import { serveData } from '../server/service.js';
import { DataError } from '../server/config.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ status: 'unavailable', error: { code: 'METHOD_NOT_ALLOWED', message: 'Use uma consulta GET.' } }); }
  try {
    const params = req.query || Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
    if (Object.values(params).some(value => typeof value !== 'string')) throw new DataError('Parâmetro repetido ou inválido.', 'INVALID_QUERY', 400);
    return res.status(200).json(await serveData(params));
  } catch (error) {
    const known = error instanceof DataError;
    console.error('[consulta]', known ? error.code : 'INTERNAL_ERROR', error.message);
    return res.status(known ? error.status : 500).json({ status: 'unavailable', error: {
      code: known ? error.code : 'INTERNAL_ERROR',
      message: known ? error.message : 'Não foi possível validar esta consulta. Nenhum total foi calculado.',
    }, checkedAt: new Date().toISOString() });
  }
}
