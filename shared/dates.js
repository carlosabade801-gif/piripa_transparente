export function isoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw new Error('Use uma data no formato AAAA-MM-DD');
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new Error('Data inválida');
  return value;
}
export function fromBR(value) {
  const match = String(value).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) throw new Error('Data não reconhecida na fonte');
  return isoDate(`${match[3]}-${match[2]}-${match[1]}`);
}
export const dateBR = value => value ? value.slice(0, 10).split('-').reverse().join('/') : 'Não informado';
export function period(start, end) {
  isoDate(start); isoDate(end);
  const days = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
  if (days < 1 || days > 31) throw new Error('Consulte um intervalo de 1 a 31 dias');
  if (start.slice(0, 4) !== end.slice(0, 4)) throw new Error('Consulte um exercício por vez');
  return { start, end };
}
export function monthBounds(year, month) {
  if (!Number.isInteger(Number(year)) || Number(year) < 2010 || Number(year) > 2100 || !Number.isInteger(Number(month)) || month < 1 || month > 12) throw new Error('Mês ou ano inválido');
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  return { start, end: `${year}-${String(month).padStart(2, '0')}-${last}` };
}
