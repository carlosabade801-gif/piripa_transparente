import { useState } from "react";
import { Search, ExternalLink, Eye } from "lucide-react";
import Card from "../components/Card";
import { Pill, SectionTitle } from "../components/ui";
import { fmt, fmtR, statusCls } from "../lib/utils";

export default function Licitacoes({ data }) {
  const [busca, setBusca] = useState("");
  const filtered = data.licitacoes.filter(l =>
    l.objeto.toLowerCase().includes(busca.toLowerCase()) ||
    l.modalidade.toLowerCase().includes(busca.toLowerCase()) ||
    l.status.toLowerCase().includes(busca.toLowerCase())
  );
  const total = data.licitacoes.reduce((s, l) => s + l.valor, 0);

  return (
    <div className="space-y-6">
      <SectionTitle sub="Compras e contratos públicos">📋 Licitações e Contratos</SectionTitle>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-slate-400">Total contratado</p>
          <p className="text-lg font-black text-white mt-1">{fmt(total)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400">Contratos listados</p>
          <p className="text-lg font-black text-white mt-1">{data.licitacoes.length}</p>
        </Card>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar licitações..."
          className="w-full bg-[#0D1F3C] border border-[#1A3356] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60" />
      </div>

      <div className="space-y-3">
        {filtered.map((l, i) => (
          <Card key={i}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-mono">Nº {l.id} · {l.data}</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusCls(l.status)}`}>{l.status}</span>
            </div>
            <p className="font-bold text-white text-sm leading-snug mb-3">{l.objeto}</p>
            <div className="flex items-center justify-between">
              <Pill color="#64748b">{l.modalidade}</Pill>
              <p className="font-black text-cyan-400">{fmtR(l.valor)}</p>
            </div>
          </Card>
        ))}
        {filtered.length === 0 &&
          <p className="text-center text-slate-500 py-10 text-sm">Nenhuma licitação encontrada</p>}
      </div>

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
