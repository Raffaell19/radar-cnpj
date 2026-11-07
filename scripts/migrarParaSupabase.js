/**
 * SCRIPT DE MIGRAÇÃO INICIAL PARA O SUPABASE
 * Envia as empresas locais existentes para o banco Supabase
 */

const { db } = require('../src/database');
const { salvarEmpresasSupabase, supabase } = require('../src/services/supabaseClient');

async function migrar() {
  console.log('--- Verificando conexão com o Supabase ---');
  const { data: testData, error: testError } = await supabase.from('empresas').select('count', { count: 'exact', head: true });

  if (testError) {
    console.error('❌ A tabela "empresas" ainda não foi criada no Supabase!');
    console.error('Detalhe:', testError.message);
    console.log('\nPor favor, execute o script SQL no SQL Editor do Supabase antes de rodar a migração.');
    process.exit(1);
  }

  console.log('✅ Tabela "empresas" conectada com sucesso no Supabase!');

  const rows = db.prepare('SELECT * FROM empresas').all();
  console.log(`Lendo ${rows.length} empresas do banco local...`);

  const formatadas = rows.map(r => ({
    cnpj: r.cnpj,
    razao_social: r.razao_social,
    nome_fantasia: r.nome_fantasia || '',
    situacao_cadastral: r.situacao_cadastral || 'ATIVA',
    cnae_codigo: r.cnae_codigo || '',
    cnae_descricao: r.cnae_descricao || '',
    capital_social: Number(r.capital_social) || 0,
    porte: r.porte || 'ME',
    natureza_juridica: r.natureza_juridica || '',
    uf: r.uf || '',
    municipio: r.municipio || '',
    bairro: r.bairro || '',
    logradouro: r.logradouro || '',
    numero: r.numero || '',
    cep: r.cep || '',
    ddd: r.ddd || '',
    telefone: r.telefone || '',
    eh_celular: r.eh_celular ? 1 : 0,
    email: r.email || '',
    eh_mei: r.eh_mei ? 1 : 0,
    data_abertura: r.data_abertura || null,
    socio_nome: r.socio_nome || '',
    socio_cargo: r.socio_cargo || '',
    quadro_societario: r.quadro_societario ? JSON.parse(r.quadro_societario) : []
  }));

  const salvas = await salvarEmpresasSupabase(formatadas);
  console.log(`🚀 ${salvas.length} empresas migradas com sucesso para o Supabase!`);
}

if (require.main === module) {
  migrar();
}

module.exports = { migrar };

