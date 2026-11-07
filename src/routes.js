const express = require('express');
const router = express.Router();

const cnpjService = require('./services/cnpjService');
const radarService = require('./services/radarService');
const crmService = require('./services/crmService');

// Feed e Estatísticas ao Vivo
router.get('/live', async (req, res) => {
  try {
    const stats = await cnpjService.getLiveStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pesquisa de Empresas
router.all('/pesquisa', async (req, res) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const resultado = await cnpjService.pesquisarEmpresas(params);
    res.json({ success: true, ...resultado });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ficha de uma Empresa por CNPJ (suporta dígitos puros ou formatado com barras/pontos)
router.use('/empresa', async (req, res) => {
  try {
    const rawCnpj = decodeURIComponent(req.path.replace(/^\//, ''));
    const cleanCnpj = rawCnpj.replace(/\D/g, '');
    if (!cleanCnpj || cleanCnpj.length < 8) {
      return res.status(400).json({ success: false, error: 'CNPJ inválido' });
    }
    const empresa = await cnpjService.obterEmpresaPorCnpj(cleanCnpj);
    if (!empresa) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada na Receita Federal' });
    }
    res.json({ success: true, empresa });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Busca Inteligente de CNAEs
router.get('/cnaes', (req, res) => {
  try {
    const lista = cnpjService.buscarCnaes(req.query.q);
    res.json({ success: true, cnaes: lista });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Radares
router.get('/radares', (req, res) => {
  try {
    const dados = radarService.listarRadares();
    res.json({ success: true, ...dados });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/radares', async (req, res) => {
  try {
    const radar = await radarService.criarRadar(req.body);
    res.status(201).json({ success: true, radar });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/radares/:id', (req, res) => {
  try {
    const radar = radarService.obterRadar(req.params.id);
    if (!radar) return res.status(404).json({ success: false, error: 'Radar não encontrado' });
    res.json({ success: true, radar });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/radares/:id', async (req, res) => {
  try {
    const radar = await radarService.atualizarRadar(req.params.id, req.body);
    res.json({ success: true, radar });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/radares/:id/status', (req, res) => {
  try {
    const radar = radarService.alternarStatusRadar(req.params.id, req.body.ativo);
    res.json({ success: true, radar });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/radares/:id/executar', async (req, res) => {
  try {
    const resultado = await radarService.executarRadar(req.params.id);
    res.json({ success: true, resultado });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/radares/:id', (req, res) => {
  try {
    const resultado = radarService.excluirRadar(req.params.id);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// WhatsApp Assistido
router.post('/whatsapp/preparar', (req, res) => {
  try {
    const { template, dados } = req.body;
    const resultado = radarService.formatarMensagemWhatsApp(template, dados);
    res.json({ success: true, ...resultado });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/whatsapp/disparado', (req, res) => {
  try {
    const { leadId, mensagem } = req.body;
    const resultado = radarService.registrarDisparo(leadId, mensagem);
    res.json({ success: true, resultado });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// CRM Leads e Kanban
router.get('/leads', (req, res) => {
  try {
    const resultado = crmService.listarLeads(req.query.coluna, req.query.q);
    res.json({ success: true, ...resultado });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/leads/:id', async (req, res) => {
  try {
    const detalhes = await crmService.obterDetalhesLead(req.params.id);
    if (!detalhes) return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    res.json({ success: true, ...detalhes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/leads/:id/coluna', (req, res) => {
  try {
    const lead = crmService.moverColunaLead(req.params.id, req.body.coluna);
    res.json({ success: true, ...lead });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/leads/importar', async (req, res) => {
  try {
    const resultado = await crmService.importarEmpresaParaCrm(req.body.cnpj, req.body.coluna || 'novos');
    res.json({ success: true, ...resultado });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/leads/:id/notas', (req, res) => {
  try {
    const resultado = crmService.salvarNotasLead(req.params.id, req.body.notas);
    res.json(resultado);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/leads/:id', (req, res) => {
  try {
    const resultado = crmService.excluirLead(req.params.id);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
