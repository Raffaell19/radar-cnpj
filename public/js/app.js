/**
 * SISTEMA RADAR CNPJ - APP CONTROLLER
 * Gerencia Navegação, Globo & Feed ao Vivo, Radares, Busca Avulsa, CRM Kanban e WhatsApp Assistido
 */

/**
 * LOCAL STORAGE ADAPTER
 * Persistência autônoma no navegador (Zero dependência de servidor ou banco externo)
 */
const LocalStore = {
  KEYS: {
    LEADS: 'radar_leads_v2',
    RADARES: 'radar_radares_v2',
    HISTORICO: 'radar_historico_v2',
    BUSCAS: 'radar_buscas_v1',
    NICHES: 'radar_custom_niches_v1'
  },

  getCustomNiches() {
    try {
      const raw = localStorage.getItem(this.KEYS.NICHES);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  saveCustomNiches(niches) {
    try {
      localStorage.setItem(this.KEYS.NICHES, JSON.stringify(niches));
    } catch (e) { }
  },

  addCustomNiche(niche) {
    const list = this.getCustomNiches();
    list.push(niche);
    this.saveCustomNiches(list);
  },

  deleteCustomNiche(id) {
    const list = this.getCustomNiches().filter(n => n.id !== id);
    this.saveCustomNiches(list);
  },

  getLeads() {
    try {
      const raw = localStorage.getItem(this.KEYS.LEADS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Erro ao ler leads do localStorage:', e);
      return [];
    }
  },

  saveLeads(leads) {
    try {
      localStorage.setItem(this.KEYS.LEADS, JSON.stringify(leads));
    } catch (e) {
      console.warn('Erro ao salvar leads no localStorage:', e);
    }
  },

  getRadares() {
    try {
      const raw = localStorage.getItem(this.KEYS.RADARES);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  saveRadares(radares) {
    try {
      localStorage.setItem(this.KEYS.RADARES, JSON.stringify(radares));
    } catch (e) {
      console.warn('Erro ao salvar radares no localStorage:', e);
    }
  },

  getHistorico(leadId) {
    try {
      const raw = localStorage.getItem(this.KEYS.HISTORICO);
      const all = raw ? JSON.parse(raw) : [];
      if (leadId) {
        return all.filter(h => String(h.lead_id) === String(leadId));
      }
      return all;
    } catch (e) {
      return [];
    }
  },

  addHistorico(leadId, evento, descricao) {
    try {
      const raw = localStorage.getItem(this.KEYS.HISTORICO);
      const all = raw ? JSON.parse(raw) : [];
      all.unshift({
        id: Date.now(),
        lead_id: Number(leadId),
        evento,
        descricao,
        data: new Date().toLocaleString('pt-BR')
      });
      localStorage.setItem(this.KEYS.HISTORICO, JSON.stringify(all.slice(0, 1000)));
    } catch (e) { }
  },

  getHistoricoBuscas() {
    try {
      const raw = localStorage.getItem(this.KEYS.BUSCAS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Erro ao ler histórico de buscas:', e);
      return [];
    }
  },

  saveHistoricoBuscas(buscas) {
    try {
      localStorage.setItem(this.KEYS.BUSCAS, JSON.stringify(buscas));
    } catch (e) {
      console.warn('Erro ao salvar histórico de buscas:', e);
    }
  },

  addBusca(item) {
    try {
      const buscas = this.getHistoricoBuscas();
      // Se já existir busca com o mesmo título salva nos últimos 20 segundos, atualiza
      const existingIndex = buscas.findIndex(b => b.id === item.id || (b.titulo === item.titulo && Math.abs(new Date(b.criado_iso || 0) - new Date(item.criado_iso || 0)) < 20000));
      if (existingIndex >= 0) {
        buscas[existingIndex] = item;
      } else {
        buscas.unshift(item);
      }
      this.saveHistoricoBuscas(buscas.slice(0, 50));
    } catch (e) {
      console.warn('Erro ao adicionar busca no histórico:', e);
    }
  },

  deleteBusca(id) {
    const buscas = this.getHistoricoBuscas().filter(b => String(b.id) !== String(id));
    this.saveHistoricoBuscas(buscas);
  },

  renameBusca(id, novoTitulo) {
    const buscas = this.getHistoricoBuscas();
    const b = buscas.find(item => String(item.id) === String(id));
    if (b) {
      b.titulo = novoTitulo;
      this.saveHistoricoBuscas(buscas);
    }
  },

  clearHistoricoBuscas() {
    this.saveHistoricoBuscas([]);
  }
};

/**
 * NICHOS ESTRATÉGICOS PREDEFINIDOS (12 NICHOS MAIS BUSCADOS)
 */
const DEFAULT_NICHES = [
  { id: 'odonto', nome: 'Odontologia', icone: '🦷', termo: 'Odontologia' },
  { id: 'estetica', nome: 'Estética & Beleza', icone: '✨', termo: 'Estética' },
  { id: 'clinicas', nome: 'Clínicas Médicas', icone: '🩺', termo: 'Clínica Médica' },
  { id: 'advocacia', nome: 'Advocacia', icone: '⚖️', termo: 'Advocacia' },
  { id: 'contabil', nome: 'Contabilidade', icone: '📊', termo: 'Contabilidade' },
  { id: 'tecnologia', nome: 'Tecnologia & TI', icone: '💻', termo: 'Tecnologia' },
  { id: 'restaurante', nome: 'Restaurantes', icone: '🍽️', termo: 'Restaurante' },
  { id: 'engenharia', nome: 'Engenharia & Obras', icone: '🏗️', termo: 'Engenharia' },
  { id: 'logistica', nome: 'Logística & Cargas', icone: '🚚', termo: 'Transporte de Cargas' },
  { id: 'varejo', nome: 'Comércio Varejista', icone: '🛍️', termo: 'Comércio Varejista' },
  { id: 'educacao', nome: 'Educação & Cursos', icone: '🎓', termo: 'Cursos' },
  { id: 'industria', nome: 'Indústria & Confecção', icone: '🏭', termo: 'Confecção' }
];

const SUPABASE_CONFIG = {
  url: 'https://flkmbqgvgdtucmronsgr.supabase.co',
  anonKey: 'sb_publishable__RELyvx9iFo3Nb4RNeqWMA_XMb3uOSl'
};

const App = {
  activeTab: 'home',
  liveData: null,
  liveIndex: 0,
  liveTimer: null,
  currentModalLead: null,
  currentSearchResults: [],
  currentUser: null,
  supabaseAuth: null,
  currentActiveNicheId: null,

  // Inicialização Geral
  async init() {
    this.initSupabaseAuth();
    this.setupNavigation();
    this.setupModals();
    this.setupSearch();
    this.renderNichesChips();
    this.setupRadarForm();
    this.updateHistoricoBadgeCount();
    await this.loadLiveStats();
    await this.loadRadars();
    await this.loadCrm();
    this.startLiveFeedLoop();
    await this.checkAuthSession();
  },

  // 0. Autenticação Multi-Usuário (Supabase Auth - Acesso Fechado)
  initSupabaseAuth() {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      try {
        this.supabaseAuth = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      } catch (e) {
        console.warn('Erro ao inicializar Supabase Auth client:', e);
      }
    }
  },

  async checkAuthSession() {
    if (!this.supabaseAuth) return;
    try {
      const { data: { session }, error } = await this.supabaseAuth.auth.getSession();
      if (session && session.user) {
        this.currentUser = session.user;
        this.updateAuthUI(session.user);
      } else {
        this.currentUser = null;
        this.showAuthModal();
      }
    } catch (e) {
      console.warn('Erro ao verificar sessão Supabase:', e);
    }
  },

  updateAuthUI(user) {
    const headerProfile = document.getElementById('userProfileHeader');
    const emailText = document.getElementById('userEmailText');
    if (headerProfile && emailText && user) {
      emailText.textContent = user.email || 'Operador';
      headerProfile.style.display = 'inline-flex';
    }
    this.hideAuthModal();
  },

  showAuthModal() {
    const modal = document.getElementById('authOverlayModal');
    if (modal) {
      modal.style.display = 'flex';
      const inputEmail = document.getElementById('authInputEmail');
      if (inputEmail) setTimeout(() => inputEmail.focus(), 150);
    }
  },

  hideAuthModal() {
    const modal = document.getElementById('authOverlayModal');
    if (modal) modal.style.display = 'none';
  },

  async handleAuthLogin(event) {
    if (event) event.preventDefault();
    if (!this.supabaseAuth) {
      this.showToast('Módulo de autenticação indisponível.');
      return;
    }

    const emailInput = document.getElementById('authInputEmail');
    const passInput = document.getElementById('authInputPassword');
    const errorAlert = document.getElementById('authAlertError');
    const errorMsg = document.getElementById('authAlertErrorMsg');
    const btnSubmit = document.getElementById('btnSubmitAuthLogin');

    if (errorAlert) errorAlert.style.display = 'none';
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = 'Validando credenciais...';
    }

    try {
      const { data, error } = await this.supabaseAuth.auth.signInWithPassword({
        email: emailInput ? emailInput.value.trim() : '',
        password: passInput ? passInput.value : ''
      });

      if (error) {
        if (errorAlert && errorMsg) {
          const msg = (error.message && (error.message.includes('Invalid') || error.message.includes('credentials')))
            ? 'E-mail ou senha incorretos. Acesso restrito a operadores cadastrados.'
            : (error.message || 'Falha ao autenticar.');
          errorMsg.textContent = msg;
          errorAlert.style.display = 'flex';
        }
        return;
      }

      if (data && data.user) {
        this.currentUser = data.user;
        this.updateAuthUI(data.user);
        this.showToast(`Login realizado com sucesso! Bem-vindo(a), ${data.user.email}`);
        if (passInput) passInput.value = '';
      }
    } catch (err) {
      if (errorAlert && errorMsg) {
        errorMsg.textContent = 'Erro de conexão com o serviço de autenticação.';
        errorAlert.style.display = 'flex';
      }
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
          Entrar no Sistema
        `;
      }
    }
  },

  async logoutUser() {
    if (this.supabaseAuth) {
      try {
        await this.supabaseAuth.auth.signOut();
      } catch (e) { }
    }
    this.currentUser = null;
    const headerProfile = document.getElementById('userProfileHeader');
    if (headerProfile) headerProfile.style.display = 'none';
    this.showAuthModal();
    this.showToast('Sessão encerrada com segurança.');
  },

  // Nichos Rápidos
  renderNichesChips() {
    const container = document.getElementById('nichesChipsGrid');
    if (!container) return;

    const customNiches = LocalStore.getCustomNiches();
    const allNiches = [...DEFAULT_NICHES, ...customNiches];

    container.innerHTML = allNiches.map(niche => {
      const isActive = this.currentActiveNicheId === niche.id;
      const isCustom = Boolean(niche.isCustom);
      const safeTerm = (niche.termo || niche.nome).replace(/'/g, "\\'");
      return `
        <button type="button" class="niche-chip-btn ${isActive ? 'active' : ''}" 
                onclick="App.selectQuickNiche('${safeTerm}', '${niche.id}')"
                title="Filtrar por ${niche.nome}">
          <span class="niche-chip-icon">${niche.icone || '🎯'}</span>
          <span>${niche.nome}</span>
          ${isCustom ? `
            <span class="niche-chip-remove" onclick="event.stopPropagation(); App.removeCustomNiche('${niche.id}')" title="Remover nicho personalizado">×</span>
          ` : ''}
        </button>
      `;
    }).join('');
  },

  selectQuickNiche(termo, nicheId) {
    this.currentActiveNicheId = nicheId;
    const inputCnae = document.getElementById('searchInputCnae');
    if (inputCnae) {
      inputCnae.value = termo;
    }
    this.renderNichesChips();
    this.runSearch();
  },

  promptAddCustomNiche() {
    const nome = prompt('Digite o nome do novo nicho a adicionar:\n(Ex: Academias, Imobiliárias, Pet Shops, Farmácias)');
    if (!nome || !nome.trim()) return;

    const termo = prompt(`Digite a palavra-chave de atividade para buscar na Receita Federal:\n(Padrão: "${nome.trim()}")`, nome.trim());
    if (!termo || !termo.trim()) return;

    const newNiche = {
      id: 'custom_' + Date.now(),
      nome: nome.trim(),
      icone: '🎯',
      termo: termo.trim(),
      isCustom: true
    };

    LocalStore.addCustomNiche(newNiche);
    this.renderNichesChips();
    this.selectQuickNiche(newNiche.termo, newNiche.id);
    this.showToast(`Nicho "${nome.trim()}" adicionado! Buscando empresas...`);
  },

  removeCustomNiche(id) {
    if (confirm('Deseja remover este nicho da sua lista?')) {
      LocalStore.deleteCustomNiche(id);
      if (this.currentActiveNicheId === id) {
        this.currentActiveNicheId = null;
      }
      this.renderNichesChips();
      this.showToast('Nicho removido.');
    }
  },

  handleLimiteChange(val) {
    const customInput = document.getElementById('searchCustomLimiteNum');
    const badge = document.getElementById('searchLimiteBadge');
    if (val === 'custom') {
      if (customInput) {
        customInput.style.display = 'inline-block';
        customInput.focus();
      }
      if (badge && customInput) badge.textContent = `${customInput.value || 100} empresas`;
    } else {
      if (customInput) customInput.style.display = 'none';
      if (badge) badge.textContent = `${val} empresas`;
    }
  },

  handleCustomLimiteInput(val) {
    const badge = document.getElementById('searchLimiteBadge');
    if (badge) badge.textContent = `${val || 1} empresas`;
  },

  // 1. Navegação por Abas
  setupNavigation() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        this.switchTab(target);
      });
    });

    // Links diretos da hero
    document.querySelectorAll('[data-goto]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab(el.dataset.goto);
      });
    });
  },

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `view-${tabId}`);
    });

    if (tabId === 'radar') this.loadRadars();
    if (tabId === 'crm') this.loadCrm();
    if (tabId === 'search') this.runSearch();
  },

  // 2. Feed ao Vivo e Estatísticas
  async loadLiveStats() {
    try {
      const res = await fetch('/api/live');
      const data = await res.json();
      this.liveData = data;

      const heroNum = document.getElementById('heroStatNum');
      if (heroNum && data.hoje) {
        heroNum.textContent = Number(data.hoje).toLocaleString('pt-BR');
      }

      const baseCount = document.getElementById('baseCountTotal');
      if (baseCount && data.base) {
        baseCount.textContent = Number(data.base).toLocaleString('pt-BR');
      }

      this.updateLiveFeedItem();
    } catch (err) {
      console.warn('Erro ao carregar /api/live:', err);
    }
  },

  updateLiveFeedItem() {
    if (!this.liveData || !this.liveData.empresas || !this.liveData.empresas.length) return;
    const emp = this.liveData.empresas[this.liveIndex % this.liveData.empresas.length];

    const titleEl = document.getElementById('feedCompanyTitle');
    const metaEl = document.getElementById('feedCompanyMeta');

    if (titleEl) titleEl.textContent = emp.nome || 'Empresa Registrada';
    if (metaEl) {
      metaEl.textContent = `CNPJ ${emp.cnpj || 'Recente'} · aberta hoje ${emp.uf ? 'em ' + emp.uf : 'no Brasil'}`;
    }

    if (window.triggerGlobePulse) {
      window.triggerGlobePulse();
    }

    this.liveIndex++;
  },

  startLiveFeedLoop() {
    if (this.liveTimer) clearInterval(this.liveTimer);
    this.liveTimer = setInterval(() => {
      this.updateLiveFeedItem();
    }, 3800);
  },

  // 3. Módulo Radar de Empresas (Conforme o Vídeo)
  loadRadars() {
    try {
      const radares = LocalStore.getRadares();
      const leads = LocalStore.getLeads();

      // Métricas do Topo calculadas em tempo real
      const responderam = leads.filter(l => l.coluna === 'negociacao' || l.coluna === 'fechado').length;
      const receberam = leads.filter(l => l.coluna === 'contatado').length;
      const esperandoEnvio = leads.filter(l => l.coluna === 'novos').length;
      const radaresLigados = radares.filter(r => r.ativo).length;

      document.getElementById('metricResponderam').textContent = responderam;
      document.getElementById('metricReceberam').textContent = receberam;
      document.getElementById('metricEsperando').textContent = esperandoEnvio;
      document.getElementById('metricRadaresLigados').textContent = `${radaresLigados} de ${radares.length}`;

      // Lista de Radares
      const container = document.getElementById('radarsListContainer');
      if (!container) return;

      if (!radares.length) {
        container.innerHTML = `
          <div class="empty-state" style="text-align:center; padding: 40px; color: var(--ink-3);">
            <p>Nenhum radar configurado ainda. Crie seu primeiro radar para monitorar novas aberturas!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = radares.map(radar => `
        <div class="radar-card" data-id="${radar.id}">
          <div class="radar-card-header">
            <div class="radar-info">
              <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="6"></circle>
                  <circle cx="12" cy="12" r="2"></circle>
                </svg>
                ${radar.nome}
              </h3>
              <div class="radar-chips">
                <span class="radar-chip">${radar.municipio_filtro && radar.municipio_filtro !== 'todos' ? radar.municipio_filtro + '/' + radar.uf_filtro : (radar.uf_filtro && radar.uf_filtro !== 'todos' ? radar.uf_filtro : 'Brasil inteiro')}</span>
                <span class="radar-chip">Capital ≥ R$ ${Number(radar.capital_minimo || 0).toLocaleString('pt-BR')}</span>
                <span class="radar-chip">${radar.dias_abertura || 30} dias</span>
                ${radar.so_celulares ? '<span class="radar-chip">Só Celulares</span>' : ''}
                ${radar.excluir_mei ? '<span class="radar-chip">Sem MEI</span>' : ''}
                <span class="radar-chip">Canal: ${(radar.canal || 'whatsapp').toUpperCase()}</span>
              </div>
            </div>
            <div class="radar-controls">
              <button class="btn btn-quiet btn-sm" onclick="App.openEditRadarModal(${radar.id})" title="Editar parâmetros deste radar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Editar
              </button>
              <button class="btn btn-quiet btn-sm" onclick="App.triggerRadarRun(${radar.id})" title="Executar varredura agora">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Varrer Agora
              </button>
              <label class="toggle-switch">
                <input type="checkbox" ${radar.ativo ? 'checked' : ''} onchange="App.toggleRadarStatus(${radar.id}, this.checked)">
                <span class="toggle-slider"></span>
              </label>
              <button class="btn btn-quiet btn-sm" style="color:var(--danger)" onclick="App.deleteRadar(${radar.id})" title="Excluir radar">
                &times;
              </button>
            </div>
          </div>
          <div class="radar-card-footer">
            <span>
              ${radar.ativo ? '● Monitorando em tempo real na base da Receita' : '○ Você pausou esta automação. Ligue o interruptor para retomar.'}
            </span>
            <span>
              <b>${radar.capturas_mes || 0}</b> de ${radar.teto_mensal || 200} empresas capturadas este mês
            </span>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Erro ao listar radares:', err);
    }
  },

  toggleRadarStatus(id, checked) {
    const radares = LocalStore.getRadares();
    const r = radares.find(rad => String(rad.id) === String(id));
    if (r) {
      r.ativo = checked;
      LocalStore.saveRadares(radares);
      this.showToast(`Radar ${checked ? 'ativado' : 'pausado'} com sucesso!`);
      this.loadRadars();
    }
  },

  async triggerRadarRun(id) {
    try {
      this.showToast('Executando varredura na base de dados da Receita Federal...');
      const radares = LocalStore.getRadares();
      const radar = radares.find(r => String(r.id) === String(id));
      if (!radar) return;

      const queryParams = new URLSearchParams();
      if (radar.cnae_filtro) queryParams.append('cnae', radar.cnae_filtro);
      if (radar.uf_filtro && radar.uf_filtro !== 'todos') queryParams.append('uf', radar.uf_filtro);
      if (radar.municipio_filtro && radar.municipio_filtro !== 'todos') queryParams.append('municipio', radar.municipio_filtro);
      if (radar.so_celulares) queryParams.append('apenasCelular', '1');
      if (radar.excluir_mei) queryParams.append('semMei', '1');
      if (radar.capital_minimo > 0) queryParams.append('capitalMin', radar.capital_minimo);

      const res = await fetch(`/api/pesquisa?${queryParams.toString()}`);
      const data = await res.json();
      const empresas = (data.success && data.empresas) ? data.empresas : [];

      let novosLeads = 0;
      if (empresas.length > 0 && radar.criar_lead_crm) {
        const leads = LocalStore.getLeads();
        const existingCnpjs = new Set(leads.map(l => (l.cnpj || '').replace(/\D/g, '')));

        for (const emp of empresas) {
          const clean = (emp.cnpj || '').replace(/\D/g, '');
          if (!existingCnpjs.has(clean)) {
            const leadId = Date.now() + Math.floor(Math.random() * 1000);
            leads.unshift({
              id: leadId,
              cnpj: emp.cnpj,
              razao_social: emp.razao_social,
              nome_fantasia: emp.nome_fantasia || '',
              municipio: emp.municipio || '',
              uf: emp.uf || '',
              telefone: emp.telefone || '',
              email: emp.email || '',
              cnae_descricao: emp.cnae_descricao || '',
              capital_social: Number(emp.capital_social) || 0,
              contato_nome: emp.socio_nome || 'Responsável',
              coluna: 'novos',
              origem: 'radar',
              radar_id: radar.id,
              data_abertura: emp.data_abertura || '',
              importado_em: new Date().toISOString(),
              notas: ''
            });
            LocalStore.addHistorico(leadId, 'captura_radar', `Capturado automaticamente pelo radar "${radar.nome}"`);
            existingCnpjs.add(clean);
            novosLeads++;
            if (novosLeads >= (radar.teto_diario || 20)) break;
          }
        }

        radar.capturas_mes = (radar.capturas_mes || 0) + novosLeads;
        LocalStore.saveLeads(leads);
        LocalStore.saveRadares(radares);
      }

      this.showToast(`Varredura concluída! ${novosLeads} novos leads enviados ao CRM.`);
      this.loadRadars();
      this.loadCrm();
    } catch (err) {
      console.error('Erro na varredura:', err);
      this.showToast('Erro ao executar varredura.');
    }
  },

  deleteRadar(id) {
    if (!confirm('Tem certeza que deseja excluir este radar?')) return;
    let radares = LocalStore.getRadares();
    radares = radares.filter(r => String(r.id) !== String(id));
    LocalStore.saveRadares(radares);
    this.showToast('Radar excluído com sucesso.');
    this.loadRadars();
  },

  // Modal Novo / Editar Radar
  openCreateRadarModal() {
    const form = document.getElementById('formNovoRadar');
    if (form) form.reset();

    const inputId = document.getElementById('inputRadarId');
    if (inputId) inputId.value = '';

    const titulo = document.getElementById('modalRadarTitulo');
    if (titulo) titulo.textContent = 'Novo radar';

    const btnTexto = document.getElementById('btnSubmitRadarTexto');
    if (btnTexto) btnTexto.textContent = 'Salvar e Iniciar Radar';

    // Reset preset de dias
    const preset = document.getElementById('selectDiasAberturaPreset');
    if (preset) preset.value = '30';
    const containerCustom = document.getElementById('customDiasContainer');
    if (containerCustom) containerCustom.style.display = 'none';
    const finalInput = document.getElementById('inputDiasAberturaFinal');
    if (finalInput) finalInput.value = '30';

    // Canal default
    document.querySelectorAll('.channel-card').forEach(c => c.classList.remove('selected'));
    const firstChannel = document.querySelector('.channel-card');
    if (firstChannel) {
      firstChannel.classList.add('selected');
      const radio = firstChannel.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    }

    this.openModal('modalNovoRadar');
  },

  openEditRadarModal(id) {
    try {
      const radares = LocalStore.getRadares();
      const radar = radares.find(r => String(r.id) === String(id));
      if (!radar) {
        this.showToast('Radar não encontrado.');
        return;
      }

      const form = document.getElementById('formNovoRadar');
      if (!form) return;

      form.reset();

      // Atribui ID do radar em edição
      const inputId = document.getElementById('inputRadarId');
      if (inputId) inputId.value = radar.id;

      // Altera títulos
      const titulo = document.getElementById('modalRadarTitulo');
      if (titulo) titulo.textContent = `Editar radar: ${radar.nome}`;

      const btnTexto = document.getElementById('btnSubmitRadarTexto');
      if (btnTexto) btnTexto.textContent = 'Salvar Alterações';

      // Preenche os campos textuais e seletores
      const setVal = (name, val) => {
        const el = form.querySelector(`[name="${name}"]`);
        if (el) el.value = val !== undefined && val !== null ? val : '';
      };

      setVal('nome', radar.nome);
      setVal('cnae_filtro', radar.cnae_filtro || '');
      setVal('capital_minimo', radar.capital_minimo !== undefined ? radar.capital_minimo : 0);
      setVal('porte_filtro', radar.porte_filtro || 'todos');
      setVal('uf_filtro', radar.uf_filtro || 'todos');
      setVal('municipio_filtro', radar.municipio_filtro === 'todos' ? '' : (radar.municipio_filtro || ''));
      setVal('mensagem_template', radar.mensagem_template || '');
      setVal('teto_diario', radar.teto_diario !== undefined ? radar.teto_diario : 10);
      setVal('teto_mensal', radar.teto_mensal !== undefined ? radar.teto_mensal : 100);

      // Checkboxes
      const setCheck = (name, checked) => {
        const el = form.querySelector(`[name="${name}"]`);
        if (el) el.checked = Boolean(checked);
      };
      setCheck('so_celulares', radar.so_celulares === 1);
      setCheck('excluir_mei', radar.excluir_mei === 1);
      setCheck('criar_lead_crm', radar.criar_lead_crm === 1);
      setCheck('ativo', radar.ativo === 1);

      // Canal
      document.querySelectorAll('.channel-card').forEach(c => {
        const r = c.querySelector('input[type="radio"]');
        if (r && r.value === radar.canal) {
          c.classList.add('selected');
          r.checked = true;
        } else {
          c.classList.remove('selected');
        }
      });

      // Configuração de dias de abertura (Preset vs Customizado)
      const preset = document.getElementById('selectDiasAberturaPreset');
      const containerCustom = document.getElementById('customDiasContainer');
      const finalInput = document.getElementById('inputDiasAberturaFinal');
      const valInput = document.getElementById('inputCustomDiasValor');
      const unidadeSelect = document.getElementById('selectCustomDiasUnidade');
      const badge = document.getElementById('customDiasCalculoBadge');

      const padroes = ['7', '15', '30', '60', '90', '120', '180', '365'];
      const diasNum = Number(radar.dias_abertura) || 30;

      if (padroes.includes(String(diasNum))) {
        if (preset) preset.value = String(diasNum);
        if (containerCustom) containerCustom.style.display = 'none';
        if (finalInput) finalInput.value = diasNum;
      } else {
        if (preset) preset.value = 'custom';
        if (containerCustom) containerCustom.style.display = 'block';

        if (diasNum % 365 === 0) {
          if (valInput) valInput.value = diasNum / 365;
          if (unidadeSelect) unidadeSelect.value = 'anos';
        } else if (diasNum % 30 === 0) {
          if (valInput) valInput.value = diasNum / 30;
          if (unidadeSelect) unidadeSelect.value = 'meses';
        } else {
          if (valInput) valInput.value = diasNum;
          if (unidadeSelect) unidadeSelect.value = 'dias';
        }

        if (finalInput) finalInput.value = diasNum;
        if (badge) badge.textContent = `= ${diasNum} dias`;
      }

      this.openModal('modalNovoRadar');
    } catch (err) {
      console.error('Erro ao abrir edição do radar:', err);
      this.showToast('Erro ao abrir edição do radar.');
    }
  },

  onDiasPresetChange(val) {
    const container = document.getElementById('customDiasContainer');
    const finalInput = document.getElementById('inputDiasAberturaFinal');
    const valInput = document.getElementById('inputCustomDiasValor');

    if (val === 'custom') {
      if (container) container.style.display = 'block';
      if (valInput && !valInput.value) {
        valInput.value = '90';
      }
      this.onCustomDiasInput();
    } else {
      if (container) container.style.display = 'none';
      if (finalInput) finalInput.value = val;
    }
  },

  onCustomDiasInput() {
    const valInput = document.getElementById('inputCustomDiasValor');
    const unidadeSelect = document.getElementById('selectCustomDiasUnidade');
    const finalInput = document.getElementById('inputDiasAberturaFinal');
    const badge = document.getElementById('customDiasCalculoBadge');

    const num = Math.max(1, parseInt(valInput?.value, 10) || 1);
    const unidade = unidadeSelect?.value || 'dias';

    let mult = 1;
    if (unidade === 'meses') mult = 30;
    else if (unidade === 'anos') mult = 365;

    const totalDias = num * mult;
    if (finalInput) finalInput.value = totalDias;
    if (badge) badge.textContent = `= ${totalDias} dias`;
  },

  setupRadarForm() {
    const form = document.getElementById('formNovoRadar');
    if (!form) return;

    // Toggle de opções avançadas
    const accordionBtn = document.getElementById('accordionToggleBtn');
    const accordionContent = document.getElementById('accordionContent');
    if (accordionBtn && accordionContent) {
      accordionBtn.addEventListener('click', () => {
        accordionContent.classList.toggle('open');
      });
    }

    // Seleção de canais (WhatsApp / E-mail / Ambos)
    document.querySelectorAll('.channel-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.channel-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const radarId = document.getElementById('inputRadarId')?.value;
      const finalDias = Number(document.getElementById('inputDiasAberturaFinal')?.value || formData.get('dias_abertura') || 30);

      const payload = {
        nome: formData.get('nome') || 'Empresas Recém-Abertas',
        canal: formData.get('canal') || 'whatsapp',
        cnae_filtro: formData.get('cnae_filtro') || '',
        capital_minimo: formData.get('capital_minimo') !== null ? Number(formData.get('capital_minimo')) : 0,
        porte_filtro: formData.get('porte_filtro') || 'todos',
        uf_filtro: formData.get('uf_filtro') || 'todos',
        municipio_filtro: formData.get('municipio_filtro') || '',
        dias_abertura: finalDias,
        mensagem_template: formData.get('mensagem_template') || '',
        teto_diario: formData.get('teto_diario') ? Number(formData.get('teto_diario')) : 20,
        teto_mensal: formData.get('teto_mensal') ? Number(formData.get('teto_mensal')) : 200,
        so_celulares: formData.get('so_celulares') === 'on',
        excluir_mei: formData.get('excluir_mei') === 'on',
        criar_lead_crm: formData.get('criar_lead_crm') === 'on',
        ativo: formData.get('ativo') === 'on'
      };

      try {
        let radares = LocalStore.getRadares();
        let targetId = radarId;

        if (targetId) {
          const idx = radares.findIndex(r => String(r.id) === String(targetId));
          if (idx !== -1) {
            radares[idx] = { ...radares[idx], ...payload, id: Number(targetId) };
          }
        } else {
          targetId = Date.now();
          const newRadar = {
            ...payload,
            id: targetId,
            capturas_mes: 0,
            disparos_hoje: 0,
            criado_em: new Date().toISOString()
          };
          radares.push(newRadar);
        }

        LocalStore.saveRadares(radares);

        // Opcional: sincronização secundária se o servidor estiver disponível
        fetch(radarId ? `/api/radares/${radarId}` : '/api/radares', {
          method: radarId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => { });

        this.closeModal('modalNovoRadar');
        this.showToast(radarId ? 'Radar atualizado com sucesso!' : 'Radar configurado com sucesso!');
        form.reset();
        if (document.getElementById('inputRadarId')) document.getElementById('inputRadarId').value = '';
        this.loadRadars();
        this.loadCrm();

        if (payload.ativo) {
          this.triggerRadarRun(targetId);
        }
      } catch (err) {
        console.error('Erro ao salvar radar:', err);
        this.showToast('Erro ao salvar radar.');
      }
    });
  },

  // 4. Módulo Busca Avulsa de Empresas
  selectedSearchUfs: new Set(),

  setupSearch() {
    const btnSearch = document.getElementById('btnSubmitSearch');
    const formSearch = document.getElementById('formSearchFilters');
    if (formSearch) {
      formSearch.addEventListener('submit', (e) => {
        e.preventDefault();
        this.runSearch();
      });
    }
    if (btnSearch) {
      btnSearch.addEventListener('click', () => this.runSearch());
    }

    // Inicialização do Multi-Select de Estados (UF)
    this.setupUfMultiSelect();

    // Inicialização do Filtro de Tempo de Abertura
    this.setupSearchTimeFilter();
  },

  setupUfMultiSelect() {
    const estados = [
      { sigla: 'RS', nome: 'Rio Grande do Sul' },
      { sigla: 'SC', nome: 'Santa Catarina' },
      { sigla: 'PR', nome: 'Paraná' },
      { sigla: 'SP', nome: 'São Paulo' },
      { sigla: 'RJ', nome: 'Rio de Janeiro' },
      { sigla: 'MG', nome: 'Minas Gerais' },
      { sigla: 'ES', nome: 'Espírito Santo' },
      { sigla: 'BA', nome: 'Bahia' },
      { sigla: 'GO', nome: 'Goiás' },
      { sigla: 'DF', nome: 'Distrito Federal' },
      { sigla: 'MT', nome: 'Mato Grosso' },
      { sigla: 'MS', nome: 'Mato Grosso do Sul' },
      { sigla: 'PE', nome: 'Pernambuco' },
      { sigla: 'CE', nome: 'Ceará' },
      { sigla: 'MA', nome: 'Maranhão' },
      { sigla: 'PB', nome: 'Paraíba' },
      { sigla: 'RN', nome: 'Rio Grande do Norte' },
      { sigla: 'AL', nome: 'Alagoas' },
      { sigla: 'PI', nome: 'Piauí' },
      { sigla: 'SE', nome: 'Sergipe' },
      { sigla: 'PA', nome: 'Pará' },
      { sigla: 'AM', nome: 'Amazonas' },
      { sigla: 'RO', nome: 'Rondônia' },
      { sigla: 'TO', nome: 'Tocantins' },
      { sigla: 'AC', nome: 'Acre' },
      { sigla: 'AP', nome: 'Amapá' },
      { sigla: 'RR', nome: 'Roraima' }
    ];

    const listContainer = document.getElementById('searchUfListContainer');
    const trigger = document.getElementById('searchUfTrigger');
    const dropdown = document.getElementById('searchUfDropdown');
    const filterInput = document.getElementById('searchUfFilterInput');
    const btnClear = document.getElementById('btnSearchUfClear');

    if (!listContainer || !trigger || !dropdown) return;

    // Renderiza lista de estados
    const renderList = (filtro = '') => {
      const termo = filtro.trim().toLowerCase();
      const filtrados = estados.filter(e => e.sigla.toLowerCase().includes(termo) || e.nome.toLowerCase().includes(termo));

      listContainer.innerHTML = filtrados.map(e => `
        <label class="uf-option-item">
          <input type="checkbox" value="${e.sigla}" ${this.selectedSearchUfs.has(e.sigla) ? 'checked' : ''} onchange="App.toggleSearchUf('${e.sigla}', this.checked)">
          <span><b>${e.sigla}</b> - ${e.nome}</span>
        </label>
      `).join('');
    };

    renderList();

    // Toggle Dropdown
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === 'flex';
      dropdown.style.display = isOpen ? 'none' : 'flex';
      trigger.classList.toggle('active', !isOpen);
      if (!isOpen && filterInput) {
        setTimeout(() => filterInput.focus(), 50);
      }
    });

    // Filtro de texto dentro do dropdown
    if (filterInput) {
      filterInput.addEventListener('input', (e) => {
        renderList(e.target.value);
      });
      filterInput.addEventListener('click', (e) => e.stopPropagation());
    }

    // Botão Limpar
    if (btnClear) {
      btnClear.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedSearchUfs.clear();
        this.renderUfBadges();
        renderList(filterInput?.value || '');
      });
    }

    // Botões de Regiões Rápidas (Sul, Sudeste, etc.)
    document.querySelectorAll('.btn-region-quick').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ufs = (btn.dataset.ufs || '').split(',').map(u => u.trim());
        const allPresent = ufs.every(u => this.selectedSearchUfs.has(u));
        ufs.forEach(u => {
          if (allPresent) this.selectedSearchUfs.delete(u);
          else this.selectedSearchUfs.add(u);
        });
        this.renderUfBadges();
        renderList(filterInput?.value || '');
      });
    });

    // Fecha ao clicar fora
    document.addEventListener('click', (e) => {
      if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
        trigger.classList.remove('active');
      }
    });
  },

  toggleSearchUf(sigla, isChecked) {
    if (isChecked) {
      this.selectedSearchUfs.add(sigla);
    } else {
      this.selectedSearchUfs.delete(sigla);
    }
    this.renderUfBadges();
  },

  removeSearchUf(sigla, event) {
    if (event) event.stopPropagation();
    this.selectedSearchUfs.delete(sigla);
    this.renderUfBadges();
    const cb = document.querySelector(`#searchUfListContainer input[value="${sigla}"]`);
    if (cb) cb.checked = false;
  },

  renderUfBadges() {
    const container = document.getElementById('searchUfBadgesContainer');
    const counter = document.getElementById('searchUfBadgeCount');
    const hiddenInput = document.getElementById('searchSelectUf');
    if (!container || !counter || !hiddenInput) return;

    if (this.selectedSearchUfs.size === 0) {
      container.innerHTML = `<span id="searchUfPlaceholder" style="color:var(--ink-3);">Todos os Estados</span>`;
      counter.textContent = 'Todos';
      hiddenInput.value = 'todos';
      return;
    }

    const arr = Array.from(this.selectedSearchUfs);
    hiddenInput.value = arr.join(',');
    counter.textContent = `${arr.length} selecionado(s)`;

    if (arr.length <= 4) {
      container.innerHTML = arr.map(sigla => `
        <span class="uf-chip-badge">
          ${sigla}
          <span class="chip-remove" onclick="App.removeSearchUf('${sigla}', event)">&times;</span>
        </span>
      `).join('');
    } else {
      container.innerHTML = `
        <span class="uf-chip-badge" style="background:var(--accent); color:#fff;">
          ${arr.length} estados (${arr.slice(0, 3).join(', ')}...)
        </span>
      `;
    }
  },

  setupSearchTimeFilter() {
    const preset = document.getElementById('searchSelectDiasPreset');
    const customBox = document.getElementById('searchCustomDiasBox');
    const finalInput = document.getElementById('searchDiasAberturaFinal');
    const numInput = document.getElementById('searchCustomDiasNum');
    const unitSelect = document.getElementById('searchCustomDiasUnit');
    const badge = document.getElementById('searchCustomDiasBadge');

    if (!preset || !customBox || !finalInput) return;

    const calcCustom = () => {
      const num = Math.max(1, parseInt(numInput?.value, 10) || 1);
      const unit = unitSelect?.value || 'meses';
      let mult = 1;
      if (unit === 'meses') mult = 30;
      else if (unit === 'anos') mult = 365;

      const totalDias = num * mult;
      if (finalInput) finalInput.value = totalDias;
      if (badge) badge.textContent = `= ${totalDias} dias`;
    };

    preset.addEventListener('change', () => {
      const val = preset.value;
      if (val === 'custom') {
        customBox.style.display = 'block';
        calcCustom();
      } else {
        customBox.style.display = 'none';
        finalInput.value = val;
      }
    });

    if (numInput) numInput.addEventListener('input', calcCustom);
    if (unitSelect) unitSelect.addEventListener('change', calcCustom);
  },

  async runSearch(page = 1) {
    const termo = document.getElementById('searchInputTermo')?.value || '';
    const uf = document.getElementById('searchSelectUf')?.value || 'todos';
    const diasAbertura = document.getElementById('searchDiasAberturaFinal')?.value || 'todos';
    const cnae = document.getElementById('searchInputCnae')?.value || '';
    const cidade = document.getElementById('searchInputCidade')?.value || '';
    const capitalMin = document.getElementById('searchCapitalMin')?.value || '';
    const soCelular = document.getElementById('searchCheckCelular')?.checked ? 1 : 0;
    const semMei = document.getElementById('searchCheckSemMei')?.checked ? 1 : 0;

    // 1. Limite configurável de leads
    let limite = 100;
    const selectLimite = document.getElementById('searchSelectLimite')?.value || '100';
    if (selectLimite === 'custom') {
      limite = parseInt(document.getElementById('searchCustomLimiteNum')?.value, 10) || 100;
    } else {
      limite = parseInt(selectLimite, 10) || 100;
    }
    if (limite > 500) limite = 500;
    if (limite < 1) limite = 15;

    // 2. Anti-repetição (ocultar leads já pesquisados ou no CRM)
    const ocultarRepetidos = document.getElementById('searchCheckOcultarRepetidos')?.checked;
    const cnpjsExcluir = [];
    if (ocultarRepetidos) {
      // Leads do CRM
      const leadsCrm = LocalStore.getLeads();
      leadsCrm.forEach(l => {
        if (l.cnpj) cnpjsExcluir.push(String(l.cnpj).replace(/\D/g, ''));
      });
      // Leads em pastas anteriores salvas
      const buscas = LocalStore.getHistoricoBuscas();
      buscas.forEach(b => {
        if (Array.isArray(b.empresas)) {
          b.empresas.forEach(e => {
            if (e.cnpj) cnpjsExcluir.push(String(e.cnpj).replace(/\D/g, ''));
          });
        }
      });
    }

    const queryParams = new URLSearchParams({
      termo,
      uf,
      municipio: cidade,
      cnae,
      capital_minimo: capitalMin,
      so_celulares: soCelular,
      excluir_mei: semMei,
      pagina: page,
      por_pagina: limite
    });

    if (diasAbertura && diasAbertura !== 'todos') {
      queryParams.append('dias_abertura', diasAbertura);
    }

    if (cnpjsExcluir.length > 0) {
      const unicos = [...new Set(cnpjsExcluir)];
      queryParams.append('excluir_cnpjs', unicos.slice(0, 150).join(','));
    }

    const tbody = document.getElementById('searchResultsTbody');
    const countEl = document.getElementById('searchResultsCount');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px;">Carregando até ${limite} empresas...</td></tr>`;

    try {
      const res = await fetch(`/api/pesquisa?${queryParams.toString()}`);
      const data = await res.json();
      if (!data.success) return;

      this.currentSearchResults = data.empresas || [];
      const btnExport = document.getElementById('btnExportSearchCsv');
      if (btnExport) {
        btnExport.style.display = (data.empresas && data.empresas.length > 0) ? 'inline-flex' : 'none';
      }

      if (countEl) countEl.textContent = `${data.total.toLocaleString('pt-BR')} empresas encontradas (exibindo ${data.empresas.length})`;

      if (!data.empresas.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--ink-3);">Nenhuma empresa encontrada com estes critérios.</td></tr>`;
        return;
      }

      this.renderSearchResultsTable(data.empresas);

      // Salva automaticamente a pesquisa como pasta no histórico
      const partes = [];
      if (cnae) partes.push(cnae);
      if (termo) partes.push(`"${termo}"`);
      if (uf && uf !== 'todos') partes.push(uf.replace(/,/g, ', '));
      if (cidade) partes.push(cidade);
      if (diasAbertura && diasAbertura !== 'todos') partes.push(`Últimos ${diasAbertura} dias`);
      partes.push(`Limite: ${limite}`);
      const tituloAuto = partes.length > 0 ? partes.join(' · ') : 'Pesquisa Geral de Empresas';

      const registroBusca = {
        id: Date.now(),
        titulo: tituloAuto,
        filtros: { termo, uf, diasAbertura, cnae, cidade, capitalMin, soCelular, semMei, limite },
        total: data.total || data.empresas.length,
        empresas: data.empresas,
        criado_em: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        criado_iso: new Date().toISOString()
      };

      LocalStore.addBusca(registroBusca);
      this.updateHistoricoBadgeCount();
      if (document.getElementById('panelHistoricoBuscas')?.style.display !== 'none') {
        this.renderHistoricoBuscas();
      }
    } catch (err) {
      console.error('Erro na pesquisa:', err);
    }
  },

  formatarDataEAbertura(dataAberturaRaw) {
    if (!dataAberturaRaw) {
      return { dataFormatada: '—', tempoRelativo: 'Não informada' };
    }

    let ano, mes, dia;
    const str = String(dataAberturaRaw).trim();
    if (str.includes('-')) {
      const parts = str.split('T')[0].split('-');
      ano = parseInt(parts[0], 10);
      mes = parseInt(parts[1], 10) - 1;
      dia = parseInt(parts[2], 10);
    } else if (str.includes('/')) {
      const parts = str.split('/');
      dia = parseInt(parts[0], 10);
      mes = parseInt(parts[1], 10) - 1;
      ano = parseInt(parts[2], 10);
    }

    if (!ano || isNaN(ano)) {
      return { dataFormatada: str, tempoRelativo: '' };
    }

    const dataAbertura = new Date(ano, mes, dia);
    const dataHoje = new Date();
    dataHoje.setHours(0, 0, 0, 0);

    const diffMs = dataHoje - dataAbertura;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const pad = n => String(n).padStart(2, '0');
    const dataFormatada = `${pad(dia)}/${pad(mes + 1)}/${ano}`;

    let tempoRelativo = '';
    if (diffDias <= 0) {
      tempoRelativo = 'Aberta hoje';
    } else if (diffDias === 1) {
      tempoRelativo = 'Aberta ontem';
    } else if (diffDias < 30) {
      tempoRelativo = `Aberta há ${diffDias} dias`;
    } else if (diffDias < 365) {
      const meses = Math.floor(diffDias / 30);
      tempoRelativo = meses <= 1 ? 'Aberta há 1 mês' : `Aberta há ${meses} meses`;
    } else {
      const anos = Math.floor(diffDias / 365);
      tempoRelativo = anos <= 1 ? 'Aberta há 1 ano' : `Aberta há ${anos} anos`;
    }

    return { dataFormatada, tempoRelativo };
  },

  renderSearchResultsTable(empresas) {
    const tbody = document.getElementById('searchResultsTbody');
    if (!tbody) return;
    if (!empresas || !empresas.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--ink-3);">Nenhuma empresa encontrada.</td></tr>`;
      return;
    }

    // Set de CNPJs já cadastrados no CRM para destacar status
    const crmLeads = LocalStore.getLeads();
    const crmCnpjs = new Set(crmLeads.map(l => String(l.cnpj || '').replace(/\D/g, '')));

    tbody.innerHTML = empresas.map(emp => {
      const ab = this.formatarDataEAbertura(emp.data_abertura);
      const cleanCnpj = String(emp.cnpj || '').replace(/\D/g, '');
      const jaNoCrm = crmCnpjs.has(cleanCnpj);
      const badgeStatus = jaNoCrm
        ? '<span class="badge-lead-crm">💼 No CRM</span>'
        : '<span class="badge-lead-inedito">✨ Inédita</span>';

      return `
      <tr>
        <td>
          <b style="color:#fff; display:block;">${emp.razao_social}</b>
          <div style="display:flex; align-items:center; gap:6px; margin-top:3px; flex-wrap:wrap;">
            <span style="font-size:11px; color:var(--ink-3); font-family:var(--mono);">${emp.cnpj}</span>
            ${badgeStatus}
          </div>
        </td>
        <td>
          <span style="color:var(--sky); font-size:12px;">${emp.municipio || '—'}/${emp.uf || '—'}</span>
          <small style="display:block; color:var(--ink-3); font-size:11px;">${emp.bairro || 'Bairro não informado'}</small>
        </td>
        <td>
          <span style="font-size:12px; color:var(--ink-2); display:block; max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${emp.cnae_descricao || 'Atividade não informada'}
          </span>
          <small style="color:var(--ink-3); font-family:var(--mono); font-size:10px;">CNAE ${emp.cnae_codigo || '—'}</small>
        </td>
        <td style="white-space: nowrap;">
          <span style="color:#fff; font-weight:550; font-size:12px; font-variant-numeric:tabular-nums; display:flex; align-items:center; gap:5px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--sky); flex-shrink:0;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            ${ab.dataFormatada}
          </span>
          <small style="color:#25d07e; font-size:11px; font-weight:600; display:block; margin-top:2px;">${ab.tempoRelativo}</small>
        </td>
        <td>
          <span style="color:var(--ink-1); font-weight:550; font-variant-numeric:tabular-nums;">
            R$ ${Number(emp.capital_social || 0).toLocaleString('pt-BR')}
          </span>
          <small style="display:block; color:var(--ink-3); font-size:10px;">${emp.porte || 'ME'}</small>
        </td>
        <td class="col-telefone" style="white-space: nowrap !important; min-width: 150px;">
          <span class="badge-tag ${emp.eh_celular ? 'badge-phone' : ''}" style="white-space: nowrap !important; display: inline-flex; align-items: center;">
            ${emp.telefone || 'Telefone não informado'}
          </span>
        </td>
        <td style="text-align:right;">
          <div style="display:inline-flex; gap:6px;">
            <button class="btn btn-quiet btn-sm" onclick="App.openCompanyDetails('${emp.cnpj}')" title="Abrir Raio-X completo e investigação online (Google Maps, Redes Sociais, Sócios)">
              Detalhes
            </button>
            <button class="btn btn-quiet btn-sm" onclick="App.openCompanyModal('${emp.cnpj}')" title="Ver ficha cadastral da Receita Federal">
              Ficha
            </button>
            <button class="btn btn-solid btn-sm" onclick="App.importToCrm('${emp.cnpj}')" title="Adicionar ao CRM">
              + CRM
            </button>
            <button class="btn btn-whatsapp btn-sm" onclick="App.openWaModalFromCompany('${emp.cnpj}')" title="Disparo WhatsApp">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
          </div>
        </td>
      </tr>
      `;
    }).join('');
  },

  // ==================== MÓDULO DE PASTAS & HISTÓRICO DE BUSCAS ====================
  toggleHistoricoPanel() {
    const panel = document.getElementById('panelHistoricoBuscas');
    if (!panel) return;
    const isHidden = panel.style.display === 'none' || !panel.style.display;
    panel.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      this.renderHistoricoBuscas();
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  updateHistoricoBadgeCount() {
    const buscas = LocalStore.getHistoricoBuscas();
    const count = buscas.length;
    const badge = document.getElementById('badgeHistoricoCount');
    if (badge) badge.textContent = count;
    const tag = document.getElementById('historicoTotalSalvasTag');
    if (tag) tag.textContent = `${count} ${count === 1 ? 'pasta salva' : 'pastas salvas'}`;
  },

  filtrarCardsHistorico(texto) {
    this.renderHistoricoBuscas(texto);
  },

  renderHistoricoBuscas(filtroTexto = '') {
    const container = document.getElementById('historicoBuscasList');
    if (!container) return;

    let buscas = LocalStore.getHistoricoBuscas();
    this.updateHistoricoBadgeCount();

    if (filtroTexto && filtroTexto.trim()) {
      const q = filtroTexto.toLowerCase().trim();
      buscas = buscas.filter(b => {
        const tit = (b.titulo || '').toLowerCase();
        const uf = (b.filtros?.uf || '').toLowerCase();
        const cnae = (b.filtros?.cnae || '').toLowerCase();
        const termo = (b.filtros?.termo || '').toLowerCase();
        const data = (b.criado_em || '').toLowerCase();
        return tit.includes(q) || uf.includes(q) || cnae.includes(q) || termo.includes(q) || data.includes(q);
      });
    }

    if (!buscas.length) {
      container.innerHTML = `
        <div class="folder-empty-state">
          <div style="font-size: 32px; margin-bottom: 8px;">📁</div>
          <p style="font-weight: 600; color: #fff; margin-bottom: 4px;">Nenhuma pasta de pesquisa ${filtroTexto ? 'encontrada para o filtro' : 'salva ainda'}.</p>
          <p style="font-size: 12px; color: var(--ink-3); max-width: 460px; margin: 0 auto;">
            ${filtroTexto ? 'Tente buscar com outro termo.' : 'Todas as pesquisas que você fizer serão guardadas aqui automaticamente como pastas organizadas com todos os leads gravados, prontas para recarga instantânea ou exportação.'}
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = buscas.map(b => {
      const f = b.filtros || {};
      const totalLeads = b.empresas ? b.empresas.length : 0;
      const totalBase = b.total || totalLeads;

      const badges = [];
      if (f.uf && f.uf !== 'todos') {
        badges.push(`<span class="folder-badge-item">📍 <strong>${f.uf}</strong></span>`);
      } else {
        badges.push(`<span class="folder-badge-item">📍 <strong>Brasil</strong></span>`);
      }

      if (f.cnae) {
        badges.push(`<span class="folder-badge-item">💼 <strong>${f.cnae}</strong></span>`);
      }
      if (f.termo) {
        badges.push(`<span class="folder-badge-item">🔎 <strong>"${f.termo}"</strong></span>`);
      }
      if (f.diasAbertura && f.diasAbertura !== 'todos') {
        badges.push(`<span class="folder-badge-item">⏱️ <strong>${f.diasAbertura} dias</strong></span>`);
      }
      if (f.soCelular == 1) {
        badges.push(`<span class="folder-badge-item" style="color:#25d07e;">📱 <strong>Celular</strong></span>`);
      }

      return `
        <div class="search-folder-card" id="folderCard_${b.id}">
          <div class="folder-top-row">
            <div class="folder-name-wrap" title="Clique para renomear" onclick="App.promptRenameBusca('${b.id}')">
              <span class="folder-icon">📁</span>
              <h4 class="folder-title">${b.titulo}</h4>
              <span style="font-size:11px; opacity:0.6; cursor:pointer;" title="Renomear pasta">✏️</span>
            </div>
            <span class="folder-date">${b.criado_em}</span>
          </div>

          <div class="folder-badges-row">
            ${badges.join('')}
          </div>

          <div class="folder-leads-info">
            <span class="folder-leads-count">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              ${totalLeads} leads salvos
            </span>
            <span class="folder-base-total">de ${Number(totalBase).toLocaleString('pt-BR')} na base</span>
          </div>

          <div class="folder-actions-row">
            <button type="button" class="btn btn-solid btn-sm" onclick="App.carregarBuscaSalva('${b.id}')" title="Carregar estes ${totalLeads} leads diretamente na tabela de busca">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              Ver Leads (${totalLeads})
            </button>
            <button type="button" class="btn btn-quiet btn-sm" onclick="App.exportarBuscaSalvaCsv('${b.id}')" title="Exportar planilha CSV/Excel desta pasta">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              CSV
            </button>
            <button type="button" class="btn btn-quiet btn-sm btn-delete" onclick="App.excluirBuscaSalva('${b.id}')" title="Excluir esta pasta do histórico">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  carregarBuscaSalva(id) {
    const buscas = LocalStore.getHistoricoBuscas();
    const busca = buscas.find(b => String(b.id) === String(id));
    if (!busca) {
      this.showToast('Pasta de pesquisa não encontrada.');
      return;
    }

    const empresas = busca.empresas || [];
    this.currentSearchResults = empresas;

    // Atualiza tabela de resultados
    this.renderSearchResultsTable(empresas);

    // Atualiza cabeçalho da tabela
    const countEl = document.getElementById('searchResultsCount');
    if (countEl) {
      countEl.innerHTML = `<span style="color:var(--sky); font-weight:600;">📁 Pasta Ativa:</span> "${busca.titulo}" — <strong>${empresas.length}</strong> leads gravados (${(busca.total || empresas.length).toLocaleString('pt-BR')} na base)`;
    }

    // Exibe botão de exportar
    const btnExport = document.getElementById('btnExportSearchCsv');
    if (btnExport) {
      btnExport.style.display = empresas.length > 0 ? 'inline-flex' : 'none';
    }

    // Restaura visualmente os filtros no formulário
    const f = busca.filtros || {};
    if (document.getElementById('searchInputTermo')) document.getElementById('searchInputTermo').value = f.termo || '';
    if (document.getElementById('searchInputCnae')) document.getElementById('searchInputCnae').value = f.cnae || '';
    if (document.getElementById('searchInputCidade')) document.getElementById('searchInputCidade').value = f.cidade || '';
    if (document.getElementById('searchCapitalMin')) document.getElementById('searchCapitalMin').value = f.capitalMin || '';
    if (document.getElementById('searchCheckCelular')) document.getElementById('searchCheckCelular').checked = f.soCelular == 1;
    if (document.getElementById('searchCheckSemMei')) document.getElementById('searchCheckSemMei').checked = f.semMei == 1;

    // Restaura UFs selecionadas
    const ufStr = f.uf || 'todos';
    this.selectedSearchUfs.clear();
    if (ufStr && ufStr !== 'todos') {
      ufStr.split(',').forEach(sigla => {
        if (sigla.trim()) this.selectedSearchUfs.add(sigla.trim().toUpperCase());
      });
    }
    const hiddenUf = document.getElementById('searchSelectUf');
    if (hiddenUf) hiddenUf.value = this.selectedSearchUfs.size > 0 ? Array.from(this.selectedSearchUfs).join(',') : 'todos';
    this.renderUfBadges();
    document.querySelectorAll('.uf-item-row input[type="checkbox"]').forEach(chk => {
      chk.checked = this.selectedSearchUfs.has(chk.value);
    });

    // Restaura tempo de abertura
    const dias = f.diasAbertura || 'todos';
    const presetSelect = document.getElementById('searchSelectDiasPreset');
    const finalInput = document.getElementById('searchDiasAberturaFinal');
    const customBox = document.getElementById('searchCustomDiasBox');
    if (finalInput) finalInput.value = dias;
    if (presetSelect) {
      const match = Array.from(presetSelect.options).find(opt => opt.value === String(dias));
      if (match) {
        presetSelect.value = String(dias);
        if (customBox) customBox.style.display = 'none';
      } else if (dias !== 'todos') {
        presetSelect.value = 'custom';
        if (customBox) {
          customBox.style.display = 'block';
          const numInput = document.getElementById('searchCustomDiasNum');
          const unitSelect = document.getElementById('searchCustomDiasUnit');
          const badge = document.getElementById('searchCustomDiasBadge');
          if (numInput) numInput.value = dias;
          if (unitSelect) unitSelect.value = 'dias';
          if (badge) badge.textContent = `= ${dias} dias`;
        }
      } else {
        presetSelect.value = 'todos';
        if (customBox) customBox.style.display = 'none';
      }
    }

    // Feedback visual
    this.showToast(`Pasta "${busca.titulo}" carregada com ${empresas.length} leads!`);

    // Rolagem suave até a tabela
    countEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  exportarBuscaSalvaCsv(id) {
    const buscas = LocalStore.getHistoricoBuscas();
    const busca = buscas.find(b => String(b.id) === String(id));
    if (!busca || !busca.empresas || !busca.empresas.length) {
      this.showToast('Nenhum lead nesta pasta para exportar.');
      return;
    }

    const empresas = busca.empresas;
    const headers = [
      'CNPJ',
      'Razao Social',
      'Nome Fantasia',
      'Situacao',
      'Telefone',
      'Contato/Socio',
      'Municipio',
      'UF',
      'CNAE Codigo',
      'CNAE Descricao',
      'Capital Social',
      'Data Abertura',
      'Tempo de Abertura'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = empresas.map(e => [
      escapeCsv(e.cnpj),
      escapeCsv(e.razao_social),
      escapeCsv(e.nome_fantasia || ''),
      escapeCsv(e.situacao_cadastral || 'ATIVA'),
      escapeCsv(e.telefone || ''),
      escapeCsv(e.socio_nome || ''),
      escapeCsv(e.municipio || ''),
      escapeCsv(e.uf || ''),
      escapeCsv(e.cnae_codigo || ''),
      escapeCsv(e.cnae_descricao || ''),
      escapeCsv(e.capital_social || 0),
      escapeCsv(e.data_abertura || ''),
      escapeCsv(this.formatarDataEAbertura(e.data_abertura).tempoRelativo)
    ].join(';'));

    const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = (busca.titulo || 'leads').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 30);
    const dataHoje = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `pasta_${safeTitle}_${dataHoje}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast(`Exportação da pasta concluída! (${empresas.length} leads baixados)`);
  },

  excluirBuscaSalva(id) {
    if (!confirm('Deseja realmente excluir esta pasta do histórico?')) return;
    LocalStore.deleteBusca(id);
    this.renderHistoricoBuscas();
    this.updateHistoricoBadgeCount();
    this.showToast('Pasta excluída do histórico.');
  },

  promptRenameBusca(id) {
    const buscas = LocalStore.getHistoricoBuscas();
    const busca = buscas.find(b => String(b.id) === String(id));
    if (!busca) return;
    const novoNome = prompt('Digite o novo nome para esta pasta:', busca.titulo);
    if (novoNome && novoNome.trim() && novoNome.trim() !== busca.titulo) {
      LocalStore.renameBusca(id, novoNome.trim());
      this.renderHistoricoBuscas();
      this.showToast('Pasta renomeada com sucesso!');
    }
  },

  salvarBuscaAtualComoPasta() {
    if (!this.currentSearchResults || !this.currentSearchResults.length) {
      this.showToast('Faça uma pesquisa com resultados antes de salvar em pasta.');
      return;
    }

    const nomeSugerido = document.getElementById('searchInputCnae')?.value || document.getElementById('searchInputTermo')?.value || 'Minha Pasta de Leads';
    const nome = prompt('Digite o nome para esta nova pasta de leads:', nomeSugerido);
    if (!nome || !nome.trim()) return;

    const termo = document.getElementById('searchInputTermo')?.value || '';
    const uf = document.getElementById('searchSelectUf')?.value || 'todos';
    const diasAbertura = document.getElementById('searchDiasAberturaFinal')?.value || 'todos';
    const cnae = document.getElementById('searchInputCnae')?.value || '';
    const cidade = document.getElementById('searchInputCidade')?.value || '';
    const capitalMin = document.getElementById('searchCapitalMin')?.value || '';
    const soCelular = document.getElementById('searchCheckCelular')?.checked ? 1 : 0;
    const semMei = document.getElementById('searchCheckSemMei')?.checked ? 1 : 0;

    const novaBusca = {
      id: Date.now(),
      titulo: nome.trim(),
      filtros: { termo, uf, diasAbertura, cnae, cidade, capitalMin, soCelular, semMei },
      total: this.currentSearchResults.length,
      empresas: this.currentSearchResults,
      criado_em: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      criado_iso: new Date().toISOString()
    };

    LocalStore.addBusca(novaBusca);
    this.updateHistoricoBadgeCount();
    const panel = document.getElementById('panelHistoricoBuscas');
    if (panel) panel.style.display = 'block';
    this.renderHistoricoBuscas();
    this.showToast(`Pasta "${nome.trim()}" salva com sucesso com ${this.currentSearchResults.length} leads!`);
  },

  limparHistoricoBuscas() {
    const buscas = LocalStore.getHistoricoBuscas();
    if (!buscas.length) {
      this.showToast('O histórico de pastas já está vazio.');
      return;
    }
    if (!confirm(`Deseja realmente excluir todas as ${buscas.length} pastas salvas do seu histórico?`)) return;
    LocalStore.clearHistoricoBuscas();
    this.updateHistoricoBadgeCount();
    this.renderHistoricoBuscas();
    this.showToast('Histórico de pesquisas limpo.');
  },

  async importToCrm(cnpj) {
    try {
      const cleanCnpj = String(cnpj || '').replace(/\D/g, '');
      const leads = LocalStore.getLeads();
      const existe = leads.find(l => (l.cnpj || '').replace(/\D/g, '') === cleanCnpj);
      if (existe) {
        this.showToast('Esta empresa já está no seu CRM!');
        return;
      }

      // Procura primeiro nos resultados em memória
      let emp = (this.currentSearchResults || []).find(e => (e.cnpj || '').replace(/\D/g, '') === cleanCnpj);

      // Se não estiver em memória, busca na API federal
      if (!emp) {
        const res = await fetch(`/api/empresa/${cleanCnpj}`);
        const data = await res.json();
        if (data.success && data.empresa) {
          emp = data.empresa;
        }
      }

      if (!emp) {
        this.showToast('Erro ao obter dados cadastrais da empresa.');
        return;
      }

      const leadId = Date.now();
      const novoLead = {
        id: leadId,
        cnpj: emp.cnpj,
        razao_social: emp.razao_social,
        nome_fantasia: emp.nome_fantasia || '',
        municipio: emp.municipio || '',
        uf: emp.uf || '',
        telefone: emp.telefone || '',
        email: emp.email || '',
        cnae_descricao: emp.cnae_descricao || '',
        capital_social: Number(emp.capital_social) || 0,
        contato_nome: emp.socio_nome || 'Responsável',
        coluna: 'novos',
        origem: 'busca',
        data_abertura: emp.data_abertura || '',
        importado_em: new Date().toISOString(),
        notas: ''
      };

      leads.unshift(novoLead);
      LocalStore.saveLeads(leads);
      LocalStore.addHistorico(leadId, 'lead_criado', 'Empresa adicionada aos Novos Leads');

      this.showToast('Empresa importada com sucesso para o CRM!');
      this.loadCrm();
      this.loadRadars();
    } catch (err) {
      console.error('Erro ao importar para CRM:', err);
      this.showToast('Erro ao importar para o CRM.');
    }
  },

  // 5. Módulo CRM Kanban (Base Local do Navegador)
  loadCrm() {
    try {
      const leads = LocalStore.getLeads();
      const columns = ['novos', 'contatado', 'negociacao', 'fechado', 'perdido'];

      const kanban = {
        novos: [],
        contatado: [],
        negociacao: [],
        fechado: [],
        perdido: []
      };

      leads.forEach(l => {
        const col = (l.coluna && kanban[l.coluna]) ? l.coluna : 'novos';
        kanban[col].push(l);
      });

      columns.forEach(col => {
        const bodyEl = document.getElementById(`kanbanColBody-${col}`);
        const countBadge = document.getElementById(`kanbanCount-${col}`);
        const colLeads = kanban[col] || [];

        if (countBadge) countBadge.textContent = colLeads.length;
        if (!bodyEl) return;

        if (!colLeads.length) {
          bodyEl.innerHTML = `<div style="text-align:center; padding:30px 10px; color:var(--hair); font-size:12px;">Nenhum lead nesta etapa</div>`;
          return;
        }

        bodyEl.innerHTML = colLeads.map(l => `
          <div class="lead-card" draggable="true" ondragstart="App.onLeadDragStart(event, ${l.id})">
            <div class="lead-title">${l.razao_social}</div>
            <div class="lead-cnpj">CNPJ ${l.cnpj}</div>
            <div class="lead-contact">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>${l.contato_nome || 'Responsável'}</span>
            </div>
            <div class="lead-contact">
              <span style="color:var(--sky); font-size:11px;">${l.municipio || 'Brasil'}/${l.uf || ''}</span>
            </div>
            <div class="lead-footer">
              <button class="btn btn-quiet btn-sm" onclick="App.openLeadDetails(${l.id})">Detalhes</button>
              <button class="btn btn-whatsapp btn-sm" onclick="App.openWaModalFromLead(${l.id})">
                WhatsApp
              </button>
            </div>
          </div>
        `).join('');
      });

      this.setupKanbanDropZones();
    } catch (err) {
      console.error('Erro ao carregar CRM:', err);
    }
  },

  exportLeadsToCsv() {
    const leads = LocalStore.getLeads();
    if (!leads.length) {
      this.showToast('Nenhum lead no funil para exportar.');
      return;
    }

    const headers = [
      'CNPJ',
      'Razao Social',
      'Nome Fantasia',
      'Etapa CRM',
      'Telefone',
      'Contato',
      'Municipio',
      'UF',
      'CNAE Descricao',
      'Capital Social',
      'Data Abertura',
      'Anotacoes',
      'Data Importacao'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = leads.map(l => [
      escapeCsv(l.cnpj),
      escapeCsv(l.razao_social),
      escapeCsv(l.nome_fantasia || ''),
      escapeCsv(l.coluna),
      escapeCsv(l.telefone || ''),
      escapeCsv(l.contato_nome || ''),
      escapeCsv(l.municipio || ''),
      escapeCsv(l.uf || ''),
      escapeCsv(l.cnae_descricao || ''),
      escapeCsv(l.capital_social || 0),
      escapeCsv(l.data_abertura || ''),
      escapeCsv(l.notas || ''),
      escapeCsv(l.importado_em || '')
    ].join(';'));

    const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dataHoje = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `leads_crm_${dataHoje}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast(`Exportação concluída! (${leads.length} leads salvos na planilha)`);
  },

  exportSearchResultsToCsv() {
    const empresas = this.currentSearchResults || [];
    if (!empresas.length) {
      this.showToast('Nenhum resultado para exportar.');
      return;
    }

    const headers = [
      'CNPJ',
      'Razao Social',
      'Nome Fantasia',
      'Situacao',
      'Telefone',
      'Contato/Socio',
      'Municipio',
      'UF',
      'CNAE Codigo',
      'CNAE Descricao',
      'Capital Social',
      'Data Abertura',
      'Tempo de Abertura'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = empresas.map(e => [
      escapeCsv(e.cnpj),
      escapeCsv(e.razao_social),
      escapeCsv(e.nome_fantasia || ''),
      escapeCsv(e.situacao_cadastral || 'ATIVA'),
      escapeCsv(e.telefone || ''),
      escapeCsv(e.socio_nome || ''),
      escapeCsv(e.municipio || ''),
      escapeCsv(e.uf || ''),
      escapeCsv(e.cnae_codigo || ''),
      escapeCsv(e.cnae_descricao || ''),
      escapeCsv(e.capital_social || 0),
      escapeCsv(e.data_abertura || ''),
      escapeCsv(this.formatarDataEAbertura(e.data_abertura).tempoRelativo)
    ].join(';'));

    const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dataHoje = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `empresas_busca_${dataHoje}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast(`Exportação concluída! (${empresas.length} empresas na planilha)`);
  },

  clearAllLeads() {
    const leads = LocalStore.getLeads();
    if (!leads.length) {
      this.showToast('O funil de leads já está vazio!');
      return;
    }
    if (!confirm(`Deseja realmente limpar todos os ${leads.length} leads do seu CRM?`)) return;

    LocalStore.saveLeads([]);
    this.showToast('Funil de leads limpo com sucesso.');
    this.loadCrm();
    this.loadRadars();
  },

  onLeadDragStart(e, leadId) {
    e.dataTransfer.setData('text/plain', leadId);
    e.target.classList.add('dragging');
  },

  setupKanbanDropZones() {
    const bodies = document.querySelectorAll('.kanban-col-body');
    bodies.forEach(body => {
      body.addEventListener('dragover', (e) => {
        e.preventDefault();
        body.style.background = 'rgba(47, 114, 245, 0.08)';
      });
      body.addEventListener('dragleave', () => {
        body.style.background = 'transparent';
      });
      body.addEventListener('drop', (e) => {
        e.preventDefault();
        body.style.background = 'transparent';
        const leadId = e.dataTransfer.getData('text/plain');
        const novaColuna = body.dataset.coluna;

        if (leadId && novaColuna) {
          const leads = LocalStore.getLeads();
          const lead = leads.find(l => String(l.id) === String(leadId));
          if (lead && lead.coluna !== novaColuna) {
            const antiga = lead.coluna;
            lead.coluna = novaColuna;
            LocalStore.saveLeads(leads);
            LocalStore.addHistorico(lead.id, 'mudanca_etapa', `Etapa alterada de "${antiga}" para "${novaColuna}"`);
            App.loadCrm();
            App.loadRadars();
          }
        }
      });
    });
  },

  // 6. WhatsApp Assistido via Link Direto wa.me
  openWaModalFromLead(leadId) {
    try {
      const leads = LocalStore.getLeads();
      const lead = leads.find(l => String(l.id) === String(leadId));
      if (!lead) return;
      this.currentModalLead = lead;
      this.renderWaModal(lead);
    } catch (err) {
      this.showToast('Erro ao preparar disparo de WhatsApp.');
    }
  },

  async openWaModalFromCompany(cnpj) {
    try {
      const cleanCnpj = String(cnpj || '').replace(/\D/g, '');
      const res = await fetch(`/api/empresa/${cleanCnpj}`);
      const data = await res.json();
      if (!data.success) return;

      const emp = data.empresa;
      this.currentModalLead = {
        cnpj: emp.cnpj,
        razao_social: emp.razao_social,
        municipio: emp.municipio,
        telefone: emp.telefone,
        contato_nome: emp.socio_nome,
        cnae_descricao: emp.cnae_descricao
      };
      this.renderWaModal(this.currentModalLead);
    } catch (err) {
      this.showToast('Erro ao preparar WhatsApp.');
    }
  },

  async renderWaModal(dados) {
    const template = document.getElementById('templateMensagemCustom')?.value ||
      'Olá {primeiro_nome_contato}, vi que a {empresa} abriu recentemente em {municipio}! Como vocês estão cuidando da estruturação e divulgação comercial neste início?';

    const res = await fetch('/api/whatsapp/preparar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template, dados })
    });
    const info = await res.json();
    if (!info.success) return;

    document.getElementById('waTargetCompany').textContent = dados.razao_social;
    document.getElementById('waTargetContact').textContent = `${info.primeiroNome} (${dados.telefone || 'Sem número'})`;
    document.getElementById('waBubbleMessage').textContent = info.mensagemFormatada;

    const btnSend = document.getElementById('btnDispararWaMe');
    if (btnSend) {
      btnSend.onclick = async () => {
        if (!info.urlWaMe) {
          alert('Esta empresa não possui número de celular cadastrado.');
          return;
        }

        // Abre wa.me em nova aba
        window.open(info.urlWaMe, '_blank');

        // Se for um lead do CRM, registra no histórico e avança para 'Em Contato'
        if (dados.id) {
          const leads = LocalStore.getLeads();
          const lead = leads.find(l => String(l.id) === String(dados.id));
          if (lead) {
            lead.coluna = 'contatado';
            lead.ultimo_contato_em = new Date().toISOString();
            LocalStore.saveLeads(leads);
            LocalStore.addHistorico(lead.id, 'whatsapp_disparado', `Mensagem enviada via WhatsApp para ${dados.telefone || ''}`);
            App.loadCrm();
            App.loadRadars();
          }
        }

        App.closeModal('modalWhatsapp');
        App.showToast('Link do WhatsApp aberto! Lead atualizado no CRM.');
      };
    }

    this.openModal('modalWhatsapp');
  },

  // 7. Ficha Completa do CNPJ
  async openCompanyModal(cnpj) {
    try {
      const cleanCnpj = String(cnpj || '').replace(/\D/g, '');
      if (!cleanCnpj) {
        this.showToast('CNPJ inválido.');
        return;
      }
      this.showToast('Carregando ficha da Receita Federal...');
      const res = await fetch(`/api/empresa/${cleanCnpj}`);
      const data = await res.json();
      if (!data.success || !data.empresa) {
        this.showToast('Ficha não encontrada na Receita Federal.');
        return;
      }
      const emp = data.empresa;

      document.getElementById('fichaRazao').textContent = emp.razao_social;
      document.getElementById('fichaFantasia').textContent = emp.nome_fantasia || '(Sem nome fantasia declarado)';
      document.getElementById('fichaCnpj').textContent = emp.cnpj;
      document.getElementById('fichaSituacao').textContent = emp.situacao_cadastral || 'ATIVA';
      document.getElementById('fichaAbertura').textContent = emp.data_abertura ? new Date(emp.data_abertura).toLocaleDateString('pt-BR') : 'Informação não encontrada';
      document.getElementById('fichaCapital').textContent = `R$ ${Number(emp.capital_social || 0).toLocaleString('pt-BR')}`;
      document.getElementById('fichaPorte').textContent = emp.porte || 'Não informado';
      document.getElementById('fichaCnae').textContent = emp.cnae_codigo ? `${emp.cnae_codigo} - ${emp.cnae_descricao || ''}` : 'Não informado';

      const endFicha = [emp.logradouro, emp.numero, emp.bairro, emp.municipio ? `${emp.municipio}/${emp.uf || ''}` : ''].filter(Boolean).join(' - ');
      document.getElementById('fichaEndereco').textContent = endFicha || 'Endereço não informado na Receita Federal';
      document.getElementById('fichaTelefone').textContent = emp.telefone || 'Informação não informada na Receita Federal';
      document.getElementById('fichaEmail').textContent = emp.email || 'Informação não cadastrada na Receita Federal';

      const qsaContainer = document.getElementById('fichaQsaList');
      if (qsaContainer) {
        if (emp.quadro_societario && emp.quadro_societario.length) {
          qsaContainer.innerHTML = emp.quadro_societario.map(s => `
            <div style="background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:6px; margin-bottom:6px;">
              <b>${s.nome}</b> <span style="color:var(--sky); font-size:12px;">(${s.qualificacao || 'Sócio'})</span>
            </div>
          `).join('');
        } else {
          qsaContainer.innerHTML = `<span style="color:var(--ink-3); font-size:12px; font-style:italic;">Quadro societário (QSA) não informado ou não aplicável pela Receita Federal (ex.: MEI / Empresário Individual).</span>`;
        }
      }

      this.openModal('modalFichaCnpj');
    } catch (err) {
      console.error('Erro ao abrir ficha do CNPJ:', err);
      this.showToast('Erro ao carregar ficha do CNPJ.');
    }
  },

  // 8. Gaveta Slide-Over: Raio-X Completo do Lead & Investigação
  activeDrawerLead: null,
  activeDrawerEmpresa: null,

  renderDrawerData(emp, lead = null, historico = []) {
    this.activeDrawerLead = lead;
    this.activeDrawerEmpresa = emp;

    // Header e Identificação
    const selectColuna = document.getElementById('drawerLeadColuna');
    if (selectColuna) {
      selectColuna.value = lead ? (lead.coluna || 'novos') : 'novos';
    }

    const sitEl = document.getElementById('drawerLeadSituacao');
    if (sitEl) sitEl.textContent = emp.situacao_cadastral || 'ATIVA';

    const porteEl = document.getElementById('drawerLeadPorte');
    if (porteEl) porteEl.textContent = emp.porte || (emp.eh_mei ? 'MEI' : 'ME');

    const razaoEl = document.getElementById('drawerLeadRazao');
    if (razaoEl) razaoEl.textContent = emp.razao_social;

    const fantasiaEl = document.getElementById('drawerLeadFantasia');
    if (fantasiaEl) fantasiaEl.textContent = emp.nome_fantasia || '(Sem nome fantasia declarado)';

    const cnpjEl = document.getElementById('drawerLeadCnpj');
    if (cnpjEl) cnpjEl.textContent = emp.cnpj;

    const dtAberturaEl = document.getElementById('drawerLeadDataAbertura');
    if (dtAberturaEl) {
      if (emp.data_abertura) {
        const d = new Date(emp.data_abertura);
        const agora = new Date();
        const diffDias = Math.floor((agora - d) / (1000 * 60 * 60 * 24));
        const strDias = diffDias <= 0 ? 'Aberta hoje' : (diffDias === 1 ? 'Aberta ontem' : `Aberta há ${diffDias} dias`);
        dtAberturaEl.textContent = `${strDias} (${d.toLocaleDateString('pt-BR')})`;
      } else {
        dtAberturaEl.textContent = 'Data de abertura não informada';
      }
    }

    // Quick Actions
    const telQuick = document.getElementById('drawerLeadTelefoneQuick');
    if (telQuick) telQuick.textContent = emp.telefone || 'Sem telefone na Receita';

    const btnWa = document.getElementById('drawerBtnWa');
    if (btnWa) {
      if (!emp.telefone) {
        btnWa.style.opacity = '0.5';
        btnWa.style.cursor = 'not-allowed';
        btnWa.title = 'Telefone não disponível na base oficial da Receita';
      } else {
        btnWa.style.opacity = '1';
        btnWa.style.cursor = 'pointer';
        btnWa.title = 'Chamar no WhatsApp';
      }
    }

    // Contato e Responsável Oficial
    const titularMei = emp.eh_mei && emp.razao_social ? emp.razao_social.replace(/^\d{2}\.?\d{3}\.?\d{3}\s*/, '').trim() : '';
    const contatoNome = emp.socio_nome || titularMei;

    const contatoEl = document.getElementById('drawerLeadContato');
    if (contatoEl) contatoEl.textContent = contatoNome || 'Informação não encontrada na base oficial';

    const cargoEl = document.getElementById('drawerLeadCargo');
    if (cargoEl) cargoEl.textContent = emp.socio_cargo || (emp.eh_mei ? 'Titular / Empresário Individual' : 'Cargo não informado');

    const telEl = document.getElementById('drawerLeadTelefone');
    if (telEl) telEl.textContent = emp.telefone || 'Informação não encontrada na Receita Federal';

    const emailEl = document.getElementById('drawerLeadEmail');
    if (emailEl) emailEl.textContent = emp.email || 'Informação não cadastrada na Receita Federal';

    // Presença Digital e Redes Sociais Inteligentes (Perfil Google Maps Direto, Instagram, LinkedIn, Facebook)
    let nomeBusca = (emp.nome_fantasia || emp.razao_social || '').trim();
    nomeBusca = nomeBusca
      .replace(/\s+(LTDA|EIRELI|ME|EPP|S\/A|SA|SOCIEDADE UNIPESSOAL|UNIPESSOAL|LIMITADA)\b/gi, '')
      .replace(/^\d{2}\.?\d{3}\.?\d{3}\s*/, '')
      .trim();

    let nomeCurto = nomeBusca;
    if (emp.municipio && nomeCurto.toLowerCase().endsWith(emp.municipio.toLowerCase().trim())) {
      nomeCurto = nomeCurto.slice(0, -emp.municipio.length).trim();
    }

    const partesEndereco = [];
    if (emp.logradouro) {
      let log = emp.logradouro.trim();
      if (emp.numero && emp.numero.trim() && !/^(s\/?n|sem\s+n)/i.test(emp.numero.trim())) {
        log += `, ${emp.numero.trim()}`;
      }
      partesEndereco.push(log);
    }
    if (emp.bairro && emp.bairro.trim()) {
      partesEndereco.push(emp.bairro.trim());
    }
    if (emp.municipio && emp.municipio.trim()) {
      partesEndereco.push(emp.municipio.trim());
    }
    if (emp.uf && emp.uf.trim()) {
      partesEndereco.push(emp.uf.trim());
    }

    const mapsQuery = partesEndereco.length > 0
      ? `${nomeCurto || nomeBusca}, ${partesEndereco.join(', ')}`
      : `${nomeBusca}, ${emp.municipio || ''} - ${emp.uf || ''}`;

    const linkMaps = document.getElementById('linkGoogleMaps');
    if (linkMaps) {
      linkMaps.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;
    }

    const cidadeUf = [emp.municipio, emp.uf].filter(Boolean).join(' - ');
    const linkGoogle = document.getElementById('linkGoogleSearch');
    if (linkGoogle) {
      linkGoogle.href = `https://www.google.com/search?q=${encodeURIComponent(`${nomeCurto || nomeBusca} ${cidadeUf}`.trim())}`;
    }

    const linkInsta = document.getElementById('linkInstagram');
    if (linkInsta) {
      linkInsta.href = `https://www.google.com/search?q=${encodeURIComponent(`site:instagram.com "${nomeCurto || nomeBusca}" ${emp.municipio || ''}`.trim())}`;
    }

    const linkLiEmp = document.getElementById('linkLinkedInEmpresa');
    if (linkLiEmp) {
      linkLiEmp.href = `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/company "${nomeCurto || nomeBusca}"`)}`;
    }

    const socioQuery = (emp.socio_nome || '').trim();
    const linkLiSocio = document.getElementById('linkLinkedInSocios');
    if (linkLiSocio) {
      linkLiSocio.href = socioQuery
        ? `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in "${socioQuery}"`)}`
        : `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in "${nomeCurto || nomeBusca}"`)}`;
    }

    const linkFb = document.getElementById('linkFacebook');
    if (linkFb) {
      linkFb.href = `https://www.facebook.com/search/top?q=${encodeURIComponent(`${nomeCurto || nomeBusca} ${emp.municipio || ''}`.trim())}`;
    }

    // Quadro Societário (QSA)
    const qsaListEl = document.getElementById('drawerLeadQsaList');
    if (qsaListEl) {
      if (emp.quadro_societario && emp.quadro_societario.length > 0) {
        qsaListEl.innerHTML = emp.quadro_societario.map(s => {
          const sQuery = encodeURIComponent(s.nome);
          return `
            <div class="partner-item">
              <div class="partner-info">
                <b>${s.nome}</b>
                <span>${s.qualificacao || 'Sócio'}</span>
              </div>
              <div class="partner-actions">
                <a href="https://www.google.com/search?q=${sQuery}" target="_blank" class="btn btn-quiet btn-xs" title="Pesquisar sócio no Google">
                  Google
                </a>
                <a href="https://www.google.com/search?q=site:linkedin.com/in+${sQuery}" target="_blank" class="btn btn-quiet btn-xs" title="Pesquisar sócio no LinkedIn">
                  LinkedIn
                </a>
              </div>
            </div>
          `;
        }).join('');
      } else {
        qsaListEl.innerHTML = `
          <div style="background: rgba(255,255,255,0.03); border: 1px dashed var(--hair); border-radius: 8px; padding: 12px; font-size: 12px; color: var(--ink-3); line-height: 1.5;">
            ℹ️ Quadro de Sócios (QSA) não informado ou não aplicável pela Receita Federal (ex.: MEI / Empresário Individual / Titular Único).
          </div>
        `;
      }
    }

    // Endereço e Localização
    const endEl = document.getElementById('drawerLeadEndereco');
    if (endEl) {
      const partes = [emp.logradouro, emp.numero, emp.bairro].filter(Boolean);
      endEl.textContent = partes.length ? partes.join(', ') : 'Endereço não informado na Receita Federal';
    }

    const cidUfEl = document.getElementById('drawerLeadCidadeUf');
    if (cidUfEl) {
      cidUfEl.textContent = (emp.municipio || emp.uf) ? `${emp.municipio || '—'}/${emp.uf || '—'}` : 'Município não informado';
    }

    const cepEl = document.getElementById('drawerLeadCep');
    if (cepEl) {
      cepEl.textContent = emp.cep ? `CEP ${emp.cep}` : 'CEP não informado';
    }

    // Raio-X Econômico & Fiscal
    const cnaeEl = document.getElementById('drawerLeadCnae');
    if (cnaeEl) cnaeEl.textContent = `${emp.cnae_codigo || '—'} - ${emp.cnae_descricao || 'Atividade comercial'}`;

    const capEl = document.getElementById('drawerLeadCapital');
    if (capEl) capEl.textContent = `R$ ${Number(emp.capital_social || 0).toLocaleString('pt-BR')}`;

    const natEl = document.getElementById('drawerLeadNatureza');
    if (natEl) natEl.textContent = emp.natureza_juridica || 'Sociedade Empresária Limitada';

    // Bloco de Notas
    const notasInput = document.getElementById('drawerLeadNotasInput');
    if (notasInput) notasInput.value = lead ? (lead.notas || '') : '';

    // Timeline de Histórico
    const timelineEl = document.getElementById('drawerLeadTimeline');
    if (timelineEl) {
      if (!historico || !historico.length) {
        timelineEl.innerHTML = `<span style="color:var(--ink-3); font-size:12px;">Nenhum evento registrado ainda.</span>`;
      } else {
        timelineEl.innerHTML = historico.map(h => {
          const dataFmt = h.data ? new Date(h.data).toLocaleString('pt-BR') : 'Recentemente';
          return `
            <div class="timeline-entry">
              <div style="color:#fff; font-weight:550;">${h.descricao}</div>
              <span class="timeline-time">${dataFmt}</span>
            </div>
          `;
        }).join('');
      }
    }

    // Abre a Gaveta Lateral
    document.getElementById('drawerBackdrop')?.classList.add('active');
    document.getElementById('drawerLeadDetails')?.classList.add('active');
  },

  async openLeadDetails(id) {
    try {
      const leads = LocalStore.getLeads();
      const lead = leads.find(l => String(l.id) === String(id));
      if (!lead) {
        this.showToast('Lead não encontrado.');
        return;
      }

      let emp = lead;
      try {
        const cleanCnpj = (lead.cnpj || '').replace(/\D/g, '');
        const res = await fetch(`/api/empresa/${cleanCnpj}`);
        const data = await res.json();
        if (data.success && data.empresa) {
          emp = { ...lead, ...data.empresa };
        }
      } catch (e) { }

      const historico = LocalStore.getHistorico(lead.id);
      this.renderDrawerData(emp, lead, historico);
    } catch (err) {
      console.error('Erro ao abrir detalhes do lead:', err);
      this.showToast('Erro ao carregar detalhes do lead.');
    }
  },

  async openCompanyDetails(cnpj) {
    try {
      const cleanCnpj = String(cnpj || '').replace(/\D/g, '');
      if (!cleanCnpj) {
        this.showToast('CNPJ inválido.');
        return;
      }
      this.showToast('Carregando raio-x da empresa...');
      const res = await fetch(`/api/empresa/${cleanCnpj}`);
      const data = await res.json();
      if (!data.success || !data.empresa) {
        this.showToast('Empresa não encontrada na Receita Federal.');
        return;
      }
      const emp = data.empresa;

      const leads = LocalStore.getLeads();
      const lead = leads.find(l => (l.cnpj || '').replace(/\D/g, '') === cleanCnpj) || null;
      const historico = lead ? LocalStore.getHistorico(lead.id) : [];

      this.renderDrawerData(emp, lead, historico);
    } catch (err) {
      console.error('Erro ao carregar detalhes da empresa:', err);
      this.showToast('Erro ao carregar detalhes da empresa.');
    }
  },

  closeLeadDetails() {
    document.getElementById('drawerBackdrop')?.classList.remove('active');
    document.getElementById('drawerLeadDetails')?.classList.remove('active');
    this.activeDrawerLead = null;
    this.activeDrawerEmpresa = null;
  },

  async changeLeadStageFromDrawer(newStage) {
    if (!this.activeDrawerLead && this.activeDrawerEmpresa) {
      await this.importToCrm(this.activeDrawerEmpresa.cnpj);
      this.showToast('Empresa adicionada ao CRM!');
      await this.openCompanyDetails(this.activeDrawerEmpresa.cnpj);
      return;
    }
    if (!this.activeDrawerLead) return;

    const leads = LocalStore.getLeads();
    const lead = leads.find(l => String(l.id) === String(this.activeDrawerLead.id));
    if (lead) {
      const antiga = lead.coluna;
      lead.coluna = newStage;
      LocalStore.saveLeads(leads);
      LocalStore.addHistorico(lead.id, 'mudanca_etapa', `Etapa alterada de "${antiga}" para "${newStage}"`);
      this.showToast('Etapa do lead atualizada com sucesso!');
      this.loadCrm();
      this.loadRadars();
      this.openLeadDetails(lead.id);
    }
  },

  async saveLeadNotesFromDrawer() {
    if (!this.activeDrawerLead && this.activeDrawerEmpresa) {
      await this.importToCrm(this.activeDrawerEmpresa.cnpj);
      await this.openCompanyDetails(this.activeDrawerEmpresa.cnpj);
    }
    if (!this.activeDrawerLead) return;
    const notasVal = document.getElementById('drawerLeadNotasInput')?.value || '';
    const leads = LocalStore.getLeads();
    const lead = leads.find(l => String(l.id) === String(this.activeDrawerLead.id));
    if (lead) {
      lead.notas = notasVal;
      LocalStore.saveLeads(leads);
      LocalStore.addHistorico(lead.id, 'anotacao', 'Anotações internas salvas');
      this.showToast('Anotações salvas com sucesso!');
      this.openLeadDetails(lead.id);
    }
  },

  deleteLeadFromDrawer() {
    if (!this.activeDrawerLead) return;
    if (!confirm(`Tem certeza que deseja remover o lead "${this.activeDrawerLead.razao_social}" do CRM?`)) return;

    let leads = LocalStore.getLeads();
    leads = leads.filter(l => String(l.id) !== String(this.activeDrawerLead.id));
    LocalStore.saveLeads(leads);
    this.showToast('Lead removido do CRM.');
    this.closeLeadDetails();
    this.loadCrm();
    this.loadRadars();
  },

  triggerDrawerWa() {
    if (!this.activeDrawerLead) return;
    const leadId = this.activeDrawerLead.id;
    this.openWaModalFromLead(leadId);
  },

  copyLeadCnpj() {
    if (!this.activeDrawerEmpresa) return;
    const cnpj = this.activeDrawerEmpresa.cnpj;
    navigator.clipboard.writeText(cnpj);
    this.showToast(`CNPJ ${cnpj} copiado!`);
  },

  copyLeadPhone() {
    if (!this.activeDrawerEmpresa) return;
    const tel = this.activeDrawerEmpresa.telefone;
    if (!tel) {
      this.showToast('Telefone não disponível.');
      return;
    }
    navigator.clipboard.writeText(tel);
    this.showToast(`Telefone ${tel} copiado!`);
  },

  // Helpers de Modal
  setupModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        this.closeLeadDetails();
      }
    });
  },

  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  },

  showToast(msg) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'flex';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
