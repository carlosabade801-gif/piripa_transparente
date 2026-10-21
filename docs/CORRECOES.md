# Correções da entrega

## Erros corrigidos

1. **Receitas:** removida a soma da previsão como arrecadação. Excluídas das movimentações do período as linhas de previsão anual com arrecadação zero e data de 1º de janeiro fora do intervalo solicitado. Entradas orçamentárias e extraorçamentárias permanecem separadas.
2. **Despesas:** três colunas monetárias independentes. O campo “Fase” do portal contém o tipo de empenho e não é usado para inferir se houve pagamento. Ajustes negativos são preservados.
3. **Detalhes:** extração por DOM, com identificação do diálogo original, em vez de expressão regular que truncava os campos. Valores da linha são confrontados com o detalhe. A unidade orçamentária é distinta da unidade gestora.
4. **Resumo:** parâmetros e campos reais do SICONFI. Seleção exata das contas `TotalReceitas` e `SubtotalDasDespesas`, com colunas de execução acumulada do bimestre. Nenhuma receita é inferida a partir da despesa. A linha de subtotal evita incorporar linhas de equilíbrio à despesa executada.
5. **Licitações:** estimado, homologado e documentos do processo. Nenhuma soma de licitações recebe o rótulo de despesa paga. O filtro junino é uma busca temática, sem declaração de cobertura exaustiva.
6. **Benefícios:** consulta mensal isolada do orçamento municipal, exigindo a chave no servidor. Falhas ou falta da chave não viram zero.
7. **Dados fabricados:** removidos os mocks, o cache JSON embarcado, o gerador de cache antigo, percentuais de crescimento fixos, estimativas de receita e simulador sem base individual. Removido o chat que apresentava dados sem comprovação; substituído por explicações determinísticas.
8. **Consistência:** centavos inteiros, filtros sobre todo o conjunto, totais antes da paginação, versão consistente entre páginas e na exportação, cancelamento de consultas antigas no cliente.
9. **Rastreabilidade:** período, fonte, URL da consulta, instante de coleta, unidade, ID da linha, campos ausentes e hashes visíveis. O hash não é uma certificação.
10. **Falhas:** erros explícitos, sem fallback para valores antigos; limite de tamanho e prazo da resposta; API e dados fora do cache offline.
11. **Manutenção:** um único backend para desenvolvimento e hospedagem; ferramentas de compilação atualizadas e dependências sem uso retiradas.

## Conferência do caso usado na auditoria

Consulta do portal municipal: **15/09/2025 a 15/09/2025**.

| Indicador | Resultado conferido |
|---|---:|
| Despesa empenhada | R$ 59.071,97 |
| Despesa liquidada | R$ 113.290,88 |
| Despesa paga | R$ 125.523,02 |
| Lançamentos de despesas | 43 |
| Receita orçamentária arrecadada | R$ 261.237,83 |
| Entradas extraorçamentárias | R$ 1.187,29 |
| Lançamentos de receitas no intervalo | 22 |
| Linhas de previsão anual excluídas do intervalo | 133 |

No primeiro lançamento de despesa da amostra, o pagamento de **R$ 1.572,15** é preservado, assim como a liquidação de **−R$ 3.735,94**. Não é exibido pagamento zero a partir da coluna de empenho.

RREO de 2025, 6º bimestre: receita realizada **R$ 62.367.891,95**; previsão atualizada **R$ 68.748.000,00**; empenhado, liquidado e pago do subtotal de despesas **R$ 60.186.944,70** em cada coluna, conforme aquela publicação. As três colunas não são somadas. A consulta retornou 235 células de demonstrativo. A consulta de licitações de 2025 retornou 53 registros.

Esses números são evidências de consultas específicas, não parâmetros fixos do aplicativo nem certificação do exercício inteiro. Uma retificação da fonte pode alterar os resultados.

## Limites de entrega

- Não foram recebidos acesso ao sistema contábil, extratos, inventário completo de documentos fiscais ou credencial da CGU.
- Não há conciliação documental completa de cada ingresso até cada pagamento, nem confirmação da publicação de todos os órgãos, fundos e poderes. O portal Fator retorna um conjunto consolidado próprio; o RREO tem abrangência fiscal própria.
- Restos a pagar, despesas extraorçamentárias, transferências entre contas, saldos e documentos de liquidação exigem uma integração e uma conciliação específicas antes de qualquer afirmação de cobertura integral.
- O app foi compilado e testado localmente; publicação e validação sob o domínio definitivo não fazem parte desta entrega.
- A auditoria de dependências verifica avisos conhecidos no registro npm no momento da consulta; não certifica ausência de vulnerabilidades.

Para uma apresentação pública correta, descreva o produto como **consulta rastreável dos registros publicados pelas fontes**. Uma declaração de “cada centavo integralmente auditado” exige a conciliação contábil e documental que ainda não está disponível.
