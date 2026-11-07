/**
 * ALIMENTADOR AUTOMÁTICO DO SUPABASE
 * Varre índices públicos e enriquece novos CNPJs na Receita Federal para os estados do Sul e nichos-alvo
 */

const { descobrirCnpjsPorCriterios } = require('../src/services/cnpjService');
const { supabase } = require('../src/services/supabaseClient');

const METAS = [
  // Odontologia no Sul
  { cnae: 'odontologia', uf: 'RS', municipio: 'Porto Alegre' },
  { cnae: 'odontologia', uf: 'RS', municipio: 'Caxias do Sul' },
  { cnae: 'odontologia', uf: 'SC', municipio: 'Florianópolis' },
  { cnae: 'odontologia', uf: 'SC', municipio: 'Joinville' },
  { cnae: 'odontologia', uf: 'PR', municipio: 'Curitiba' },
  { cnae: 'odontologia', uf: 'PR', municipio: 'Londrina' },
  
  // Clínicas Médicas e Saúde no Sul
  { cnae: 'clinica medica', uf: 'RS', municipio: 'Porto Alegre' },
  { cnae: 'clinica medica', uf: 'SC', municipio: 'Florianópolis' },
  { cnae: 'clinica medica', uf: 'PR', municipio: 'Curitiba' }
];

async function executarAlimentacao() {
  console.log('🚀 Iniciando alimentação estratégica do Supabase...');

  for (const meta of METAS) {
    try {
      console.log(`\n🔎 Varrendo nicho: "${meta.cnae}" em ${meta.municipio}/${meta.uf}...`);
      const encontradas = await descobrirCnpjsPorCriterios(meta);
      console.log(`✅ ${encontradas.length} empresas processadas para ${meta.cnae} em ${meta.uf}`);
    } catch (err) {
      console.warn(`Erro ao processar ${meta.cnae}/${meta.uf}:`, err.message);
    }
  }

  const { count } = await supabase.from('empresas').select('count', { count: 'exact', head: true });
  console.log(`\n🎉 Alimentação concluída! Total atual de empresas no Supabase: ${count}`);
}

if (require.main === module) {
  executarAlimentacao();
}

module.exports = { executarAlimentacao };
