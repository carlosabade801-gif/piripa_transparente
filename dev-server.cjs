/**
 * Servidor de proxy local para desenvolvimento.
 * Rode com: node dev-server.js
 * 
 * Simula as Vercel Serverless Functions localmente sem precisar do Vercel CLI.
 * Resolve os problemas de CORS com Fator Sistemas, SAI2, Portal Federal e SICONFI.
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

// Portal da Transparência Federal
const PORTAL_BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";
const PORTAL_KEY  = process.env.PORTAL_API_KEY || "";

// SICONFI
const SICONFI_BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt";
const IBGE_CODE    = "2924702";
const UF           = "BA";

// ── Helpers ──────────────────────────────────────────────────────────────────

function httpsGet(targetUrl, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new url.URL(targetUrl);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: { "User-Agent": "PiripaTransparente/1.0", ...extraHeaders },
    };
    https.get(opts, res => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        resolve({ buf, statusCode: res.statusCode });
      });
    }).on("error", reject);
  });
}

async function httpsGetISO(targetUrl) {
  const { buf, statusCode } = await httpsGet(targetUrl);
  if (statusCode >= 400) throw new Error(`HTTP ${statusCode}`);
  return buf.toString("utf8");
}

async function httpsGetJSON(targetUrl, headers = {}) {
  const { buf, statusCode } = await httpsGet(targetUrl, { Accept: "application/json", ...headers });
  if (statusCode >= 400) throw new Error(`HTTP ${statusCode} from ${new url.URL(targetUrl).hostname}`);
  return JSON.parse(buf.toString("utf8"));
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

function norm(txt) {
  return String(txt || "").replace(/[\n\t\r]+/g, " ").replace(/\s{2,}/g, " ").trim();
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
        norm(tdM[1].replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&nbsp;/g, " ").replace(/&#\d+;/g, ""))
      );
    }
    if (cells.length >= 4) rows.push(cells);
  }
  return rows;
}

function extractDialogs(html, parser) {
  const result = {};
  const re = /<div[^>]+id=['"](dialog_\d+)['"][^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const txt = norm(m[2].replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ").replace(/&#\d+;/g, ""));
    if (txt.length > 20) result[m[1]] = parser(txt);
  }
  return result;
}

function fld(txt, re) {
  const m = txt.match(re);
  return m ? m[1].trim().replace(/\s+/g, " ") : "";
}

function parseDespesaDialog(txt) {
  // Unidade/Secretaria
  const unidade = fld(txt, /^(.+?)(?:Relat)/);
  
  // Valor (deve pegar "Valor Empenhado: R$ X" ou "Valor: R$ X" ou similar)
  const valorM = txt.match(/Valor[^:]*:\s*R\$\s*([\d.,\-]+)/i);
  const valor = valorM ? parseBRL(valorM[1]) : 0;
  
  return {
    unidade,
    valor,
    fase:       fld(txt, /Fase[^:]*:\s*(.+?)\s*N[º°o]/i),
    empenho:    fld(txt, /N[º°o]\s*Empenho[^:]*:\s*(\S+)/i),
    processo:   fld(txt, /N[º°o]\s*do\s*Processo[^:]*:\s*(\S+)/i),
    data:       fld(txt, /Data[^:]*:\s*([\d\/]+)/i),
    credor:     fld(txt, /Credor[^:]*:\s*(.+?)\s*(?:CPF|CNPJ)/i),
    historico:  fld(txt, /(?:Bem|Servi)[^:]*:\s*(.+?)\s*Fun/i),
    funcao:     fld(txt, /Fun[^\s:]*:\s*(.+?)\s*Sub/i),
    subfuncao:  fld(txt, /Sub[^\s:]*:\s*(.+?)\s*Programa/i),
    fonte:      fld(txt, /Fonte[^:]*:\s*(.+?)\s*Categoria/i),
    elemento:   fld(txt, /Elemento[^:]*:\s*(.+?)\s*Sub/i),
    contrato:   fld(txt, /N[º°o]\s*Contrato[^:]*:\s*(.+?)\s*Processo\s*Licit/i),
    licitacao:  fld(txt, /Processo\s*Licit[^:]*:\s*(.+?)\s*Modalidade/i),
    modalidade: fld(txt, /Modalidade[^:]*:\s*(.+?)\s*(?:Consulta|$)/i),
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

// ── Mapeamento de funções ─────────────────────────────────────────────────────
const FUNCAO_MAP = {
  "educação":            { cor: "#3B82F6", icone: "BookOpen" },
  "educacao":            { cor: "#3B82F6", icone: "BookOpen" },
  "saúde":               { cor: "#EF4444", icone: "Heart" },
  "saude":               { cor: "#EF4444", icone: "Heart" },
  "administração":       { cor: "#8B5CF6", icone: "Users" },
  "administracao":       { cor: "#8B5CF6", icone: "Users" },
  "assistência social":  { cor: "#10B981", icone: "Shield" },
  "assistencia social":  { cor: "#10B981", icone: "Shield" },
  "urbanismo":           { cor: "#F59E0B", icone: "HardHat" },
  "agricultura":         { cor: "#059669", icone: "TreePine" },
  "saneamento":          { cor: "#06B6D4", icone: "Building2" },
  "cultura":             { cor: "#EC4899", icone: "Building2" },
  "transporte":          { cor: "#F97316", icone: "Building2" },
  "desporto e lazer":    { cor: "#14B8A6", icone: "Building2" },
  "legislativa":         { cor: "#6366F1", icone: "Building2" },
};

function mapFuncao(nome) {
  const key = (nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  for (const [k, v] of Object.entries(FUNCAO_MAP)) {
    if (key.includes(k.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) return v;
  }
  return { cor: "#6B7280", icone: "Building2" };
}

// ── Handlers por endpoint ─────────────────────────────────────────────────────

async function handleTotais() {
  const [emp, liq, pag, ext, rp] = await Promise.all([
    httpsGetISO(`${FATOR_BASE}/carregaDespesaSub.php?empenhadocalc&id=${FATOR_ID}`),
    httpsGetISO(`${FATOR_BASE}/carregaDespesaSub.php?liquidacaocalc&id=${FATOR_ID}`),
    httpsGetISO(`${FATOR_BASE}/carregaDespesaSub.php?pagamentocalc&id=${FATOR_ID}`),
    httpsGetISO(`${FATOR_BASE}/carregaDespesaSub.php?pagamentocalcExtra&id=${FATOR_ID}`),
    httpsGetISO(`${FATOR_BASE}/carregaDespesaSub.php?liquidacaocalcRP&id=${FATOR_ID}`),
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

  const html    = await httpsGetISO(`${FATOR_BASE}/carregaDespesa.php?${qs}`);
  const rows    = parseTableRows(html);
  const dialogs = extractDialogs(html, parseDespesaDialog);

  const items = rows.map((c, i) => {
    let valor = 0;
    if (c.length >= 7) {
      const faseUpper = (c[2] || "").toUpperCase();
      if (faseUpper.includes("LIQUIDAC")) {
        valor = parseBRL(c[5]);
      } else if (faseUpper.includes("PAGAMENTO") || faseUpper.includes("EXTRA")) {
        valor = parseBRL(c[6]);
      } else {
        valor = parseBRL(c[4]);
      }
    } else {
      valor = parseBRL(c[4]);
    }
    return {
      data: c[0] || "", processo: c[1] || "", fase: c[2] || "",
      credor: c[3] || "", valor: valor,
      valorFmt: valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      detalhe: dialogs[`dialog_${i}`] || null,
    };
  });

  return { total: items.length, items };
}

async function handleReceita(params) {
  const inicio = params.inicio || "01/01/2025";
  const fim    = params.fim    || "31/01/2025";

  const html    = await httpsGetISO(
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

async function handleCategorias(params) {
  const anoInt = parseInt(params.ano || new Date().getFullYear() - 1);
  const ini = `01/01/${anoInt}`;
  const fim = `31/12/${anoInt}`;

  const qs = new url.URLSearchParams({
    id: FATOR_ID, unidade_gestora: "0", tipo: "-1",
    fornecedor: "", cpfcnpj: "",
    data_publicacao: ini, data_publicacao_fim: fim,
    Numero: "", NProcesso: "", funcao: "-1", subfuncao: "-1",
    Despesa: "", Historico: "", fonte: "-1", acao: "-1",
    Valor: "", modalidade: "-1", Categoria_Economica: "-1",
    Grupo_Despesa: "-1", Modalidade_Aplicacao: "-1",
    Elemento: "-1", Subelemento: "-1", nContrato: "",
  });

  const html    = await httpsGetISO(`${FATOR_BASE}/carregaDespesa.php?${qs}`);
  const dialogs = extractDialogs(html, parseDespesaDialog);

  const funcoes = {};
  for (const [, det] of Object.entries(dialogs)) {
    const funcaoNome = det.funcao || "Outros";
    if (!funcoes[funcaoNome]) funcoes[funcaoNome] = 0;
    funcoes[funcaoNome] += det.valor;
  }

  if (Object.keys(funcoes).length === 0) {
    const rows = parseTableRows(html);
    const totalFromRows = rows.reduce((s, c) => s + parseBRL(c[4]), 0);
    return { source: "fator", ano: anoInt, total: totalFromRows, categorias: [] };
  }

  const total = Object.values(funcoes).reduce((s, v) => s + v, 0);
  const categorias = Object.entries(funcoes)
    .map(([nome, valor]) => {
      const mapped = mapFuncao(nome);
      return { nome, valor, pct: total > 0 ? parseFloat(((valor / total) * 100).toFixed(1)) : 0, cor: mapped.cor, icone: mapped.icone };
    })
    .sort((a, b) => b.valor - a.valor);

  return { source: "fator", ano: anoInt, total, categorias };
}

async function handleTransferencias(params) {
  if (!PORTAL_KEY) return { source: "unavailable", items: [], error: "Chave API não configurada" };
  const anoInt = parseInt(params.ano || new Date().getFullYear() - 1);
  const mes = `${anoInt}12`;
  const headers = { "chave-api-dados": PORTAL_KEY };

  // Buscar programas sociais em paralelo (endpoints que funcionam sem permissão especial)
  const [bolsaRes, bpcRes] = await Promise.allSettled([
    httpsGetJSON(`${PORTAL_BASE}/novo-bolsa-familia-por-municipio?mesAno=${mes}&codigoIbge=${IBGE_CODE}&pagina=1`, headers)
      .catch(() => httpsGetJSON(`${PORTAL_BASE}/bolsa-familia-por-municipio?mesAno=${mes}&codigoIbge=${IBGE_CODE}&pagina=1`, headers)),
    httpsGetJSON(`${PORTAL_BASE}/bpc-por-municipio?mesAno=${mes}&codigoIbge=${IBGE_CODE}&pagina=1`, headers),
  ]);

  const items = [];

  // Bolsa Família
  if (bolsaRes.status === "fulfilled" && Array.isArray(bolsaRes.value) && bolsaRes.value.length > 0) {
    const bf = bolsaRes.value[0];
    items.push({
      programa: bf.tipo?.descricao || "Bolsa Família",
      valor: parseFloat(bf.valor || 0),
      beneficiarios: parseInt(bf.quantidadeBeneficiados || 0),
      origem: "Federal",
      area: "Assistência Social",
    });
  }

  // BPC (Benefício de Prestação Continuada)
  if (bpcRes.status === "fulfilled" && Array.isArray(bpcRes.value) && bpcRes.value.length > 0) {
    const bpc = bpcRes.value[0];
    items.push({
      programa: bpc.tipo?.descricao || "BPC / LOAS",
      valor: parseFloat(bpc.valor || 0),
      beneficiarios: parseInt(bpc.quantidadeBeneficiados || 0),
      origem: "Federal",
      area: "Assistência Social",
    });
  }

  return { source: "portal_federal", ano: anoInt, total: items.length, items };
}

async function handleBolsaFamilia(params) {
  if (!PORTAL_KEY) return { source: "unavailable", item: null, error: "Chave API não configurada" };
  const mes = params.mesAno || `${params.ano || new Date().getFullYear() - 1}12`;
  let data;
  try {
    data = await httpsGetJSON(
      `${PORTAL_BASE}/novo-bolsa-familia-por-municipio?mesAno=${mes}&codigoIbge=${IBGE_CODE}&pagina=1`,
      { "chave-api-dados": PORTAL_KEY }
    );
  } catch {
    data = await httpsGetJSON(
      `${PORTAL_BASE}/bolsa-familia-por-municipio?mesAno=${mes}&codigoIbge=${IBGE_CODE}&pagina=1`,
      { "chave-api-dados": PORTAL_KEY }
    );
  }
  if (!Array.isArray(data) || data.length === 0) return { source: "portal_federal", item: null };
  const item = data[0];
  return {
    source: "portal_federal",
    item: {
      programa: "Bolsa Família / CadÚnico",
      valor: parseFloat(item.valor || item.valorTotalBolsaFamilia || 0),
      beneficiarios: parseInt(item.quantidadeBeneficiados || item.quantidadeBeneficiarios || 0),
      origem: "Federal",
      area: "Assistência Social",
    },
  };
}

async function handleHistorico(params) {
  const ai = parseInt(params.anoInicio || 2019);
  const af = parseInt(params.anoFim || new Date().getFullYear() - 1);
  const anos = [];
  for (let y = ai; y <= af; y++) anos.push(y);

  const results = await Promise.all(
    anos.map(async (y) => {
      const bimestres = y < new Date().getFullYear() ? [6, 5, 4, 3, 2, 1] : [4, 3, 2, 1];
      for (const b of bimestres) {
        try {
          const data = await httpsGetJSON(
            `${SICONFI_BASE}/rreo?an_exercicio=${y}&in_periodicidade=B&nr_periodo=${b}&co_tipo_demonstrativo=RREO&no_uf=${UF}&co_municipio=${IBGE_CODE}`
          );
          if (data?.items?.length) {
            const items = data.items;
            const soma = (filtro, campo) =>
              items.filter(filtro).reduce((s, i) => s + parseFloat(i[campo] || 0), 0);
            const receita = soma(
              i => (i.nome_conta || "").toLowerCase().includes("receita total") || i.cod_conta === "ReceitaTotal",
              "valor_orcado"
            );
            const despesa = soma(
              i => (i.nome_conta || "").toLowerCase().includes("despesa total") || i.cod_conta === "DespesaTotal",
              "valor_realizado"
            );
            if (receita > 0 || despesa > 0) {
              return { ano: String(y), receita: parseFloat((receita / 1e6).toFixed(1)), despesa: parseFloat((despesa / 1e6).toFixed(1)) };
            }
          }
        } catch { /* skip */ }
      }
      return null;
    })
  );

  return { source: "siconfi", historico: results.filter(Boolean) };
}

// ── Servidor HTTP ─────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS
  const allowedOrigins = ["http://localhost:5173", "http://localhost:3000", "https://piripa-transparente.vercel.app"];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
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
    if (endpoint === "totais")          result = await handleTotais();
    else if (endpoint === "despesa")    result = await handleDespesa(rest);
    else if (endpoint === "receita")    result = await handleReceita(rest);
    else if (endpoint === "licitacoes") result = await handleLicitacoes(rest);
    else if (endpoint === "categorias") result = await handleCategorias(rest);
    else if (endpoint === "transferencias") result = await handleTransferencias(rest);
    else if (endpoint === "bolsafamilia")   result = await handleBolsaFamilia(rest);
    else if (endpoint === "historico")      result = await handleHistorico(rest);
    else {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "endpoint inválido" }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify(result));
    console.log(`[proxy] ${endpoint} → ${result.total ?? result.categorias?.length ?? "ok"} registros`);

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
╠════════════════════════════════════════════╣
║  Endpoints disponíveis:                    ║
║  • totais, despesa, receita, licitacoes    ║
║  • categorias, transferencias              ║
║  • bolsafamilia, historico                 ║
╚════════════════════════════════════════════╝
  
  Terminal 2: npm run dev
  Browser:    http://localhost:5173
  `);
});
