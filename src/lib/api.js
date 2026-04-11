import { CONFIG } from "./config";
import { MOCK } from "./mock";

// ╔══════════════════════════════════════════════════════╗
// ║  URLS DAS APIs                                       ║
// ╚══════════════════════════════════════════════════════╝

// 1. SICONFI — Tesouro Nacional (sem chave, CORS aberto)
export const siconfiUrl = {
  rreo: (ano, bimestre = 6) =>
    `https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo` +
    `?an_exercicio=${ano}&in_periodicidade=B&nr_periodo=${bimestre}` +
    `&co_tipo_demonstrativo=RREO&no_uf=${CONFIG.uf}&co_municipio=${CONFIG.ibgeCode}`,
  rgf: (ano) =>
    `https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rgf` +
    `?an_exercicio=${ano}&in_periodicidade=Q&nr_periodo=2` +
    `&co_tipo_demonstrativo=RGF&no_uf=${CONFIG.uf}&co_municipio=${CONFIG.ibgeCode}`,
};

// 2. Portal da Transparência Federal (chave no header)
const PORTAL_KEY = CONFIG.chavePortal;
const PORTAL_BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";
const portalHeaders = { "chave-api-dados": PORTAL_KEY };

export const portalUrl = {
  // Transferências voluntárias (convênios, emendas, etc.)
  transferencias: (ano) =>
    `${PORTAL_BASE}/transferencias-voluntarias?municipio=${CONFIG.ibgeCode}&ano=${ano}&pagina=1&quantidade=100`,

  // Bolsa Família — mês mais recente (formato YYYYMM)
  bolsaFamilia: (mesAno) =>
    `${PORTAL_BASE}/bolsa-familia-por-municipio?mesAno=${mesAno}&codigoIbge=${CONFIG.ibgeCode}&pagina=1`,

  // Novo Bolsa Família (endpoint atual)
  novoBolsaFamilia: (mesAno) =>
    `${PORTAL_BASE}/novo-bolsa-familia-por-municipio?mesAno=${mesAno}&codigoIbge=${CONFIG.ibgeCode}&pagina=1`,

  // Convênios ativos
  convenios: (ano) =>
    `${PORTAL_BASE}/convenios?municipioConvenente=${CONFIG.ibgeCode}&ano=${ano}&pagina=1&quantidade=50`,

  // Emendas parlamentares
  emendas: (ano) =>
    `${PORTAL_BASE}/emendas?municipio=${CONFIG.ibgeCode}&ano=${ano}&pagina=1`,
};

// 3. IBGE (sem chave)
export const ibgeUrl = {
  municipio: `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${CONFIG.ibgeCode}`,
  populacao: `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2024/variaveis/9324?localidades=N6[${CONFIG.ibgeCode}]`,
};

// ╔══════════════════════════════════════════════════════╗
// ║  FETCH SEGURO — timeout + fallback automático        ║
// ╚══════════════════════════════════════════════════════╝
export async function safeFetch(url, options = {}, fallback = null, timeoutMs = 8000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { data: await res.json(), source: "api", ok: true };
  } catch (e) {
    clearTimeout(timer);
    return { data: fallback, source: "mock", ok: false, error: e.message };
  }
}

// Fetch com chave do Portal da Transparência
export function portalFetch(url, fallback = null) {
  return safeFetch(url, { headers: portalHeaders }, fallback);
}

// ╔══════════════════════════════════════════════════════╗
// ║  NORMALIZADORES                                      ║
// ╚══════════════════════════════════════════════════════╝
export function normalizarRREO(raw) {
  if (!raw?.items?.length) return null;
  const items = raw.items;

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

  return { receita: receita || null, despesa: despesa || null };
}

// Normaliza transferências do Portal → formato do MOCK
export function normalizarTransferencias(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  return raw.map(t => ({
    programa:  t.programa?.nome || t.descricao || t.objeto || "Transferência",
    valor:     parseFloat(t.valor || t.valorTotalTransferido || 0),
    origem:    "Federal",
    area:      t.funcao?.descricao || t.programa?.descricao || "Geral",
    dataInicio: t.dataInicio || null,
    situacao:  t.situacao?.descricao || null,
  })).filter(t => t.valor > 0);
}

// Normaliza Bolsa Família
export function normalizarBolsaFamilia(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const item = raw[0];
  return {
    programa:  "Bolsa Família / CadÚnico",
    valor:     parseFloat(item.valor || item.valorTotalBolsaFamilia || 0),
    beneficiarios: parseInt(item.quantidadeBeneficiados || item.quantidadeBeneficiarios || 0),
    origem:    "Federal",
    area:      "Assistência Social",
  };
}

// ╔══════════════════════════════════════════════════════╗
// ║  LOADER PRINCIPAL                                    ║
// ╚══════════════════════════════════════════════════════╝
// Tenta bimestres do mais recente (6) ao 1º — útil para anos em curso
async function fetchRREOComFallback(ano) {
  const anoAtual    = new Date().getFullYear();
  const bimestres   = ano < anoAtual ? [6, 5, 4, 3, 2, 1] : [4, 3, 2, 1]; // ano corrente: evita buscar bimestres futuros
  for (const b of bimestres) {
    const result = await safeFetch(siconfiUrl.rreo(ano, b), {}, null);
    if (result.ok && result.data?.items?.length) {
      const norm = normalizarRREO(result.data);
      if (norm?.receita && norm?.despesa) {
        return { norm, bimestre: b };
      }
    }
  }
  return null;
}

export async function loadMunicipioData(ano) {
  // Mês mais recente para Bolsa Família
  const mesAno = `${ano}12`;

  // SICONFI: sem chave, sem CORS, funciona direto
  // Portal Federal: tem CORS bloqueado em dev — usar proxy ou VITE_PORTAL_API_KEY em produção
  const [siconfiResult] = await Promise.all([
    fetchRREOComFallback(ano),
  ]);
  const transferResult = { ok: false };
  const bfResult = { ok: false };

  // ── Resumo orçamentário (SICONFI) ──
  let resumoFinal = { ...MOCK.resumo, ano };
  let srcFinal    = "mock";

  if (siconfiResult) {
    resumoFinal = {
      ano,
      receita:   siconfiResult.norm.receita,
      despesa:   siconfiResult.norm.despesa,
      superavit: siconfiResult.norm.receita - siconfiResult.norm.despesa,
      bimestre:  siconfiResult.bimestre,
    };
    srcFinal = "api";
  }

  // ── Transferências — usa dados mock (Portal da Transparência Federal
  // tem CORS bloqueado em dev; em produção usar VITE_PORTAL_API_KEY) ──
  let transferFinal = MOCK.transferencias;

  return {
    data: {
      ...MOCK,
      resumo:         resumoFinal,
      transferencias: transferFinal,
    },
    source: srcFinal,
    // Metadados de debug (útil no console)
    _debug: {
      siconfi:      siconfiResult ? `✅ ao vivo (bimestre ${siconfiResult.bimestre})` : "❌ mock (sem dados)",
      transferencias: transferResult.ok ? "✅ ao vivo" : `❌ mock (${transferResult.error})`,
      bolsaFamilia: bfResult.ok ? "✅ ao vivo" : `❌ mock (${bfResult.error})`,
    },
  };
}
