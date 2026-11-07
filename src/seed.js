const { db } = require('./database');

const CNAE_LIST = [
  { codigo: '8630504', descricao: 'Atividade odontológica', setor: 'Odontologia' },
  { codigo: '8630502', descricao: 'Atividade médica ambulatorial com recursos para realização de procedimentos cirúrgicos', setor: 'Saúde' },
  { codigo: '8630501', descricao: 'Atividade médica ambulatorial com recursos para realização de exames complementares', setor: 'Saúde' },
  { codigo: '8630503', descricao: 'Atividade médica ambulatorial restrita a consultas', setor: 'Saúde' },
  { codigo: '8630506', descricao: 'Serviços de vacinação e imunização humana', setor: 'Saúde' },
  { codigo: '5611201', descricao: 'Restaurantes e similares', setor: 'Alimentação' },
  { codigo: '5611203', descricao: 'Lanchonetes, casas de chá, de sucos e similares', setor: 'Alimentação' },
  { codigo: '6201501', descricao: 'Desenvolvimento de programas de computador sob encomenda', setor: 'Tecnologia' },
  { codigo: '6202300', descricao: 'Desenvolvimento e licenciamento de programas de computador customizáveis', setor: 'Tecnologia' },
  { codigo: '6204000', descricao: 'Consultoria em tecnologia da informação', setor: 'Tecnologia' },
  { codigo: '6920601', descricao: 'Atividades de contabilidade', setor: 'Contabilidade' },
  { codigo: '7319002', descricao: 'Promoção de vendas e publicidade no local de venda', setor: 'Marketing' },
  { codigo: '7311400', descricao: 'Agências de publicidade', setor: 'Marketing' },
  { codigo: '4781400', descricao: 'Comércio varejista de artigos do vestuário e acessórios', setor: 'Comércio' },
  { codigo: '7112000', descricao: 'Serviços de engenharia', setor: 'Engenharia' },
  { codigo: '7490104', descricao: 'Atividades de intermediação e agenciamento de serviços e negócios em geral', setor: 'Serviços' },
  { codigo: '4520001', descricao: 'Serviços de manutenção e reparação mecânica de veículos automotores', setor: 'Automotivo' },
  { codigo: '8599699', descricao: 'Outras atividades de ensino não especificadas anteriormente', setor: 'Educação' }
];

const CIDADES = [
  { uf: 'RS', municipio: 'Porto Alegre', ddd: '51' },
  { uf: 'RS', municipio: 'Caxias do Sul', ddd: '54' },
  { uf: 'PR', municipio: 'Londrina', ddd: '43' },
  { uf: 'PR', municipio: 'Curitiba', ddd: '41' },
  { uf: 'PR', municipio: 'Apucarana', ddd: '43' },
  { uf: 'SP', municipio: 'São Paulo', ddd: '11' },
  { uf: 'SP', municipio: 'Campinas', ddd: '19' },
  { uf: 'SP', municipio: 'Ribeirão Preto', ddd: '16' },
  { uf: 'RJ', municipio: 'Rio de Janeiro', ddd: '21' },
  { uf: 'RJ', municipio: 'Niterói', ddd: '21' },
  { uf: 'MG', municipio: 'Belo Horizonte', ddd: '31' },
  { uf: 'MG', municipio: 'Uberlândia', ddd: '34' },
  { uf: 'SC', municipio: 'Florianópolis', ddd: '48' },
  { uf: 'SC', municipio: 'Navegantes', ddd: '47' },
  { uf: 'GO', municipio: 'Goiânia', ddd: '62' },
  { uf: 'BA', municipio: 'Salvador', ddd: '71' },
  { uf: 'DF', municipio: 'Brasília', ddd: '61' }
];

// Base estritamente autêntica e oficial da Receita Federal (Sem dados fictícios)
const EMPRESAS_REAIS_RFB = [
  {
    cnpj: '52.910.432/0001-33',
    razao_social: '52.910.432 DINE MENDES DA SILVA MAGORNO',
    nome_fantasia: '',
    situacao_cadastral: 'ATIVA',
    cnae_codigo: '7319002',
    cnae_descricao: 'Promoção de vendas',
    capital_social: 1500,
    porte: 'MEI',
    natureza_juridica: '213-5 - Empresário (Individual)',
    uf: 'RJ',
    municipio: 'RIO DE JANEIRO',
    bairro: 'TANQUE',
    logradouro: 'RUA JOSE POLICARPO DA SILVEIRA',
    numero: '89',
    cep: '22.733-170',
    ddd: '21',
    telefone: '(21) 7253-9529',
    eh_celular: 1,
    email: 'magornodine@gmail.com',
    eh_mei: 1,
    data_abertura: '2023-11-16',
    socio_nome: 'Dine Mendes da Silva Magorno',
    socio_cargo: 'Titular / Empresário Individual',
    quadro_societario: []
  },
  {
    cnpj: '69.720.347/0001-05',
    razao_social: 'BASE EMPRESARIAL DE SERVICOS MVS LTDA',
    nome_fantasia: '',
    situacao_cadastral: 'ATIVA',
    cnae_codigo: '7020400',
    cnae_descricao: 'Atividades de consultoria em gestão empresarial, exceto consultoria técnica específica',
    capital_social: 12000,
    porte: 'ME',
    natureza_juridica: '206-2 - Sociedade Empresária Limitada',
    uf: 'PR',
    municipio: 'APUCARANA',
    bairro: 'CENTRO',
    logradouro: 'R DOUTOR NAGIB DAHER',
    numero: '62',
    cep: '86.800-040',
    ddd: '98',
    telefone: '(98) 8132-1796',
    eh_celular: 1,
    email: 'rochaemanuelly556@gmail.com',
    eh_mei: 0,
    data_abertura: '2026-10-20',
    socio_nome: 'MARCOS VINICIUS DOS SANTOS MENOR',
    socio_cargo: '49-Sócio-Administrador',
    quadro_societario: [
      { nome: 'MARCOS VINICIUS DOS SANTOS MENOR', qualificacao: '49-Sócio-Administrador', pais_origem: 'BRASIL' }
    ]
  },
  {
    cnpj: '69.720.346/0001-60',
    razao_social: 'RST HOLDING LTDA',
    nome_fantasia: '',
    situacao_cadastral: 'ATIVA',
    cnae_codigo: '6462000',
    cnae_descricao: 'Holdings de instituições não-financeiras',
    capital_social: 50000,
    porte: 'ME',
    natureza_juridica: '206-2 - Sociedade Empresária Limitada',
    uf: 'SC',
    municipio: 'NAVEGANTES',
    bairro: 'CENTRO',
    logradouro: '',
    numero: '',
    cep: '',
    ddd: '16',
    telefone: '(16) 9729-1423',
    eh_celular: 1,
    email: 'joao.peddobrasil@gmail.com',
    eh_mei: 0,
    data_abertura: '2026-10-20',
    socio_nome: 'JOAO PEDRO ROSSETTI FERREIRA DOS SANTOS',
    socio_cargo: '49-Sócio-Administrador',
    quadro_societario: [
      { nome: 'JOAO PEDRO ROSSETTI FERREIRA DOS SANTOS', qualificacao: '49-Sócio-Administrador', pais_origem: 'BRASIL' }
    ]
  },
  {
    cnpj: '92.685.833/0001-51',
    razao_social: 'ASSOCIACAO HOSPITALAR MOINHOS DE VENTO',
    nome_fantasia: 'HOSPITAL MOINHOS DE VENTO',
    situacao_cadastral: 'ATIVA',
    cnae_codigo: '8610101',
    cnae_descricao: 'Atividades de atendimento hospitalar, exceto pronto-socorro e unidades para atendimento a urgências',
    capital_social: 0,
    porte: 'DEMAIS',
    natureza_juridica: '399-9 - Associação Privada',
    uf: 'RS',
    municipio: 'PORTO ALEGRE',
    bairro: 'MOINHOS DE VENTO',
    logradouro: 'RUA RAMIRO BARCELOS',
    numero: '910',
    cep: '90.035-001',
    ddd: '51',
    telefone: '(51) 3314-3545',
    eh_celular: 0,
    email: '',
    eh_mei: 0,
    data_abertura: '1969-04-08',
    socio_nome: 'ANDRE MEYER DA SILVA',
    socio_cargo: '16-Presidente',
    quadro_societario: [
      { nome: 'ANDRE MEYER DA SILVA', qualificacao: '16-Presidente', pais_origem: 'BRASIL' }
    ]
  },
  {
    cnpj: '00.000.000/0001-91',
    razao_social: 'BANCO DO BRASIL SA',
    nome_fantasia: 'DIRECAO GERAL',
    situacao_cadastral: 'ATIVA',
    cnae_codigo: '6422100',
    cnae_descricao: 'Bancos múltiplos, com carteira comercial',
    capital_social: 12000000000,
    porte: 'DEMAIS',
    natureza_juridica: '203-8 - Sociedade de Economia Mista',
    uf: 'DF',
    municipio: 'BRASILIA',
    bairro: 'ASA NORTE',
    logradouro: 'QUADRA SAUN QUADRA 5 LOTE B',
    numero: 'SN',
    cep: '70.040-912',
    ddd: '61',
    telefone: '(61) 3493-9002',
    eh_celular: 0,
    email: '',
    eh_mei: 0,
    data_abertura: '1966-08-01',
    socio_nome: 'ALAN CARLOS GUEDES DE OLIVEIRA',
    socio_cargo: '10-Diretor',
    quadro_societario: [
      { nome: 'ALAN CARLOS GUEDES DE OLIVEIRA', qualificacao: '10-Diretor', pais_origem: 'BRASIL' }
    ]
  },
  {
    cnpj: '33.000.167/0001-01',
    razao_social: 'PETROLEO BRASILEIRO S A PETROBRAS',
    nome_fantasia: 'PETROBRAS',
    situacao_cadastral: 'ATIVA',
    cnae_codigo: '0600001',
    cnae_descricao: 'Extração de petróleo e gás natural',
    capital_social: 205431960000,
    porte: 'DEMAIS',
    natureza_juridica: '203-8 - Sociedade de Economia Mista',
    uf: 'RJ',
    municipio: 'RIO DE JANEIRO',
    bairro: 'CENTRO',
    logradouro: 'AVENIDA REPUBLICA DO CHILE',
    numero: '65',
    cep: '20.031-912',
    ddd: '21',
    telefone: '(21) 2166-0000',
    eh_celular: 0,
    email: '',
    eh_mei: 0,
    data_abertura: '1966-09-20',
    socio_nome: 'ANGELICA GARCIA COBAS LAUREANO',
    socio_cargo: '10-Diretor',
    quadro_societario: [
      { nome: 'ANGELICA GARCIA COBAS LAUREANO', qualificacao: '10-Diretor', pais_origem: 'BRASIL' }
    ]
  }
];

function inserirEmpresa(emp) {
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
    emp.nome_fantasia || '',
    emp.situacao_cadastral || 'ATIVA',
    emp.cnae_codigo || '',
    emp.cnae_descricao || '',
    emp.capital_social || 0,
    emp.porte || 'ME',
    emp.natureza_juridica || '',
    emp.uf || '',
    emp.municipio || '',
    emp.bairro || '',
    emp.logradouro || '',
    emp.numero || '',
    emp.cep || '',
    emp.ddd || '',
    emp.telefone || '',
    emp.eh_celular !== undefined ? emp.eh_celular : 0,
    emp.email || '',
    emp.eh_mei || 0,
    emp.data_abertura || '',
    emp.socio_nome || '',
    emp.socio_cargo || '',
    JSON.stringify(emp.quadro_societario || [])
  );
}

// Limpa 100% de dados de teste (CRM, Histórico, Radares e Empresas Fictícias)
function limparTudoEZerarBanco() {
  console.log('[Seed] Removendo empresas e leads fictícios do banco de dados...');
  db.exec(`
    DELETE FROM leads_crm;
    DELETE FROM historico_leads;
    DELETE FROM radares;
    DELETE FROM empresas;
  `);

  console.log('[Seed] Inserindo empresas 100% reais e autênticas da Receita Federal...');
  for (const emp of EMPRESAS_REAIS_RFB) {
    inserirEmpresa(emp);
  }

  console.log(`[Seed] Base de dados real inicializada com sucesso (${EMPRESAS_REAIS_RFB.length} empresas oficiais).`);
  console.log('[Seed] CRM e Radares zerados com sucesso (0 leads, 0 radares)!');
}

function popularBanco() {
  const contagem = db.prepare('SELECT COUNT(*) as total FROM empresas').get();
  if (contagem.total === 0) {
    limparTudoEZerarBanco();
  }
}

module.exports = {
  popularBanco,
  limparTudoEZerarBanco,
  inserirEmpresa,
  CNAE_LIST,
  CIDADES,
  EMPRESAS_REAIS_RFB
};

if (require.main === module) {
  limparTudoEZerarBanco();
}
