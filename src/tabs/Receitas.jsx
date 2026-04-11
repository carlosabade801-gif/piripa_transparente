import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { AlertCircle, Landmark } from "lucide-react";
import Card from "../components/Card";
import { Pill, SectionTitle } from "../components/ui";
import { fmt, fmtR, pc } from "../lib/utils";
import { CONFIG } from "../lib/config";

export default function Receitas({ data }) {
  const { transferencias, resumo } = data;
  const totalFederal  = transferencias.filter(t => t.origem === "Federal").reduce((s, t) => s + t.valor, 0);
  const totalEstadual = transferencias.filter(t => t.origem === "Estadual").reduce((s, t) => s + t.valor, 0);
  const totalPropria  = transferencias.filter(t => t.origem === "Própria").reduce((s, t) => s + t.valor, 0);

  const origemData = [
    { name: "Federal",  value: totalFederal,  cor: "#3B82F6" },
    { name: "Estadual", value: totalEstadual, cor: "#8B5CF6" },
    { name: "Própria",  value: totalPropria,  cor: "#10B981" },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle sub="De onde vem o dinheiro da prefeitura">💰 Fontes de Receita</SectionTitle>

      <Card className="border-emerald-500/20">
        <p className="text-xs text-slate-400">Total arrecadado em {resumo.ano}</p>
        <p className="text-3xl font-black text-emerald-400 mt-1">{fmtR(resumo.receita)}</p>
        <p className="text-xs text-slate-500 mt-1">{pc(resumo.receita)} por morador</p>
      </Card>

      <Card>
        <p className="text-xs font-bold text-slate-300 mb-4">Composição por origem</p>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={origemData} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
              {origemData.map((d, i) => <Cell key={i} fill={d.cor} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#0D1F3C", border: "1px solid #1A3356", borderRadius: 12, fontSize: 12 }}
              formatter={(v, n) => [fmtR(v), n]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex justify-around mt-2">
          {origemData.map((d, i) => (
            <div key={i} className="text-center">
              <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: d.cor }} />
              <p className="text-xs text-slate-400">{d.name}</p>
              <p className="text-xs font-bold text-white">{((d.value / resumo.receita) * 100).toFixed(0)}%</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <div className="flex gap-2">
          <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-400">Dependência de repasses</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {(((totalFederal + totalEstadual) / resumo.receita) * 100).toFixed(0)}% da receita vem de transferências federais e estaduais.
              Municípios pequenos como {CONFIG.municipio} dependem fortemente do FPM e repasses do SUS/FUNDEB.
              Receita própria (ISS, IPTU) representa apenas {((totalPropria / resumo.receita) * 100).toFixed(0)}%.
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        {transferencias.map((t, i) => (
          <Card key={i} className="flex items-center gap-3">
            <div className={`p-2 rounded-lg flex-shrink-0 ${
              t.origem === "Federal" ? "bg-blue-500/10" :
              t.origem === "Estadual" ? "bg-purple-500/10" : "bg-emerald-500/10"
            }`}>
              <Landmark size={16} className={
                t.origem === "Federal" ? "text-blue-400" :
                t.origem === "Estadual" ? "text-purple-400" : "text-emerald-400"
              } />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm truncate">{t.programa}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Pill color={t.origem === "Federal" ? "#3B82F6" : t.origem === "Estadual" ? "#8B5CF6" : "#10B981"}>{t.origem}</Pill>
                <span className="text-xs text-slate-500">{t.area}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-black text-white text-sm">{fmt(t.valor)}</p>
              <p className="text-xs text-slate-500">{((t.valor / resumo.receita) * 100).toFixed(1)}%</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
