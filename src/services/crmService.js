const { db } = require('../database');
const { obterEmpresaPorCnpj } = require('./cnpjService');

function listarLeads(colunaFiltro = null, termo = null) {
  let query = 'SELECT * FROM leads_crm WHERE 1=1';
  const params = [];

  if (colunaFiltro && colunaFiltro !== 'todos') {
    query += ' AND coluna = ?';
    params.push(colunaFiltro);
  }

  if (termo && termo.trim() !== '') {
    query += ' AND (razao_social LIKE ? OR nome_fantasia LIKE ? OR cnpj LIKE ? OR contato_nome LIKE ?)';
    const t = `%${termo}%`;
    params.push(t, t, t, t);
  }

  query += ' ORDER BY id DESC';
  const leads = db.prepare(query).all(...params);

  // Agrupamento por colunas para o Kanban
  const kanban = {
    novos: [],
    contatado: [],
    negociacao: [],
    fechado: [],
    perdido: []
  };

  leads.forEach(l => {
    if (kanban[l.coluna]) {
      kanban[l.coluna].push(l);
    } else {
      kanban.novos.push(l);
    }
  });

  return {
    total: leads.length,
    kanban,
    leads
  };
}

async function obterDetalhesLead(id) {
  const lead = db.prepare('SELECT * FROM leads_crm WHERE id = ?').get(id);
  if (!lead) return null;

  const historico = db.prepare('SELECT * FROM historico_leads WHERE lead_id = ? ORDER BY id DESC').all(id);

  // Busca dados completos da empresa original se existir
  let empresaOriginal = await obterEmpresaPorCnpj(lead.cnpj);
  if (!empresaOriginal) {
    empresaOriginal = {
      cnpj: lead.cnpj,
      razao_social: lead.razao_social,
      nome_fantasia: lead.nome_fantasia || lead.razao_social,
      municipio: lead.municipio,
      uf: lead.uf,
      telefone: lead.telefone,
      email: lead.email,
      cnae_descricao: lead.cnae_descricao,
      capital_social: lead.capital_social,
      socio_nome: lead.contato_nome || '',
      socio_cargo: lead.contato_nome ? 'Responsável Declarado' : '',
      quadro_societario: lead.contato_nome ? [{ nome: lead.contato_nome, qualificacao: 'Responsável Declarado', pais_origem: 'BRASIL' }] : [],
      data_abertura: lead.data_abertura,
      porte: 'ME',
      situacao_cadastral: 'ATIVA'
    };
  }

  return {
    lead,
    historico,
    dados_completos: empresaOriginal
  };
}

function moverColunaLead(id, novaColuna) {
  const lead = db.prepare('SELECT * FROM leads_crm WHERE id = ?').get(id);
  if (!lead) return null;

  const colunaAnterior = lead.coluna;
  db.prepare('UPDATE leads_crm SET coluna = ? WHERE id = ?').run(novaColuna, id);

  const nomesColunas = {
    novos: 'Novos Leads',
    contatado: 'Em Contato',
    negociacao: 'Negociação',
    fechado: 'Fechado',
    perdido: 'Perdido'
  };

  db.prepare(`
    INSERT INTO historico_leads (lead_id, evento, descricao) VALUES (?, ?, ?)
  `).run(
    id,
    'movido',
    `Lead movido de "${nomesColunas[colunaAnterior] || colunaAnterior}" para "${nomesColunas[novaColuna] || novaColuna}"`
  );

  const historico = db.prepare('SELECT * FROM historico_leads WHERE lead_id = ? ORDER BY id DESC').all(id);
  const updatedLead = db.prepare('SELECT * FROM leads_crm WHERE id = ?').get(id);
  return { lead: updatedLead, historico };
}

async function importarEmpresaParaCrm(cnpj, coluna = 'novos') {
  const check = db.prepare('SELECT * FROM leads_crm WHERE cnpj = ?').get(cnpj);
  if (check) {
    return { jaExistia: true, lead: check };
  }

  const empresa = await obterEmpresaPorCnpj(cnpj);
  if (!empresa) {
    throw new Error('Empresa não encontrada na base.');
  }

  const insert = db.prepare(`
    INSERT INTO leads_crm (
      cnpj, razao_social, nome_fantasia, municipio, uf,
      telefone, email, cnae_descricao, capital_social, contato_nome,
      coluna, origem, data_abertura
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, 'busca_avulsa', ?
    )
  `);

  const res = insert.run(
    empresa.cnpj,
    empresa.razao_social,
    empresa.nome_fantasia,
    empresa.municipio,
    empresa.uf,
    empresa.telefone,
    empresa.email,
    empresa.cnae_descricao,
    empresa.capital_social,
    empresa.socio_nome,
    coluna,
    empresa.data_abertura
  );

  const novoId = res.lastInsertRowid;

  db.prepare(`
    INSERT INTO historico_leads (lead_id, evento, descricao) VALUES (?, ?, ?)
  `).run(
    novoId,
    'importado',
    'Importado manualmente a partir da busca avulsa de empresas.'
  );

  return { jaExistia: false, lead: obterDetalhesLead(novoId) };
}

function excluirLead(id) {
  db.prepare('DELETE FROM historico_leads WHERE lead_id = ?').run(id);
  db.prepare('DELETE FROM leads_crm WHERE id = ?').run(id);
  return { success: true, id };
}

function salvarNotasLead(id, notas) {
  db.prepare('UPDATE leads_crm SET notas = ? WHERE id = ?').run(notas, id);
  db.prepare(`
    INSERT INTO historico_leads (lead_id, evento, descricao) VALUES (?, ?, ?)
  `).run(id, 'anotacao', 'Anotações internas do lead atualizadas.');
  return { success: true, id, notas };
}

module.exports = {
  listarLeads,
  obterDetalhesLead,
  moverColunaLead,
  importarEmpresaParaCrm,
  excluirLead,
  salvarNotasLead
};
