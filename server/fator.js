import { load } from 'cheerio';
import { createHash } from 'node:crypto';
import { parseMoney, sumCents } from '../shared/money.js';
import { fromBR, dateBR } from '../shared/dates.js';
import { DataError, normalize, MUNICIPALITY, SOURCES } from './config.js';

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const labels = [
  'Relatório', 'Fase da despesa', 'N[º°o]\\s*Empenho', 'N[º°o]\\s*do\\s*Processo', 'Data', 'Credor', 'CPF', 'CNPJ',
  'Unidade Orçamentária', 'Valor Empenhado', 'Valor Liquidado', 'Valor Pago', 'Bem\\s*\\/\\s*Serviço prestado',
  'Função', 'Sub-Função', 'Programa', 'Fonte do Recurso', 'Ação\\s*\\/\\s*Projeto', 'Categoria Econômica',
  'Grupo de Despesa', 'Modalidade de Aplicação', 'Elemento de Despesa', 'Sub-elemento', 'N[º°o]\\s*Contrato',
  'Processo Licitatório', 'Modalidade', 'Tipo de Receita', 'Receita', 'Fonte de Recurso', 'Valor Previsto', 'Valor',
  'Data de arrecadação', 'Categoria', 'Origem', 'Esp[eé]cie', 'Rubrica', 'Al[ií]nea', 'Subal[ií]nea', 'Item', 'Consulta Realizada em',
];
function field(text, label) {
  const match = text.match(new RegExp(`(?:^|\\s)${label}\\s*:\\s*(.*?)(?=\\s*(?:${labels.join('|')})\\s*:|$)`, 'i'));
  const result = clean(match?.[1]);
  return result && result !== '-' ? result : null;
}
function detail($, dialogId, kind) {
  const node = $(`[id="${dialogId}"]`);
  if (node.length !== 1) throw new DataError('O detalhe de um lançamento não pôde ser relacionado à linha original.');
  const clone = node.clone();
  clone.find('button,script,style,table').remove();
  let text = clean(clone.text());
  // Do not treat a nested list of subempenhos as part of the classification fields.
  text = text.split(/(?:📋|💰)\s*(?:LIQUIDAÇÕES|PAGAMENTOS)/)[0];
  const unit = clean(node.find('strong span').first().text()) || null;
  const common = { unidadeGestora: unit, fonte: field(text, kind === 'despesa' ? 'Fonte do Recurso' : 'Fonte de Recurso') };
  if (kind === 'receita') return {
    ...common, categoria: field(text, 'Categoria'), origem: field(text, 'Origem'), especie: field(text, 'Esp[eé]cie'),
    data: field(text, 'Data de arrecadação'), arrecadado: field(text, 'Valor'), previsto: field(text, 'Valor Previsto'),
  };
  return {
    ...common, unidadeOrcamentaria: field(text, 'Unidade Orçamentária'), funcao: field(text, 'Função'),
    subfuncao: field(text, 'Sub-Função'), programa: field(text, 'Programa'), acao: field(text, 'Ação\\s*\\/\\s*Projeto'),
    historico: field(text, 'Bem\\s*\\/\\s*Serviço prestado'), elemento: field(text, 'Elemento de Despesa'),
    grupo: field(text, 'Grupo de Despesa'), categoria: field(text, 'Categoria Econômica'),
    processo: field(text, 'N[º°o]\\s*do\\s*Processo'), contrato: field(text, 'N[º°o]\\s*Contrato'),
    licitacao: field(text, 'Processo Licitatório'), modalidade: field(text, 'Modalidade'),
    tipo: field(text, 'Fase da despesa'), data: field(text, 'Data'),
    empenhado: field(text, 'Valor Empenhado'), liquidado: field(text, 'Valor Liquidado'), pago: field(text, 'Valor Pago'),
  };
}

export function fatorUrl(kind, range) {
  const params = new URLSearchParams({ id: MUNICIPALITY.fator, unidade_gestora: '0', tipo: '-1' });
  if (kind === 'receita') {
    for (const [k, v] of Object.entries({ dt_ini: dateBR(range.start), dt_fim: dateBR(range.end), natureza: '-1', tipoREC: '2', valor: '' })) params.set(k, v);
    return `${SOURCES.fator}/carregaReceita.php?${params}`;
  }
  for (const [k, v] of Object.entries({ fornecedor: '', cpfcnpj: '', data_publicacao: dateBR(range.start), data_publicacao_fim: dateBR(range.end), Numero: '', NProcesso: '', funcao: '-1', subfuncao: '-1', Despesa: '', Historico: '', fonte: '-1', acao: '-1', Valor: '', modalidade: '-1', Categoria_Economica: '-1', Grupo_Despesa: '-1', Modalidade_Aplicacao: '-1', Elemento: '-1', Subelemento: '-1', nContrato: '' })) params.set(k, v);
  return `${SOURCES.fator}/carregaDespesa.php?${params}`;
}

export function parseFator(html, kind, range) {
  if (!['despesa', 'receita'].includes(kind)) throw new DataError('Tipo de consulta inválido.');
  const $ = load(html);
  const expected = kind === 'despesa'
    ? ['data', 'empenho', 'fase', 'credor', 'vl. empenhado', 'vl. liquidado', 'vl. pago', 'informacoes']
    : ['data', 'tipo', 'receita', 'valor previsto', 'valor arrecadado', 'informacoes'];
  let table, headers;
  $('table').each((_, el) => {
    const h = $(el).find('tr').first().children('th,td').map((_, c) => normalize($(c).text())).get();
    if (expected.every(key => h.includes(key))) {
      if (table) throw new DataError('Mais de uma tabela financeira encontrada.');
      table = el; headers = h;
    }
  });
  if (!table) throw new DataError('A estrutura da fonte mudou ou não foi possível obter a tabela. Nenhum total foi calculado.');
  const rows = $(table).find('tr').filter((_, el) => $(el).closest('table')[0] === table).toArray().slice(1);
  const items = [], warnings = new Set();
  let excludedForecastRows = 0, missingClassification = 0, sourceRows = 0;
  for (const row of rows) {
    const cells = $(row).children('td').map((_, el) => clean($(el).text())).get();
    if (!cells.length) continue;
    if (cells.length === 1 && /nenhum|nao (?:ha|foram|encontrad)|sem (?:registro|resultado)/.test(normalize(cells[0]))) continue;
    if (cells.length !== headers.length) throw new DataError('Linha financeira com quantidade inesperada de colunas.');
    sourceRows++;
    const get = name => cells[headers.indexOf(name)];
    const dialogId = get('informacoes').match(/^dialog_\d+$/)?.[0];
    if (!dialogId) throw new DataError('Identificador de detalhe ausente.');
    const det = detail($, dialogId, kind);
    // The municipal portal omits the city name on this particular fund.
    const unitName = normalize(det.unidadeGestora);
    if (!unitName.includes('piripa') && unitName !== 'fundo municipal de assistencia social') throw new DataError('Unidade gestora não reconhecida no lançamento original.');
    let date;
    try { date = fromBR(get('data')); } catch { throw new DataError('A fonte retornou uma data inválida.'); }
    if (!det.data || fromBR(det.data) !== date) throw new DataError('Data da linha ausente ou divergente no detalhe original.');
    const common = { data: date, linhaFonte: sourceRows, dialogId, chaveFonte: $(`[id="${dialogId}"]`).attr('data-chave') || null, unidadeGestora: det.unidadeGestora, fonte: det.fonte };
    let item;
    try {
      if (kind === 'despesa') {
        item = { ...common, empenho: get('empenho'), tipoEmpenho: get('fase'), credor: get('credor'),
          empenhadoCentavos: parseMoney(get('vl. empenhado')), liquidadoCentavos: parseMoney(get('vl. liquidado')), pagoCentavos: parseMoney(get('vl. pago')),
          unidadeOrcamentaria: det.unidadeOrcamentaria, funcao: det.funcao, subfuncao: det.subfuncao, programa: det.programa,
          acao: det.acao, historico: det.historico, elemento: det.elemento, grupo: det.grupo, categoria: det.categoria,
          processo: det.processo, contrato: det.contrato, licitacao: det.licitacao, modalidade: det.modalidade,
        };
        for (const key of ['empenhado', 'liquidado', 'pago']) {
          if (det[key] === null || parseMoney(det[key]) !== item[`${key}Centavos`]) throw new Error('Valores da linha e do detalhe divergem');
        }
      } else {
        const type = normalize(get('tipo'));
        const natureza = type.includes('extra') ? 'extraorcamentaria' : type === 'receita orcamentaria' ? 'orcamentaria' : null;
        if (!natureza) throw new Error('Natureza de receita desconhecida');
        item = { ...common, tipo: get('tipo'), natureza, descricao: get('receita'),
          arrecadadoCentavos: parseMoney(get('valor arrecadado')), previstoCentavos: parseMoney(get('valor previsto')),
          categoria: det.categoria, origem: det.origem, especie: det.especie,
        };
        if (det.arrecadado === null || parseMoney(det.arrecadado) !== item.arrecadadoCentavos) throw new Error('Arrecadação da linha diverge do detalhe');
      }
    } catch (error) { throw new DataError(`O lançamento ${sourceRows} não passou na conferência de valores: ${error.message}.`); }
    if (date < range.start || date > range.end) {
      if (kind === 'receita' && item.arrecadadoCentavos === 0 && date === `${range.start.slice(0,4)}-01-01`) { excludedForecastRows++; continue; }
      throw new DataError('A fonte devolveu movimentação fora do período solicitado.');
    }
    if (!det.fonte || (kind === 'despesa' && (!det.unidadeOrcamentaria || !det.funcao))) missingClassification++;
    item.id = hash([MUNICIPALITY.ibge, kind, sourceRows, item]).slice(0, 24);
    items.push(item);
  }
  if (excludedForecastRows) warnings.add(`${excludedForecastRows} linhas de previsão anual sem arrecadação no período foram excluídas dos movimentos.`);
  if (missingClassification) warnings.add(`${missingClassification} registros têm classificação incompleta na fonte; consulte os detalhes originais.`);
  return { items, warnings: [...warnings], sourceRows, excludedForecastRows, missingClassification, totals: totalsFor(kind, items) };
}

export function totalsFor(kind, items) {
  if (kind === 'despesa') return { empenhadoCentavos: sumCents(items, 'empenhadoCentavos'), liquidadoCentavos: sumCents(items, 'liquidadoCentavos'), pagoCentavos: sumCents(items, 'pagoCentavos') };
  if (kind === 'receita') return {
    orcamentariaCentavos: sumCents(items.filter(i => i.natureza === 'orcamentaria'), 'arrecadadoCentavos'),
    extraorcamentariaCentavos: sumCents(items.filter(i => i.natureza === 'extraorcamentaria'), 'arrecadadoCentavos'),
  };
  return {};
}
