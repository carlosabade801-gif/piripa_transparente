import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import handler from './api/fator-proxy.js';

const root = resolve('dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/fator-proxy') {
    req.query = Object.fromEntries(url.searchParams);
    for (const key of url.searchParams.keys()) if (url.searchParams.getAll(key).length > 1) req.query[key] = url.searchParams.getAll(key);
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => res.end(JSON.stringify(data));
    return handler(req, res);
  }
  if (url.pathname.startsWith('/api/')) { res.writeHead(404); return res.end(); }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  try {
    let path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    if (!extname(path)) path = resolve(root, 'index.html');
    const data = await readFile(path);
    res.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
    res.setHeader('Cache-Control', path.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('Execute npm run build para abrir o app, ou use npm run dev:full.'); }
}).listen(Number(process.env.PORT || 3001), '0.0.0.0', () => console.log(`Piripá Transparente em http://localhost:${process.env.PORT || 3001}`));
