/**
 * Servidor de proxy local para desenvolvimento.
 * Rode com: node dev-server.js
 * 
 * Simula as Vercel Serverless Functions localmente sem precisar do Vercel CLI.
 * Resolve os problemas de CORS com Fator Sistemas e SAI2.
 * 
 * Usage:
 *   Terminal 1: node dev-server.js
 *   Terminal 2: npm run dev
 *   Browser: http://localhost:5173
 */

const http  = require("http");
const https = require("https");
const url   = require("url");

const PORT       = 3001;
const FATOR_BASE = "https://transparencia.fatorsistemas.com.br/dados";
const SAI2_BASE  = "https://sai2.io.org.br/v3";
const FATOR_ID   = "pm_piripa";
const SAI2_ORG   = 1820;

// ── Helpers ──────────────────────────────────────────────────────────────────

function httpsGet(targetUrl) {
  return new Promise((resolve, reject) => {
    https.get(targetUrl, { headers: { "User-Agent": "PiripaTransparente/1.0" } }, res => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        resolve(buf.toString("latin1")); // ISO-8859-1
      });
    }).on("error", reject);
  });
}

function httpsPost(targetUrl, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new url.URL(targetUrl);
    const opts = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   "POST",
      headers:  {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(data),
        "Accept":         "application/json",
      },
    };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function parseBRL(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".")) || 0;
}

function parseTableRows(html) {
  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trM;
  while ((trM = trRe.exec(html)) !== null) {
    const cells = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdM;
    while ((tdM = tdRe.exec(trM[1])) !== null) {
      cells.push(
        tdM[1].replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "")
          .replace(/\s+/g, " ").trim()
      );
    }
    if (cells.length >= 4) rows.push(cells);
  }
  return rows;
}

function extractDialogs(html, parser) {
  const result = {};
  const re = /<div[^>]+id="(dialog_\d+)"[^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const txt = m[2].replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "").replace(/\s+/g, " ").trim();
    if (txt.length > 20) result[m[1]] = parser(txt);
  }
  return result;
}

function fld(txt, re) {
  const m = txt.match(re);
  return m ? m[1].trim().replace(/\s+/g, " ") : "";
}

function parseDespesaDialog(txt) {
  return {
    unidade:    fld(txt, /^(.+?)(?:Relat)/),
    fase:       fld(txt, /Fase[:\s]+(.+?)(?=N[º°o])/i),
    empenho:    fld(txt, /N[º°o]\s*Empenho[:\s]+(\S+)/i),
    processo:   fld(txt, /N[º°o]\s*do\s*Processo[:\s]+(\S+)/i),
    data:       fld(txt, /Data[:\s]+([\d\/]+)/i),
    credor:     fld(txt, /Credor[:\s]+(.+?)(?=CPF|CNPJ)/i),
    valor:      fld(txt, /Valor[:\s]+(R\$[^\n]+?)(?=Bem|Servi)/i),
    historico:  fld(txt, /(?:Bem|Servi)[^\n:]+[:\s]+(.+?)(?=Fun)/i),
    funcao:     fld(txt, /Fun[çc][ãa]o[:\s]+(.+?)(?=Sub-Fun)/i),
    subfuncao:  fld(txt, /Sub-Fun[çc][ãa]o[:\s]+(.+?)(?=Programa)/i),
    fonte:      fld(txt, /Fonte[^:]+[:\s]+(.+?)(?=Categ)/i),
    elemento:   fld(txt, /Elemento de Despesa[:\s]+(.+?)(?=Sub-elem)/i),
    contrato:   fld(txt, /N[º°o]\s*Contrato[:\s]+(.+?)(?=Processo\s*Licit)/i),
    licitacao:  fld(txt, /Processo\s*Licit[^:]+[:\s]+(.+?)(?=Modalidade)/i),
    modalidade: fld(txt, /Modalidade[:\s]+(.+?)(?=Consulta|$)/i),
  };
}

function parseReceitaDialog(txt) {
  return {
    tipo:          fld(txt, /Tipo de Receita[:\s]+(.+?)(?=Receita[:\s])/i),
    receita:       fld(txt, /Receita[:\s]+(.+?)(?=Fonte)/i),
    fonte:         fld(txt, /Fonte de Recurso[:\s]+(.+?)(?=Valor\s*Previsto)/i),
    valorPrevisto: parseBRL(fld(txt, /Valor\s*Previsto[:\s]+([\d.,]+)/i)),
    data:          fld(txt, /Data de arrecada[^\:]+[:\s]+([\d\/]+)/i),
    categoria:     fld(txt, /Categoria[:\s]+(.+?)(?=Origem)/i),
    origem:        fld(txt, /Origem[:\s]+(.+?)(?=Esp)/i),
  };
}

// ── Handlers por endpoint ─────────────────────────────────────────────────────

async function handleTotais() {
  const [emp, liq, pag, ext, rp] = await Promise.all([
    httpsGet(`${FATOR_BASE}/carregaDespesaSub.php?empenhadocalc&id=${FATOR_ID}`),
    httpsGet(`${FATOR_BASE}/carregaDespesaSub.php?liquidacaocalc&id=${FATOR_ID}`),
    httpsGet(`${FATOR_BASE}/carregaDespesaSub.php?pagamentocalc&id=${FATOR_ID}`),
    httpsGet(`${FATOR_BASE}/carregaDespesaSub.php?pagamentocalcExtra&id=${FATOR_ID}`),
    httpsGet(`${FATOR_BASE}/carregaDespesaSub.php?liquidacaocalcRP&id=${FATOR_ID}`),
  ]);
  return {
    empenhado:   parseBRL(emp.trim()),
    liquidado:   parseBRL(liq.trim()),
    pago:        parseBRL(pag.trim()),
    extraPago:   parseBRL(ext.trim()),
    rpLiquidado: parseBRL(rp.trim()),
  };
}

async function handleDespesa(params) {
  const inicio     = params.inicio     || "01/01/2025";
  const fim        = params.fim        || "31/01/2025";
  const funcao     = params.funcao     || "-1";
  const fornecedor = params.fornecedor || "";

  const qs = new url.URLSearchParams({
    id: FATOR_ID, unidade_gestora: "0", tipo: "-1",
    fornecedor, cpfcnpj: "",
    data_publicacao: inicio, data_publicacao_fim: fim,
    Numero: "", NProcesso: "", funcao, subfuncao: "-1",
    Despesa: "", Historico: "", fonte: "-1", acao: "-1",
    Valor: "", modalidade: "-1", Categoria_Economica: "-1",
    Grupo_Despesa: "-1", Modalidade_Aplicacao: "-1",
    Elemento: "-1", Subelemento: "-1", nContrato: "",
  });

  const html    = await httpsGet(`${FATOR_BASE}/carregaDespesa.php?${qs}`);
  const rows    = parseTableRows(html);
  const dialogs = extractDialogs(html, parseDespesaDialog);

  const items = rows.map((c, i) => ({
    data: c[0] || "", processo: c[1] || "", fase: c[2] || "",
    credor: c[3] || "", valor: parseBRL(c[4]), valorFmt: c[4] || "0,00",
    detalhe: dialogs[`dialog_${i}`] || null,
  }));

  return { total: items.length, items };
}

async function handleReceita(params) {
  const inicio = params.inicio || "01/01/2025";
  const fim    = params.fim    || "31/01/2025";

  const html    = await httpsGet(
    `${FATOR_BASE}/carregaReceita.php?id=${FATOR_ID}&unidade_gestora=0&tipo=-1&dt_ini=${inicio}&dt_fim=${fim}&natureza=-1&tipoREC=2&valor=`
  );
  const rows    = parseTableRows(html);
  const dialogs = extractDialogs(html, parseReceitaDialog);

  const items = rows.map((c, i) => ({
    data: c[0] || "", tipo: c[1] || "", descricao: c[2] || "",
    valor: parseBRL(c[3]), valorFmt: c[3] || "0,00",
    detalhe: dialogs[`dialog_${i}`] || null,
  }));

  return { total: items.length, items };
}

async function handleLicitacoes(params) {
  const ano  = parseInt(params.ano || new Date().getFullYear());
  const json = await httpsPost(`${SAI2_BASE}/Licitacao/Filtro`, {
    cod_orgao_org: SAI2_ORG,
    ano,
  });
  const data  = JSON.parse(json);
  const items = (Array.isArray(data) ? data : []).map(l => ({
    id:              l.Detalhes        || "",
    numero:          l.NumeroLicitacao || "",
    processo:        l.NumeroProcesso  || "",
    objeto:          l.Objeto          || "",
    modalidade:      l.Modalidade      || "",
    status:          l.Status          || "",
    valor:           l.ValorEstimado   || l.ValorEstimadoPncp || 0,
    valorHomologado: l.ValorHomologado || 0,
    data:            l.DataLicitacao   ? l.DataLicitacao.split("T")[0] : "",
    srp:             l.Srp === 1,
  }));
  return { total: items.length, ano, items };
}

// ── Servidor HTTP ─────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  const parsed = url.parse(req.url, true);
  if (!parsed.pathname.startsWith("/api/fator-proxy")) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  const { endpoint = "despesa", ...rest } = parsed.query;

  try {
    let result;
    if (endpoint === "totais")      result = await handleTotais();
    else if (endpoint === "despesa")  result = await handleDespesa(rest);
    else if (endpoint === "receita")  result = await handleReceita(rest);
    else if (endpoint === "licitacoes") result = await handleLicitacoes(rest);
    else {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "endpoint inválido" }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify(result));
    console.log(`[proxy] ${endpoint} → ${result.total ?? "ok"} registros`);

  } catch (err) {
    console.error(`[proxy] ERRO ${endpoint}:`, err.message);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  Piripá Transparente — Proxy Dev           ║
║  http://localhost:${PORT}/api/fator-proxy    ║
╚════════════════════════════════════════════╝
  
  Terminal 2: npm run dev
  Browser:    http://localhost:5173
  `);
});
