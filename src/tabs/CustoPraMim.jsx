import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Card from "../components/Card";
import { SectionTitle } from "../components/ui";
import { fmtR } from "../lib/utils";
import { CONFIG } from "../lib/config";

const aliquotas = {
  clt:        { iss: 0.005, iptu: 0.002, icms_municipal: 0.025, total: 0.032 },
  autonomo:   { iss: 0.020, iptu: 0.002, icms_municipal: 0.025, total: 0.047 },
  empresario: { iss: 0.040, iptu: 0.004, icms_municipal: 0.025, total: 0.069 },
};

export default function CustoPraMim({ data }) {
  const { resumo, categorias } = data;
  const [salario, setSalario]               = useState(2000);
  const [regime, setRegime]                 = useState("clt");
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);

  const aliq           = aliquotas[regime];
  const contrib_anual  = salario * 12 * aliq.total;
  const contrib_mensal = contrib_anual / 12;

  const minha_parte = categorias.map(c => ({
    ...c,
    meu_valor: (c.valor / resumo.despesa) * contrib_anual,
    meu_mes:   (c.valor / resumo.despesa) * contrib_mensal,
  }));

  return (
    <div className="space-y-6">
      <SectionTitle sub="Descubra onde vai o seu dinheiro em impostos">🧮 Quanto Custa pra Mim?</SectionTitle>

      <Card glow>
        <p className="text-sm font-bold text-white mb-4">Informe sua situação:</p>

        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { id: "clt",        label: "CLT / Assalariado" },
            { id: "autonomo",   label: "Autônomo / MEI" },
            { id: "empresario", label: "Empresário" },
          ].map(r => (
            <button key={r.id} onClick={() => setRegime(r.id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                regime === r.id ? "bg-cyan-500 text-white" : "bg-[#1A3356] text-slate-400 hover:text-white"
              }`}>
              {r.label}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">Renda mensal</label>
            <span className="text-sm font-black text-white">{fmtR(salario)}</span>
          </div>
          <input type="range" min={1412} max={30000} step={100} value={salario}
            onChange={e => setSalario(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer" />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>R$ 1.412 (salário mínimo)</span>
            <span>R$ 30.000</span>
          </div>
        </div>

        <div className="bg-[#060F1E] rounded-xl p-4 mt-2">
          <p className="text-xs text-slate-400 mb-1">Sua contribuição estimada para a prefeitura</p>
          <p className="text-2xl font-black text-cyan-400">
            {fmtR(contrib_mensal)}<span className="text-sm font-normal text-slate-400">/mês</span>
          </p>
          <p className="text-sm text-slate-400 mt-1">{fmtR(contrib_anual)} por ano</p>
          <p className="text-xs text-slate-600 mt-2">
            ≈ {(aliq.total * 100).toFixed(1)}% da sua renda vai para tributos municipais (ISS, IPTU, cota ICMS)
          </p>
        </div>

        <button onClick={() => setMostrarDetalhes(!mostrarDetalhes)}
          className="flex items-center gap-1 text-xs text-slate-400 mt-3 hover:text-white transition-colors">
          {mostrarDetalhes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {mostrarDetalhes ? "Ocultar" : "Ver"} como é calculado
        </button>

        {mostrarDetalhes && (
          <div className="mt-3 space-y-1.5 bg-[#060F1E] rounded-xl p-3">
            <p className="text-xs font-bold text-slate-300 mb-2">Composição tributária estimada:</p>
            {[
              ["ISS (serviços)",   (aliq.iss * 100).toFixed(1) + "%"],
              ["IPTU (imóvel)",    (aliq.iptu * 100).toFixed(1) + "%"],
              ["Cota-parte ICMS",  (aliq.icms_municipal * 100).toFixed(1) + "%"],
            ].map(([k, v], i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-300 font-semibold">{v}</span>
              </div>
            ))}
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              * Estimativa baseada em dados do IBPT. Valores reais variam conforme imóvel, atividade e alíquotas municipais vigentes.
            </p>
          </div>
        )}
      </Card>

      <div>
        <p className="text-sm font-bold text-white mb-3">Onde seu dinheiro é aplicado:</p>
        <div className="space-y-2.5">
          {minha_parte.map((c, i) => {
            const Ic = c.icone;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="p-2 rounded-lg flex-shrink-0" style={{ background: c.cor + "22" }}>
                  <Ic size={16} style={{ color: c.cor }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-slate-300">{c.nome}</p>
                    <p className="text-xs font-black text-white">
                      {fmtR(c.meu_mes)}<span className="text-slate-500 font-normal">/mês</span>
                    </p>
                  </div>
                  <div className="w-full bg-[#1A3356] rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${c.pct}%`, background: c.cor }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <p className="text-sm font-bold text-amber-400 mb-3">💡 Para entender na prática</p>
        <div className="space-y-2">
          {[
            { icon: "🏥", texto: `Cada morador recebe R$ ${(14280000 / CONFIG.populacao / 12).toFixed(0)}/mês em serviços de saúde da prefeitura` },
            { icon: "📚", texto: `R$ ${(13140000 / CONFIG.populacao / 12).toFixed(0)}/mês por morador são investidos em educação` },
            { icon: "🛣️", texto: `A prefeitura gastou em média ${fmtR(5713000 / 365)} por dia em obras e infraestrutura` },
          ].map((item, i) => (
            <p key={i} className="text-xs text-slate-300 flex gap-2">
              <span>{item.icon}</span>
              <span>{item.texto}</span>
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}
