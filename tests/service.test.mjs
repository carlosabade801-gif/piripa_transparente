import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { serveData, clearDataCache } from '../server/service.js';
import handler from '../api/fator-proxy.js';
const html=readFileSync(new URL('fixtures/expense_exact.txt',import.meta.url),'utf8');
const params={endpoint:'despesa',inicio:'2025-09-15',fim:'2025-09-15'};

test('Source errors never become zero, fixture, or stale success; successful responses disclose cache',async () => {
  const original=globalThis.fetch; let calls=0; clearDataCache();
  try {
    globalThis.fetch=async () => {calls++;return new Response(html);};
    const first=await serveData(params); const cached=await serveData(params);
    assert.equal(calls,1);assert.equal(first.meta.cache,false);assert.equal(cached.meta.cache,true);
    assert.equal(first.meta.sha256Resposta.length,64);assert.equal(first.meta.atualizadoNaFonteEm,null);
    globalThis.fetch=async () => new Response('failure',{status:503});
    await assert.rejects(serveData({...params,refresh:'1'}),/HTTP 503/);
    await assert.rejects(serveData(params),/HTTP 503/);
    clearDataCache();globalThis.fetch=async () => new Response('<h1>Service temporarily unavailable</h1>');
    await assert.rejects(serveData(params),/estrutura/);
  } finally { globalThis.fetch=original;clearDataCache(); }
});
test('Optional federal integration without a key is unavailable, never an invented total',async () => {
  const key=process.env.PORTAL_API_KEY;delete process.env.PORTAL_API_KEY;
  try {await assert.rejects(serveData({endpoint:'beneficios',ano:'2025',mes:'12'}),error => error.code==='NOT_CONFIGURED' && error.status===503);}
  finally {if(key!==undefined)process.env.PORTAL_API_KEY=key;}
});
test('HTTP gateway rejects invalid queries and never exposes an internal stack trace',async () => {
  function res(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};}
  let r=res();await handler({method:'POST'},r);assert.equal(r.statusCode,405);
  r=res();await handler({method:'GET',query:{endpoint:['receita','despesa']}},r);assert.equal(r.statusCode,400);
  r=res();await handler({method:'GET',query:{endpoint:'http://example.test'}},r);assert.equal(r.statusCode,400);assert.equal(r.data.status,'unavailable');assert.ok(!r.data.stack);
  r=res();await handler({method:'GET',query:{...params,inicio:'2025-02-31'}},r);assert.equal(r.statusCode,400);
});
