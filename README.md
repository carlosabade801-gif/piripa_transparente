# Piripá Transparente 🏛️

App de transparência pública municipal para Piripá-BA.
React + Vite + Tailwind + Vercel Serverless Functions.

## Abas e fontes de dados

| Aba | Fonte | Dados |
|-----|-------|-------|
| 🏛️ Visão Geral | SICONFI / Tesouro | Receita, despesa, superávit anual |
| 🧮 Pra Mim | Calculado | Quanto do imposto vai para cada área |
| 💸 Despesas | SICONFI | Gráficos por categoria |
| 💰 Receitas | SICONFI | Transferências FPM, FUNDEB, SUS |
| 📋 Contratos | MOCK | Licitações estáticas |
| 🚨 Denunciar | Links oficiais | TCM-BA, MP, CGU, Ouvidoria |
| 🤖 IA | Claude API | Chat sobre as finanças |
| 🔍 Gastos | **Fator Sistemas — ao vivo** | Cada empenho/pagamento com descrição |
| ⚖️ Licitações | **SAI2 — ao vivo** | Todas as licitações do ano |
| 💹 Receitas+ | **Fator Sistemas — ao vivo** | Cada arrecadação com fonte e previsto |

## APIs confirmadas ao vivo

### SICONFI (sem chave)
```
GET https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo
  ?an_exercicio=2025&in_periodicidade=B&nr_periodo=4
  &co_tipo_demonstrativo=RREO&no_uf=BA&co_municipio=2924702
```

### Fator Sistemas (proxy necessário — ISO-8859-1 + CORS)
```
GET https://transparencia.fatorsistemas.com.br/dados/carregaDespesa.php
  ?id=pm_piripa&data_publicacao=01/01/2025&data_publicacao_fim=31/01/2025

GET https://transparencia.fatorsistemas.com.br/dados/carregaReceita.php
  ?id=pm_piripa&dt_ini=01/01/2025&dt_fim=31/01/2025
```

### SAI2 — Licitações (JSON puro, sem autenticação)
```
POST https://sai2.io.org.br/v3/Licitacao/Filtro
  { "cod_orgao_org": 1820, "ano": 2025 }
```

### Portal da Transparência Federal (chave gratuita)
```
GET https://api.portaldatransparencia.gov.br/api-de-dados/transferencias-voluntarias
  ?municipio=2924702&ano=2025
  Header: chave-api-dados: SUA_CHAVE
```

## Rodar localmente

```bash
npm install
cp .env.example .env

# Opção 1: só o frontend (proxy retorna erro — dados mock)
npm run dev

# Opção 2: frontend + proxy (dados reais da prefeitura)
npm i -g vercel
vercel dev
```

## Deploy no Vercel

```bash
git init
git add .
git commit -m "init"
git push origin main
```
Importe no vercel.com e adicione:
- `VITE_PORTAL_API_KEY` — chave do Portal da Transparência

## Adaptar para outro município

`src/lib/config.js` — código IBGE e população
`api/fator-proxy.js` — `FATOR_ID` e `SAI2_ORG`

Para descobrir os IDs, abra o portal de transparência do município e
inspecione as chamadas de rede (DevTools → Network → XHR/Fetch).
