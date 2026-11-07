const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// No ambiente Vercel (Serverless), apenas /tmp tem permissão de escrita
const isVercel = Boolean(process.env.VERCEL);
let dbPath;

if (isVercel) {
  const tmpPath = path.join('/tmp', 'radar_cnpj.sqlite');
  const sourcePath = path.join(__dirname, '..', 'radar_cnpj.sqlite');
  if (!fs.existsSync(tmpPath) && fs.existsSync(sourcePath)) {
    try {
      fs.copyFileSync(sourcePath, tmpPath);
    } catch (e) {
      console.warn('[Vercel] Aviso ao copiar banco inicial para /tmp:', e.message);
    }
  }
  dbPath = tmpPath;
} else {
  dbPath = path.join(__dirname, '..', 'radar_cnpj.sqlite');
}

const db = new DatabaseSync(dbPath);

// Criação de tabelas
db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cnpj TEXT UNIQUE NOT NULL,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    situacao_cadastral TEXT DEFAULT 'ATIVA',
    cnae_codigo TEXT,
    cnae_descricao TEXT,
    capital_social REAL DEFAULT 0,
    porte TEXT DEFAULT 'ME',
    natureza_juridica TEXT,
    uf TEXT,
    municipio TEXT,
    bairro TEXT,
    logradouro TEXT,
    numero TEXT,
    cep TEXT,
    ddd TEXT,
    telefone TEXT,
    eh_celular INTEGER DEFAULT 1,
    email TEXT,
    eh_mei INTEGER DEFAULT 0,
    data_abertura TEXT,
    socio_nome TEXT,
    socio_cargo TEXT,
    quadro_societario TEXT,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS radares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    canal TEXT DEFAULT 'whatsapp',
    cnae_filtro TEXT,
    capital_minimo REAL DEFAULT 0,
    porte_filtro TEXT DEFAULT 'todos',
    uf_filtro TEXT DEFAULT 'todos',
    municipio_filtro TEXT DEFAULT 'todos',
    dias_abertura INTEGER DEFAULT 30,
    mensagem_template TEXT,
    teto_diario INTEGER DEFAULT 20,
    teto_mensal INTEGER DEFAULT 200,
    so_celulares INTEGER DEFAULT 1,
    excluir_mei INTEGER DEFAULT 1,
    criar_lead_crm INTEGER DEFAULT 1,
    ativo INTEGER DEFAULT 1,
    capturas_mes INTEGER DEFAULT 0,
    disparos_hoje INTEGER DEFAULT 0,
    ultimo_disparo_data TEXT,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leads_crm (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cnpj TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    municipio TEXT,
    uf TEXT,
    telefone TEXT,
    email TEXT,
    cnae_descricao TEXT,
    capital_social REAL DEFAULT 0,
    contato_nome TEXT,
    coluna TEXT DEFAULT 'novos',
    origem TEXT DEFAULT 'radar',
    radar_id INTEGER,
    data_abertura TEXT,
    importado_em TEXT DEFAULT CURRENT_TIMESTAMP,
    ultimo_contato_em TEXT,
    notas TEXT
  );

  CREATE TABLE IF NOT EXISTS historico_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    evento TEXT NOT NULL,
    descricao TEXT NOT NULL,
    data TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT
  );
`);

// Inicializa configurações padrão se vazias
const getConfig = db.prepare('SELECT valor FROM configuracoes WHERE chave = ?');
const setConfig = db.prepare('INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)');

if (!getConfig.get('whatsapp_padrao')) {
  setConfig.run('whatsapp_padrao', '5511999998888');
  setConfig.run('mensagem_padrao', 'Olá {primeiro_nome_contato}, vi que a empresa {empresa} abriu recentemente em {municipio}! Como vocês estão cuidando da estruturação e divulgação comercial neste início?');
}

module.exports = {
  db,
  getConfig,
  setConfig
};
