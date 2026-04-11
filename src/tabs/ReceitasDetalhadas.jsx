import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, ChevronDown, ChevronUp,
  TrendingUp, ExternalLink, Info
} from "lucide-react";
import Card from "../components/Card";
import { SectionTitle } from "../components/ui";
import { fmtR } from "../lib/utils";

const PROXY = "/api/fator-proxy";

const MESES = [
  { label: "Janeiro",   ini: "01/01", fim: "31/01" },
  { label: "Fevereiro", ini: "01/02", fim: "28/02" },
  { label: "Março",     ini: "01/03", fim: "31/03" },
  { label: "Abril",     ini: "01/04", fim: "30/04" },
  { label: "Maio",      ini: "01/05", fim: "31/05" },
  { label: "Junho",     ini: "01/06", fim: "30/06" },
  { label: "Julho",     ini: "01/07", fim: "31/07" },
  { label: "Agosto",    ini: "01/08", fim: "31/08" },
  { label: "Setembro",  ini: "01/09", fim: "30/09" },
  { label: "Outubro",   ini: "01/10", fim: "31/10" },
  { label: "Novembro",  ini: "01/11", fim: "30/11" },
  { label: "Dezembro",  ini: "01/12", fim: "31/12" },
];

// Paleta de cores por tipo de receita
const TIPO_COR = {
  "Receita Orçamentária":       "#10B981",
  "Receita Extra-Orçamentária": "#F59E0B",
  "DEFAULT":                    "#6B7280",
};

function getTipoCor(tipo = "") {
  return TIPO_COR[tipo] || TIPO_COR.DEFAULT;
}

// Extrai o nome legível da receita (remove código numérico do início)
function nomeReceita(desc = "") {
  const m = desc.match(/^\d+\s*[-–]\s*(.+)$/);
  return m ? m[1].trim() : desc;
}

// ── Card de receita ───────────────────────────────────────────────────────────
function ReceitaCard({ item }) {
  const [open, setOpen] = useState(false);
  const cor  = getTipoCor(item.tipo);
  const det  = item.detalhe;
  const nome = nomeReceita(item.descricao);

  // Progresso: arrecadado vs. previsto
  const pct = det?.valorPrevisto > 0
    ? Math.min((item.valor / det.valorPrevisto) * 100, 150)
    : 0;

  return (
    <div className="border border-[#1A3356] rounded-xl overflow-hidden"
      style={{ borderLeftColor: cor, borderLeftWidth: 3 }}>

      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-3 hover:bg-[#0D1F3C]/50 transition-colors text-left">
        {/* Tipo pill */}
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: cor + "22", color: cor }}>
          {item.tipo?.replace("Receita ", "") || "—"}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{nome || item.descricao}</p>
          {/* Barra de progresso vs. previsto */}
          {det?.valorPrevisto > 0 && (
            <div className="mt-1.5">
              <div className="w-full bg-[#1A3356] rounded-full h-1">
                <div className="h-1 rounded-full transition-all"
                  style={{ width: `${Math.min(pct, 100)}%`, background: pct > 100 ? "#EF4444" : cor }} />
              </div>
              <p className="text-[9px] text-slate-600 mt-0.5">
                {pct.toFixed(0)}% do previsto ({fmtR(det.valorPrevisto)})
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <p className="text-sm font-black text-white">{fmtR(item.valor)}</p>
          {open
            ? <ChevronUp size={11} className="text-slate-500" />
            : <ChevronDown size={11} className="text-slate-500" />}
        </div>
      </button>

      {/* Detalhes */}
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-[#1A3356]">
          <div className="grid grid-cols-2 gap-2">
            {item.data && (
              <div className="bg-[#060F1E] rounded-lg p-2">
                <p className="text-[10px] text-slate-500">Data</p>
                <p className="text-xs text-white mt-0.5">{item.data}</p>
              </div>
            )}
            {det?.valorPrevisto > 0 && (
              <div className="bg-[#060F1E] rounded-lg p-2">
                <p className="text-[10px] text-slate-500">Previsto</p>
                <p className="text-xs font-bold text-slate-300 mt-0.5">{fmtR(det.valorPrevisto)}</p>
              </div>
            )}
            {det?.fonte && (
              <div className="bg-[#060F1E] rounded-lg p-2 col-span-2">
                <p className="text-[10px] text-slate-500">Fonte de recurso</p>
                <p className="text-xs text-slate-300 leading-relaxed mt-0.5">{det.fonte}</p>
              </div>
            )}
            {det?.categoria && (
              <div className="bg-[#060F1E] rounded-lg p-2">
                <p className="text-[10px] text-slate-500">Categoria</p>
                <p className="text-xs text-slate-300 mt-0.5">{det.categoria}</p>
              </div>
            )}
            {det?.origem && (
              <div className="bg-[#060F1E] rounded-lg p-2">
                <p className="text-[10px] text-slate-500">Origem</p>
                <p className="text-xs text-slate-300 mt-0.5">{det.origem}</p>
              </div>
            )}
          </div>

          {/* Descrição completa */}
          {item.descricao && (
            <div className="bg-[#060F1E] rounded-lg p-2 border border-emerald-500/20">
              <p className="text-[10px] text-emerald-400 font-bold mb-1">📄 Classificação orçamentária</p>
              <p className="text-[10px] text-slate-400 font-mono leading-relaxed">{item.descricao}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Aba principal ─────────────────────────────────────────────────────────────
export default function ReceitasDetalhadas() {
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth();

  const [ano,      setAno]      = useState(anoAtual);
  const [mes,      setMes]      = useState(mesAtual > 0 ? mesAtual - 1 : 0);
  const [busca,    setBusca]    = useState("");
  const [filtroT,  setFiltroT]  = useState("TODOS");
  const [loading,  setLoading]  = useState(false);
  const [receitas, setReceitas] = useState([]);
  const [erro,     setErro]     = useState(null);
  const [pagina,   setPagina]   = useState(1);
  const POR_PAGINA = 40;

  const anosDisp = Array.from({ length: anoAtual - 2019 }, (_, i) => anoAtual - i);

  const buscar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    setPagina(1);
    const m   = MESES[mes];
    const ini = `${m.ini}/${ano}`;
    const fim = `${m.fim}/${ano}`;
    try {
      const r = await fetch(`${PROXY}?endpoint=receita&inicio=${encodeURIComponent(ini)}&fim=${encodeURIComponent(fim)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setReceitas(d.items || []);
    } catch (e) {
      setErro("Não foi possível carregar as receitas. Verifique o proxy.");
    } finally {
      setLoading(false);
    }
  }, [ano, mes]);

  useEffect(() => { buscar(); }, [buscar]);

  // Tipos únicos
  const tipos = ["TODOS", ...new Set(receitas.map(r => r.tipo).filter(Boolean))];

  const filtradas = receitas.filter(r => {
    const txt = nomeReceita(r.descricao || "").toLowerCase();
    const matchB = !busca || txt.includes(busca.toLowerCase()) || r.tipo.toLowerCase().includes(busca.toLowerCase());
    const matchT = filtroT === "TODOS" || r.tipo === filtroT;
    return matchB && matchT;
  });

  const totalFiltrado = filtradas.reduce((s, r) => s + r.valor, 0);
  const totalGeral    = receitas.reduce((s, r) => s + r.valor, 0);
  const paginadas     = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const totalPaginas  = Math.ceil(filtradas.length / POR_PAGINA);

  // Top 5 fontes de receita
  const topFontes = Object.entries(
    filtradas.reduce((acc, r) => {
      const nome = nomeReceita(r.descricao);
      if (nome) acc[nome] = (acc[nome] || 0) + r.valor;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <SectionTitle sub="De onde vem cada real arrecadado">
        💰 Receitas Detalhadas
      </SectionTitle>

      {/* Seletor de período */}
      <Card glow>
        <p className="text-xs font-bold text-slate-300 mb-3">Período de consulta:</p>
        <div className="flex gap-2">
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            className="bg-[#060F1E] border border-[#1A3356] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none flex-shrink-0">
            {anosDisp.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            className="bg-[#060F1E] border border-[#1A3356] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none flex-1">
            {MESES.map((m, i) => <option key={i} value={i}>{m.label}</option>)}
          </select>
          <button onClick={buscar} disabled={loading}
            className="p-1.5 rounded-lg bg-[#060F1E] border border-[#1A3356] hover:border-emerald-500/50 transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin text-emerald-400" : "text-slate-500"} />
          </button>
        </div>

        {/* Total arrecadado */}
        {!loading && receitas.length > 0 && (
          <div className="mt-4 bg-[#060F1E] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={13} className="text-emerald-400" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total arrecadado</p>
            </div>
            <p className="text-2xl font-black text-emerald-400">{fmtR(totalGeral)}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">
              {MESES[mes].label} de {ano} — {receitas.length.toLocaleString("pt-BR")} lançamentos
            </p>
          </div>
        )}
      </Card>

      {/* Erro */}
      {erro && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-xs text-red-400 font-bold mb-1">⚠️ {erro}</p>
        </Card>
      )}

      {/* Top fontes */}
      {!loading && topFontes.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 mb-2.5">📊 Maiores fontes de receita:</p>
          <div className="space-y-2.5">
            {topFontes.map(([nome, valor], i) => {
              const max = topFontes[0][1];
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-600 w-3.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <p className="text-xs text-slate-300 truncate flex-1 pr-2">{nome}</p>
                      <p className="text-xs font-black text-white flex-shrink-0">{fmtR(valor)}</p>
                    </div>
                    <div className="w-full bg-[#1A3356] rounded-full h-1">
                      <div className="h-1 rounded-full bg-emerald-500"
                        style={{ width: `${(valor / max) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Busca e filtros */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }}
            placeholder="Buscar por tipo de receita..."
            className="w-full bg-[#0D1F3C] border border-[#1A3356] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {tipos.map(t => (
            <button key={t} onClick={() => { setFiltroT(t); setPagina(1); }}
              className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
                filtroT === t ? "text-white" : "bg-[#0D1F3C] text-slate-400 border border-[#1A3356]"
              }`}
              style={filtroT === t ? { background: getTipoCor(t) } : {}}>
              {t === "TODOS" ? "Todas" : t.replace("Receita ", "")}
            </button>
          ))}
        </div>
      </div>

      {/* Contador */}
      {!loading && receitas.length > 0 && (
        <div className="flex justify-between">
          <p className="text-xs text-slate-500">
            {filtradas.length.toLocaleString("pt-BR")} lançamentos
          </p>
          <p className="text-xs font-black text-emerald-400">{fmtR(totalFiltrado)}</p>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-14">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-emerald-500/20 rounded-full" />
            <div className="w-10 h-10 border-2 border-t-emerald-500 rounded-full animate-spin absolute inset-0" />
          </div>
          <p className="text-xs text-slate-400">Carregando receitas da prefeitura...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginadas.map((item, i) => (
            <ReceitaCard key={`${item.data}-${(pagina-1)*POR_PAGINA+i}`} item={item} />
          ))}
          {filtradas.length === 0 && !erro && (
            <p className="text-center text-slate-500 py-12 text-sm">
              Nenhuma receita encontrada para este período.
            </p>
          )}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => { setPagina(p => Math.max(1, p-1)); window.scrollTo(0,0); }}
            disabled={pagina === 1}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#0D1F3C] border border-[#1A3356] text-slate-400 disabled:opacity-30">
            ← Anterior
          </button>
          <span className="text-xs text-slate-500 font-mono">{pagina}/{totalPaginas}</span>
          <button onClick={() => { setPagina(p => Math.min(totalPaginas, p+1)); window.scrollTo(0,0); }}
            disabled={pagina === totalPaginas}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#0D1F3C] border border-[#1A3356] text-slate-400 disabled:opacity-30">
            Próxima →
          </button>
        </div>
      )}

      {/* Nota informativa */}
      <Card className="border-slate-700/40">
        <div className="flex gap-2">
          <Info size={13} className="text-slate-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-slate-400 mb-0.5">Como ler as receitas</p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              A barra de progresso mostra quanto foi arrecadado vs. o valor previsto no orçamento.
              <span className="text-red-400"> Vermelho</span> = arrecadou mais que o previsto. &nbsp;
              Toque em qualquer linha para ver a fonte de recurso e classificação completa.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
