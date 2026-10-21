import { mkdir, writeFile } from 'node:fs/promises';
import { serveData, clearDataCache } from '../server/service.js';
import { money } from '../shared/money.js';

clearDataCache();
const checks = [
  { endpoint: 'despesa', inicio: '2025-09-15', fim: '2025-09-15' },
  { endpoint: 'receita', inicio: '2025-09-15', fim: '2025-09-15' },
  { endpoint: 'resumo', ano: '2025', bimestre: '6' },
  { endpoint: 'licitacoes', ano: '2025' },
];
const results = await Promise.all(checks.map(async params => {
  try {
    const data = await serveData({ ...params, refresh: '1' });
    if (data.status !== 'ok') throw new Error(`Consulta retornou ${data.status}`);
    return { consulta: params, sucesso: true, status: data.status, registros: data.total ?? data.items.length, totais: data.totals, resumo: data.resumo, avisos: data.warnings, meta: data.meta };
  } catch(error) { return { consulta: params, sucesso: false, erro: error.message }; }
}));
const report = { executadoEm: new Date().toISOString(), escopo: 'Consulta às fontes externas. Evidência pontual; não certifica todos os registros, anos, documentos ou a completude da publicação.', consultas: results, beneficios: 'Integração autenticada não testada sem PORTAL_API_KEY.' };
await mkdir('docs', { recursive: true });
await writeFile('docs/validacao-fontes.json', JSON.stringify(report, null, 2) + '\n');
for (const result of results) console.log(JSON.stringify({ endpoint: result.consulta.endpoint, sucesso: result.sucesso, registros: result.registros, totais: result.totais && Object.fromEntries(Object.entries(result.totais).map(([k,v]) => [k,money(v)])), erro: result.erro }));
if (results.some(r => !r.sucesso)) process.exitCode = 1;
