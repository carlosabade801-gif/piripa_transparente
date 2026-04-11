import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, DollarSign, FileText,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp,
  ExternalLink, Building2, Hash, Calendar, Info
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

const FASE_META = {
  EMPENHO:    { cor: "#8B5CF6", bg: "#8B5CF622", label: "Empenho"   },
  LIQUIDACAO: { cor: "#F59E0B", bg: "#F59E0B22", label: "Liquidação" },
  PAGAMENTO:  { cor: "#10B981", bg: "#10B98122", label: "Pagamento"  },
  DEFAULT:    { cor: "#6B7280", bg: "#6B728022", label: "—"          },
};

function getFaseMeta(fase = "") {
  const u = fase.toUpperCase();
  if (u.includes("EMPENHO"))    return FASE_META.EMPENHO;
  if (u.includes("LIQUIDAC"))   return FASE_META.LIQUIDACAO;
  if (u.includes("PAGAMENTO"))  return FASE_META.PAGAMENTO;
  return FASE_META.DEFAULT;
}

// ── Card de total ─────────────────────────────────────────────────────────────
function TotalCard({ label, valor, icon: Icon, cor }) {
  return (
    <div className="bg-[#060F1E] rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} style={{ color: cor }} />
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-sm font-black" style={{ color: cor }}>
        {valor !== null ? fmtR(valor) : <span className="animate-pulse text-slate-700">...</span>}
      </p>
    </div>
  );
}

// ── Linha de detalhe ──────────────────────────────────────────────────────────
function DetalheField({ label, value }) {
  if (!value || value === "-" || value === "" || value.toLowerCase() === "não aplicável") return null;
  return (
    <div className="bg-[#060F1E] rounded-lg p-2">
      <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
      <p className="text-xs text-slate-200 leading-relaxed">{value}</p>
    </div>
  );
}

// ── Card de despesa ───────────────────────────────────────────────────────────
function DespesaCard({ item }) {
  const [open, setOpen] = useState(false);
  const fm = getFaseMeta(item.fase);
  const det = item.detalhe;

  return (
    <div className="rounded-xl overflow-hidden border border-[#1A3356]"
      style={{ borderLeftColor: fm.cor, borderLeftWidth: 3 }}>

      {/* Linha resumo */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 p-3 hover:bg-[#0D1F3C]/60 transition-colors text-left">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: fm.bg, color: fm.cor }}>
          {fm.label}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">
            {det?.credor || item.credor}
          </p>
          {det?.historico && (
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{det.historico}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <p className="text-sm font-black text-white">{fmtR(item.valor)}</p>
          {open
            ? <ChevronUp size={11} className="text-slate-500" />
            : <ChevronDown size={11} className="text-slate-500" />}
        </div>
      </button>

      {/* Detalhes expandidos */}
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <DetalheField label="Data"          value={det?.data      || item.data} />
            <DetalheField label="Nº Empenho"    value={det?.empenho} />
            <DetalheField label="Nº Processo"   value={det?.processo  || item.processo} />
            <DetalheField label="Unidade"        value={det?.unidade} />
          </div>

          {det?.historico && (
            <div className="bg-[#060F1E] rounded-lg p-2 border border-cyan-500/20">
              <p className="text-[10px] text-cyan-400 font-bold mb-1">📋 Bem / Serviço prestado</p>
              <p className="text-xs text-slate-200 leading-relaxed">{det.historico}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <DetalheField label="Função"         value={det?.funcao} />
            <DetalheField label="Subfunção"      value={det?.subfuncao} />
            <DetalheField label="Programa"       value={det?.programa} />
            <DetalheField label="Fonte"          value={det?.fonte} />
            <DetalheField label="Elemento"       value={det?.elemento} />
            <DetalheField label="Nº Contrato"    value={det?.contrato} />
            <DetalheField label="Licitação"      value={det?.licitacao} />
            <DetalheField label="Modalidade"     value={det?.modalidade} />
          </div>

          {/* Fase completa */}
          <div className="text-[10px] text-slate-600 pt-1">
            {item.fase}
          </div>

          {/* Links para documentos originais */}
          {item.links && item.links.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#1A3356]">
              <p className="text-[9px] text-slate-600 w-full mb-0.5">📂 Ver documento original:</p>
              {item.links.map((link, li) => (
                <a key={li} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors border border-cyan-500/20">
                  {link.icon} {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Aba principal ─────────────────────────────────────────────────────────────
export default function GastosDetalhados() {
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth();

  const [ano,        setAno]        = useState(anoAtual);
  const [mes,        setMes]        = useState(mesAtual > 0 ? mesAtual - 1 : 0);
  const [busca,      setBusca]      = useState("");
  const [filtroFase, setFiltroFase] = useState("TODOS");
  const [loading,    setLoading]    = useState(false);
  const [totais,     setTotais]     = useState(null);
  const [despesas,   setDespesas]   = useState([]);
  const [erro,       setErro]       = useState(null);
  const [pagina,     setPagina]     = useState(1);

  const POR_PAGINA   = 40;
  const anosDisp     = Array.from({ length: anoAtual - 2019 }, (_, i) => anoAtual - i);

  const buscarDados = useCallback(async () => {
    setLoading(true);
    setErro(null);
    setPagina(1);

    const m   = MESES[mes];
    const ini = `${m.ini}/${ano}`;
    const fim = `${m.fim}/${ano}`;

    try {
      const [rTotais, rDesp] = await Promise.all([
        fetch(`${PROXY}?endpoint=totais`),
        fetch(`${PROXY}?endpoint=despesa&inicio=${encodeURIComponent(ini)}&fim=${encodeURIComponent(fim)}`),
      ]);

      if (rTotais.ok) setTotais(await rTotais.json());

      if (rDesp.ok) {
        const d = await rDesp.json();
        setDespesas(d.items || []);
      } else {
        setErro("Não foi possível carregar os dados. Verifique se o proxy está deployado no Vercel.");
      }
    } catch {
      setErro("Erro de conexão com o proxy. Certifique-se que a Vercel Function está ativa.");
    } finally {
      setLoading(false);
    }
  }, [ano, mes]);

  useEffect(() => { buscarDados(); }, [buscarDados]);

  // Filtros
  const filtrados = despesas.filter(d => {
    const texto = (d.detalhe?.credor || d.credor || "") + " " +
                  (d.detalhe?.historico || "") + " " +
                  (d.processo || "") + " " +
                  (d.detalhe?.empenho || "");
    const matchB = !busca || texto.toLowerCase().includes(busca.toLowerCase());
    const matchF = filtroFase === "TODOS" || d.fase.toUpperCase().includes(filtroFase);
    return matchB && matchF;
  });

  const totalValor   = filtrados.reduce((s, d) => s + d.valor, 0);
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);

  // Top credores (apenas pagamentos)
  const topCredores = Object.entries(
    filtrados
      .filter(d => d.fase.toUpperCase().includes("PAGAMENTO"))
      .reduce((acc, d) => {
        const nome = d.detalhe?.credor || d.credor;
        if (nome && nome !== "DIVERSOS") acc[nome] = (acc[nome] || 0) + d.valor;
        return acc;
      }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <SectionTitle sub="Cada empenho, liquidação e pagamento da prefeitura">
        🔍 Gastos Detalhados
      </SectionTitle>

      {/* Seletor de período */}
      <Card glow>
        <p className="text-xs font-bold text-slate-300 mb-3">Período de consulta:</p>
        <div className="flex gap-2 mb-4">
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            className="bg-[#060F1E] border border-[#1A3356] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none flex-shrink-0">
            {anosDisp.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            className="bg-[#060F1E] border border-[#1A3356] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none flex-1">
            {MESES.map((m, i) => <option key={i} value={i}>{m.label}</option>)}
          </select>
          <button onClick={buscarDados} disabled={loading}
            className="p-1.5 rounded-lg bg-[#060F1E] border border-[#1A3356] hover:border-cyan-500/50 transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin text-cyan-400" : "text-slate-500"} />
          </button>
        </div>

        {/* Cards de totais */}
        <div className="grid grid-cols-2 gap-2">
          <TotalCard label="Empenhado"  valor={totais?.empenhado  ?? null} icon={FileText}    cor="#8B5CF6" />
          <TotalCard label="Liquidado"  valor={totais?.liquidado  ?? null} icon={CheckCircle} cor="#F59E0B" />
          <TotalCard label="Pago"       valor={totais?.pago       ?? null} icon={DollarSign}  cor="#10B981" />
          <TotalCard label="Extra-Orç." valor={totais?.extraPago  ?? null} icon={AlertCircle} cor="#EF4444" />
        </div>
      </Card>

      {/* Erro */}
      {erro && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-xs text-red-400 font-bold mb-1">⚠️ {erro}</p>
          <p className="text-xs text-slate-500">
            O proxy <code className="text-cyan-400 bg-cyan-400/10 px-1 rounded">/api/fator-proxy</code> precisa
            estar deployado no Vercel para buscar dados em tempo real da prefeitura.
          </p>
        </Card>
      )}

      {/* Top credores */}
      {!loading && topCredores.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 mb-2.5">💸 Quem mais recebeu pagamentos:</p>
          <div className="space-y-2.5">
            {topCredores.map(([credor, valor], i) => {
              const max = topCredores[0][1];
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-600 w-3.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <p className="text-xs text-slate-300 truncate flex-1 pr-2">{credor}</p>
                      <p className="text-xs font-black text-white flex-shrink-0">{fmtR(valor)}</p>
                    </div>
                    <div className="w-full bg-[#1A3356] rounded-full h-1">
                      <div className="h-1 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${(valor / max) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Busca e filtros de fase */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }}
            placeholder="Buscar fornecedor, descrição, processo..."
            className="w-full bg-[#0D1F3C] border border-[#1A3356] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {[
            { key: "TODOS",    label: "Todos",      cor: "#06B6D4" },
            { key: "EMPENHO",  label: "Empenho",    cor: "#8B5CF6" },
            { key: "LIQUIDAC", label: "Liquidação", cor: "#F59E0B" },
            { key: "PAGAMENTO",label: "Pagamento",  cor: "#10B981" },
          ].map(f => (
            <button key={f.key}
              onClick={() => { setFiltroFase(f.key); setPagina(1); }}
              className={`flex-shrink-0 text-[10px] font-bold px-3 py-1 rounded-full transition-all ${
                filtroFase === f.key ? "text-white" : "bg-[#0D1F3C] text-slate-400 border border-[#1A3356]"
              }`}
              style={filtroFase === f.key ? { background: f.cor } : {}}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contador e total */}
      {!loading && despesas.length > 0 && (
        <div className="flex items-center justify-between px-0.5">
          <p className="text-xs text-slate-500">
            {filtrados.length.toLocaleString("pt-BR")} registros
            {(busca || filtroFase !== "TODOS") && ` de ${despesas.length.toLocaleString("pt-BR")}`}
          </p>
          <p className="text-xs font-black text-cyan-400">{fmtR(totalValor)}</p>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-14">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-cyan-500/20 rounded-full" />
            <div className="w-10 h-10 border-2 border-t-cyan-500 rounded-full animate-spin absolute inset-0" />
          </div>
          <p className="text-xs text-slate-400">Buscando dados da prefeitura...</p>
          <p className="text-[10px] text-slate-600">Isso pode levar alguns segundos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginados.map((item, i) => (
            <DespesaCard key={`${item.processo}-${(pagina - 1) * POR_PAGINA + i}`} item={item} />
          ))}
          {filtrados.length === 0 && !erro && (
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm mb-1">Nenhum registro encontrado.</p>
              <p className="text-slate-600 text-xs">Tente outro período ou remova os filtros.</p>
            </div>
          )}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => { setPagina(p => Math.max(1, p - 1)); window.scrollTo(0,0); }}
            disabled={pagina === 1}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#0D1F3C] border border-[#1A3356] text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
            ← Anterior
          </button>
          <span className="text-xs text-slate-500 font-mono">{pagina}/{totalPaginas}</span>
          <button onClick={() => { setPagina(p => Math.min(totalPaginas, p + 1)); window.scrollTo(0,0); }}
            disabled={pagina === totalPaginas}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#0D1F3C] border border-[#1A3356] text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
            Próxima →
          </button>
        </div>
      )}

      {/* Nota informativa */}
      <Card className="border-slate-700/40">
        <div className="flex gap-2">
          <Info size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400">Como ler os dados</p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              <span className="text-purple-400 font-bold">Empenho</span> = compromisso de gasto criado. &nbsp;
              <span className="text-amber-400 font-bold">Liquidação</span> = serviço confirmado entregue. &nbsp;
              <span className="text-emerald-400 font-bold">Pagamento</span> = dinheiro efetivamente saiu.
              Toque em qualquer linha para ver a descrição completa do gasto.
            </p>
          </div>
        </div>
      </Card>

      <div className="text-center">
        <a href={`https://transparencia.fatorsistemas.com.br/dados/despesa.php?id=${ID_MUNICIPIO}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline">
          <ExternalLink size={11} /> Portal oficial da prefeitura
        </a>
      </div>
    </div>
  );
}

const ID_MUNICIPIO = "pm_piripa";
