# 🚀 Sistema Radar CNPJ (Clone TodoCNPJ)

Plataforma inteligente de captação e prospecção de empresas recém-abertas no Brasil com enriquecimento cadastral via Receita Federal, funil de vendas CRM Kanban integrado e abordagem assistida via WhatsApp.

---

## 🌟 Principais Recursos

- **📡 Radar de Empresas em Tempo Real:** Captura contínua de novas empresas abertas na Receita Federal com filtros por CNAE, Porte, UF, Município e Capital Social.
- **🔍 Busca Avulsa de CNPJs:** Pesquisa detalhada de CNPJs em tempo real com quadro societário (QSA) e dados de contato.
- **📊 CRM Kanban Completo:** Funil de prospecção visual (*Novos Leads, Em Contato, Negociação, Fechado, Perdido*).
- **📋 Gaveta Raio-X do Lead:** Visualização profunda dos dados cadastrais, presença digital (Google, Instagram, LinkedIn dos sócios) e histórico de anotações.
- **💬 Abordagem Assistida WhatsApp:** Gerador dinâmico de links `wa.me` com tags personalizadas (`{primeiro_nome_contato}`, `{empresa}`, `{municipio}`).
- **🌐 Globo 3D Interativo:** Visualização em Three.js das aberturas em tempo real por coordenadas das cidades brasileiras.

---

## 🛠️ Tecnologias Utilizadas

- **Backend:** Node.js (v22+), Express 5, `node:sqlite` (DatabaseSync nativo).
- **Frontend:** Vanilla JS moderno, CSS3 Design Tokens Dark Navy (Deep Navy & Accent Blue), Three.js (Globo 3D).
- **APIs de Dados:** MinhaReceita, ReceitaWS, BrasilAPI.

---

## 💻 Como Rodar Localmente

1. Clone o repositório:
```bash
git clone https://github.com/Raffaell19/radar-cnpj.git
cd radar-cnpj
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie a aplicação:
```bash
node server.js
```

4. Abra no navegador:
👉 **http://localhost:3001**

---

## ☁️ Deploy na Vercel

O projeto está pronto para a **Vercel** através da configuração `vercel.json` e do endpoint Serverless `api/index.js`:

1. Conecte este repositório no dashboard da [Vercel](https://vercel.com).
2. O framework preset será reconhecido automaticamente.
3. Certifique-se de selecionar **Node.js 22.x** nas configurações do projeto na Vercel.
4. Clique em **Deploy**!

