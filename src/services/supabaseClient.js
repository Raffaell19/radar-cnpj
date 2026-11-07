/**
 * SERVIÇO SUPABASE - RADAR CNPJ
 * Integração com PostgreSQL na nuvem para armazenamento de centenas de milhares de empresas
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Carrega .env se existir localmente
const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    });
  } catch (e) {}
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://flkmbqgvgdtucmronsgr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function stripAccents(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Pesquisa empresas no Supabase com suporte a múltiplos estados, CNAE, tempo de abertura, capital e celular
 */
async function pesquisarEmpresasSupabase(filtros = {}) {
  if (!supabase) return null;
  try {
    let query = supabase.from('empresas').select('*', { count: 'exact' });

    // 1. Termo ou Razão Social / Sócio
    if (filtros.termo && filtros.termo.trim() !== '') {
      const rawDigits = filtros.termo.replace(/\D/g, '');
      if (rawDigits.length >= 8) {
        query = query.or(`cnpj.ilike.%${rawDigits}%,cnpj.ilike.%${filtros.termo}%`);
      } else {
        const t = filtros.termo.trim();
        const tSem = stripAccents(t);
        const orParts = [
          `razao_social.ilike.%${t}%`,
          `nome_fantasia.ilike.%${t}%`,
          `socio_nome.ilike.%${t}%`
        ];
        if (tSem !== t) {
          orParts.push(`razao_social.ilike.%${tSem}%`);
          orParts.push(`nome_fantasia.ilike.%${tSem}%`);
          orParts.push(`socio_nome.ilike.%${tSem}%`);
        }
        query = query.or(orParts.join(','));
      }
    }

    // 2. CNAE / Atividade (com suporte a buscas acentuadas e sem acento)
    if (filtros.cnae && filtros.cnae.trim() !== '') {
      const c = filtros.cnae.trim();
      const cSem = stripAccents(c);
      const orParts = [
        `cnae_codigo.ilike.%${c}%`,
        `cnae_descricao.ilike.%${c}%`,
        `razao_social.ilike.%${c}%`,
        `nome_fantasia.ilike.%${c}%`
      ];
      if (cSem !== c) {
        orParts.push(`cnae_descricao.ilike.%${cSem}%`);
        orParts.push(`razao_social.ilike.%${cSem}%`);
        orParts.push(`nome_fantasia.ilike.%${cSem}%`);
      }
      query = query.or(orParts.join(','));
    }

    // 3. Múltiplos Estados (UF)
    let ufsList = [];
    if (Array.isArray(filtros.ufs)) {
      ufsList = filtros.ufs.map(u => String(u).trim().toUpperCase()).filter(u => u && u !== 'TODOS');
    } else if (filtros.uf && filtros.uf !== 'todos' && filtros.uf.trim() !== '') {
      ufsList = filtros.uf.split(',').map(u => u.trim().toUpperCase()).filter(u => u && u !== 'TODOS');
    }

    if (ufsList.length > 0) {
      query = query.in('uf', ufsList);
    }

    // 4. Município
    if (filtros.municipio && filtros.municipio !== 'todos' && filtros.municipio.trim() !== '') {
      query = query.ilike('municipio', `%${filtros.municipio.trim()}%`);
    }

    // 5. Capital Social
    if (filtros.capital_minimo && Number(filtros.capital_minimo) > 0) {
      query = query.gte('capital_social', Number(filtros.capital_minimo));
    }
    if (filtros.capital_maximo && Number(filtros.capital_maximo) > 0) {
      query = query.lte('capital_social', Number(filtros.capital_maximo));
    }

    // 6. Porte
    if (filtros.porte && filtros.porte !== 'todos') {
      query = query.eq('porte', filtros.porte);
    }

    // 7. Filtros de Celular e MEI
    if (filtros.excluir_mei) {
      query = query.eq('eh_mei', 0);
    } else if (filtros.somente_mei) {
      query = query.eq('eh_mei', 1);
    }

    if (filtros.so_celulares) {
      query = query.eq('eh_celular', 1);
    }

    // 8. Tempo de Abertura (dias)
    if (filtros.dias_abertura && Number(filtros.dias_abertura) > 0) {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - Number(filtros.dias_abertura));
      const limiteStr = dataLimite.toISOString().split('T')[0];
      query = query.gte('data_abertura', limiteStr);
    }

    // 9. Anti-Repetição (Exclusão de CNPJs já prospectados / salvos)
    let cnpjsExcluir = [];
    if (Array.isArray(filtros.excluir_cnpjs)) {
      cnpjsExcluir = filtros.excluir_cnpjs.filter(Boolean);
    } else if (typeof filtros.excluir_cnpjs === 'string' && filtros.excluir_cnpjs.trim()) {
      cnpjsExcluir = filtros.excluir_cnpjs.split(',').map(c => c.trim()).filter(Boolean);
    }

    if (cnpjsExcluir.length > 0) {
      // Formata para o padrão de lista do PostgREST
      const safeList = cnpjsExcluir.slice(0, 200).map(c => `"${c}"`).join(',');
      query = query.not('cnpj', 'in', `(${safeList})`);
    }

    // Ordenação e Paginação / Limite solicitado
    const pagina = Math.max(1, parseInt(filtros.pagina, 10) || 1);
    const porPagina = Math.min(500, Math.max(1, parseInt(filtros.por_pagina || filtros.limite, 10) || 15));
    const de = (pagina - 1) * porPagina;
    const ate = de + porPagina - 1;

    query = query
      .order('data_abertura', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .range(de, ate);

    const { data, count, error } = await query;

    if (error) {
      console.warn('[Supabase] Erro na busca de empresas:', error.message);
      return null;
    }

    const total = count || (data ? data.length : 0);

    return {
      total,
      pagina,
      por_pagina: porPagina,
      total_paginas: Math.ceil(total / porPagina),
      empresas: data || []
    };
  } catch (err) {
    console.warn('[Supabase] Exceção na busca:', err.message);
    return null;
  }
}

/**
 * Insere ou atualiza empresas em lote no Supabase
 */
async function salvarEmpresasSupabase(empresas = []) {
  if (!supabase || !empresas || !empresas.length) return [];
  try {
    const { data, error } = await supabase
      .from('empresas')
      .upsert(empresas, { onConflict: 'cnpj' })
      .select();

    if (error) {
      console.warn('[Supabase] Erro ao salvar empresas:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('[Supabase] Exceção ao salvar:', err.message);
    return [];
  }
}

module.exports = {
  supabase,
  pesquisarEmpresasSupabase,
  salvarEmpresasSupabase
};
