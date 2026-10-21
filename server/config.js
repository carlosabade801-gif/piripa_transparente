export const MUNICIPALITY = Object.freeze({ name: 'Piripá', uf: 'BA', ibge: '2924702', fator: 'pm_piripa', sai: 1820 });
export const SOURCES = Object.freeze({
  city: 'https://www.piripa.ba.gov.br/',
  expense: 'https://transparencia.fatorsistemas.com.br/dados/despesa.php?id=pm_piripa',
  revenue: 'https://transparencia.fatorsistemas.com.br/dados/receita.php?id=pm_piripa',
  fator: 'https://transparencia.fatorsistemas.com.br/dados',
  siconfi: 'https://apidatalake.tesouro.gov.br/ords/siconfi/tt',
  siconfiDocs: 'https://apidatalake.tesouro.gov.br/docs/siconfi/',
  procurement: 'https://transparencia.piripa.ba.gov.br/licitacoes',
  sai: 'https://sai2.io.org.br/v3/Licitacao/Filtro',
  federal: 'https://api.portaldatransparencia.gov.br/api-de-dados',
});
export class DataError extends Error {
  constructor(message, code = 'SOURCE_INVALID', status = 502) { super(message); this.code = code; this.status = status; }
}
export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
