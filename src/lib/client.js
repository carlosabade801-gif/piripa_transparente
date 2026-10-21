import { decimalBR, sumCents } from '../../shared/money.js';

export async function query(params, signal) {
  const response = await fetch(`/api/fator-proxy?${new URLSearchParams(params)}`, { signal, cache: 'no-store' });
  let data;
  try { data = await response.json(); } catch { throw new Error('O serviço não retornou uma consulta válida. Tente novamente.'); }
  if (!response.ok || data.error) throw new Error(data.error?.message || 'Consulta indisponível. Tente novamente.');
  if (!data.meta?.snapshot || !['ok', 'empty', 'partial'].includes(data.status)) throw new Error('Não foi possível confirmar a resposta da consulta.');
  return data;
}

export function saveFile(name, data, mime = 'application/json;charset=utf-8') {
  const blob = new Blob([data], { type: mime }), url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Neutralize spreadsheet formulas in text cells; numeric centavos/BRL remain numbers.
export function csvCell(value, numeric = false) {
  let text = value === null || value === undefined ? '' : String(value);
  if (!numeric && /^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function csvExport(items, meta, filters) {
  const keys = [...new Set(items.flatMap(item => Object.keys(item)))];
  const evidence = { fonte: meta.fonte, urlConsulta: meta.urlConsulta, periodo: JSON.stringify(meta.periodo), coletadoEm: meta.coletadoEm, atualizadoNaFonteEm: meta.atualizadoNaFonteEm, sha256Resposta: meta.sha256Resposta, snapshot: meta.snapshot, filtros: JSON.stringify(filters) };
  const headers = [...keys.map(k => k.endsWith('Centavos') ? k.replace('Centavos', 'BRL') : k), ...Object.keys(evidence)];
  const lines = [headers.map(k => csvCell(k)).join(';')];
  for (const item of items) lines.push([...keys.map(key => csvCell(key.endsWith('Centavos') && item[key] != null ? decimalBR(item[key]) : item[key], key.endsWith('Centavos'))), ...Object.values(evidence).map(v => csvCell(v))].join(';'));
  return '\ufeff' + lines.join('\r\n');
}

export async function exportQuery(params, current, format, onProgress = () => {}) {
  const items = [], ids = new Set();
  let pages = 1;
  for (let pagina = 1; pagina <= pages; pagina++) {
    const data = await query({ ...params, refresh: '0', pagina: String(pagina), tamanho: '100', snapshot: current.meta.snapshot });
    if (data.total !== current.total || JSON.stringify(data.totals) !== JSON.stringify(current.totals)) throw new Error('Os dados mudaram. Atualize a consulta antes de exportar.');
    pages = Math.max(1, data.paginas);
    for (const item of data.items) { if (ids.has(item.id)) throw new Error('Registro repetido na exportação.'); ids.add(item.id); items.push(item); }
    onProgress(`${pagina}/${pages}`);
  }
  if (items.length !== current.total) throw new Error('Exportação incompleta. Nenhum arquivo foi gerado.');
  if (params.endpoint === 'despesa') for (const key of ['empenhadoCentavos', 'liquidadoCentavos', 'pagoCentavos']) {
    if (sumCents(items, key) !== current.totals[key]) throw new Error('O total da exportação não confere.');
  }
  if (params.endpoint === 'receita') for (const natureza of ['orcamentaria', 'extraorcamentaria']) {
    if (sumCents(items.filter(i => i.natureza === natureza), 'arrecadadoCentavos') !== current.totals[`${natureza}Centavos`]) throw new Error('O total da exportação não confere.');
  }
  const payload = { ...current, items, pagina: undefined, paginas: undefined, tamanho: undefined, exportadoEm: new Date().toISOString() };
  const name = `piripa-${params.endpoint}-${params.inicio || params.ano}-${current.meta.snapshot.slice(0, 8)}`;
  saveFile(`${name}.${format}`, format === 'csv' ? csvExport(items, current.meta, current.appliedFilters) : JSON.stringify(payload, null, 2), format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8');
}
