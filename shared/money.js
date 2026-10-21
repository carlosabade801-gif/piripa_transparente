// All financial calculations use integer centavos. Missing values remain missing.
export function parseMoney(value, locale = 'br') {
  if (value === null || value === undefined || value === '') throw new Error('Valor monetário ausente');
  let text = String(value).trim().replace(/R\$\s*/gi, '').replace(/[\s\u00a0]/g, '');
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Valor monetário inválido');
    text = String(value);
    locale = 'decimal';
  }
  if (locale === 'br') {
    if (!/^-?(?:\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{1,2})?$/.test(text)) throw new Error(`Moeda BRL inválida: ${text}`);
    text = text.replaceAll('.', '').replace(',', '.');
  }
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('Valor monetário fora do formato esperado');
  const negative = text.startsWith('-');
  const [whole, decimal = ''] = text.replace(/^-/, '').split('.');
  const cents = Number(BigInt(whole) * 100n + BigInt(decimal.padEnd(2, '0')));
  if (!Number.isSafeInteger(cents)) throw new Error('Valor monetário fora do limite seguro');
  return negative ? -cents : cents;
}

export function sumCents(items, key) {
  return items.reduce((total, item) => {
    const value = item[key];
    if (!Number.isSafeInteger(value) || !Number.isSafeInteger(total + value)) throw new Error('Soma monetária inválida');
    return total + value;
  }, 0);
}

export function money(cents) {
  if (cents === null || cents === undefined) return 'Não informado';
  if (!Number.isSafeInteger(cents)) throw new Error('Valor monetário inválido');
  const value = BigInt(cents), absolute = value < 0n ? -value : value;
  const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(absolute / 100n);
  return `${value < 0n ? '-' : ''}R$\u00a0${whole},${String(absolute % 100n).padStart(2, '0')}`;
}

export function decimalBR(cents) {
  if (!Number.isSafeInteger(cents)) throw new Error('Valor monetário inválido');
  const amount = BigInt(cents), absolute = amount < 0n ? -amount : amount;
  return `${amount < 0n ? '-' : ''}${absolute / 100n},${String(absolute % 100n).padStart(2, '0')}`;
}
