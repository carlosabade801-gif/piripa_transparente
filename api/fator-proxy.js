/**
 * Vercel Serverless Function — Proxy Completo Piripá Transparente
 *
 * CORREÇÃO PRINCIPAL: O HTML do Fator Sistemas usa \n\t\r entre os campos.
 * O parser normaliza os espaços ANTES de aplicar os regex.
 *
 * Fontes:
 *  - Fator Sistemas (transparencia.fatorsistemas.com.br) → despesas + receitas
 *  - SAI2 (sai2.io.org.br) → licitações JSON puro via POST
 *
 * Endpoints:
 *   GET /api/fator-proxy?endpoint=totais
 *   GET /api/fator-proxy?endpoint=despesa&inicio=01/01/2025&fim=31/01/2025
 *   GET /api/fator-proxy?endpoint=receita&inicio=01/01/2025&fim=31/01/2025
 *   GET /api/fator-proxy?endpoint=licitacoes&ano=2025
 */

const FATOR_BASE = "https://transparencia.fatorsistemas.com.br/dados";
const SAI2_BASE  = "https://sai2.io.org.br/v3";
const FATOR_ID   = "pm_piripa";
const SAI2_ORG   = 1820;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchISO(url) {
  const res = await fetch(url, { headers: { "User-Agent": "PiripaTransparente/1.0" } });
  if (!res.ok) throw new Error(`Fator HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder("iso-8859-1").decode(buf);
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
  const re = /<div[^>]+id="(dialog_\d+)"[^>]*>([\s\S]*?)<\/div>/gi;
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
  // Unidade/Secretaria = tudo antes de "Relatório:" ou "Relat"
  const unidadeM = txt.match(/^(.+?)\s*Relat/i);
  const unidade  = unidadeM ? unidadeM[1].trim() : "";

  // Valor como número (campo "Valor: R$ X,XX")
  const valorM = txt.match(/Valor:\s*R\$\s*([\d.,\-]+)/i);
  const valor  = valorM ? parseBRL(valorM[1]) : 0;

  // Número do processo / empenho / liquidação
  const processoM  = txt.match(/N[º°o]\s*do\s*Processo:\s*(\S+)/i);
  const empenhoM   = txt.match(/N[º°o]\s*Empenho:\s*(\S+)/i);
  const liquidacaoM= txt.match(/N[º°o]\s*Liquida[çc][ãa]o:\s*(\S+)/i);
  const processo   = processoM?.[1]  || "";
  const empenho    = empenhoM?.[1]   || liquidacaoM?.[1] || "";

  return {
    unidade,
    valor,
    empenho,
    processo,
    fase:       fld(txt, /Fase:\s*(.+?)\s*N[º°o]/i),
    data:       fld(txt, /Data:\s*([\d\/]+)/i),
    credor:     fld(txt, /Credor:\s*(.+?)\s*(?:CPF|CNPJ):/i),
    cnpj:       fld(txt, /(?:CPF|CNPJ):\s*([\d.\\/\-xX]+)/i),
    historico:  fld(txt, /Bem\s*\/\s*Servi[çc]o\s*prestado:\s*(.+?)\s*Fun[çc][ãa]o:/i),
    funcao:     fld(txt, /Fun[çc][ãa]o:\s*(.+?)\s*Sub-Fun[çc][ãa]o:/i),
    subfuncao:  fld(txt, /Sub-Fun[çc][ãa]o:\s*(.+?)\s*Programa:/i),
    programa:   fld(txt, /Programa:\s*(.+?)\s*Fonte/i),
    fonte:      fld(txt, /Fonte do Recurso:\s*(.+?)\s*Categoria/i),
    categoria:  fld(txt, /Categoria Econ[ôo]mica:\s*(.+?)\s*Grupo/i),
    grupo:      fld(txt, /Grupo de Despesa\s*:\s*(.+?)\s*Modalidade de Aplica/i),
    elemento:   fld(txt, /Elemento de Despesa:\s*(.+?)\s*Sub-elemento:/i),
    contrato:   fld(txt, /N[º°o]\s*Contrato:\s*(.+?)\s*Processo\s*Licit/i),
    licitacao:  fld(txt, /Processo\s*Licit[a-z]+[oó][a-z]*:\s*(.+?)\s*Modalidade:/i),
    modalidade: fld(txt, /Modalidade:\s*(.+?)\s*(?:Consulta|$)/i),
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

// ── Handler principal ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
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
        return {
          data:      c[0] || "",
          processo:  c[1] || "",
          fase:      c[2] || "",
          credor:    c[3] || "",
          valor:     parseBRL(c[4]),
          valorFmt:  c[4] || "0,00",
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

    return res.status(400).json({ error: "endpoint inválido" });

  } catch (err) {
    console.error("[fator-proxy]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
