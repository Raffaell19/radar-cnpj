const express = require('express');
const cors = require('cors');
const path = require('node:path');
const routes = require('./src/routes');
const { popularBanco } = require('./src/seed');
const { getLiveStats, calcDvCnpj, consultarCnpjFederal, salvarEmpresaNoBanco } = require('./src/services/cnpjService');
const { db } = require('./src/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos Estáticos do Frontend
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/api', routes);

// Fallback para SPA (compatível com Express 5)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Sincronização periódica do feed de novas aberturas da Receita Federal
async function sincronizarNovosCnpjsLive() {
  try {
    const stats = await getLiveStats();
    if (stats && stats.empresas && stats.empresas.length > 0) {
      for (const item of stats.empresas.slice(0, 3)) {
        const raw = (item.cnpj || '').replace(/\D/g, '');
        if (raw.length >= 8) {
          const cnpj14 = calcDvCnpj(raw.slice(0, 8) + '0001');
          const existe = db.prepare('SELECT id FROM empresas WHERE cnpj LIKE ?').get('%' + raw.slice(0, 8) + '%');
          if (!existe) {
            const enriched = await consultarCnpjFederal(cnpj14);
            if (enriched) {
              salvarEmpresaNoBanco(enriched);
              console.log(`[LiveSync] Nova empresa sincronizada da Receita: ${enriched.cnpj} - ${enriched.razao_social}`);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[LiveSync] Aviso na sincronização do feed:', err.message);
  }
}

// Inicialização
popularBanco();

if (require.main === module) {
  sincronizarNovosCnpjsLive();
  setInterval(sincronizarNovosCnpjsLive, 10 * 60 * 1000); // Executa a cada 10 minutos

  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Sistema Radar CNPJ (Clone TodoCNPJ)`);
    console.log(`📡 Servidor ativo em: http://localhost:${PORT}`);
    console.log(`🎯 Módulos: Radar de Empresas, CRM Kanban & Busca Avulsa`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;
