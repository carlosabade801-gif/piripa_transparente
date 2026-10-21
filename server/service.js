import { parseFator, fatorUrl, hash, totalsFor } from './fator.js';
import { normalizeRreo, siconfiUrl } from './siconfi.js';
import { SOURCES, MUNICIPALITY, DataError, normalize } from './config.js';
import { period, isoDate } from '../shared/dates.js';
import { parseMoney, sumCents } from '../shared/money.js';

const MAX_BYTES = 32 * 1024 * 1024;
const TTL_MS = 120_000;
const cache = new Map();
const inflight = new Map();

export async function download(url, options = {}) {
  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(25_000), headers: { 'User-Agent': 'PiripaTransparente/1.0 (consulta publica)', ...options.headers } });
  } catch { throw new DataError('A fonte não respondeu no prazo. Tente novamente ou consulte um período menor.', 'SOURCE_TIMEOUT', 504); }
  if (!response.ok) throw new DataError(`A fonte respondeu com erro HTTP ${response.status}.`, 'SOURCE_HTTP', 502);
  const reader = response.body.getReader();
  const chunks = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) { await reader.cancel(); throw new DataError('A resposta é muito grande. Consulte um intervalo menor.', 'SOURCE_TOO_LARGE', 413); }
      chunks.push(value);
    }
  } catch (error) { if (error instanceof DataError) throw error; throw new DataError('A resposta da fonte foi interrompida.', 'SOURCE_INTERRUPTED', 502); }
  const bytes = Buffer.concat(chunks.map(c => Buffer.from(c)));
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { text = new TextDecoder('windows-1252').decode(bytes); }
  return { text, rawSha256: (await import('node:crypto')).createHash('sha256').update(bytes).digest('hex'), byteLength: length, fetchedAt: new Date().toISOString() };
}

function jsonResponse(raw) {
  try { return JSON.parse(raw.text); } catch { throw new DataError('A fonte não devolveu JSON válido.'); }
}

function metadata(name, url, raw, extra = {}) {
  return {
    fonte: name, urlConsulta: url, municipio: MUNICIPALITY.name, codigoIbge: MUNICIPALITY.ibge,
    coletadoEm: raw.fetchedAt, atualizadoNaFonteEm: null, sha256Resposta: raw.rawSha256,
    bytesResposta: raw.byteLength, cache: false, versaoExtrator: '1.0.0',
    cobertura: 'Registros retornados pela fonte nesta consulta. A completude da publicação municipal não é certificada pelo aplicativo.',
    ...extra,
  };
}

function yearValue(value) {
  const year = Number(value);
  if (!/^\d{4}$/.test(String(value)) || year < 2019 || year > new Date().getUTCFullYear()) throw new DataError('Exercício inválido.', 'INVALID_QUERY', 400);
  return year;
}

async function getCached(key, refresh, loader) {
  if (refresh) cache.delete(key);
  const saved = cache.get(key);
  if (!refresh && saved && Date.now() - saved.time < TTL_MS) return { ...saved.value, meta: { ...saved.value.meta, cache: true } };
  if (inflight.has(key)) return inflight.get(key);
  const promise = loader().then(value => {
    value.meta.snapshot = hash({ items: value.items, resumo: value.resumo, periodo: value.meta.periodo, consultado: value.meta.urlConsulta });
    // Small bounded in-process cache: no outdated fallback when the source fails.
    if (cache.size >= 8) cache.delete(cache.keys().next().value);
    cache.set(key, { time: Date.now(), value });
    return value;
  }).finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export function clearDataCache() { cache.clear(); inflight.clear(); }

async function fator(kind, params) {
  let range;
  try { range = period(params.inicio, params.fim); } catch (error) { throw new DataError(error.message, 'INVALID_QUERY', 400); }
  yearValue(range.start.slice(0, 4));
  const url = fatorUrl(kind, range);
  return getCached(url, params.refresh === '1', async () => {
    const raw = await download(url);
    const parsed = parseFator(raw.text, kind, range);
    return {
      status: parsed.items.length ? 'ok' : 'empty', items: parsed.items, totals: parsed.totals, warnings: parsed.warnings,
      meta: metadata('Fator Sistemas — portal indicado pela Prefeitura de Piripá', url, raw, {
        periodo: range, urlPortal: kind === 'despesa' ? SOURCES.expense : SOURCES.revenue,
        linhasNaFonte: parsed.sourceRows, previsoesAnuaisExcluidas: parsed.excludedForecastRows,
        registrosSemClassificacaoCompleta: parsed.missingClassification,
        abrangencia: 'Consolidado retornado pelo portal municipal; unidades gestoras identificadas em cada registro.',
      }),
    };
  });
}

async function rreo(params) {
  const year = yearValue(params.ano); const bimester = Number(params.bimestre);
  if (!Number.isInteger(bimester) || bimester < 1 || bimester > 6) throw new DataError('Bimestre inválido.', 'INVALID_QUERY', 400);
  const firstUrl = siconfiUrl(year, bimester);
  return getCached(firstUrl, params.refresh === '1', async () => {
    const items = [], pages = []; let offset = 0, hasMore;
    do {
      if (pages.length >= 10) throw new DataError('O demonstrativo excedeu o limite de páginas; o resumo foi interrompido para evitar dados incompletos.');
      const url = siconfiUrl(year, bimester, offset), raw = await download(url), data = jsonResponse(raw);
      if (!Array.isArray(data.items) || typeof data.hasMore !== 'boolean' || (data.hasMore && !data.items.length)) throw new DataError('Formato inesperado no SICONFI.');
      if (data.offset !== undefined && Number(data.offset) !== offset) throw new DataError('Paginação inconsistente no SICONFI.');
      items.push(...data.items); pages.push({ url, sha256: raw.rawSha256, coletadoEm: raw.fetchedAt });
      hasMore = data.hasMore; offset += data.items.length;
    } while (hasMore);
    const resumo = normalizeRreo(items, year, bimester);
    return {
      status: resumo ? 'ok' : 'empty', resumo, items, warnings: resumo ? [] : ['O SICONFI não retornou este demonstrativo. Selecione outro bimestre ou consulte a fonte.'],
      meta: metadata('SICONFI — Tesouro Nacional', firstUrl, { fetchedAt: pages[0].coletadoEm, rawSha256: pages[0].sha256 }, {
        periodo: { ano: year, bimestre: bimester }, paginas: pages, anexo: 'RREO-Anexo 01',
        abrangencia: 'Demonstrativo fiscal do ente municipal, acumulado até o bimestre selecionado. Não representa saldo bancário.',
        cobertura: 'Contas e colunas identificadas no RREO. Não some as etapas da despesa nem compare automaticamente com outro universo de consulta.',
      }),
    };
  });
}

export function normalizeProcurement(data, year) {
  if (!Array.isArray(data)) throw new DataError('Formato inesperado no portal de licitações.');
  const ids = new Set();
  return data.map((row, index) => {
    if (!row.Detalhes || !row.Objeto || !row.DataLicitacao || !String(row.DataLicitacao).startsWith(`${year}-`)) throw new DataError('Licitação sem identificador, objeto ou data correspondente ao exercício.');
    if (ids.has(String(row.Detalhes))) throw new DataError('Identificador de licitação duplicado na fonte.');
    ids.add(String(row.Detalhes));
    isoDate(row.DataLicitacao.slice(0,10));
    const amount = value => value === null || value === undefined || value === '' || Number(value) === 0 ? null : parseMoney(value, 'decimal');
    return {
      id: String(row.Detalhes), linhaFonte: index + 1, numero: row.NumeroLicitacao || null, processo: row.NumeroProcesso || null,
      objeto: row.Objeto, modalidade: row.Modalidade || null, situacao: row.Status || null, data: row.DataLicitacao.slice(0, 10),
      estimadoCentavos: amount(row.ValorEstimado) ?? amount(row.ValorEstimadoPncp), homologadoCentavos: amount(row.ValorHomologado),
      registroPrecos: row.Srp === 1, url: `${SOURCES.procurement}/${encodeURIComponent(row.Detalhes)}`,
    };
  });
}

async function procurement(params) {
  const year = yearValue(params.ano);
  return getCached(`sai:${year}`, params.refresh === '1', async () => {
    const body = { cod_orgao_org: MUNICIPALITY.sai, ano: year };
    const raw = await download(SOURCES.sai, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
    const items = normalizeProcurement(jsonResponse(raw), year);
    return {
      status: items.length ? 'ok' : 'empty', items,
      warnings: ['Valores estimados e homologados não comprovam contratação ou pagamento. Zero/ausência no campo de valor é exibido como não informado.'],
      meta: metadata('SAI2 — licitações do portal municipal', SOURCES.procurement, raw, { periodo: { ano: year }, requisicao: { url: SOURCES.sai, method: 'POST', body }, abrangencia: 'Licitações retornadas pelo órgão 1820. Contratos, aditivos e pagamentos exigem documentos específicos.' }),
    };
  });
}

async function benefits(params) {
  const year = yearValue(params.ano), month = Number(params.mes);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new DataError('Mês inválido.', 'INVALID_QUERY', 400);
  const key = process.env.PORTAL_API_KEY;
  if (!key) throw new DataError('A consulta de benefícios federais ainda não foi configurada. Use o link do Portal da Transparência.', 'NOT_CONFIGURED', 503);
  const competence = `${year}${String(month).padStart(2, '0')}`;
  return getCached(`benefits:${competence}`, params.refresh === '1', async () => {
    const definitions = [{ name: 'Bolsa Família', path: 'novo-bolsa-familia-por-municipio' }, { name: 'BPC', path: 'bpc-por-municipio' }];
    const records = await Promise.all(definitions.map(async program => {
      const url = `${SOURCES.federal}/${program.path}?mesAno=${competence}&codigoIbge=${MUNICIPALITY.ibge}&pagina=1`;
      try {
        const raw = await download(url, { headers: { 'chave-api-dados': key } }), rows = jsonResponse(raw);
        if (!Array.isArray(rows)) throw new DataError('Formato inesperado');
        if (rows.length === 0) return { programa: program.name, status: 'empty', valorCentavos: null, beneficiarios: null, url };
        if (rows.length !== 1) throw new DataError('Resultado municipal ambíguo');
        const row = rows[0];
        const ibge = row.municipio?.codigoIBGE ?? row.municipio?.codigoIbge;
        if (String(ibge) !== MUNICIPALITY.ibge || !String(row.dataReferencia || '').startsWith(`${year}-${String(month).padStart(2, '0')}`)) throw new DataError('Município/competência não confirmados');
        const beneficiaries = Number(row.quantidadeBeneficiados);
        if (!Number.isSafeInteger(beneficiaries) || beneficiaries < 0) throw new DataError('Quantidade não confirmada');
        return { programa: program.name, status: 'ok', valorCentavos: parseMoney(row.valor, 'decimal'), beneficiarios: beneficiaries, url, coletadoEm: raw.fetchedAt, sha256Resposta: raw.rawSha256 };
      } catch { return { programa: program.name, status: 'unavailable', valorCentavos: null, beneficiarios: null, url }; }
    }));
    return {
      status: records.every(r => r.status === 'ok') ? 'ok' : 'partial', items: records,
      warnings: ['Benefícios pagos pela União aos cidadãos. Não integram os totais de receita ou despesa da prefeitura. Pessoas podem aparecer em diferentes competências.'],
      meta: { fonte: 'Portal da Transparência Federal — CGU', urlConsulta: 'https://portaldatransparencia.gov.br/beneficios', coletadoEm: new Date().toISOString(), atualizadoNaFonteEm: null, periodo: { ano: year, mes: month }, cache: false, abrangencia: 'Benefícios agregados por município de residência e competência mensal.' },
    };
  });
}

export function filterDataset(dataset, kind, params) {
  if (params.snapshot && params.snapshot !== dataset.meta.snapshot) throw new DataError('A fonte mudou durante a consulta. Atualize para carregar uma única versão dos dados.', 'SNAPSHOT_CHANGED', 409);
  const q = normalize(params.q).slice(0, 200);
  const allowedPhases = ['todos', 'empenhado', 'liquidado', 'pago'];
  if (params.fase && !allowedPhases.includes(params.fase)) throw new DataError('Etapa inválida.', 'INVALID_QUERY', 400);
  if (params.natureza && !['todas', 'orcamentaria', 'extraorcamentaria'].includes(params.natureza)) throw new DataError('Natureza inválida.', 'INVALID_QUERY', 400);
  if (params.tema && params.tema !== 'juninos') throw new DataError('Tema inválido.', 'INVALID_QUERY', 400);
  const options = field => [...new Set(dataset.items.map(i => i[field]).filter(Boolean))].sort((a,b) => a.localeCompare(b,'pt-BR'));
  const filtered = dataset.items.filter(item => {
    if (q && !normalize(Object.values(item).join(' ')).includes(q)) return false;
    if (params.unidade && item.unidadeOrcamentaria !== params.unidade) return false;
    if (params.funcao && item.funcao !== params.funcao) return false;
    if (params.fonte && item.fonte !== params.fonte) return false;
    if (params.natureza && params.natureza !== 'todas' && item.natureza !== params.natureza) return false;
    if (kind === 'despesa' && params.fase && params.fase !== 'todos' && item[`${params.fase}Centavos`] === 0) return false;
    if (params.tema === 'juninos' && !/(sao joao|sao pedro|junin|festejos juninos)/.test(normalize(item.objeto))) return false;
    return true;
  });
  const page = Number(params.pagina || 1), size = Number(params.tamanho || 25);
  if (!Number.isInteger(page) || page < 1 || page > 100000 || !Number.isInteger(size) || size < 1 || size > 100) throw new DataError('Paginação inválida.', 'INVALID_QUERY', 400);
  const group = (field, metric) => {
    const groups = new Map();
    for (const item of filtered) {
      const nature = kind === 'receita' ? (item.natureza === 'orcamentaria' ? 'Orçamentária · ' : 'Extraorçamentária · ') : '';
      const label = nature + (item[field] || 'Não informado na fonte');
      if (!groups.has(label)) groups.set(label, []); groups.get(label).push(item);
    }
    return [...groups].map(([nome, rows]) => ({ nome, centavos: sumCents(rows, metric), registros: rows.length })).sort((a,b) => b.centavos - a.centavos);
  };
  const metric = kind === 'despesa' ? `${params.fase && params.fase !== 'todos' ? params.fase : 'pago'}Centavos` : 'arrecadadoCentavos';
  return {
    ...dataset, items: filtered.slice((page - 1) * size, page * size),
    totals: totalsFor(kind, filtered), periodTotals: dataset.totals || null,
    total: filtered.length, totalPeriodo: dataset.items.length, pagina: page, tamanho: size, paginas: Math.ceil(filtered.length / size),
    filters: { unidades: options('unidadeOrcamentaria'), funcoes: options('funcao'), fontes: options('fonte') },
    appliedFilters: { q: params.q || '', fase: params.fase || 'todos', natureza: params.natureza || 'todas', unidade: params.unidade || '', funcao: params.funcao || '', fonte: params.fonte || '', tema: params.tema || '' },
    grupos: kind === 'despesa' ? { metrica: metric, unidades: group('unidadeOrcamentaria', metric), fontes: group('fonte', metric) } : kind === 'receita' ? { metrica: metric, origens: group('origem', metric), fontes: group('fonte', metric) } : null,
  };
}

export async function serveData(params) {
  switch (params.endpoint) {
    case 'despesa': case 'receita': return filterDataset(await fator(params.endpoint, params), params.endpoint, params);
    case 'resumo': return rreo(params);
    case 'licitacoes': return filterDataset(await procurement(params), 'licitacoes', params);
    case 'beneficios': return benefits(params);
    default: throw new DataError('Consulta inválida.', 'INVALID_QUERY', 400);
  }
}
