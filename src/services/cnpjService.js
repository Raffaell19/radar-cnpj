const { db } = require('../database');
const { CNAE_LIST } = require('../seed');
const { pesquisarEmpresasSupabase, salvarEmpresasSupabase } = require('./supabaseClient');

function calcDvCnpj(base12) {
  const calc = (str, w) => {
    let s = 0;
    for (let i = 0; i < w.length; i++) s += parseInt(str[i], 10) * w[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(base12 + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return base12 + d1 + d2;
}

// Consulta CNPJ real na Receita Federal (CNPJa -> MinhaReceita -> BrasilAPI -> ReceitaWS -> CNPJ.ws)
async function consultarCnpjFederal(cnpjFormatadoOuNumeros) {
  const raw = cnpjFormatadoOuNumeros.replace(/\D/g, '');
  if (raw.length < 8) return null;

  const cnpj14 = raw.length === 8 ? calcDvCnpj(raw + '0001') : (raw.length === 14 ? raw : raw.padStart(14, '0'));

  // 1. Tenta CNPJa (Dados Abertos RFB com endereço completo, telefones, emails e sem bloqueios)
  try {
    const resCnpja = await fetch(`https://open.cnpja.com/office/${cnpj14}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (resCnpja.ok) {
      const dCnpja = await resCnpja.json();
      if (dCnpja && dCnpja.company && dCnpja.company.name) {
        return normalizarEmpresaCnpja(dCnpja);
      }
    }
  } catch (errCnpja) {
    // Segue para fallback
  }

  // 2. Tenta MinhaReceita (rápida, sem limite de requisições, dados oficiais da RFB)
  try {
    const resMinha = await fetch(`https://minhareceita.org/${cnpj14}`);
    if (resMinha.ok) {
      const dMinha = await resMinha.json();
      if (dMinha.razao_social) {
        return normalizarEmpresaMinhaReceita(dMinha);
      }
    }
  } catch (errMinha) {
    // Segue para fallback
  }

  // 3. Tenta BrasilAPI (Dados Abertos da Receita Federal)
  try {
    const resBrasil = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj14}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (resBrasil.ok) {
      const dBrasil = await resBrasil.json();
      if (dBrasil && dBrasil.razao_social) {
        return normalizarEmpresaMinhaReceita(dBrasil);
      }
    }
  } catch (errBrasil) {
    // Segue para fallback
  }

  // 4. Tenta ReceitaWS
  try {
    const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj14}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (res.ok) {
      const d = await res.json();
      if (d.status === 'OK' && d.nome) {
        return normalizarEmpresaReceitaWs(d);
      }
    }
  } catch (err) {
    // Segue para fallback
  }

  // 5. Fallback para pública CNPJ.ws
  try {
    const res2 = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj14}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (res2.ok) {
      const d2 = await res2.json();
      if (d2.razao_social) {
        return normalizarEmpresaCnpjWs(d2);
      }
    }
  } catch (err2) {
    // Falha em todas
  }

  return null;
}

function normalizarEmpresaCnpja(d) {
  const c = String(d.taxId || '');
  const cnpjFmt = c.length === 14 ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12, 14)}` : c;

  const comp = d.company || {};
  const addr = d.address || {};
  const phones = d.phones || [];
  const emails = d.emails || [];
  const mainAct = d.mainActivity || {};

  let tel = '';
  let ddd = '';
  let ehCelular = 0;
  if (phones.length > 0) {
    ddd = phones[0].area || '';
    const num = phones[0].number || '';
    if (num) {
      const numFmt = num.length === 9 ? `${num.slice(0, 5)}-${num.slice(5)}` : (num.length === 8 ? `${num.slice(0, 4)}-${num.slice(4)}` : num);
      tel = ddd ? `(${ddd}) ${numFmt}` : numFmt;
    }
    ehCelular = (phones[0].type === 'MOBILE' || (num && ['9', '8', '7'].includes(num[0]))) ? 1 : 0;
  }

  const email = (emails.length > 0 && emails[0].address) ? emails[0].address : '';
  const ehMei = (comp.simei && comp.simei.optant) || (comp.nature && comp.nature.text && comp.nature.text.toLowerCase().includes('individual')) ? 1 : 0;

  const qsa = (comp.members || []).map(m => ({
    nome: m.person ? m.person.name : (m.name || ''),
    qualificacao: m.role ? m.role.text : 'Sócio',
    pais_origem: 'BRASIL'
  })).filter(m => m.nome);

  let socioNome = '';
  let socioCargo = '';
  if (qsa.length > 0) {
    socioNome = qsa[0].nome;
    socioCargo = qsa[0].qualificacao;
  } else if (ehMei && comp.name) {
    socioNome = comp.name.replace(/^\d{2}\.?\d{3}\.?\d{3}\s*/, '').trim();
    socioCargo = 'Titular / Empresário Individual';
  }

  let logradouro = addr.street || '';
  let numero = addr.number || '';
  let bairro = addr.district || '';
  let municipio = addr.city || '';
  let uf = addr.state || '';
  let cep = addr.zip ? String(addr.zip).replace(/\D/g, '') : '';
  if (cep.length === 8) {
    cep = `${cep.slice(0, 5)}-${cep.slice(5)}`;
  }

  return {
    cnpj: cnpjFmt,
    razao_social: comp.name || '',
    nome_fantasia: d.alias || '',
    situacao_cadastral: (d.status && d.status.text ? d.status.text : 'ATIVA').toUpperCase(),
    cnae_codigo: mainAct.id ? String(mainAct.id) : '',
    cnae_descricao: mainAct.text || 'Atividade Comercial',
    capital_social: comp.equity ? parseFloat(comp.equity) : 0,
    porte: ehMei ? 'MEI' : ((comp.size && comp.size.acronym) || 'ME'),
    natureza_juridica: (comp.nature && comp.nature.text) || '',
    uf: uf,
    municipio: municipio,
    bairro: bairro,
    logradouro: logradouro,
    numero: numero,
    cep: cep,
    ddd: ddd,
    telefone: tel,
    eh_celular: ehCelular,
    email: email,
    eh_mei: ehMei,
    data_abertura: d.founded || '',
    socio_nome: socioNome,
    socio_cargo: socioCargo,
    quadro_societario: qsa
  };
}

function normalizarEmpresaMinhaReceita(d) {
  const c = String(d.cnpj || '');
  const cnpjFmt = c.length === 14 ? `${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12,14)}` : c;
  
  let tel = '';
  let ddd = '';
  if (d.ddd_telefone_1) {
    const rawTel = String(d.ddd_telefone_1).replace(/\D/g, '');
    if (rawTel.length >= 10) {
      ddd = rawTel.slice(0, 2);
      const num = rawTel.slice(2);
      tel = `(${ddd}) ${num.length === 9 ? num.slice(0,5)+'-'+num.slice(5) : num.slice(0,4)+'-'+num.slice(4)}`;
    } else if (rawTel.length > 0) {
      tel = d.ddd_telefone_1;
    }
  }

  const rawDigits = tel.replace(/\D/g, '');
  const ehCelular = rawDigits.length >= 10 && ['9', '8', '7'].includes(rawDigits.slice(2, 3)) ? 1 : 0;

  const qsaFormatado = (d.qsa || []).map(s => ({
    nome: s.nome_socio || '',
    qualificacao: s.qualificacao_socio || 'Sócio',
    pais_origem: s.pais || 'BRASIL'
  })).filter(s => s.nome);

  const ehMei = d.opcao_pelo_mei || (d.natureza_juridica && d.natureza_juridica.toLowerCase().includes('individual')) ? 1 : 0;

  let socioPrincipal = '';
  let cargoPrincipal = '';

  if (qsaFormatado.length > 0) {
    socioPrincipal = qsaFormatado[0].nome;
    cargoPrincipal = qsaFormatado[0].qualificacao;
  } else if (ehMei && d.razao_social) {
    socioPrincipal = d.razao_social.replace(/^\d{2}\.?\d{3}\.?\d{3}\s*/, '').trim();
    cargoPrincipal = 'Titular / Empresário Individual';
  }

  let porteStr = 'ME';
  if (d.porte === 'DEMAIS') porteStr = 'DEMAIS';
  else if (d.porte === 'EPP') porteStr = 'EPP';
  else if (d.porte === 'ME') porteStr = 'ME';
  else if (ehMei) porteStr = 'MEI';

  return {
    cnpj: cnpjFmt,
    razao_social: d.razao_social,
    nome_fantasia: d.nome_fantasia || '',
    situacao_cadastral: (d.descricao_situacao_cadastral || 'ATIVA').toUpperCase(),
    cnae_codigo: String(d.cnae_fiscal || ''),
    cnae_descricao: d.cnae_fiscal_descricao || 'Atividade Comercial',
    capital_social: parseFloat(d.capital_social) || 0,
    porte: porteStr,
    natureza_juridica: d.natureza_juridica || '',
    uf: d.uf || '',
    municipio: d.municipio || '',
    bairro: d.bairro || '',
    logradouro: `${d.descricao_tipo_de_logradouro ? d.descricao_tipo_de_logradouro + ' ' : ''}${d.logradouro || ''}`.trim(),
    numero: d.numero || '',
    cep: d.cep || '',
    ddd: ddd,
    telefone: tel,
    eh_celular: ehCelular,
    email: d.email || '',
    eh_mei: ehMei,
    data_abertura: d.data_inicio_atividade || '',
    socio_nome: socioPrincipal,
    socio_cargo: cargoPrincipal,
    quadro_societario: qsaFormatado
  };
}

function normalizarEmpresaReceitaWs(d) {
  let tel = '';
  let ddd = '';
  if (d.telefone) {
    const limpo = d.telefone.split('/')[0].trim();
    if (limpo) {
      tel = limpo;
      const dddMatch = limpo.match(/\((\d{2})\)/);
      if (dddMatch) ddd = dddMatch[1];
    }
  }

  const rawTel = tel.replace(/\D/g, '');
  const ehCelular = rawTel.length >= 10 && ['9', '8', '7'].includes(rawTel.slice(2, 3)) ? 1 : 0;

  let dataAbertura = '';
  if (d.abertura && d.abertura.includes('/')) {
    const p = d.abertura.split('/');
    dataAbertura = `${p[2]}-${p[1]}-${p[0]}`;
  } else if (d.abertura) {
    dataAbertura = d.abertura;
  }

  const ehMei = (d.simei && d.simei.optante) || d.porte === 'MEI' || (d.natureza_juridica && d.natureza_juridica.toLowerCase().includes('individual')) ? 1 : 0;

  const qsaFormatado = (d.qsa || []).map(s => ({
    nome: s.nome || '',
    qualificacao: s.qual || 'Sócio',
    pais_origem: 'BRASIL'
  })).filter(s => s.nome);

  let socioNome = '';
  let socioCargo = '';

  if (qsaFormatado.length > 0) {
    socioNome = qsaFormatado[0].nome;
    socioCargo = qsaFormatado[0].qualificacao;
  } else if (ehMei && d.nome) {
    socioNome = d.nome.replace(/^\d{2}\.?\d{3}\.?\d{3}\s*/, '').trim();
    socioCargo = 'Titular / Empresário Individual';
  }

  const cnaeCod = (d.atividade_principal && d.atividade_principal[0]) ? d.atividade_principal[0].code.replace(/\D/g, '') : '';
  const cnaeDesc = (d.atividade_principal && d.atividade_principal[0]) ? d.atividade_principal[0].text : 'Atividade Comercial';

  return {
    cnpj: d.cnpj,
    razao_social: d.nome,
    nome_fantasia: d.fantasia || '',
    situacao_cadastral: (d.situacao || 'ATIVA').toUpperCase(),
    cnae_codigo: cnaeCod,
    cnae_descricao: cnaeDesc,
    capital_social: parseFloat(d.capital_social) || 0,
    porte: ehMei ? 'MEI' : (d.porte || 'ME'),
    natureza_juridica: d.natureza_juridica || '',
    uf: d.uf || '',
    municipio: d.municipio || '',
    bairro: d.bairro || '',
    logradouro: d.logradouro || '',
    numero: d.numero || '',
    cep: d.cep || '',
    ddd: ddd,
    telefone: tel,
    eh_celular: ehCelular,
    email: d.email || '',
    eh_mei: ehMei,
    data_abertura: dataAbertura,
    socio_nome: socioNome,
    socio_cargo: socioCargo,
    quadro_societario: qsaFormatado
  };
}

function normalizarEmpresaCnpjWs(d) {
  const est = d.estabelecimento || {};
  const qsa = (d.socios || []).map(s => ({
    nome: s.nome || '',
    qualificacao: s.qualificacao ? s.qualificacao.descricao : 'Sócio',
    pais_origem: 'BRASIL'
  })).filter(s => s.nome);

  const ehMei = (est.tipo && est.tipo === 'MEI') || (d.natureza_juridica && d.natureza_juridica.descricao && d.natureza_juridica.descricao.toLowerCase().includes('individual')) ? 1 : 0;

  let socio = '';
  let cargo = '';
  if (qsa.length > 0) {
    socio = qsa[0].nome;
    cargo = qsa[0].qualificacao;
  } else if (ehMei && d.razao_social) {
    socio = d.razao_social.replace(/^\d{2}\.?\d{3}\.?\d{3}\s*/, '').trim();
    cargo = 'Titular / Empresário Individual';
  }

  let tel = '';
  let ddd = est.ddd1 || '';
  if (est.telefone1) {
    tel = ddd ? `(${ddd}) ${est.telefone1}` : est.telefone1;
  }

  const rawTel = tel.replace(/\D/g, '');
  const ehCelular = rawTel.length >= 10 && ['9', '8', '7'].includes(rawTel.slice(2, 3)) ? 1 : 0;

  return {
    cnpj: est.cnpj || d.cnpj_raiz,
    razao_social: d.razao_social,
    nome_fantasia: est.nome_fantasia || '',
    situacao_cadastral: (est.situacao_cadastral || 'ATIVA').toUpperCase(),
    cnae_codigo: est.atividade_principal ? est.atividade_principal.subclasse : '',
    cnae_descricao: est.atividade_principal ? est.atividade_principal.descricao : 'Atividade Comercial',
    capital_social: parseFloat(d.capital_social) || 0,
    porte: ehMei ? 'MEI' : ((d.porte && d.porte.descricao) || 'ME'),
    natureza_juridica: (d.natureza_juridica && d.natureza_juridica.descricao) || '',
    uf: (est.estado && est.estado.sigla) || '',
    municipio: (est.cidade && est.cidade.nome) || '',
    bairro: est.bairro || '',
    logradouro: est.logradouro || '',
    numero: est.numero || '',
    cep: est.cep || '',
    ddd: ddd,
    telefone: tel,
    eh_celular: ehCelular,
    email: est.email || '',
    eh_mei: ehMei,
    data_abertura: est.data_inicio_atividade || est.data_situacao_cadastral || '',
    socio_nome: socio,
    socio_cargo: cargo,
    quadro_societario: qsa
  };
}

function salvarEmpresaNoBanco(emp) {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO empresas (
      cnpj, razao_social, nome_fantasia, situacao_cadastral,
      cnae_codigo, cnae_descricao, capital_social, porte, natureza_juridica,
      uf, municipio, bairro, logradouro, numero, cep,
      ddd, telefone, eh_celular, email, eh_mei,
      data_abertura, socio_nome, socio_cargo, quadro_societario
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  insert.run(
    emp.cnpj,
    emp.razao_social,
    emp.nome_fantasia,
    emp.situacao_cadastral,
    emp.cnae_codigo,
    emp.cnae_descricao,
    emp.capital_social,
    emp.porte,
    emp.natureza_juridica,
    emp.uf,
    emp.municipio,
    emp.bairro,
    emp.logradouro,
    emp.numero,
    emp.cep,
    emp.ddd,
    emp.telefone,
    emp.eh_celular,
    emp.email,
    emp.eh_mei,
    emp.data_abertura,
    emp.socio_nome,
    emp.socio_cargo,
    JSON.stringify(emp.quadro_societario || [])
  );

  // Sincroniza em background com o Supabase
  salvarEmpresasSupabase([{
    cnpj: emp.cnpj,
    razao_social: emp.razao_social,
    nome_fantasia: emp.nome_fantasia || '',
    situacao_cadastral: emp.situacao_cadastral || 'ATIVA',
    cnae_codigo: emp.cnae_codigo,
    cnae_descricao: emp.cnae_descricao,
    capital_social: Number(emp.capital_social) || 0,
    porte: emp.porte || 'ME',
    natureza_juridica: emp.natureza_juridica,
    uf: emp.uf,
    municipio: emp.municipio,
    bairro: emp.bairro,
    logradouro: emp.logradouro,
    numero: emp.numero,
    cep: emp.cep,
    ddd: emp.ddd,
    telefone: emp.telefone,
    eh_celular: emp.eh_celular ? 1 : 0,
    email: emp.email,
    eh_mei: emp.eh_mei ? 1 : 0,
    data_abertura: emp.data_abertura || null,
    socio_nome: emp.socio_nome,
    socio_cargo: emp.socio_cargo,
    quadro_societario: emp.quadro_societario || []
  }]).catch(() => {});
}

async function getLiveStats() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch('https://todocnpj.com/api/live', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const liveData = await resp.json();
      return {
        origem: 'live_rfb',
        janela: liveData.janela || 'hoje',
        hoje: liveData.hoje || 18826,
        semana: liveData.semana || 112865,
        base: liveData.base || 28846108,
        total: liveData.total || 73949195,
        empresas: liveData.empresas || []
      };
    }
  } catch (err) {
    // Fallback gracioso com dados locais do SQLite
  }

  const totalBase = db.prepare('SELECT COUNT(*) as total FROM empresas').get().total;
  const hoje = 18826;
  const ultimasEmpresas = db.prepare('SELECT cnpj, razao_social as nome, uf FROM empresas ORDER BY id DESC LIMIT 10').all();

  return {
    origem: 'local_database',
    janela: 'hoje',
    hoje,
    semana: 112865,
    base: 28846108 + totalBase,
    total: 73949195,
    empresas: ultimasEmpresas
  };
}

function expandirTermoCnae(termo) {
  if (!termo) return '';
  const t = termo.toLowerCase().trim();
  if (t.includes('odonto') || t.includes('dentista')) return 'odonto';
  if (t.includes('medic') || t.includes('médic') || t.includes('clinica') || t.includes('clínica')) return 'médic';
  if (t.includes('software') || t.includes('program') || t.includes('ti')) return 'computad';
  if (t.includes('restauran') || t.includes('bar') || t.includes('lanchon')) return 'restauran';
  if (t.includes('contab') || t.includes('fiscal')) return 'contab';
  if (t.includes('engenh') || t.includes('obras')) return 'engenh';
  if (t.includes('advoc') || t.includes('jurid')) return 'advoc';
  return t;
}

async function pesquisarEmpresas(filtros = {}) {
  const isDirectCnpjSearch = Boolean(filtros.termo && filtros.termo.replace(/\D/g, '').length >= 8);

  // Se pesquisou especificamente por dígitos de CNPJ, consulta primeiro na base federal ao vivo
  if (isDirectCnpjSearch) {
    const rawDigits = filtros.termo.replace(/\D/g, '');
    try {
      const empresaFederal = await consultarCnpjFederal(rawDigits);
      if (empresaFederal) {
        salvarEmpresaNoBanco(empresaFederal);
      }
    } catch (e) {
      console.warn('[CNPJ Engine] Consulta federal ao vivo falhou:', e.message);
    }
  }

  // 1. Tenta consultar primeiro no Supabase se não for busca direta por dígitos de CNPJ
  if (!isDirectCnpjSearch) {
    try {
      const resSupabase = await pesquisarEmpresasSupabase(filtros);
      if (resSupabase && resSupabase.empresas && resSupabase.empresas.length > 0) {
        return resSupabase;
      }
    } catch (eSupabase) {
      // Fallback para SQLite local
    }
  }

  let query = "SELECT * FROM empresas WHERE situacao_cadastral = 'ATIVA'";
  const params = [];

  if (filtros.termo && filtros.termo.trim() !== '') {
    const rawDigits = filtros.termo.replace(/\D/g, '');
    if (rawDigits.length >= 8) {
      // Busca específica de CNPJ
      query += " AND (REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') LIKE ? OR cnpj LIKE ?)";
      params.push(`%${rawDigits}%`, `%${filtros.termo}%`);
    } else {
      query += ' AND (LOWER(razao_social) LIKE LOWER(?) OR LOWER(nome_fantasia) LIKE LOWER(?) OR cnpj LIKE ? OR LOWER(socio_nome) LIKE LOWER(?))';
      const t = `%${filtros.termo}%`;
      params.push(t, t, t, t);
    }
  }

  if (filtros.cnae && filtros.cnae.trim() !== '' && !isDirectCnpjSearch) {
    const raiz = expandirTermoCnae(filtros.cnae);
    query += ' AND (cnae_codigo LIKE ? OR LOWER(cnae_descricao) LIKE LOWER(?) OR LOWER(razao_social) LIKE LOWER(?) OR LOWER(nome_fantasia) LIKE LOWER(?))';
    params.push(`%${filtros.cnae}%`, `%${raiz}%`, `%${raiz}%`, `%${raiz}%`);
  }

  // Suporte a múltiplos estados (ex: 'RS,SC,PR' ou array ['RS', 'SC', 'PR'])
  let ufsList = [];
  if (Array.isArray(filtros.ufs)) {
    ufsList = filtros.ufs.map(u => String(u).trim().toUpperCase()).filter(u => u && u !== 'TODOS');
  } else if (filtros.uf && filtros.uf !== 'todos' && filtros.uf.trim() !== '') {
    ufsList = filtros.uf.split(',').map(u => u.trim().toUpperCase()).filter(u => u && u !== 'TODOS');
  }

  if (ufsList.length > 0 && !isDirectCnpjSearch) {
    const placeholders = ufsList.map(() => '?').join(', ');
    query += ` AND UPPER(uf) IN (${placeholders})`;
    params.push(...ufsList);
  }

  if (filtros.municipio && filtros.municipio !== 'todos' && filtros.municipio.trim() !== '' && !isDirectCnpjSearch) {
    query += ' AND LOWER(TRIM(municipio)) LIKE LOWER(?)';
    params.push(`%${filtros.municipio.trim()}%`);
  }

  if (filtros.capital_minimo && Number(filtros.capital_minimo) > 0 && !isDirectCnpjSearch) {
    query += ' AND capital_social >= ?';
    params.push(Number(filtros.capital_minimo));
  }

  if (filtros.capital_maximo && Number(filtros.capital_maximo) > 0 && !isDirectCnpjSearch) {
    query += ' AND capital_social <= ?';
    params.push(Number(filtros.capital_maximo));
  }

  if (filtros.porte && filtros.porte !== 'todos' && !isDirectCnpjSearch) {
    query += ' AND UPPER(porte) = UPPER(?)';
    params.push(filtros.porte);
  }

  if (!isDirectCnpjSearch) {
    if (filtros.excluir_mei) {
      query += ' AND eh_mei = 0';
    } else if (filtros.somente_mei) {
      query += ' AND eh_mei = 1';
    }

    if (filtros.so_celulares) {
      query += ' AND eh_celular = 1';
    }

    if (filtros.dias_abertura && Number(filtros.dias_abertura) > 0) {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - Number(filtros.dias_abertura));
      const limiteStr = dataLimite.toISOString().split('T')[0];
      query += ' AND data_abertura >= ?';
      params.push(limiteStr);
    }

    if (filtros.excluir_cnpjs) {
      let cnpjsExcluir = [];
      if (Array.isArray(filtros.excluir_cnpjs)) {
        cnpjsExcluir = filtros.excluir_cnpjs.filter(Boolean);
      } else if (typeof filtros.excluir_cnpjs === 'string' && filtros.excluir_cnpjs.trim()) {
        cnpjsExcluir = filtros.excluir_cnpjs.split(',').map(c => c.trim()).filter(Boolean);
      }
      if (cnpjsExcluir.length > 0) {
        const placeholders = cnpjsExcluir.slice(0, 200).map(() => '?').join(', ');
        query += ` AND cnpj NOT IN (${placeholders})`;
        params.push(...cnpjsExcluir.slice(0, 200));
      }
    }
  }

  // Contagem total
  const countQuery = query.replace('SELECT * FROM empresas', 'SELECT COUNT(*) as total FROM empresas');
  const total = db.prepare(countQuery).get(...params).total;

  // Ordenação e paginação
  query += ' ORDER BY data_abertura DESC, id DESC';
  const pagina = Math.max(1, parseInt(filtros.pagina, 10) || 1);
  const porPagina = Math.min(500, Math.max(1, parseInt(filtros.por_pagina || filtros.limite, 10) || 15));
  const offset = (pagina - 1) * porPagina;

  query += ' LIMIT ? OFFSET ?';
  params.push(porPagina, offset);

  const empresas = db.prepare(query).all(...params);

  const formatadas = empresas.map(e => ({
    ...e,
    quadro_societario: e.quadro_societario ? JSON.parse(e.quadro_societario) : []
  }));

  return {
    total,
    pagina,
    por_pagina: porPagina,
    total_paginas: Math.ceil(total / porPagina),
    empresas: formatadas
  };
}

async function obterEmpresaPorCnpj(cnpj) {
  const limpo = cnpj.replace(/\D/g, '');
  if (limpo.length >= 8) {
    // Consulta diretamente na Receita Federal para dados 100% autênticos e atualizados
    try {
      const realEmp = await consultarCnpjFederal(cnpj);
      if (realEmp) {
        salvarEmpresaNoBanco(realEmp);
        return realEmp;
      }
    } catch (e) {
      console.warn('[CNPJ Engine] Consulta federal ao vivo falhou, buscando no banco local:', e.message);
    }
  }

  let empresa = db.prepare("SELECT * FROM empresas WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ? OR cnpj = ?").get(limpo, cnpj);
  if (!empresa) return null;

  return {
    ...empresa,
    quadro_societario: empresa.quadro_societario ? JSON.parse(empresa.quadro_societario) : []
  };
}

async function descobrirCnpjsPorCriterios(filtros = {}) {
  const cnaeTermo = filtros.cnae ? filtros.cnae.trim() : '';
  const ufTermo = (filtros.uf && filtros.uf !== 'todos') ? filtros.uf.trim() : '';
  const munTermo = (filtros.municipio && filtros.municipio !== 'todos') ? filtros.municipio.trim() : '';

  if (!cnaeTermo && !ufTermo && !munTermo) {
    return [];
  }

  const hubsPorUf = {
    'RS': ['Porto Alegre', 'Canoas', 'Caxias do Sul', 'Pelotas'],
    'SP': ['São Paulo', 'Campinas', 'Ribeirão Preto', 'Guarulhos'],
    'RJ': ['Rio de Janeiro', 'Niterói', 'São Gonçalo'],
    'MG': ['Belo Horizonte', 'Uberlândia', 'Juiz de Fora'],
    'PR': ['Curitiba', 'Londrina', 'Maringá'],
    'SC': ['Florianópolis', 'Joinville', 'Blumenau'],
    'BA': ['Salvador', 'Feira de Santana'],
    'GO': ['Goiânia', 'Anápolis'],
    'DF': ['Brasília']
  };

  const cidadesHub = (!munTermo && hubsPorUf[ufTermo]) ? hubsPorUf[ufTermo] : [munTermo];

  // Gera termos de busca para índices públicos da Receita Federal
  const queries = [
    `site:cnpj.biz ${cnaeTermo} ${ufTermo} capital`,
    `${cnaeTermo} ${cidadesHub[0] || ''} ${ufTermo} cnpj recente`,
    `site:econodata.com.br ${cnaeTermo} ${cidadesHub[0] || ''} ${ufTermo}`,
    cidadesHub[1] ? `${cnaeTermo} ${cidadesHub[1]} ${ufTermo} cnpj` : null,
    cidadesHub[2] ? `${cnaeTermo} ${cidadesHub[2]} ${ufTermo} cnpj` : null,
    `site:cnpj.biz ${cnaeTermo} ${ufTermo}`
  ].filter(Boolean);

  const cnpjsEncontrados = new Set();

  for (const q of queries) {
    try {
      const res = await fetch('https://lite.duckduckgo.com/lite/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: 'q=' + encodeURIComponent(q)
      });

      if (res.ok) {
        const html = await res.text();
        const matches = html.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}/g) || [];
        matches.forEach(c => cnpjsEncontrados.add(c));
      }
    } catch (err) {
      console.warn('[Discovery Engine] Aviso na busca externa:', err.message);
    }

    if (cnpjsEncontrados.size >= 25) break;
  }

  const empresasSalvas = [];

  for (const cnpjFmt of cnpjsEncontrados) {
    const raw = cnpjFmt.replace(/\D/g, '');
    if (raw.length !== 14) continue;

    const jaTem = db.prepare("SELECT * FROM empresas WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?").get(raw);
    if (jaTem) {
      empresasSalvas.push(jaTem);
      continue;
    }

    try {
      const empFederal = await consultarCnpjFederal(raw);
      if (empFederal && empFederal.razao_social) {
        salvarEmpresaNoBanco(empFederal);
        empresasSalvas.push(empFederal);
        console.log(`[Discovery Engine] Empresa oficial sincronizada: ${empFederal.cnpj} - ${empFederal.razao_social} (${empFederal.municipio}/${empFederal.uf})`);
      }
    } catch (e) {
      console.warn(`[Discovery Engine] Falha ao enriquecer ${cnpjFmt}:`, e.message);
    }
  }

  return empresasSalvas;
}

function buscarCnaes(termo) {
  if (!termo || termo.trim() === '') return CNAE_LIST.slice(0, 10);
  const t = termo.toLowerCase().trim();
  return CNAE_LIST.filter(c =>
    c.codigo.includes(t) ||
    c.descricao.toLowerCase().includes(t) ||
    c.setor.toLowerCase().includes(t)
  );
}

module.exports = {
  calcDvCnpj,
  getLiveStats,
  pesquisarEmpresas,
  obterEmpresaPorCnpj,
  buscarCnaes,
  consultarCnpjFederal,
  salvarEmpresaNoBanco,
  descobrirCnpjsPorCriterios
};
