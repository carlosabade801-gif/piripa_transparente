# Interface para celular — 1.1.0

Atualizada em 22/10/2026 para reduzir a dificuldade de uso por cidadãos com pouca familiaridade com tecnologia.

## Como ficou o uso

1. Abrir o app mostra “Quanto entrou?” e “Onde foi gasto?”, sem esperar consultas financeiras para exibir a navegação.
2. Escolher mês e ano faz a consulta automaticamente. O período exato e o principal valor aparecem antes das ferramentas de busca.
3. Cada gasto aparece em um cartão com a data, o credor, o valor pago e o começo da finalidade. “Ver detalhes” abre a descrição completa e a classificação do recurso.
4. No celular, os detalhes ocupam a tela e oferecem “Fechar” e “Voltar para a lista”. O foco retorna ao botão que abriu o registro.
5. Início, Entradas, Gastos e Mais ficam fixos na parte inferior. O menu respeita a área reservada pelo aparelho. O botão Voltar do navegador funciona entre as telas.
6. A sessão preserva os filtros e a visualização ao trocar de tela. Ao retornar, os dados são consultados novamente; os valores financeiros não são gravados no navegador.
7. Exportar e visualizar a tabela continuam disponíveis. A exportação inclui todas as páginas.

## Leitura e desempenho

- Tema claro, textos escuros, fonte nativa e campos de entrada com pelo menos 16 px.
- Botões principais de pelo menos 48 px; rótulos escritos junto aos ícones.
- Sem fonte externa, imagens grandes, biblioteca nova de interface ou pedido financeiro na tela inicial.
- Dez cartões por página. O backend calcula totais e grupos usando todos os registros encontrados.
- Explicações técnicas ficam em seções que podem ser abertas; ausência de informação e falha de consulta continuam explícitas.
- Respeita a preferência de redução de movimento. Foco por teclado, identificação do diálogo e estados de carregamento/erro acessíveis.
- O service worker continua sem guardar respostas financeiras e elimina a versão anterior do cache ao ativar.

## Conferência realizada

Foram usados os registros reais preservados nas amostras de teste, servidos como respostas controladas para testar a interface compilada. Essas amostras não são usadas em produção.

Foram conferidos: navegação e histórico, consulta por período, busca, limpeza de filtros, filtro por área, paginação, valores negativos, separação de receitas e entradas extraorçamentárias, CSV e JSON completos, falhas de fonte, detalhes, compras, resumo fiscal e ajuda.

Larguras conferidas: 320, 360, 390, 412, 768 e 1440 px. Orientação horizontal: 844 × 390 px. As páginas não ultrapassaram a largura disponível. A tabela, quando escolhida pelo usuário, permite rolagem interna.

O relatório está em `validacao-interface.json`. Não houve teste em aparelho físico, pesquisa com cidadãos, certificação formal de acessibilidade, medição em rede móvel real ou novo levantamento das fontes externas nesta atualização. As evidências anteriores de consultas ao vivo permanecem em `validacao-fontes.json`, com suas datas originais.

## Limite preservado

A mudança de interface não constitui conciliação documental completa com contratos, notas fiscais e extratos. O aplicativo apresenta os registros retornados pelas fontes e os limites de cada consulta.
