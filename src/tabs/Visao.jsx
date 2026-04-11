import {
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { ExternalLink } from "lucide-react";
import { TrendingUp, DollarSign, Users, CheckCircle } from "lucide-react";
import Card from "../components/Card";
import { ApiStatus, SectionTitle, KpiCard } from "../components/ui";
import { fmt, fmtR, pc } from "../lib/utils";
import { CONFIG } from "../lib/config";

export default function Visao({ data, dataSource, loading }) {
  const { resumo, historico, categorias } = data;
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600/20 to-blue-800/20 border border-cyan-500/20 p-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full -translate-y-12 translate-x-12" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <ApiStatus source={dataSource} />
            <span className="text-xs text-slate-500">Ano: {resumo.ano}</span>
          </div>
          <p className="text-slate-300 text-sm">A Prefeitura de {CONFIG.municipio} arrecadou</p>
          <p className="text-3xl font-black text-white mt-1">{fmtR(resumo.receita)}</p>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed">
            e gastou <span className="text-white font-semibold">{fmtR(resumo.despesa)}</span>.
            O superávit foi de <span className="text-emerald-400 font-bold">{fmtR(resumo.superavit)}</span>.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Isso equivale a <span className="text-amber-400 font-bold">{pc(resumo.despesa)}</span> gasto por cada um dos {CONFIG.populacao.toLocaleString("pt-BR")} moradores.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard loading={loading} label="Receita Total"  value={fmt(resumo.receita)}   sub={resumo.ano}                               trend={9.3} icon={TrendingUp}   color="#10B981" />
        <KpiCard loading={loading} label="Despesa Total"  value={fmt(resumo.despesa)}   sub={resumo.ano}                               trend={7.5} icon={DollarSign}  color="#06B6D4" />
        <KpiCard loading={loading} label="Por Morador"    value={pc(resumo.despesa)}    sub={`${CONFIG.populacao.toLocaleString("pt-BR")} hab.`}    icon={Users}        color="#8B5CF6" />
        <KpiCard loading={loading} label="Superávit"      value={fmt(resumo.superavit)} sub="Sobrou no caixa"                          icon={CheckCircle}  color="#10B981" />
      </div>

      {/* Histórico */}
      <div>
        <SectionTitle sub="Receita vs Despesa — em R$ milhões">📈 Evolução Orçamentária</SectionTitle>
        <Card>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={historico}>
              <defs>
                <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#06B6D4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A3356" />
              <XAxis dataKey="ano" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v => `${v}M`} />
              <Tooltip
                contentStyle={{ background: "#0D1F3C", border: "1px solid #1A3356", borderRadius: 12, fontSize: 12 }}
                formatter={(v, n) => [`R$ ${v}M`, n === "receita" ? "Receita" : "Despesa"]}
              />
              <Area type="monotone" dataKey="receita" stroke="#10B981" fill="url(#gRec)" strokeWidth={2.5} dot={{ r: 3, fill: "#10B981" }} />
              <Area type="monotone" dataKey="despesa" stroke="#06B6D4" fill="url(#gDes)" strokeWidth={2.5} dot={{ r: 3, fill: "#06B6D4" }} />
              <Legend formatter={v => v === "receita" ? "💰 Receita" : "💸 Despesa"} wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Distribuição */}
      <div>
        <SectionTitle sub="Para onde vai cada R$ 100 gastos">🍕 Distribuição dos Gastos</SectionTitle>
        <Card>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={categorias} dataKey="valor" nameKey="nome" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                {categorias.map((c, i) => <Cell key={i} fill={c.cor} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#0D1F3C", border: "1px solid #1A3356", borderRadius: 12, fontSize: 12 }}
                formatter={(v, n) => [fmtR(v), n]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-2">
            {categorias.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.cor }} />
                <span className="text-xs text-slate-400 flex-1 truncate">{c.nome}</span>
                <span className="text-xs font-bold text-white">{c.pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Fontes */}
      <Card className="border-slate-700/50">
        <p className="text-xs font-bold text-slate-400 mb-3">📡 Fontes de dados utilizadas</p>
        <div className="space-y-2">
          {[
            ["SICONFI / Tesouro Nacional",       "https://siconfi.tesouro.gov.br",                           "Receitas e despesas anuais"],
            ["Portal da Transparência Federal",  "https://portaldatransparencia.gov.br",                     "Repasses e convênios"],
            ["IBGE Cidades",                     `https://www.ibge.gov.br/cidades-e-estados/ba/piripa.html`, "Dados municipais"],
            ["TCM-BA / SAGRES",                  "https://sagres.tcm.ba.gov.br",                             "Fiscalização estadual"],
          ].map(([nome, url, desc], i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between group">
              <div>
                <p className="text-xs font-semibold text-cyan-400 group-hover:underline">{nome}</p>
                <p className="text-xs text-slate-600">{desc}</p>
              </div>
              <ExternalLink size={11} className="text-slate-600 group-hover:text-cyan-400" />
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
