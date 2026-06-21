import { useState, useEffect, useCallback } from "react";
import { Search, ExternalLink, Eye, RefreshCw, Wifi, WifiOff } from "lucide-react";
import Card from "../components/Card";
import { Pill, SectionTitle } from "../components/ui";
import { fmt, fmtR, statusCls } from "../lib/utils";

const PROXY = "/api/fator-proxy";

export default function Licitacoes({ data }) {
  const [busca, setBusca]       = useState("");
  const [licitacoes, setLicit]  = useState([]);
  const [loading, setLoading]   = useState(true);
  const [source, setSource]     = useState("mock");
  const [ano, setAno]           = useState(new Date().getFullYear());
  const anoAtual = new Date().getFullYear();
  const anosDisp = Array.from({ length: anoAtual - 2020 }, (_, i) => anoAtual - i);

  const fetchLicitacoes = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${PROXY}?endpoint=licitacoes&ano=${ano}`);
      const d = await r.json();
      if (d.items?.length > 0) {
        setLicit(d.items);
        setSource("sai2");
      } else {
        setLicit(data.licitacoes || []);
        setSource("mock");
      }
    } catch {
      setLicit(data.licitacoes || []);
      setSource("mock");
    }
    setLoading(false);
  }, [ano, data.licitacoes]);

  useEffect(() => { fetchLicitacoes(); }, [fetchLicitacoes]);

  const filtered = licitacoes.filter(l => {
    const txt = `${l.objeto || ""} ${l.modalidade || ""} ${l.status || ""} ${l.numero || ""}`.toLowerCase();
    return txt.includes(busca.toLowerCase());
  });

  const total = licitacoes.reduce((s, l) => s + (l.valor || 0), 0);
  const live  = source === "sai2";

  return (
    <div className="space-y-6">
      <SectionTitle sub="Compras e contratos públicos">📋 Licitações e Contratos</SectionTitle>

      {/* Status + Ano */}
      <div className="flex items-center justify-between">
        <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full
          ${live ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"}`}>
          {live ? <Wifi size={10} /> : <WifiOff size={10} />}
          {live ? "Dados ao vivo (SAI2)" : "Dados estimados"}
        </div>
        <div className="flex items-center gap-2">
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            className="bg-[#0D1F3C] border border-[#1A3356] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none">
            {anosDisp.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={fetchLicitacoes} disabled={loading}
            className="p-1.5 rounded-lg bg-[#0D1F3C] border border-[#1A3356] hover:border-cyan-500/50 transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin text-cyan-400" : "text-slate-500"} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-slate-400">Total estimado</p>
          <p className="text-lg font-black text-white mt-1">{fmt(total)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400">Contratos em {ano}</p>
          <p className="text-lg font-black text-white mt-1">{licitacoes.length}</p>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar licitações..."
          className="w-full bg-[#0D1F3C] border border-[#1A3356] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60" />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <RefreshCw size={20} className="animate-spin text-cyan-400" />
          <span className="ml-2 text-sm text-slate-400">Buscando licitações...</span>
        </div>
      )}

      {/* Lista */}
      {!loading && (
        <div className="space-y-3">
          {filtered.map((l, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 font-mono">
                  {l.numero ? `Nº ${l.numero}` : l.id ? `Nº ${l.id}` : ""} · {l.data || ""}
                </p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusCls(l.status)}`}>{l.status}</span>
              </div>
              <p className="font-bold text-white text-sm leading-snug mb-3">{l.objeto}</p>
              <div className="flex items-center justify-between">
                <Pill color="#64748b">{l.modalidade}</Pill>
                <p className="font-black text-cyan-400">{fmtR(l.valor || 0)}</p>
              </div>
              {/* Links para portais oficiais */}
              {l.links?.length > 0 && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-[#1A3356]">
                  {l.links.map((link, j) => (
                    <a key={j} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:underline">
                      <ExternalLink size={9} /> {link.label}
                    </a>
                  ))}
                </div>
              )}
            </Card>
          ))}
          {filtered.length === 0 &&
            <p className="text-center text-slate-500 py-10 text-sm">Nenhuma licitação encontrada</p>}
        </div>
      )}

      {/* Info box */}
      <Card className="border-sky-500/20 bg-sky-500/5">
        <Eye size={15} className="text-sky-400 mb-2" />
        <p className="text-sm font-bold text-sky-400 mb-1">Como funciona uma licitação?</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Antes de gastar acima de R$ 15.000, a prefeitura é obrigada a abrir concorrência pública.
          Várias empresas enviam propostas e a que oferecer o menor preço (ou melhor técnica) vence.
          Isso protege você, contribuinte, contra favoritismo e superfaturamento.
        </p>
      </Card>

      <div className="text-center">
        <a href="https://transparencia.piripa.ba.gov.br/licitacoes" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline">
          <ExternalLink size={12} /> Ver todas no portal oficial
        </a>
      </div>
    </div>
  );
}
