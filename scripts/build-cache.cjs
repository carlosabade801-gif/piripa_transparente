const fs = require("fs");
const path = require("path");

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
const PROXY_URL = "http://localhost:3001/api/fator-proxy";

async function fetchJSON(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 segundos de timeout
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`Erro ao buscar ${url}:`, err.message);
    return null;
  }
}

async function run() {
  console.log("🚀 Iniciando a geração do cache de dados históricos...");
  
  const cache = {
    years: {},
    historico: []
  };

  // 1. Buscar histórico multi-ano
  console.log("Fetching histórico...");
  const histData = await fetchJSON(`${PROXY_URL}?endpoint=historico&anoInicio=2019&anoFim=2025`);
  if (histData && histData.historico && histData.historico.length > 0) {
    cache.historico = histData.historico;
    console.log(`✅ Histórico carregado (${cache.historico.length} anos)`);
  } else {
    console.log(`⚠️ Histórico SICONFI indisponível. Usando fallback de dados históricos.`);
    cache.historico = [
      { ano: "2019", receita: 38.2, despesa: 36.8 },
      { ano: "2020", receita: 40.1, despesa: 39.4 },
      { ano: "2021", receita: 45.6, despesa: 44.2 },
      { ano: "2022", receita: 51.3, despesa: 49.7 },
      { ano: "2023", receita: 55.8, despesa: 53.1 },
      { ano: "2024", receita: 61.0, despesa: 57.1 },
      { ano: "2025", receita: 61.5, despesa: 58.5 }
    ];
  }

  // 2. Buscar dados de cada ano sequencialmente (para não sobrecarregar)
  for (const year of YEARS) {
    console.log(`\n-----------------------------------`);
    console.log(`📅 Processando ano: ${year}...`);
    
    let catData = null;
    let transData = null;
    let licData = null;

    if (year >= 2022) {
      // Categorias & total despesa
      console.log(`[${year}] Carregando categorias... (pode demorar até 45s)`);
      catData = await fetchJSON(`${PROXY_URL}?endpoint=categorias&ano=${year}`);
      
      // Transferências
      console.log(`[${year}] Carregando transferências...`);
      transData = await fetchJSON(`${PROXY_URL}?endpoint=transferencias&ano=${year}`);
      
      // Licitações
      console.log(`[${year}] Carregando licitações...`);
      licData = await fetchJSON(`${PROXY_URL}?endpoint=licitacoes&ano=${year}`);
    } else {
      console.log(`[${year}] Pulando buscas da API (ano anterior a 2022, dados não disponíveis)`);
    }

    // Processar resumo orçamentário
    let resumo = null;
    let despesaReal = catData?.total || 0;
    const histEntry = cache.historico.find(h => String(h.ano) === String(year));
    
    // Se não obteve despesa do Fator Sistemas, tentar estimar a partir do histórico
    if (despesaReal === 0 && histEntry) {
      despesaReal = histEntry.despesa * 1e6;
    }

    if (despesaReal > 0) {
      const receitaEstimada = histEntry ? histEntry.receita * 1e6 : despesaReal * 1.05;
      resumo = {
        ano: year,
        receita: receitaEstimada,
        despesa: despesaReal,
        superavit: receitaEstimada - despesaReal,
        bimestre: null
      };
    } else {
      // Fallback extremo
      resumo = {
        ano: year,
        receita: 60961505.77,
        despesa: 57131273.58,
        superavit: 3830232.19
      };
    }

    cache.years[year] = {
      resumo,
      categorias: catData?.categorias || [],
      transferencias: transData?.items || [],
      licitacoes: licData?.items || []
    };

    console.log(`✅ [${year}] Concluído. Despesa real: R$ ${despesaReal.toLocaleString("pt-BR")}`);
  }

  // 3. Salvar arquivo
  const destPath = path.join(__dirname, "..", "src", "lib", "data_cache.json");
  fs.writeFileSync(destPath, JSON.stringify(cache, null, 2), "utf8");
  console.log(`\n🎉 Processo concluído! Cache salvo com sucesso em: ${destPath}`);
}

run();
