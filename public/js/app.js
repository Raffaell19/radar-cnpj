/**
 * SISTEMA RADAR CNPJ - APP CONTROLLER
 * Gerencia Navegação, Globo & Feed ao Vivo, Radares, Busca Avulsa, CRM Kanban e WhatsApp Assistido
 */

const App = {
  activeTab: 'home',
  liveData: null,
  liveIndex: 0,
  liveTimer: null,
  currentModalLead: null,

  // Inicialização Geral
  async init() {
    this.setupNavigation();
    this.setupModals();
    this.setupSearch();
    this.setupRadarForm();
    await this.loadLiveStats();
    await this.loadRadars();
    await this.loadCrm();
    this.startLiveFeedLoop();
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
  async loadRadars() {
    try {
      const res = await fetch('/api/radares');
      const data = await res.json();
      if (!data.success) return;

      // Métricas do Topo
      document.getElementById('metricResponderam').textContent = data.estatisticas.responderam;
      document.getElementById('metricReceberam').textContent = data.estatisticas.receberam;
      document.getElementById('metricEsperando').textContent = data.estatisticas.esperandoEnvio;
      document.getElementById('metricRadaresLigados').textContent = `${data.estatisticas.radaresLigados} de ${data.estatisticas.totalRadares}`;

      // Lista de Radares
      const container = document.getElementById('radarsListContainer');
      if (!container) return;

      if (!data.radares.length) {
        container.innerHTML = `
          <div class="empty-state" style="text-align:center; padding: 40px; color: var(--ink-3);">
            <p>Nenhum radar configurado ainda. Crie seu primeiro radar para monitorar novas aberturas!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = data.radares.map(radar => `
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
                <span class="radar-chip">${radar.municipio_filtro !== 'todos' ? radar.municipio_filtro + '/' + radar.uf_filtro : (radar.uf_filtro !== 'todos' ? radar.uf_filtro : 'Brasil inteiro')}</span>
                <span class="radar-chip">Capital ≥ R$ ${Number(radar.capital_minimo).toLocaleString('pt-BR')}</span>
                <span class="radar-chip">${radar.dias_abertura} dias</span>
                ${radar.so_celulares ? '<span class="radar-chip">Só Celulares</span>' : ''}
                ${radar.excluir_mei ? '<span class="radar-chip">Sem MEI</span>' : ''}
                <span class="radar-chip">Canal: ${radar.canal.toUpperCase()}</span>
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
              <b>${radar.capturas_mes}</b> de ${radar.teto_mensal} empresas capturadas este mês
            </span>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Erro ao listar radares:', err);
    }
  },

  async toggleRadarStatus(id, checked) {
    try {
      await fetch(`/api/radares/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: checked })
      });
      this.showToast(`Radar ${checked ? 'ativado' : 'pausado'} com sucesso!`);
      this.loadRadars();
    } catch (err) {
      this.showToast('Erro ao atualizar status do radar');
    }
  },

  async triggerRadarRun(id) {
    try {
      this.showToast('Executando varredura na base de dados...');
      const res = await fetch(`/api/radares/${id}/executar`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.showToast(`Varredura concluída! ${data.resultado.leadsCriados} novos leads enviados ao CRM.`);
        this.loadRadars();
        this.loadCrm();
      }
    } catch (err) {
      this.showToast('Erro ao executar varredura.');
    }
  },

  async deleteRadar(id) {
    if (!confirm('Tem certeza que deseja excluir este radar?')) return;
    try {
      await fetch(`/api/radares/${id}`, { method: 'DELETE' });
      this.showToast('Radar excluído.');
      this.loadRadars();
    } catch (err) {
      this.showToast('Erro ao excluir radar.');
    }
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

  async openEditRadarModal(id) {
    try {
      this.showToast('Carregando dados do radar...');
      const res = await fetch(`/api/radares/${id}`);
      const data = await res.json();
      if (!data.success || !data.radar) {
        this.showToast('Erro ao carregar radar para edição.');
        return;
      }

      const radar = data.radar;
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
        const url = radarId ? `/api/radares/${radarId}` : '/api/radares';
        const method = radarId ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          this.closeModal('modalNovoRadar');
          this.showToast(radarId ? 'Radar atualizado e nova varredura executada!' : 'Radar criado e primeira varredura realizada!');
          form.reset();
          if (document.getElementById('inputRadarId')) document.getElementById('inputRadarId').value = '';
          this.loadRadars();
          this.loadCrm();
        } else {
          this.showToast(data.error || 'Erro ao processar radar.');
        }
      } catch (err) {
        this.showToast('Erro ao salvar radar.');
      }
    });
  },

  // 4. Módulo Busca Avulsa de Empresas
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
  },

  async runSearch(page = 1) {
    const termo = document.getElementById('searchInputTermo')?.value || '';
    const uf = document.getElementById('searchSelectUf')?.value || 'todos';
    const cnae = document.getElementById('searchInputCnae')?.value || '';
    const cidade = document.getElementById('searchInputCidade')?.value || '';
    const capitalMin = document.getElementById('searchCapitalMin')?.value || '';
    const soCelular = document.getElementById('searchCheckCelular')?.checked ? 1 : 0;
    const semMei = document.getElementById('searchCheckSemMei')?.checked ? 1 : 0;

    const queryParams = new URLSearchParams({
      termo,
      uf,
      municipio: cidade,
      cnae,
      capital_minimo: capitalMin,
      so_celulares: soCelular,
      excluir_mei: semMei,
      pagina: page,
      por_pagina: 12
    });

    const tbody = document.getElementById('searchResultsTbody');
    const countEl = document.getElementById('searchResultsCount');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px;">Carregando empresas...</td></tr>`;

    try {
      const res = await fetch(`/api/pesquisa?${queryParams.toString()}`);
      const data = await res.json();
      if (!data.success) return;

      if (countEl) countEl.textContent = `${data.total.toLocaleString('pt-BR')} empresas encontradas`;

      if (!data.empresas.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--ink-3);">Nenhuma empresa encontrada com estes critérios.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.empresas.map(emp => `
        <tr>
          <td>
            <b style="color:#fff; display:block;">${emp.razao_social}</b>
            <span style="font-size:11px; color:var(--ink-3); font-family:var(--mono);">${emp.cnpj}</span>
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
          <td>
            <span style="color:var(--ink-1); font-weight:550; font-variant-numeric:tabular-nums;">
              R$ ${Number(emp.capital_social).toLocaleString('pt-BR')}
            </span>
            <small style="display:block; color:var(--ink-3); font-size:10px;">${emp.porte || 'ME'}</small>
          </td>
          <td>
            <span class="badge-tag ${emp.eh_celular ? 'badge-phone' : ''}">
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
      `).join('');
    } catch (err) {
      console.error('Erro na pesquisa:', err);
    }
  },

  async importToCrm(cnpj) {
    try {
      const res = await fetch('/api/leads/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj, coluna: 'novos' })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(data.jaExistia ? 'Empresa já existia no CRM!' : 'Empresa importada para Novos Leads no CRM!');
        this.loadCrm();
      }
    } catch (err) {
      this.showToast('Erro ao importar para o CRM.');
    }
  },

  // 5. Módulo CRM Kanban
  async loadCrm() {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (!data.success) return;

      const columns = ['novos', 'contatado', 'negociacao', 'fechado', 'perdido'];
      columns.forEach(col => {
        const bodyEl = document.getElementById(`kanbanColBody-${col}`);
        const countBadge = document.getElementById(`kanbanCount-${col}`);
        const leads = data.kanban[col] || [];

        if (countBadge) countBadge.textContent = leads.length;
        if (!bodyEl) return;

        if (!leads.length) {
          bodyEl.innerHTML = `<div style="text-align:center; padding:30px 10px; color:var(--hair); font-size:12px;">Nenhum lead nesta etapa</div>`;
          return;
        }

        bodyEl.innerHTML = leads.map(l => `
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
      body.addEventListener('drop', async (e) => {
        e.preventDefault();
        body.style.background = 'transparent';
        const leadId = e.dataTransfer.getData('text/plain');
        const novaColuna = body.dataset.coluna;

        if (leadId && novaColuna) {
          try {
            await fetch(`/api/leads/${leadId}/coluna`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ coluna: novaColuna })
            });
            App.loadCrm();
            App.loadRadars();
          } catch (err) {
            console.error(err);
          }
        }
      });
    });
  },

  // 6. WhatsApp Assistido via Link Direto wa.me
  async openWaModalFromLead(leadId) {
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const data = await res.json();
      if (!data.success) return;
      this.currentModalLead = data.lead;
      this.renderWaModal(data.lead);
    } catch (err) {
      this.showToast('Erro ao preparar disparo de WhatsApp.');
    }
  },

  async openWaModalFromCompany(cnpj) {
    try {
      const res = await fetch(`/api/empresa/${cnpj}`);
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
          await fetch('/api/whatsapp/disparado', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: dados.id, mensagem: info.mensagemFormatada })
          });
          App.loadCrm();
          App.loadRadars();
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
      const res = await fetch(`/api/leads/${id}`);
      const data = await res.json();
      if (!data.success) {
        this.showToast('Lead não encontrado.');
        return;
      }
      const lead = data.lead;
      const emp = data.dados_completos || lead;
      this.renderDrawerData(emp, lead, data.historico || []);
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

      let lead = null;
      let historico = [];
      try {
        const leadRes = await fetch(`/api/leads?q=${cleanCnpj}`);
        const leadData = await leadRes.json();
        if (leadData.success && leadData.leads && leadData.leads.length > 0) {
          const lFound = leadData.leads.find(l => l.cnpj.replace(/\D/g, '') === cleanCnpj);
          if (lFound) {
            const detRes = await fetch(`/api/leads/${lFound.id}`);
            const detData = await detRes.json();
            if (detData.success) {
              lead = detData.lead;
              historico = detData.historico || [];
            }
          }
        }
      } catch (e) {}

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
    try {
      await fetch(`/api/leads/${this.activeDrawerLead.id}/coluna`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coluna: newStage })
      });
      this.showToast('Etapa do lead atualizada com sucesso!');
      this.loadCrm();
      this.loadRadars();
      // Atualiza timeline interna
      this.openLeadDetails(this.activeDrawerLead.id);
    } catch (err) {
      this.showToast('Erro ao atualizar etapa do lead.');
    }
  },

  async saveLeadNotesFromDrawer() {
    if (!this.activeDrawerLead && this.activeDrawerEmpresa) {
      await this.importToCrm(this.activeDrawerEmpresa.cnpj);
      await this.openCompanyDetails(this.activeDrawerEmpresa.cnpj);
    }
    if (!this.activeDrawerLead) return;
    const notasVal = document.getElementById('drawerLeadNotasInput')?.value || '';
    try {
      await fetch(`/api/leads/${this.activeDrawerLead.id}/notas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notas: notasVal })
      });
      this.showToast('Anotações salvas com sucesso!');
      // Atualiza timeline interna
    } catch (err) {
      this.showToast('Erro ao salvar anotações.');
    }
  },

  async deleteLeadFromDrawer() {
    if (!this.activeDrawerLead) return;
    if (!confirm(`Tem certeza que deseja remover o lead "${this.activeDrawerLead.razao_social}" do CRM?`)) return;

    try {
      await fetch(`/api/leads/${this.activeDrawerLead.id}`, { method: 'DELETE' });
      this.showToast('Lead removido do CRM.');
      this.closeLeadDetails();
      this.loadCrm();
      this.loadRadars();
    } catch (err) {
      this.showToast('Erro ao excluir lead.');
    }
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
