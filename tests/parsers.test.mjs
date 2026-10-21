import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from 'cheerio';
import { parseMoney, sumCents, decimalBR } from '../shared/money.js';
import { period, monthBounds, fromBR } from '../shared/dates.js';
import { parseFator, fatorUrl } from '../server/fator.js';
import { normalizeRreo, siconfiUrl } from '../server/siconfi.js';
import { filterDataset, normalizeProcurement } from '../server/service.js';
import { csvCell, csvExport } from '../src/lib/client.js';
const fixture = name => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8');
const expenseHtml = fixture('expense_exact.txt'), revenueHtml = fixture('revenue_exact.txt');
const range = { start:'2025-09-15', end:'2025-09-15' };
const expenses = parseFator(expenseHtml,'despesa',range), revenues = parseFator(revenueHtml,'receita',range);
const rreo = JSON.parse(fixture('siconfi_rreo_correto.txt')).items;

test('BRL is parsed and added in exact integer centavos, preserving negative adjustments', () => {
  assert.equal(parseMoney('R$ 1.234.567,89'),123456789);
  assert.equal(parseMoney('-3.735,94'),-373594);
  assert.equal(parseMoney(62367891.95,'decimal'),6236789195);
  assert.equal(sumCents([{v:10},{v:20}],'v'),30);
  assert.equal(decimalBR(-373594),'-3735,94');
  for (const bad of [null,undefined,'','x','1,234',Infinity,'9.999.999.999.999.999,99', 0.001]) assert.throws(() => parseMoney(bad));
  assert.throws(() => sumCents([{v:10},{v:null}],'v'));
});
test('Dates reject impossible days, include leap day and constrain each query', () => {
  assert.equal(monthBounds(2024,2).end,'2024-02-29');
  assert.equal(monthBounds(2025,2).end,'2025-02-28');
  assert.equal(fromBR('15/09/2025'),'2025-09-15');
  assert.throws(() => fromBR('31/02/2025'));
  assert.throws(() => period('2025-01-01','2025-02-01'));
  assert.throws(() => period('2025-12-31','2026-01-01'));
  assert.throws(() => period('2025-02-02','2025-02-01'));
});
test('Real expense fixture: all three stages remain independent and exact', () => {
  assert.equal(expenses.items.length,43);
  assert.deepEqual(expenses.totals,{empenhadoCentavos:5907197,liquidadoCentavos:11329088,pagoCentavos:12552302});
  const first=expenses.items[0];
  assert.equal(first.pagoCentavos,157215);
  assert.equal(first.empenhadoCentavos,0);
  assert.equal(first.liquidadoCentavos,-373594);
  assert.match(first.tipoEmpenho,/ESTIMATIVO/);
  assert.match(first.unidadeOrcamentaria,/30000.*ADMINISTRAÇÃO/);
  assert.match(first.fonte,/15000000/);
  assert.match(first.historico,/ENERGIA/i);
  assert.equal(first.contrato,null);
  assert.equal(new Set(expenses.items.map(i => i.id)).size,43);
});
test('Real receipt fixture: actual collection, not annual forecasts; budget and extra-budget separated', () => {
  assert.equal(revenues.sourceRows,155);
  assert.equal(revenues.excludedForecastRows,133);
  assert.equal(revenues.items.length,22);
  assert.deepEqual(revenues.totals,{orcamentariaCentavos:26123783,extraorcamentariaCentavos:118729});
  assert.ok(revenues.items.every(i => i.data === range.start));
  assert.match(revenues.items[0].fonte,/FNAS/);
  assert.notEqual(revenues.items[0].arrecadadoCentavos,revenues.items[0].previstoCentavos);
});
test('Parser refuses broken pages, mismatched values, absent details and movements outside query', () => {
  assert.throws(() => parseFator('<h1>Erro</h1>','despesa',range));
  assert.throws(() => parseFator(expenseHtml,'despesa',{start:'2025-09-16',end:'2025-09-16'}),/fora do período/);
  const $ = load(expenseHtml); $('table').first().find('tr').eq(1).children('td').eq(6).text('1.572,16');
  assert.throws(() => parseFator($.html(),'despesa',range),/divergem/);
  assert.throws(() => parseFator(expenseHtml.replaceAll('dialog_0','missing_0'),'despesa',range),/Identificador/);
  assert.throws(() => parseFator(revenueHtml.replace('Valor Arrecadado','Valor Não Reconhecido'),'receita',range));
});
test('Source URL uses fixed municipality, exact date limits and consolidated units', () => {
  const url=new URL(fatorUrl('receita',range));
  assert.equal(url.searchParams.get('id'),'pm_piripa');
  assert.equal(url.searchParams.get('dt_ini'),'15/09/2025');
  assert.equal(url.searchParams.get('dt_fim'),'15/09/2025');
  assert.equal(url.searchParams.get('unidade_gestora'),'0');
});
test('SICONFI uses verified municipality, annex, account and column; no inferred receipt', () => {
  const r=normalizeRreo(rreo,2025,6);
  assert.equal(r.receitaRealizada.centavos,6236789195);
  assert.equal(r.receitaPrevista.centavos,6874800000);
  for(const key of ['empenhado','liquidado','pago']) assert.equal(r[key].centavos,6018694470);
  assert.equal(new URL(siconfiUrl(2025,6)).searchParams.get('id_ente'),'2924702');
  assert.equal(normalizeRreo([],2025,6),null);
  assert.throws(() => normalizeRreo(rreo,2024,6));
  assert.throws(() => normalizeRreo([{...rreo[0],cod_ibge:123},...rreo.slice(1)],2025,6));
  const target=rreo.find(i => i.cod_conta==='TotalReceitas' && i.coluna === 'Até o Bimestre (c)');
  assert.ok(target);
  assert.throws(() => normalizeRreo([...rreo,target],2025,6),/ambígua/);
  assert.throws(() => normalizeRreo(rreo.filter(i=>i!==target),2025,6),/ausente/);
});
test('Filters and breakdowns use the entire result, not just one page; snapshot enforces consistency', () => {
  const dataset={...expenses,meta:{snapshot:'abc'}};
  const a=filterDataset(dataset,'despesa',{pagina:'1',tamanho:'10'}), b=filterDataset(dataset,'despesa',{pagina:'2',tamanho:'10',snapshot:'abc'});
  assert.equal(a.items.length,10); assert.equal(a.total,43); assert.deepEqual(a.totals,expenses.totals);
  assert.notEqual(a.items[0].id,b.items[0].id);
  assert.equal(sumCents(a.grupos.unidades,'centavos'),a.totals.pagoCentavos);
  const matched=filterDataset(dataset,'despesa',{q:'COELBA',fase:'pago'});
  assert.ok(matched.total > 0 && matched.total < 43);
  assert.ok(matched.items.every(i => i.pagoCentavos !== 0 && i.credor.includes('COELBA')));
  assert.throws(() => filterDataset(dataset,'despesa',{snapshot:'different'}),/mudou/);
  assert.throws(() => filterDataset(dataset,'despesa',{fase:'estimativo'}));
  assert.throws(() => filterDataset(dataset,'despesa',{tamanho:'999'}));
  assert.throws(() => filterDataset(dataset,'receita',{natureza:'unknown'}));
  const revenue=filterDataset({...revenues,meta:{snapshot:'x'}},'receita',{natureza:'orcamentaria'});
  assert.equal(revenue.totals.extraorcamentariaCentavos,0);
});
test('Procurement keeps estimated and homologated amounts distinct, unknown zero is not payment', () => {
  const rows=JSON.parse(fixture('sai2_2025.txt')), items=normalizeProcurement(rows,2025);
  assert.equal(items.length,53); assert.equal(items[0].estimadoCentavos,null); assert.equal(items[0].homologadoCentavos,null);
  assert.ok(items.every(i=>!('pagoCentavos' in i)));
  assert.throws(() => normalizeProcurement(rows,2024));
});
test('CSV preserves centavos and neutralizes user-controlled spreadsheet formulas', () => {
  assert.equal(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('\n +CMD'),'"\'\n +CMD"');
  assert.equal(csvCell('-3735,94',true),'"-3735,94"');
  const text=csvExport([{id:'1',pagoCentavos:157215}],{fonte:'test',urlConsulta:'https://example.test',periodo:range,snapshot:'abc'},{});
  assert.ok(text.startsWith('\ufeff')); assert.match(text,/pagoBRL/); assert.match(text,/1572,15/); assert.match(text,/snapshot/);
});
