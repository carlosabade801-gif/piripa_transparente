import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { AlertCircle, Landmark, Wifi, WifiOff } from "lucide-react";
import Card from "../components/Card";
import { Pill, SectionTitle } from "../components/ui";
import { fmt, fmtR, pc } from "../lib/utils";
import { CONFIG } from "../lib/config";

function SourceBadge({ source }) {
  const live = source === "portal_federal";
  const label = live ? "Portal Federal ao vivo" :
                source === "sem_chave" ? "Chave API pendente" : "Dados estimados";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full
      ${live ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"}`}>
      {live ? <Wifi size={8} /> : <WifiOff size={8} />}
      {label}
    </span>
  );
}

export default function Receitas({ data, sources }) {
  const { transferencias, resumo } = data;
  const src = sources || {};
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
      <SectionTitle sub="De onde vem o dinheiro da prefeitura"
        action={<SourceBadge source={src.transferencias || "mock"} />}>
        💰 Fontes de Receita
      </SectionTitle>

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
              <p className="text-xs font-bold text-white">{resumo.receita > 0 ? ((d.value / resumo.receita) * 100).toFixed(0) : 0}%</p>
            </div>
          ))}
        </div>
      </Card>

      {src.transferencias !== "portal_federal" && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <div className="flex gap-2">
            <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-400">
                {src.transferencias === "sem_chave" ? "Chave API não configurada" : "Dados estimados"}
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {src.transferencias === "sem_chave"
                  ? "Para obter dados oficiais de transferências federais, registre uma chave gratuita em portaldatransparencia.gov.br/api-de-dados/cadastrar-email e adicione como PORTAL_API_KEY no .env"
                  : "Os valores de transferências abaixo são estimativas baseadas em anos anteriores. Para dados ao vivo, configure a chave do Portal da Transparência Federal."
                }
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="border-amber-500/20 bg-amber-500/5">
        <div className="flex gap-2">
          <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-400">Dependência de repasses</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {resumo.receita > 0 ? (((totalFederal + totalEstadual) / resumo.receita) * 100).toFixed(0) : 0}% da receita vem de transferências federais e estaduais.
              Municípios pequenos como {CONFIG.municipio} dependem fortemente do FPM e repasses do SUS/FUNDEB.
              Receita própria (ISS, IPTU) representa apenas {resumo.receita > 0 ? ((totalPropria / resumo.receita) * 100).toFixed(0) : 0}%.
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
              <p className="text-xs text-slate-500">{resumo.receita > 0 ? ((t.valor / resumo.receita) * 100).toFixed(1) : 0}%</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
