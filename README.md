# Piripá Transparente

**Piripá Transparente** é uma aplicação web moderna de transparência pública, desenvolvida para fornecer acesso fácil, visual e em tempo real aos dados orçamentários, receitas, despesas e contratos do município de Piripá, na Bahia. 

O aplicativo consolida dados de múltiplas fontes oficiais do governo, convertendo informações brutas e complexas em gráficos interativos e painéis fáceis de entender para a população.

## 📊 Principais Funcionalidades

- **Visão Geral (Dashboard):** KPIs com o total de receitas e despesas, evolução orçamentária através de gráficos e detalhamento de gastos por área de atuação (Saúde, Educação, etc.).
- **Portal de Receitas:** Acompanhamento da arrecadação municipal, incluindo repasses federais e verbas de programas sociais (como Bolsa Família e BPC).
- **Mural de Contratos e Licitações:** Listagem em tempo real dos contratos firmados pela prefeitura, com detalhes sobre fornecedores, valores, vigência e status.
- **Design Responsivo e Moderno:** Construído para funcionar perfeitamente em dispositivos móveis e desktops, com interface escura (Dark Mode) voltada para a melhor legibilidade.

## 🔗 Fontes de Dados (APIs Integradas)

O sistema não utiliza banco de dados próprio para armazenar valores; ele consome dados diretamente na fonte (ao vivo) através das seguintes integrações:

1. **SAI2 (Sistema de Administração Pública):** Fornece os dados em tempo real sobre Licitações e Contratos da prefeitura.
2. **Portal da Transparência Federal (CGU):** Consumido via chave de API oficial, fornece os montantes transferidos para programas sociais como o Novo Bolsa Família e o BPC (Benefício de Prestação Continuada).
3. **Fator Sistemas:** Fornece o detalhamento estrutural das contas públicas, separando os gastos por categorias e áreas da administração municipal.

*(O app possui também suporte integrado ao SICONFI, atuando como fallback caso o município passe a enviar ativamente seus relatórios RREO/RGF).*

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React.js com Vite, Tailwind CSS para estilização, Recharts para os gráficos e Framer Motion para animações.
- **Backend / Proxy:** Node.js (via `dev-server.js` localmente e funções Serverless em produção) responsável por contornar bloqueios de CORS e orquestrar as chamadas a múltiplas APIs simultaneamente.
- **Ícones:** Lucide React.
- **Integração Continua:** GitHub e Vercel/Railway para deploy.

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js (v18 ou superior) instalado na máquina.
- Uma chave gratuita do Portal da Transparência Federal.

### Passos

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/carlosabade801-gif/piripa_transparente.git
   cd piripa_transparente
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:
   ```env
   PORTAL_API_KEY=sua_chave_aqui
   ```

4. **Inicie o Servidor Proxy (Terminal 1):**
   ```bash
   node dev-server.js
   ```

5. **Inicie o Frontend (Terminal 2):**
   ```bash
   npm run dev
   ```

6. **Acesse:** `http://localhost:5173`

## 📄 Estrutura do Projeto
- `/src`: Código fonte do frontend (Componentes React, Tabs, Utils).
- `/api`: Serverless functions (como o `fator-proxy.js`) para ambiente de produção.
- `dev-server.js`: Servidor Node para roteamento e proxy durante o desenvolvimento.
