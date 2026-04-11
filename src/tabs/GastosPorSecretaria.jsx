import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, ChevronDown, ChevronUp,
  ExternalLink, Building2, ArrowLeft, Info
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

// Cores por secretaria
const SECRETARIA_COR = {
  "PREFEITURA MUNICIPAL":         "#06B6D4",
  "FUNDO MUNICIPAL DE SAÚDE":     "#EF4444",
  "FUNDO MUNICIPAL DE EDUCAÇÃO":  "#3B82F6",
  "FUNDO MUNICIPAL DE ASSISTÊNCIA":"#10B981",
  "CÂMARA MUNICIPAL":             "#8B5CF6",
  "DEFAULT":                      "#6B7280",
};

function getCor(nome = "") {
  const u = nome.toUpperCase();
  for (const [k, v] of Object.entries(SECRETARIA_COR)) {
    if (u.includes(k)) return v;
  }
  return SECRETARIA_COR.DEFAULT;
}

// Limpa nome da secretaria (remove encoding quebrado)
function limparNome(nome = "") {
  return nome
    .replace(/Ã\x87/g, "Ç").replace(/Ã§/g, "ç")
    .replace(/Ã‡/g, "Ç").replace(/Ã£/g, "ã").replace(/ÃƒO/g, "ÃO")
    .replace(/Ã‰/g, "É").replace(/Ã©/g, "é")
    .replace(/Ã\x8a/g, "Ê").replace(/Ãš/g, "Ú").replace(/Ãš/g, "Ú")
    .replace(/Ã\x87Ã\x83/g, "ÇÃ").replace(/Ã\x81/g, "Á")
    .trim();
}

// ── Card de lançamento individual ─────────────────────────────────────────────
function LancamentoCard({ item, cor }) {
  const [open, setOpen] = useState(false);
  const det = item.detalhe;

  return (
    <div className="border border-[#1A3356] rounded-xl overflow-hidden"
      style={{ borderLeftColor: cor, borderLeftWidth: 2 }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 p-2.5 hover:bg-[#0D1F3C]/50 transition-colors text-left">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">
            {limparNome(det?.credor || item.credor || "—")}
          </p>
          {det?.historico && (
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{limparNome(det.historico)}</p>
          )}
          <p className="text-[10px] text-slate-600 mt-0.5">{item.data} · {limparNome(det?.fase || item.fase || "")}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <p className="text-xs font-black text-white">{fmtR(item.valor)}</p>
          {open ? <ChevronUp size={10} className="text-slate-500" /> : <ChevronDown size={10} className="text-slate-500" />}
        </div>
      </button>

      {open && det && (
        <div className="px-2.5 pb-2.5 space-y-1.5 border-t border-[#1A3356]">
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            {det.empenho && (
              <div className="bg-[#060F1E] rounded-lg p-2">
                <p className="text-[9px] text-slate-500">Nº Empenho</p>
                <p className="text-[10px] text-white font-mono mt-0.5">{det.empenho}</p>
              </div>
            )}
            {det.processo && (
              <div className="bg-[#060F1E] rounded-lg p-2">
                <p className="text-[9px] text-slate-500">Processo</p>
                <p className="text-[10px] text-white font-mono mt-0.5">{det.processo}</p>
              </div>
            )}
            {det.cnpj && (
              <div className="bg-[#060F1E] rounded-lg p-2 col-span-2">
                <p className="text-[9px] text-slate-500">CPF / CNPJ</p>
                <p className="text-[10px] text-white font-mono mt-0.5">{det.cnpj}</p>
              </div>
            )}
          </div>
          {det.historico && (
            <div className="bg-[#060F1E] rounded-lg p-2 border border-cyan-500/20">
              <p className="text-[9px] text-cyan-400 font-bold mb-0.5">📋 Descrição do gasto</p>
              <p className="text-[10px] text-slate-200 leading-relaxed">{limparNome(det.historico)}</p>
            </div>
          )}
          {det.fonte && det.fonte !== "NÃO APLICÁVEL" && (
            <div className="bg-[#060F1E] rounded-lg p-2">
              <p className="text-[9px] text-slate-500">Fonte de Recurso</p>
              <p className="text-[10px] text-slate-300 mt-0.5">{limparNome(det.fonte)}</p>
            </div>
          )}
          {det.licitacao && det.licitacao !== "-" && (
            <div className="bg-[#060F1E] rounded-lg p-2">
              <p className="text-[9px] text-slate-500">Licitação</p>
              <p className="text-[10px] text-slate-300 mt-0.5">{det.licitacao}</p>
            </div>
          )}
          {/* Links de documentos */}
          {item.links && item.links.length > 0 && (
            <div className="col-span-2 flex flex-wrap gap-1.5 pt-1 border-t border-[#1A3356]">
              {item.links.map((link, li) => (
                <a key={li} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors">
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

// ── Drill-down por credor dentro de uma secretaria ────────────────────────────
function SecretariaDetalhe({ secretaria, itens, onClose }) {
  const [busca,     setBusca]     = useState("");
  const [expandido, setExpandido] = useState(null);
  const [filtroFase,setFiltroFase]= useState("TODOS");
  const cor = getCor(secretaria);

  // Agrupar por credor
  const porCredor = {};
  itens.forEach(i => {
    const credor = limparNome(i.detalhe?.credor || i.credor || "Sem identificação");
    if (!porCredor[credor]) porCredor[credor] = { total: 0, itens: [] };
    porCredor[credor].total += i.valor;
    porCredor[credor].itens.push(i);
  });

  const totalSec = itens.reduce((s, i) => s + i.valor, 0);

  // Filtros
  const itensFiltrados = itens.filter(i => {
    const txt = (limparNome(i.detalhe?.credor || i.credor || "") + " " +
                 limparNome(i.detalhe?.historico || "")).toLowerCase();
    const matchB = !busca || txt.includes(busca.toLowerCase());
    const matchF = filtroFase === "TODOS" || (i.detalhe?.fase || i.fase || "").toUpperCase().includes(filtroFase);
    return matchB && matchF;
  });

  const topCredores = Object.entries(porCredor)
    .sort((a,b) => b[1].total - a[1].total)
    .slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onClose}
          className="p-1.5 rounded-lg bg-[#0D1F3C] border border-[#1A3356] hover:border-cyan-500/50">
          <ArrowLeft size={14} className="text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cor }} />
            <h3 className="text-sm font-black text-white leading-tight truncate">
              {limparNome(secretaria)}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{itens.length} lançamentos · {fmtR(totalSec)}</p>
        </div>
      </div>

      {/* Top credores (quem mais recebeu) */}
      <div>
        <p className="text-xs font-bold text-slate-400 mb-2">Quem mais recebeu desta secretaria:</p>
        <div className="space-y-2">
          {topCredores.map(([credor, dados], i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-600 w-3.5 flex-shrink-0">{i+1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-0.5">
                  <p className="text-[10px] text-slate-300 truncate flex-1 pr-2">{credor}</p>
                  <p className="text-[10px] font-black text-white flex-shrink-0">{fmtR(dados.total)}</p>
                </div>
                <div className="w-full bg-[#1A3356] rounded-full h-1">
                  <div className="h-1 rounded-full" style={{ width: `${(dados.total/totalSec)*100}%`, background: cor }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Busca e filtro fase */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar fornecedor, descrição..."
            className="w-full bg-[#0D1F3C] border border-[#1A3356] rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {["TODOS","EMPENHO","LIQUIDACAO","PAGAMENTO"].map(f => (
            <button key={f} onClick={() => setFiltroFase(f)}
              className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
                filtroFase === f ? "bg-cyan-500 text-white" : "bg-[#0D1F3C] text-slate-400 border border-[#1A3356]"
              }`}>
              {f === "TODOS" ? "Todos" : f === "LIQUIDACAO" ? "Liquidação" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-slate-500">
        {itensFiltrados.length} de {itens.length} lançamentos
      </p>

      {/* Lista completa */}
      <div className="space-y-1.5">
        {itensFiltrados.slice(0, 100).map((item, i) => (
          <LancamentoCard key={i} item={item} cor={cor} />
        ))}
        {itensFiltrados.length > 100 && (
          <p className="text-center text-[10px] text-slate-600 py-2">
            Mostrando 100 de {itensFiltrados.length}. Use a busca para filtrar.
          </p>
        )}
        {itensFiltrados.length === 0 && (
          <p className="text-center text-slate-500 py-8 text-xs">Nenhum lançamento encontrado.</p>
        )}
      </div>
    </div>
  );
}

// ── Aba principal ─────────────────────────────────────────────────────────────
export default function GastosPorSecretaria() {
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth();

  const [ano,        setAno]        = useState(anoAtual);
  const [mes,        setMes]        = useState(mesAtual > 0 ? mesAtual - 1 : 0);
  const [loading,    setLoading]    = useState(false);
  const [itens,      setItens]      = useState([]);
  const [erro,       setErro]       = useState(null);
  const [secretaria, setSecretaria] = useState(null); // drill-down ativo

  const anosDisp = Array.from({ length: anoAtual - 2019 }, (_, i) => anoAtual - i);

  const buscar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    setSecretaria(null);
    const m   = MESES[mes];
    const ini = `${m.ini}/${ano}`;
    const fim = `${m.fim}/${ano}`;
    try {
      const r = await fetch(`${PROXY}?endpoint=despesa&inicio=${encodeURIComponent(ini)}&fim=${encodeURIComponent(fim)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setItens(d.items || []);
    } catch (e) {
      setErro("Não foi possível carregar. Verifique o proxy.");
    } finally {
      setLoading(false);
    }
  }, [ano, mes]);

  useEffect(() => { buscar(); }, [buscar]);

  // Agrupar por secretaria usando o campo detalhe.unidade
  const porSecretaria = {};
  itens.forEach(i => {
    const sec = limparNome(i.detalhe?.unidade || "SEM SECRETARIA IDENTIFICADA");
    if (!porSecretaria[sec]) porSecretaria[sec] = { total: 0, itens: [] };
    porSecretaria[sec].total += i.valor;
    porSecretaria[sec].itens.push(i);
  });

  const totalGeral   = itens.reduce((s, i) => s + i.valor, 0);
  const secretarias  = Object.entries(porSecretaria).sort((a,b) => b[1].total - a[1].total);
  const comDetalhes  = itens.filter(i => i.detalhe?.unidade).length;

  // Se drill-down ativo
  if (secretaria) {
    return (
      <div className="space-y-6">
        <SecretariaDetalhe
          secretaria={secretaria}
          itens={porSecretaria[secretaria]?.itens || []}
          onClose={() => setSecretaria(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle sub="Gastos reais agrupados por secretaria">
        🏛️ Gastos por Secretaria
      </SectionTitle>

      {/* Seletor período */}
      <Card glow>
        <p className="text-xs font-bold text-slate-300 mb-3">Selecione o período:</p>
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
            className="p-1.5 rounded-lg bg-[#060F1E] border border-[#1A3356] hover:border-cyan-500/50 transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin text-cyan-400" : "text-slate-500"} />
          </button>
        </div>

        {!loading && itens.length > 0 && (
          <div className="mt-4 bg-[#060F1E] rounded-xl p-3">
            <p className="text-[10px] text-slate-500 mb-0.5">{MESES[mes].label} {ano} — {itens.length} lançamentos</p>
            <p className="text-xl font-black text-white">{fmtR(totalGeral)}</p>
            {comDetalhes < itens.length && (
              <p className="text-[10px] text-amber-400 mt-1">
                ⚠️ {itens.length - comDetalhes} lançamentos sem detalhe de secretaria
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Erro */}
      {erro && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-xs text-red-400">{erro}</p>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-14">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-cyan-500/20 rounded-full" />
            <div className="w-10 h-10 border-2 border-t-cyan-500 rounded-full animate-spin absolute inset-0" />
          </div>
          <p className="text-xs text-slate-400">Carregando dados da prefeitura...</p>
        </div>
      )}

      {/* Secretarias */}
      {!loading && secretarias.length > 0 && (
        <div className="space-y-3">
          {secretarias.map(([nome, dados], i) => {
            const cor = getCor(nome);
            const pct = totalGeral > 0 ? (dados.total / totalGeral) * 100 : 0;
            return (
              <Card key={i} onClick={() => setSecretaria(nome)}
                className="cursor-pointer hover:border-cyan-500/40 active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  {/* Ícone */}
                  <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: cor + "22" }}>
                    <Building2 size={18} style={{ color: cor }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Nome + valor */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-xs font-bold text-white leading-tight flex-1">{limparNome(nome)}</p>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black text-white">{fmtR(dados.total)}</p>
                        <p className="text-[10px] text-slate-500">{pct.toFixed(1)}%</p>
                      </div>
                    </div>

                    {/* Barra */}
                    <div className="w-full bg-[#1A3356] rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: cor }} />
                    </div>

                    {/* Info */}
                    <p className="text-[10px] text-slate-600 mt-1.5">
                      {dados.itens.length} lançamentos · toque para ver cada centavo →
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Nota */}
      {!loading && itens.length > 0 && (
        <Card className="border-slate-700/40">
          <div className="flex gap-2">
            <Info size={13} className="text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Dados ao vivo do portal da Prefeitura de Piripá. Toque em qualquer secretaria para ver
              todos os pagamentos individuais com descrição completa, fornecedor, CNPJ e fonte de recurso.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
