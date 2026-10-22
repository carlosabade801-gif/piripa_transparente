# Piripá Transparente

Aplicativo de consulta cidadã para receitas, despesas e licitações de Piripá / BA (IBGE **2924702**). Esta versão corrige a coleta e os cálculos do pacote original e torna visíveis as fontes, os períodos e as informações ausentes.

**A versão não certifica a integridade das publicações da prefeitura nem o rastreamento integral de cada centavo.** Ela mostra os registros efetivamente retornados pelas fontes, com valores conferidos e limites de cobertura explícitos. Contratos, notas fiscais, restos a pagar, contas bancárias e conciliação integral ainda dependem de documentação própria.

## Interface para celular — versão 1.1.0

A tela inicial oferece dois caminhos diretos: **Quanto entrou?** e **Onde foi gasto?**. No celular, o menu inferior mantém **Início, Entradas, Gastos e Mais** sempre acessíveis. Resumo do orçamento, compras, benefícios e ajuda ficam em Mais.

- Período por mês e ano, com atalhos para este mês e o anterior. Os dias exatos consultados aparecem junto aos valores. Consultas do mês corrente terminam no dia de hoje.
- Valor pago ou receita arrecadada em destaque, antes da busca. Empenhado/liquidado e entradas extraorçamentárias ficam em explicações expansíveis, com valores separados.
- Cartões como visualização padrão: data, área, credor, valor e finalidade. A tabela continua disponível como opção.
- Busca por palavra e filtros de área, secretaria e fonte. Toque em uma área para filtrar os gastos. O agrupamento usa a função declarada nos registros, não uma classificação inventada.
- Dez registros por página nas listas. Totais e exportações continuam incluindo todos os registros encontrados.
- Detalhes em tela cheia no celular, botões maiores, ajuda em perguntas e respostas, navegação pelo botão Voltar do navegador e preservação de período/filtros ao trocar de tela durante a sessão.
- Tema claro com textos escuros, fonte do próprio aparelho, sem download de fontes externas. Sem imagens grandes ou nova biblioteca de interface.

A atualização foi conferida em navegador automatizado nas larguras 320, 360, 390, 412, 768 e 1440 px, além de 844 × 390 em paisagem. São testes de interface com amostras reais controladas; não substituem testes em aparelhos físicos ou com usuários. Veja `docs/INTERFACE_MOBILE.md`.

## Executar localmente

Requer Node.js **22.12 ou superior** e npm. Use uma versão LTS mantida.

```bash
npm ci
npm run dev:full
```

Abra o endereço exibido pelo Vite, normalmente `http://localhost:5173`. O servidor das consultas roda na porta 3001. `npm run dev` sozinho abre apenas a interface; precisa do servidor em `npm run dev:proxy`.

Para executar a compilação de produção localmente:

```bash
npm run build
npm start
```

Abra `http://localhost:3001`. Não use `npm run preview` como servidor de produção: ele não executa a API.

## Hospedagem

O pacote inclui `vercel.json` e a função `api/fator-proxy.js`. No projeto Vercel, use Node.js 22 ou 24 compatível, comando `npm run build` e diretório `dist`. A função solicita 60 segundos e 1.024 MB; confirme a disponibilidade dessas configurações no plano de hospedagem. A entrega inclui os arquivos, **sem publicação em produção**.

Outro servidor Node também pode executar `npm start` após `npm ci` e `npm run build`. Configure HTTPS e o acesso externo às fontes. Não exponha o servidor de desenvolvimento Vite na internet. O armazenamento em memória e os limites de resposta foram dimensionados para consultas pontuais; capacidade sob carga pública ainda não foi medida.

## Benefícios federais (opcional)

Receitas, despesas, resumo SICONFI e licitações não dependem de uma chave da CGU.

Para Bolsa Família e BPC, copie `.env.example` para `.env` e configure `PORTAL_API_KEY`, emitida pelo Portal da Transparência Federal, **somente no servidor**. Na hospedagem, configure a variável de ambiente. Nunca use `VITE_PORTAL_API_KEY` ou inclua a chave no código do cliente.

Sem chave, a tela informa indisponibilidade e oferece a fonte original. A consulta autenticada não foi validada nesta entrega por falta da credencial. Valores de benefícios são mensais, pagos às pessoas, e nunca integram os totais da prefeitura. Formatos ou identidades inesperados são recusados.

## Dados e conferência

| Informação | Origem | Regra aplicada |
|---|---|---|
| Despesas por lançamento | Fator Sistemas, portal indicado pela Prefeitura | Empenhado, liquidado e pago em colunas independentes; conferência com os detalhes. |
| Receitas por lançamento | Mesmo portal municipal | Soma de **Valor Arrecadado**; previsões não entram na arrecadação; natureza orçamentária e extraorçamentária separadas. |
| Resumo fiscal | SICONFI / Tesouro Nacional | RREO, anexo 01, ente 2924702, exercício e bimestre explícitos; identificação exata de conta e coluna. |
| Licitações | SAI2, órgão 1820, pelo portal municipal | Estimado e homologado separados; nenhum valor tratado como pagamento. |
| Benefícios aos cidadãos | Portal da Transparência Federal / CGU | Município e competência verificados, quando a integração autenticada estiver disponível. |

Os detalhes de despesas incluem credor, finalidade, unidade gestora, unidade orçamentária, fonte do recurso, função, ação, elemento, empenho e referências a processo/contrato/licitação, conforme publicados. Informação ausente permanece “Não informado na fonte”. O código não infere vínculos entre um recebimento e um pagamento.

Os filtros se aplicam a todos os registros da consulta, antes da paginação. Os totais e os agrupamentos correspondem ao conjunto filtrado. A data inicial/final é limitada a 1–31 dias, no mesmo exercício, para evitar respostas excessivas e truncamento silencioso.

## Exportar

- **Planilha (CSV):** todos os registros filtrados, valores em reais com duas casas decimais, fonte, período, filtros, instante da coleta e identificadores. Textos que poderiam executar fórmulas em planilhas são neutralizados.
- **Dados com fontes (JSON):** registros em centavos inteiros, totais, metadados e avisos.
- **Resumo SICONFI:** JSON do demonstrativo e da identificação da consulta.

A exportação verifica quantidade, IDs, totais e a mesma versão semântica dos dados entre páginas. Mudança na fonte interrompe a exportação e pede nova consulta. O SHA-256 registra a identidade da resposta recebida; não substitui documento fiscal, assinatura do órgão ou certificação da veracidade. As respostas brutas de produção não são arquivadas permanentemente por este aplicativo.

## Falhas e atualização

Uma resposta inválida, alteração de estrutura, divergência de valores, período inconsistente ou erro de rede produz indisponibilidade. Não há estimativas, dados de demonstração ou uso silencioso de um arquivo histórico como se fosse a fonte atual. Um resultado vazio não comprova inexistência de movimentação.

A consulta bem-sucedida pode ser reutilizada em memória por até dois minutos; o momento original da coleta continua visível. “Atualizar dados” força nova coleta. Atualização publicada pela fonte aparece como desconhecida quando não é informada. O service worker nunca armazena respostas financeiras e elimina os caches antigos do app ao ativar a versão nova. Uma aba que permaneça aberta na versão antiga precisa ser recarregada após a atualização.

## Verificar

```bash
npm test
npm run build
npm run test:live
npm audit
```

`npm test` usa amostras reais preservadas em `tests/fixtures`, exclusivamente para testes. Elas não são usadas como fallback em produção. `npm run test:live` consulta as fontes externas e atualiza `docs/validacao-fontes.json`; depende da disponibilidade dos órgãos e pode falhar se a estrutura for alterada.

Consulte `docs/CORRECOES.md` para as mudanças e os limites da validação. O arquivo `docs/validacao-fontes.json` registra as consultas reais feitas durante a entrega. A verificação de interface em desktop e celular está registrada em `docs/validacao-interface.json`; usa as amostras reais como respostas controladas de teste, separadas das consultas externas ao vivo. A compilação e a auditoria de dependências estão registradas em `docs/validacao-tecnica.json`.

Os testes não equivalem a auditoria contábil, certificação de segurança, teste de carga ou homologação na hospedagem final.

## Estrutura

- `server/`: acesso e conferência das fontes, cálculos, filtros e paginação.
- `shared/`: dinheiro em centavos inteiros e datas.
- `api/fator-proxy.js`: entrada da API, compartilhada pela Vercel e pelo servidor local.
- `src/`: interface, detalhes e exportações.
- `public/sw.js`: política de conexão e cache da interface.
- `tests/`: regressões das falhas encontradas na auditoria.
- `docs/`: evidências e documentação.
