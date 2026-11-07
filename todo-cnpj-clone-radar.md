# Planejamento: Clone TodoCNPJ & Sistema Radar CNPJ

## Objetivo
Desenvolver uma aplicação completa em Node.js (Express + SQLite) com frontend integrado que replica fielmente o ecossistema do **TodoCNPJ**:
1. **Radar de Empresas Novas:** Captação de empresas recém-abertas com filtros (CNAE, Capital Social, UF, Município, Janela de dias, Só celulares, Excluir MEI), controle de cotas diárias/mensais de segurança.
2. **Disparo Assistido via WhatsApp (`wa.me`):** Gerador de links com templates personalizados (`{primeiro_nome_contato}`, `{empresa}`, `{municipio}`) e registro de status/envio.
3. **Busca Avulsa de Empresas:** Pesquisa por CNAE, UF, Cidade, Porte e Capital com ficha detalhada de CNPJ e importação com 1 clique para o CRM.
4. **CRM Kanban:** Funil de vendas interativo (*Novos Leads*, *Em Contato*, *Negociação*, *Fechado*, *Perdido*) com histórico e ação rápida de contato.
5. **Interface Premium:** Estética Dark Navy idêntica ao TodoCNPJ, tipografia moderna (Inter + Barlow Condensed), Globo 3D interativo Three.js com pulso em tempo real e feed de novas empresas do Brasil.

---

## Fases de Implementação

### Fase 1: Fundação do Backend (Node.js + SQLite)
- [x] Inicialização do projeto (`package.json`, dependências).
- [x] Schema do banco de dados SQLite (`database.js`):
  - Tabela `empresas` (CNPJ, Razão Social, Fantasia, CNAE, Capital, UF, Município, Telefone, É Celular, É MEI, Sócios, Data Abertura).
  - Tabela `radares` (Nome, Canal, CNAE, Capital Mínimo, Porte, UF, Município, Dias Abertura, Mensagem Template, Teto Diário, Teto Mensal, Só Celular, Excluir MEI, Criar Lead CRM, Ativo, Capturas Mês).
  - Tabela `leads_crm` (ID, Empresa ID, CNPJ, Razão Social, Município, UF, Telefone, Contato Nome, Coluna Kanban, Data Importação, Histórico).
  - Tabela `disparos_log` (ID, Lead ID, Telefone, Mensagem Enviada, Data, Canal).
- [x] Rotas da API REST (`/api`):
  - `/api/live`: Feed em tempo real de aberturas de hoje/semana e últimas empresas abertas.
  - `/api/pesquisa`: Busca avançada com múltiplos filtros combinados.
  - `/api/empresa/:cnpj`: Ficha completa do CNPJ com dados cadastrais e QSA.
  - `/api/radares`: CRUD completo de radares + execução/simulação de monitoramento.
  - `/api/leads`: Gerenciamento do CRM (listar, mover coluna, adicionar nota, excluir).
  - `/api/cnaes`: Busca inteligente de códigos CNAE por termo.

### Fase 2: Serviços de Dados de CNPJs Reais
- [x] Conector com fonte de dados pública (`services/cnpjService.js`):
  - Integração com endpoint live para obter empresas recém-abertas.
  - Enriquecimento cadastral de CNPJ via BrasilAPI / ReceitaWS.
  - Mecanismo de carga de base seed realista e geração de dados com municípios brasileiros e CNAEs para funcionamento offline e autônomo imediato.

### Fase 3: Frontend Integrado (Design TodoCNPJ + Three.js)
- [x] Estilo Global (`public/css/style.css`):
  - Design Tokens: Deep Navy (`#020E38`, `#03175A`), Accent Blue (`#2F72F5`), Sky (`#7FC4FF`), Live Green (`#25D07E`).
  - Sem uso de cores roxas/violetas (conformidade com regras de design).
  - Tipografia Google Fonts (Inter + Barlow Condensed) e FontAwesome/SVG icons.
- [x] Globo 3D Interativo (`public/js/globe.js`):
  - Renderização Three.js em canvas responsivo.
  - Mapa esférico, rotação interativa (drag), mapa noturno e atmosfera azulada.
  - Marcadores de coordenadas das capitais/cidades do Brasil acendendo com as empresas do feed ao vivo.
- [x] Componente Radar de Empresas (`public/js/app.js`):
  - Cards de métricas: Responderam, Receberam, Esperando Envio, Radares Ligados.
  - Listagem de radares com interruptor liga/desliga instantâneo.
  - Modal "Novo Radar" 100% fiel ao vídeo (opções avançadas, tetos, tags de mensagem).
- [x] Componente Busca Avulsa (`public/js/app.js`):
  - Filtros por CNAE, UF, Município, Porte, Capital Social, Apenas Celular.
  - Tabela de resultados paginada com visualização da ficha completa (QSA, Capital, Telefones) e botão direto de WhatsApp e CRM.
- [x] Componente CRM Kanban (`public/js/app.js`):
  - Funil em colunas com drag-and-drop e atualização em tempo real.
  - Card de lead com dados de contato e botão de disparo assistido `wa.me`.
  - Modal de envio WhatsApp: prévia da mensagem gerada com as tags substituídas e link direto.

### Fase 4: Validação, Testes e Entrega
- [x] Teste de inicialização do servidor Express.
- [x] Teste de todas as rotas da API via scripts automatizados.
- [x] Validação visual no navegador e verificação de fluxo ponta a ponta.

### Fase 5: Limpeza Total dos Dados Fictícios, Motor Real e Gaveta Raio-X do Lead
- [x] **Limpeza Geral do Banco de Dados:**
  - Remoção de todos os dados gerados aleatoriamente/fictícios (`69.700.001...`).
  - CRM Kanban 100% zerado (0 leads) pronto para testes iniciais do usuário.
  - Radares 100% zerados (0 radares configurados).
  - Tabela `empresas` abastecida exclusivamente com empresas autênticas da Receita Federal (RFB).
- [x] **Motor de Busca Real e Varredura Conectada:**
  - Fallback multi-nível para consultas federais: `ReceitaWS` (empresas novas de hoje/ontem), `MinhaReceita` (sem limite de requisições e dados completos de QSA e endereços) e `CNPJ.ws`.
  - Busca inteligente na rota `/api/pesquisa`: se pesquisar por CNPJ específico que ainda não consta no banco, busca automaticamente ao vivo na base federal e salva no banco.
  - Sincronização periódica em segundo plano no `server.js` conectada à API oficial de novas aberturas diárias da Receita.
- [x] **Aba Lateral Slide-Over (Raio-X Completo do Lead):**
  - Implementação da gaveta lateral retrátil ativada pelo botão "Detalhes" do card no CRM Kanban.
  - Identificação: Razão Social, Fantasia, CNPJ com cópia em 1 clique, Data oficial de abertura com cálculo de tempo (ex: "Aberta há 2 dias").
  - Ações Rápidas: Chamar no WhatsApp (abre prévia assistida com template dinâmico) e Ligar/Copiar Telefone.
  - **Presença Digital & Redes Sociais:**
    - Perfil Google / Google Maps direto do endereço da empresa
    - Pesquisa direta no Google Web (`"Razão Social" Cidade`)
    - Busca de perfil no Instagram
    - Busca de página da empresa no LinkedIn
    - Busca do perfil dos sócios no LinkedIn
    - Busca de página no Facebook
  - **Quadro de Sócios e Administradores (QSA):**
    - Listagem de sócios com qualificações e botões individuais de pesquisa no Google e LinkedIn.
  - **Localização Completa:**
    - Logradouro, número, bairro, CEP, município e UF com link de rota no Google Maps.
  - **Dados Econômicos e Fiscais:**
    - CNAE Principal, Natureza Jurídica, Capital Social e Porte.
  - **Gestão do Lead:**
    - Seletor de Etapa no topo da gaveta para transição direta entre colunas do CRM.
    - Bloco de Notas para anotações internas da prospecção com botão "Salvar Anotações".
    - Linha do tempo com histórico cronológico de cada interação.
    - Botão "Excluir Lead" para descarte limpo.

