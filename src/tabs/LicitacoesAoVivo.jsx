import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, ExternalLink, ChevronDown, ChevronUp,
  Gavel, CheckCircle, Clock, AlertCircle, FileText, DollarSign
} from "lucide-react";
import Card from "../components/Card";
import { SectionTitle } from "../components/ui";
import { fmtR } from "../lib/utils";

const PROXY = "/api/fator-proxy";

// Status → cor + ícone
const STATUS_META = {
  "Em Andamento":  { cor: "#F59E0B", Icon: Clock,         bg: "#F59E0B22" },
  "Concluída":     { cor: "#10B981", Icon: CheckCircle,   bg: "#10B98122" },
  "Homologada":    { cor: "#10B981", Icon: CheckCircle,   bg: "#10B98122" },
  "Suspensa":      { cor: "#EF4444", Icon: AlertCircle,   bg: "#EF444422" },
  "Revogada":      { cor: "#EF4444", Icon: AlertCircle,   bg: "#EF444422" },
  "Fracassada":    { cor: "#6B7280", Icon: AlertCircle,   bg: "#6B728022" },
  "DEFAULT":       { cor: "#06B6D4", Icon: Gavel,         bg: "#06B6D422" },
};

function getStatusMeta(status = "") {
  return STATUS_META[status] || STATUS_META.DEFAULT;
}

const MODALIDADE_COR = {
  "Pregão Eletrônico":    "#3B82F6",
  "Credenciamento":       "#8B5CF6",
  "Concorrência Pública": "#F59E0B",
  "Dispensa":             "#10B981",
  "Inexigibilidade":      "#EC4899",
  "DEFAULT":              "#6B7280",
};

function getModalidadeCor(mod = "") {
  return MODALIDADE_COR[mod] || MODALIDADE_COR.DEFAULT;
}

// ── Card de licitação ─────────────────────────────────────────────────────────
function LicitacaoCard({ item }) {
  const [open, setOpen] = useState(false);
  const sm = getStatusMeta(item.status);
  const mc = getModalidadeCor(item.modalidade);
  const StatusIcon = sm.Icon;

  return (
    <div className="border border-[#1A3356] rounded-xl overflow-hidden"
      style={{ borderLeftColor: mc, borderLeftWidth: 3 }}>

      {/* Cabeçalho clicável */}
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 p-3 hover:bg-[#0D1F3C]/50 transition-colors text-left">
        {/* Ícone status */}
        <div className="p-1.5 rounded-lg flex-shrink-0 mt-0.5"
          style={{ background: sm.bg }}>
          <StatusIcon size={14} style={{ color: sm.cor }} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: mc + "22", color: mc }}>
              {item.modalidade}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: sm.bg, color: sm.cor }}>
              {item.status}
            </span>
            {item.srp && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400">
                SRP
              </span>
            )}
          </div>

          {/* Objeto */}
          <p className="text-xs font-semibold text-white leading-snug line-clamp-2">
            {item.objeto || "Objeto não informado"}
          </p>

          {/* Número + data */}
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] font-mono text-slate-500">Nº {item.numero}</p>
            {item.data && (
              <p className="text-[10px] text-slate-600">
                {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
        </div>

        {/* Valor + chevron */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {item.valor > 0 && (
            <p className="text-xs font-black text-cyan-400">{fmtR(item.valor)}</p>
          )}
          {item.valorHomologado > 0 && (
            <p className="text-[10px] text-emerald-400 font-bold">{fmtR(item.valorHomologado)}</p>
          )}
          {open
            ? <ChevronUp size={11} className="text-slate-500" />
            : <ChevronDown size={11} className="text-slate-500" />}
        </div>
      </button>

      {/* Detalhes expandidos */}
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-[#1A3356]">
          <div className="grid grid-cols-2 gap-2">
            {item.numero && (
              <div className="bg-[#060F1E] rounded-lg p-2">
                <p className="text-[10px] text-slate-500">Nº Licitação</p>
                <p className="text-xs text-white font-mono mt-0.5">{item.numero}</p>
              </div>
            )}
            {item.processo && (
              <div className="bg-[#060F1E] rounded-lg p-2">
                <p className="text-[10px] text-slate-500">Nº Processo</p>
                <p className="text-xs text-white font-mono mt-0.5">{item.processo}</p>
              </div>
            )}
            {item.data && (
              <div className="bg-[#060F1E] rounded-lg p-2">
                <p className="text-[10px] text-slate-500">Data</p>
                <p className="text-xs text-white mt-0.5">
                  {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
            )}
            {item.valor > 0 && (
              <div className="bg-[#060F1E] rounded-lg p-2">
                <p className="text-[10px] text-slate-500">Valor estimado</p>
                <p className="text-xs font-black text-cyan-400 mt-0.5">{fmtR(item.valor)}</p>
              </div>
            )}
            {item.valorHomologado > 0 && (
              <div className="bg-[#060F1E] rounded-lg p-2 col-span-2">
                <p className="text-[10px] text-slate-500">Valor homologado</p>
                <p className="text-xs font-black text-emerald-400 mt-0.5">{fmtR(item.valorHomologado)}</p>
              </div>
            )}
          </div>

          {item.objeto && (
            <div className="bg-[#060F1E] rounded-lg p-2 border border-cyan-500/20">
              <p className="text-[10px] text-cyan-400 font-bold mb-1">📋 Objeto da licitação</p>
              <p className="text-xs text-slate-200 leading-relaxed">{item.objeto}</p>
            </div>
          )}

          {item.id && (
            <a href={`https://transparencia.piripa.ba.gov.br/licitacoes/${item.id}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[10px] text-cyan-400 hover:underline">
              <ExternalLink size={10} /> Ver no portal oficial
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Aba principal ─────────────────────────────────────────────────────────────
export default function LicitacoesAoVivo() {
  const anoAtual = new Date().getFullYear();
  const anosDisp = Array.from({ length: anoAtual - 2019 }, (_, i) => anoAtual - i);

  const [ano,      setAno]      = useState(anoAtual);
  const [busca,    setBusca]    = useState("");
  const [filtroM,  setFiltroM]  = useState("TODOS");
  const [filtroS,  setFiltroS]  = useState("TODOS");
  const [loading,  setLoading]  = useState(false);
  const [dados,    setDados]    = useState([]);
  const [erro,     setErro]     = useState(null);
  const [pagina,   setPagina]   = useState(1);
  const POR_PAGINA = 20;

  const buscar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    setPagina(1);
    try {
      const r = await fetch(`${PROXY}?endpoint=licitacoes&ano=${ano}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setDados(d.items || []);
    } catch (e) {
      setErro("Não foi possível carregar as licitações. Verifique se o proxy está deployado.");
    } finally {
      setLoading(false);
    }
  }, [ano]);

  useEffect(() => { buscar(); }, [buscar]);

  // Modalidades únicas para filtro
  const modalidades = ["TODOS", ...new Set(dados.map(d => d.modalidade).filter(Boolean))];
  const statuses    = ["TODOS", ...new Set(dados.map(d => d.status).filter(Boolean))];

  const filtrados = dados.filter(d => {
    const txt = (d.objeto + " " + d.numero + " " + d.processo).toLowerCase();
    const matchB = !busca || txt.includes(busca.toLowerCase());
    const matchM = filtroM === "TODOS" || d.modalidade === filtroM;
    const matchS = filtroS === "TODOS" || d.status === filtroS;
    return matchB && matchM && matchS;
  });

  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);

  // Totais por modalidade
  const porModalidade = dados.reduce((acc, d) => {
    acc[d.modalidade] = (acc[d.modalidade] || 0) + 1;
    return acc;
  }, {});

  const totalValor = dados.reduce((s, d) => s + (d.valor || 0), 0);

  return (
    <div className="space-y-6">
      <SectionTitle sub="Dados ao vivo do portal oficial">
        📋 Licitações em Tempo Real
      </SectionTitle>

      {/* Seletor de ano + refresh */}
      <div className="flex gap-2">
        <select value={ano} onChange={e => { setAno(Number(e.target.value)); }}
          className="bg-[#0D1F3C] border border-[#1A3356] text-white text-xs rounded-lg px-3 py-2 focus:outline-none flex-1">
          {anosDisp.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={buscar} disabled={loading}
          className="p-2 rounded-lg bg-[#0D1F3C] border border-[#1A3356] hover:border-cyan-500/50 transition-colors">
          <RefreshCw size={14} className={loading ? "animate-spin text-cyan-400" : "text-slate-500"} />
        </button>
      </div>

      {/* Cards de resumo */}
      {!loading && dados.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <FileText size={13} className="text-cyan-400" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</p>
            </div>
            <p className="text-xl font-black text-white">{dados.length}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">licitações em {ano}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={13} className="text-emerald-400" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valor estimado</p>
            </div>
            <p className="text-sm font-black text-emerald-400">{fmtR(totalValor)}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">total do ano</p>
          </Card>

          {/* Por modalidade */}
          {Object.entries(porModalidade).map(([mod, qtd]) => (
            <div key={mod} className="bg-[#0D1F3C] border border-[#1A3356] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: getModalidadeCor(mod) }} />
                <p className="text-[10px] font-bold text-slate-500 truncate">{mod}</p>
              </div>
              <p className="text-lg font-black text-white">{qtd}</p>
            </div>
          ))}
        </div>
      )}

      {/* Erro */}
      {erro && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-xs text-red-400 font-bold mb-1">⚠️ {erro}</p>
          <p className="text-xs text-slate-500">
            O proxy <code className="text-cyan-400 bg-cyan-400/10 px-1 rounded">/api/fator-proxy</code> precisa
            estar deployado no Vercel.
          </p>
        </Card>
      )}

      {/* Busca */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }}
            placeholder="Buscar por objeto, número..."
            className="w-full bg-[#0D1F3C] border border-[#1A3356] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60" />
        </div>

        {/* Filtro modalidade */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {modalidades.map(m => (
            <button key={m} onClick={() => { setFiltroM(m); setPagina(1); }}
              className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
                filtroM === m
                  ? "text-white"
                  : "bg-[#0D1F3C] text-slate-400 border border-[#1A3356]"
              }`}
              style={filtroM === m ? { background: getModalidadeCor(m) } : {}}>
              {m === "TODOS" ? "Todas modalidades" : m}
            </button>
          ))}
        </div>

        {/* Filtro status */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {statuses.slice(0, 5).map(s => (
            <button key={s} onClick={() => { setFiltroS(s); setPagina(1); }}
              className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
                filtroS === s ? "bg-slate-600 text-white" : "bg-[#0D1F3C] text-slate-400 border border-[#1A3356]"
              }`}>
              {s === "TODOS" ? "Todos status" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Contador */}
      {!loading && dados.length > 0 && (
        <p className="text-xs text-slate-500">
          {filtrados.length} de {dados.length} licitações
        </p>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-14">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-cyan-500/20 rounded-full" />
            <div className="w-10 h-10 border-2 border-t-cyan-500 rounded-full animate-spin absolute inset-0" />
          </div>
          <p className="text-xs text-slate-400">Buscando licitações ao vivo...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginados.map(item => (
            <LicitacaoCard key={item.id || item.numero} item={item} />
          ))}
          {filtrados.length === 0 && !erro && (
            <p className="text-center text-slate-500 py-12 text-sm">
              Nenhuma licitação encontrada.
            </p>
          )}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => { setPagina(p => Math.max(1, p - 1)); window.scrollTo(0,0); }}
            disabled={pagina === 1}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#0D1F3C] border border-[#1A3356] text-slate-400 disabled:opacity-30">
            ← Anterior
          </button>
          <span className="text-xs text-slate-500 font-mono">{pagina}/{totalPaginas}</span>
          <button onClick={() => { setPagina(p => Math.min(totalPaginas, p + 1)); window.scrollTo(0,0); }}
            disabled={pagina === totalPaginas}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#0D1F3C] border border-[#1A3356] text-slate-400 disabled:opacity-30">
            Próxima →
          </button>
        </div>
      )}

      {/* Nota educativa */}
      <Card className="border-slate-700/40">
        <p className="text-xs font-bold text-slate-400 mb-1">💡 Como ler as licitações</p>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <span className="text-blue-400 font-bold">Pregão Eletrônico</span> — compras via disputa online de preço. &nbsp;
          <span className="text-purple-400 font-bold">Credenciamento</span> — seleção de prestadores de serviço. &nbsp;
          <span className="text-amber-400 font-bold">Concorrência Pública</span> — obras e contratos de maior valor.
          Toque em qualquer licitação para ver o objeto completo.
        </p>
      </Card>
    </div>
  );
}
