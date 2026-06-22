/**
 * Vercel Serverless Function — Proxy Completo Piripá Transparente
 *
 * CORREÇÃO PRINCIPAL: O HTML do Fator Sistemas usa \n\t\r entre os campos.
 * O parser normaliza os espaços ANTES de aplicar os regex.
 *
 * Fontes:
 *  - Fator Sistemas (transparencia.fatorsistemas.com.br) → despesas + receitas
 *  - SAI2 (sai2.io.org.br) → licitações JSON puro via POST
 *  - Portal da Transparência Federal (api.portaldatransparencia.gov.br) → transferências + Bolsa Família
 *  - SICONFI (apidatalake.tesouro.gov.br) → RREO multi-ano (histórico)
 *
 * Endpoints:
 *   GET /api/fator-proxy?endpoint=totais
 *   GET /api/fator-proxy?endpoint=despesa&inicio=01/01/2025&fim=31/01/2025
 *   GET /api/fator-proxy?endpoint=receita&inicio=01/01/2025&fim=31/01/2025
 *   GET /api/fator-proxy?endpoint=licitacoes&ano=2025
 *   GET /api/fator-proxy?endpoint=categorias&ano=2024
 *   GET /api/fator-proxy?endpoint=transferencias&ano=2024
 *   GET /api/fator-proxy?endpoint=bolsafamilia&mesAno=202412
 *   GET /api/fator-proxy?endpoint=historico&anoInicio=2019&anoFim=2024
 */

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

async function fetchISO(url) {
  const res = await fetch(url, { headers: { "User-Agent": "PiripaTransparente/1.0" } });
  if (!res.ok) throw new Error(`Fator HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder("utf-8").decode(buf);
}

async function fetchJSON(url, headers = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": "PiripaTransparente/1.0", Accept: "application/json", ...headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}`);
  return res.json();
}

async function postSAI2(path, body) {
  const res = await fetch(`${SAI2_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`SAI2 HTTP ${res.status}`);
  return res.json();
}

function parseBRL(str) {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

// Normaliza \n\t\r → espaço simples (FIX PRINCIPAL)
function norm(txt) {
  return String(txt || "").replace(/[\n\t\r]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

// Extrai campo com regex no texto já normalizado
function fld(txt, re) {
  const m = txt.match(re);
  return m ? m[1].trim() : "";
}

// ── Parser de tabela HTML ─────────────────────────────────────────────────────
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
        norm(tdM[1].replace(/<[^>]+>/g, " ")
          .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&nbsp;/g, " ").replace(/&#\d+;/g, ""))
      );
    }
    if (cells.length >= 4) rows.push(cells);
  }
  return rows;
}

// ── Parser de dialogs ocultos ─────────────────────────────────────────────────
function extractDialogs(html, parser) {
  const result = {};
  const re = /<div[^>]+id=['"](dialog_\d+)['"][^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    // Normalizar imediatamente — esta é a correção do bug
    const txt = norm(
      m[2].replace(/<[^>]+>/g, " ")
          .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
          .replace(/&#\d+;/g, "")
    );
    if (txt.length > 20) result[m[1]] = parser(txt);
  }
  return result;
}

// ── Parser de despesa ─────────────────────────────────────────────────────────
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

// ── Parser de receita ─────────────────────────────────────────────────────────
function parseReceitaDialog(txt) {
  const valorM = txt.match(/Valor:\s*R\$\s*([\d.,]+)/i);
  const prevM  = txt.match(/Valor\s*Previsto:\s*([\d.,]+)/i);
  return {
    tipo:          fld(txt, /Tipo de Receita:\s*(.+?)\s*Receita:/i),
    receita:       fld(txt, /Receita:\s*(.+?)\s*Fonte/i),
    fonte:         fld(txt, /Fonte de Recurso:\s*(.+?)\s*Valor\s*Previsto/i),
    valorPrevisto: prevM ? parseBRL(prevM[1]) : 0,
    valor:         valorM ? parseBRL(valorM[1]) : 0,
    data:          fld(txt, /Data de arrecada[çc][ãa]o\s*:\s*([\d\/]+)/i),
    categoria:     fld(txt, /Categoria\s*:\s*(.+?)\s*Origem/i),
    origem:        fld(txt, /Origem\s*:\s*(.+?)\s*Esp[eé]cie/i),
    especie:       fld(txt, /Esp[eé]cie\s*:\s*(.+?)\s*(?:Rubrica|$)/i),
  };
}

// ── Gera link para o portal oficial (abre o lançamento diretamente) ──────────
function gerarLinks(item) {
  const links = [];
  const processo = item.processo || "";
  const empenho  = item.empenho  || "";

  // Link 1: Portal principal da prefeitura — página de despesas com filtro
  // Formato do processo: AAAAMMDDNNNN
  if (processo && processo.length >= 8) {
    const ano = processo.substring(0, 4);
    const mes = processo.substring(4, 6);
    const dia = processo.substring(6, 8);
    const dataFmt = `${dia}/${mes}/${ano}`;
    links.push({
      label: "Ver no portal da Prefeitura",
      url: `https://transparencia.fatorsistemas.com.br/dados/despesa.php?id=${FATOR_ID}#processo=${processo}`,
      icon: "🏛️",
    });
    links.push({
      label: "Buscar no Diário Oficial",
      url: `https://www.piripa.ba.gov.br/site/diariooficial?search=${processo}`,
      icon: "📰",
    });
  }

  // Link 2: TCM-BA SAGRES — busca por municipio + empenho
  links.push({
    label: "Consultar no TCM-BA",
    url: `https://sagres.tcm.ba.gov.br/index.asp?link=municipios&codmunicipio=2924702`,
    icon: "⚖️",
  });

  // Link 3: Link direto no portal SAI2 da prefeitura
  if (processo) {
    links.push({
      label: "Consultar no portal transparência",
      url: `https://transparencia.piripa.ba.gov.br/despesa?processo=${processo}`,
      icon: "🔍",
    });
  }

  return links;
}

// ── Mapeamento de funções para cores e ícones ─────────────────────────────────
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

// ── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const allowedOrigins = ["http://localhost:5173", "http://localhost:3000", "https://piripa-transparente.vercel.app"];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
  if (req.method === "OPTIONS") return res.status(200).end();

  const {
    endpoint   = "despesa",
    inicio     = "01/01/2025",
    fim        = "31/01/2025",
    funcao     = "-1",
    fornecedor = "",
    ano        = String(new Date().getFullYear()),
    mesAno     = "",
    anoInicio  = "2019",
    anoFim     = String(new Date().getFullYear() - 1),
  } = req.query;

  try {

    // ── TOTAIS ────────────────────────────────────────────────────────────────
    if (endpoint === "totais") {
      const [emp, liq, pag, ext, rp] = await Promise.all([
        fetchISO(`${FATOR_BASE}/carregaDespesaSub.php?empenhadocalc&id=${FATOR_ID}`),
        fetchISO(`${FATOR_BASE}/carregaDespesaSub.php?liquidacaocalc&id=${FATOR_ID}`),
        fetchISO(`${FATOR_BASE}/carregaDespesaSub.php?pagamentocalc&id=${FATOR_ID}`),
        fetchISO(`${FATOR_BASE}/carregaDespesaSub.php?pagamentocalcExtra&id=${FATOR_ID}`),
        fetchISO(`${FATOR_BASE}/carregaDespesaSub.php?liquidacaocalcRP&id=${FATOR_ID}`),
      ]);
      return res.json({
        empenhado:   parseBRL(norm(emp)),
        liquidado:   parseBRL(norm(liq)),
        pago:        parseBRL(norm(pag)),
        extraPago:   parseBRL(norm(ext)),
        rpLiquidado: parseBRL(norm(rp)),
      });
    }

    // ── DESPESAS ──────────────────────────────────────────────────────────────
    if (endpoint === "despesa") {
      const params = new URLSearchParams({
        id: FATOR_ID, unidade_gestora: "0", tipo: "-1",
        fornecedor, cpfcnpj: "",
        data_publicacao: inicio, data_publicacao_fim: fim,
        Numero: "", NProcesso: "", funcao, subfuncao: "-1",
        Despesa: "", Historico: "", fonte: "-1", acao: "-1",
        Valor: "", modalidade: "-1", Categoria_Economica: "-1",
        Grupo_Despesa: "-1", Modalidade_Aplicacao: "-1",
        Elemento: "-1", Subelemento: "-1", nContrato: "",
      });
      const html    = await fetchISO(`${FATOR_BASE}/carregaDespesa.php?${params}`);
      const rows    = parseTableRows(html);
      const dialogs = extractDialogs(html, parseDespesaDialog);

      const items = rows.map((c, i) => {
        const det = dialogs[`dialog_${i}`] || null;
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
          data:      c[0] || "",
          processo:  c[1] || "",
          fase:      c[2] || "",
          credor:    c[3] || "",
          valor:     valor,
          valorFmt:  valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          detalhe:   det,
          links:     det ? gerarLinks({ processo: det.processo || c[1], empenho: det.empenho }) : [],
        };
      });

      return res.json({ total: items.length, items });
    }

    // ── RECEITAS ──────────────────────────────────────────────────────────────
    if (endpoint === "receita") {
      const url  = `${FATOR_BASE}/carregaReceita.php?id=${FATOR_ID}&unidade_gestora=0&tipo=-1&dt_ini=${inicio}&dt_fim=${fim}&natureza=-1&tipoREC=2&valor=`;
      const html    = await fetchISO(url);
      const rows    = parseTableRows(html);
      const dialogs = extractDialogs(html, parseReceitaDialog);
      const items   = rows.map((c, i) => ({
        data:      c[0] || "",
        tipo:      c[1] || "",
        descricao: c[2] || "",
        valor:     parseBRL(c[3]),
        valorFmt:  c[3] || "0,00",
        detalhe:   dialogs[`dialog_${i}`] || null,
      }));
      return res.json({ total: items.length, items });
    }

    // ── LICITAÇÕES (SAI2) ─────────────────────────────────────────────────────
    if (endpoint === "licitacoes") {
      const data  = await postSAI2("/Licitacao/Filtro", {
        cod_orgao_org: SAI2_ORG,
        ano: parseInt(ano),
      });
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
        links: [
          {
            label: "Ver no portal da Prefeitura",
            url: `https://transparencia.piripa.ba.gov.br/licitacoes/${l.Detalhes}`,
            icon: "🏛️",
          },
          {
            label: "Ver no PNCP",
            url: `https://pncp.gov.br/app/editais?q=${encodeURIComponent(l.NumeroProcesso || "")}`,
            icon: "🇧🇷",
          },
        ],
      }));
      return res.json({ total: items.length, ano: parseInt(ano), items });
    }

    // ── CATEGORIAS (Fator Sistemas — agrupa despesas do ano por função) ───────
    if (endpoint === "categorias") {
      const anoInt = parseInt(ano);
      const ini = `01/01/${anoInt}`;
      const fim = `31/12/${anoInt}`;
      const params = new URLSearchParams({
        id: FATOR_ID, unidade_gestora: "0", tipo: "-1",
        fornecedor: "", cpfcnpj: "",
        data_publicacao: ini, data_publicacao_fim: fim,
        Numero: "", NProcesso: "", funcao: "-1", subfuncao: "-1",
        Despesa: "", Historico: "", fonte: "-1", acao: "-1",
        Valor: "", modalidade: "-1", Categoria_Economica: "-1",
        Grupo_Despesa: "-1", Modalidade_Aplicacao: "-1",
        Elemento: "-1", Subelemento: "-1", nContrato: "",
      });
      const html    = await fetchISO(`${FATOR_BASE}/carregaDespesa.php?${params}`);
      const dialogs = extractDialogs(html, parseDespesaDialog);

      // Agrupar por função
      const funcoes = {};
      for (const [, det] of Object.entries(dialogs)) {
        const funcaoNome = det.funcao || "Outros";
        if (!funcoes[funcaoNome]) funcoes[funcaoNome] = 0;
        funcoes[funcaoNome] += det.valor;
      }

      // Se não encontrou detalhes, tentar agrupar pelas linhas da tabela
      if (Object.keys(funcoes).length === 0) {
        const rows = parseTableRows(html);
        const totalFromRows = rows.reduce((s, c) => s + parseBRL(c[4]), 0);
        return res.json({
          source: "fator",
          ano: anoInt,
          total: totalFromRows,
          categorias: [],
          _note: "Sem detalhes de função disponíveis nos dialogs"
        });
      }

      const total = Object.values(funcoes).reduce((s, v) => s + v, 0);
      const categorias = Object.entries(funcoes)
        .map(([nome, valor]) => {
          const mapped = mapFuncao(nome);
          return {
            nome,
            valor,
            pct:   total > 0 ? parseFloat(((valor / total) * 100).toFixed(1)) : 0,
            cor:   mapped.cor,
            icone: mapped.icone,
          };
        })
        .sort((a, b) => b.valor - a.valor);

      return res.json({ source: "fator", ano: anoInt, total, categorias });
    }

    // ── TRANSFERÊNCIAS (Portal da Transparência Federal) ──────────────────────
    if (endpoint === "transferencias") {
      if (!PORTAL_KEY) {
        return res.json({ source: "unavailable", items: [], error: "Chave API não configurada" });
      }
      const anoInt = parseInt(ano);
      const mes = `${anoInt}12`;
      const headers = { "chave-api-dados": PORTAL_KEY };

      const [bolsaRes, bpcRes] = await Promise.allSettled([
        fetchJSON(`${PORTAL_BASE}/novo-bolsa-familia-por-municipio?mesAno=${mes}&codigoIbge=${IBGE_CODE}&pagina=1`, headers)
          .catch(() => fetchJSON(`${PORTAL_BASE}/bolsa-familia-por-municipio?mesAno=${mes}&codigoIbge=${IBGE_CODE}&pagina=1`, headers)),
        fetchJSON(`${PORTAL_BASE}/bpc-por-municipio?mesAno=${mes}&codigoIbge=${IBGE_CODE}&pagina=1`, headers),
      ]);

      const items = [];
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
      return res.json({ source: "portal_federal", ano: anoInt, total: items.length, items });
    }

    // ── BOLSA FAMÍLIA (Portal da Transparência Federal) ───────────────────────
    if (endpoint === "bolsafamilia") {
      if (!PORTAL_KEY) {
        return res.json({ source: "unavailable", item: null, error: "Chave API não configurada" });
      }
      const mes = mesAno || `${ano}12`;
      // Tenta o endpoint novo primeiro, depois o antigo
      let data;
      try {
        data = await fetchJSON(
          `${PORTAL_BASE}/novo-bolsa-familia-por-municipio?mesAno=${mes}&codigoIbge=${IBGE_CODE}&pagina=1`,
          { "chave-api-dados": PORTAL_KEY }
        );
      } catch {
        data = await fetchJSON(
          `${PORTAL_BASE}/bolsa-familia-por-municipio?mesAno=${mes}&codigoIbge=${IBGE_CODE}&pagina=1`,
          { "chave-api-dados": PORTAL_KEY }
        );
      }
      if (!Array.isArray(data) || data.length === 0) {
        return res.json({ source: "portal_federal", item: null });
      }
      const item = data[0];
      return res.json({
        source: "portal_federal",
        item: {
          programa:      "Bolsa Família / CadÚnico",
          valor:         parseFloat(item.valor || item.valorTotalBolsaFamilia || 0),
          beneficiarios: parseInt(item.quantidadeBeneficiados || item.quantidadeBeneficiarios || 0),
          origem:        "Federal",
          area:          "Assistência Social",
        },
      });
    }

    // ── HISTÓRICO MULTI-ANO (SICONFI) ─────────────────────────────────────────
    if (endpoint === "historico") {
      const ai = parseInt(anoInicio);
      const af = parseInt(anoFim);
      const anos = [];
      for (let y = ai; y <= af; y++) anos.push(y);

      const results = await Promise.all(
        anos.map(async (y) => {
          // Tentar bimestre 6, 5, 4... até achar dados
          const bimestres = y < new Date().getFullYear() ? [6, 5, 4, 3, 2, 1] : [4, 3, 2, 1];
          for (const b of bimestres) {
            try {
              const url = `${SICONFI_BASE}/rreo?an_exercicio=${y}&in_periodicidade=B&nr_periodo=${b}&co_tipo_demonstrativo=RREO&no_uf=${UF}&co_municipio=${IBGE_CODE}`;
              const data = await fetchJSON(url);
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

      const historico = results.filter(Boolean);
      return res.json({ source: "siconfi", historico });
    }

    return res.status(400).json({ error: "endpoint inválido" });

  } catch (err) {
    console.error("[fator-proxy]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
