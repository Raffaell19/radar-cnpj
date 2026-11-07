const { db } = require('../database');
const { pesquisarEmpresas, descobrirCnpjsPorCriterios } = require('./cnpjService');

function listarRadares() {
  const radares = db.prepare('SELECT * FROM radares ORDER BY id DESC').all();

  // Calcula estatísticas globais
  const totalRadares = radares.length;
  const radaresLigados = radares.filter(r => r.ativo === 1).length;

  const totalLeads = db.prepare('SELECT COUNT(*) as total FROM leads_crm').get().total;
  const contatados = db.prepare("SELECT COUNT(*) as total FROM leads_crm WHERE coluna != 'novos'").get().total;
  const responderam = db.prepare("SELECT COUNT(*) as total FROM leads_crm WHERE coluna IN ('negociacao', 'fechado')").get().total;
  const esperandoEnvio = db.prepare("SELECT COUNT(*) as total FROM leads_crm WHERE coluna = 'novos'").get().total;

  return {
    estatisticas: {
      totalRadares,
      radaresLigados,
      totalLeads,
      receberam: contatados,
      responderam,
      esperandoEnvio
    },
    radares
  };
}

function obterRadar(id) {
  return db.prepare('SELECT * FROM radares WHERE id = ?').get(id);
}

async function criarRadar(dados) {
  const insert = db.prepare(`
    INSERT INTO radares (
      nome, canal, cnae_filtro, capital_minimo, porte_filtro,
      uf_filtro, municipio_filtro, dias_abertura, mensagem_template,
      teto_diario, teto_mensal, so_celulares, excluir_mei, criar_lead_crm, ativo, capturas_mes
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const templatePadrao = 'Olá {primeiro_nome_contato}, vi que a {empresa} abriu recentemente em {municipio}! Como vocês estão cuidando da estruturação e divulgação comercial neste início?';

  const res = insert.run(
    dados.nome || 'Novo Radar de Prospecção',
    dados.canal || 'whatsapp',
    dados.cnae_filtro || '',
    Number(dados.capital_minimo) || 0,
    dados.porte_filtro || 'todos',
    dados.uf_filtro || 'todos',
    dados.municipio_filtro || 'todos',
    Number(dados.dias_abertura) || 30,
    dados.mensagem_template || templatePadrao,
    Number(dados.teto_diario) || 20,
    Number(dados.teto_mensal) || 200,
    dados.so_celulares !== undefined ? (dados.so_celulares ? 1 : 0) : 1,
    dados.excluir_mei !== undefined ? (dados.excluir_mei ? 1 : 0) : 1,
    dados.criar_lead_crm !== undefined ? (dados.criar_lead_crm ? 1 : 0) : 1,
    dados.ativo !== undefined ? (dados.ativo ? 1 : 0) : 1,
    0
  );

  const novoId = res.lastInsertRowid;

  // Executa uma primeira varredura automática para capturar empresas compatíveis
  await executarRadar(novoId);

  return obterRadar(novoId);
}

function alternarStatusRadar(id, ativo) {
  db.prepare('UPDATE radares SET ativo = ? WHERE id = ?').run(ativo ? 1 : 0, id);
  return obterRadar(id);
}

function excluirRadar(id) {
  db.prepare('DELETE FROM radares WHERE id = ?').run(id);
  return { success: true, id };
}

async function atualizarRadar(id, dados) {
  const radarExistente = obterRadar(id);
  if (!radarExistente) throw new Error('Radar não encontrado.');

  const update = db.prepare(`
    UPDATE radares SET
      nome = ?,
      canal = ?,
      cnae_filtro = ?,
      capital_minimo = ?,
      porte_filtro = ?,
      uf_filtro = ?,
      municipio_filtro = ?,
      dias_abertura = ?,
      mensagem_template = ?,
      teto_diario = ?,
      teto_mensal = ?,
      so_celulares = ?,
      excluir_mei = ?,
      criar_lead_crm = ?,
      ativo = ?
    WHERE id = ?
  `);

  update.run(
    dados.nome || radarExistente.nome,
    dados.canal || radarExistente.canal,
    dados.cnae_filtro !== undefined ? dados.cnae_filtro : radarExistente.cnae_filtro,
    dados.capital_minimo !== undefined ? Number(dados.capital_minimo) : radarExistente.capital_minimo,
    dados.porte_filtro || radarExistente.porte_filtro,
    dados.uf_filtro || radarExistente.uf_filtro,
    dados.municipio_filtro !== undefined ? dados.municipio_filtro : radarExistente.municipio_filtro,
    dados.dias_abertura !== undefined ? Number(dados.dias_abertura) : radarExistente.dias_abertura,
    dados.mensagem_template || radarExistente.mensagem_template,
    dados.teto_diario !== undefined ? Number(dados.teto_diario) : radarExistente.teto_diario,
    dados.teto_mensal !== undefined ? Number(dados.teto_mensal) : radarExistente.teto_mensal,
    dados.so_celulares !== undefined ? (dados.so_celulares ? 1 : 0) : radarExistente.so_celulares,
    dados.excluir_mei !== undefined ? (dados.excluir_mei ? 1 : 0) : radarExistente.excluir_mei,
    dados.criar_lead_crm !== undefined ? (dados.criar_lead_crm ? 1 : 0) : radarExistente.criar_lead_crm,
    dados.ativo !== undefined ? (dados.ativo ? 1 : 0) : radarExistente.ativo,
    id
  );

  // Executa uma nova varredura com os filtros atualizados
  await executarRadar(id);

  return obterRadar(id);
}

async function executarRadar(radarId) {
  const radar = obterRadar(radarId);
  if (!radar) return { capturados: 0, leadsCriados: 0 };

  // Monta critérios de busca
  const filtros = {
    cnae: radar.cnae_filtro,
    uf: radar.uf_filtro,
    municipio: radar.municipio_filtro,
    capital_minimo: radar.capital_minimo,
    porte: radar.porte_filtro,
    excluir_mei: radar.excluir_mei === 1,
    so_celulares: radar.so_celulares === 1,
    dias_abertura: radar.dias_abertura,
    por_pagina: 50
  };

  // 1. Executa busca ativa/descoberta na base pública da Receita Federal
  try {
    await descobrirCnpjsPorCriterios(filtros);
  } catch (err) {
    console.warn('[Radar Engine] Erro na descoberta ativa da Receita:', err.message);
  }

  // 2. Consulta as empresas compatíveis no banco enriquecido
  let resultado = await pesquisarEmpresas(filtros);

  // Se o filtro restrito de dias retornar 0 empresas, flexibiliza a janela temporal
  // para garantir que empresas abertas recentemente com essas características sejam entregues
  if (resultado.empresas.length === 0 && filtros.dias_abertura) {
    const filtrosFlex = { ...filtros, dias_abertura: Math.max(365, Number(filtros.dias_abertura) * 2) };
    resultado = await pesquisarEmpresas(filtrosFlex);
  }

  // Se ainda estiver zerado, pesquisa sem a restrição de dias para trazer as melhores empresas reais cadastradas
  if (resultado.empresas.length === 0) {
    const filtrosSemData = { ...filtros, dias_abertura: 0 };
    resultado = await pesquisarEmpresas(filtrosSemData);
  }

  let leadsCriados = 0;

  if (radar.criar_lead_crm === 1 && resultado.empresas.length > 0) {
    const checkLead = db.prepare('SELECT id FROM leads_crm WHERE cnpj = ?');
    const insertLead = db.prepare(`
      INSERT INTO leads_crm (
        cnpj, razao_social, nome_fantasia, municipio, uf,
        telefone, email, cnae_descricao, capital_social, contato_nome,
        coluna, origem, radar_id, data_abertura
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        'novos', 'radar', ?, ?
      )
    `);

    const insertHist = db.prepare(`
      INSERT INTO historico_leads (lead_id, evento, descricao) VALUES (?, ?, ?)
    `);

    for (const emp of resultado.empresas) {
      const existe = checkLead.get(emp.cnpj);
      if (!existe) {
        const leadRes = insertLead.run(
          emp.cnpj,
          emp.razao_social,
          emp.nome_fantasia,
          emp.municipio,
          emp.uf,
          emp.telefone,
          emp.email,
          emp.cnae_descricao,
          emp.capital_social,
          emp.socio_nome,
          radar.id,
          emp.data_abertura
        );

        insertHist.run(
          leadRes.lastInsertRowid,
          'importado',
          `Capturado automaticamente pelo radar "${radar.nome}" na etapa "Novos Leads"`
        );
        leadsCriados++;
      }
    }
  }

  // Atualiza capturas no radar
  db.prepare('UPDATE radares SET capturas_mes = ? WHERE id = ?').run(
    resultado.empresas.length,
    radar.id
  );

  return {
    radarId,
    totalEncontradas: resultado.total,
    leadsCriados,
    empresas: resultado.empresas
  };
}

function formatarMensagemWhatsApp(template, dados) {
  let primeiroNome = 'Empreendedor';
  if (dados.contato_nome || dados.socio_nome) {
    const nomeCompleto = (dados.contato_nome || dados.socio_nome).trim();
    primeiroNome = nomeCompleto.split(' ')[0];
    primeiroNome = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase();
  }

  const empresaNome = dados.nome_fantasia || dados.razao_social || 'sua empresa';
  const municipio = dados.municipio || 'sua cidade';
  const cnaeDesc = dados.cnae_descricao || 'atividades';

  let msg = template || 'Olá {primeiro_nome_contato}, vi que a empresa {empresa} abriu em {municipio}!';
  msg = msg.replaceAll('{primeiro_nome_contato}', primeiroNome);
  msg = msg.replaceAll('{empresa}', empresaNome);
  msg = msg.replaceAll('{municipio}', municipio);
  msg = msg.replaceAll('{cnae_descricao}', cnaeDesc);

  // Sanitiza telefone
  let rawPhone = (dados.telefone || '').replace(/\D/g, '');
  if (rawPhone.length >= 10 && !rawPhone.startsWith('55')) {
    rawPhone = '55' + rawPhone;
  }

  const urlWaMe = rawPhone ? `https://wa.me/${rawPhone}?text=${encodeURIComponent(msg)}` : null;

  return {
    mensagemFormatada: msg,
    telefoneLimpo: rawPhone,
    urlWaMe,
    primeiroNome
  };
}

function registrarDisparo(leadId, mensagem) {
  const lead = db.prepare('SELECT * FROM leads_crm WHERE id = ?').get(leadId);
  if (!lead) return null;

  const agora = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Atualiza coluna para 'contatado' caso ainda esteja em 'novos'
  const novaColuna = lead.coluna === 'novos' ? 'contatado' : lead.coluna;

  db.prepare('UPDATE leads_crm SET coluna = ?, ultimo_contato_em = ? WHERE id = ?').run(
    novaColuna,
    agora,
    leadId
  );

  db.prepare(`
    INSERT INTO historico_leads (lead_id, evento, descricao) VALUES (?, ?, ?)
  `).run(
    leadId,
    'mensagem_whatsapp',
    `Mensagem enviada via WhatsApp: "${mensagem.substring(0, 90)}..."`
  );

  return {
    success: true,
    leadId,
    novaColuna,
    ultimo_contato_em: agora
  };
}

module.exports = {
  listarRadares,
  obterRadar,
  criarRadar,
  atualizarRadar,
  alternarStatusRadar,
  excluirRadar,
  executarRadar,
  formatarMensagemWhatsApp,
  registrarDisparo
};
