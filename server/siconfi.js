import { parseMoney } from '../shared/money.js';
import { DataError, MUNICIPALITY, normalize, SOURCES } from './config.js';

export function siconfiUrl(year, bimester, offset = 0) {
  const params = new URLSearchParams({ an_exercicio: year, nr_periodo: bimester, co_tipo_demonstrativo: 'RREO', no_anexo: 'RREO-Anexo 01', co_esfera: 'M', id_ente: MUNICIPALITY.ibge, offset });
  return `${SOURCES.siconfi}/rreo?${params}`;
}

export function normalizeRreo(items, year, bimester) {
  if (!items.length) return null;
  for (const item of items) {
    if (String(item.cod_ibge) !== MUNICIPALITY.ibge || Number(item.exercicio) !== year || Number(item.periodo) !== bimester || item.anexo !== 'RREO-Anexo 01' || item.demonstrativo !== 'RREO') {
      throw new DataError('O demonstrativo retornado não corresponde ao município, período e anexo solicitados.');
    }
  }
  const get = (account, column) => {
    const rows = items.filter(i => i.cod_conta === account && normalize(i.coluna) === normalize(column));
    if (rows.length !== 1) throw new DataError('O demonstrativo tem uma conta/coluna ausente ou ambígua. Nenhum resumo foi estimado.');
    const row = rows[0];
    return { centavos: parseMoney(row.valor, 'decimal'), conta: row.conta, codigo: row.cod_conta, coluna: row.coluna };
  };
  return {
    receitaRealizada: get('TotalReceitas', 'Até o Bimestre (c)'),
    receitaPrevista: get('TotalReceitas', 'PREVISÃO ATUALIZADA (a)'),
    empenhado: get('SubtotalDasDespesas', 'DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)'),
    liquidado: get('SubtotalDasDespesas', 'DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h)'),
    pago: get('SubtotalDasDespesas', 'DESPESAS PAGAS ATÉ O BIMESTRE (j)'),
    instituicao: items[0].instituicao,
    exercicio: year, bimestre: bimester,
  };
}
