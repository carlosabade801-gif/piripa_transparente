import { useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  Cell, ResponsiveContainer,
} from "recharts";
import { ChevronDown, ChevronUp, Search, RefreshCw, X, ArrowLeft } from "lucide-react";
import Card from "../components/Card";
import { SectionTitle } from "../components/ui";
import { fmtR, pc } from "../lib/utils";

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

// ── Drill-down: detalhe de uma categoria ─────────────────────────────────────
function DrillDown({ categoria, ano, onClose }) {
  const [loading, setLoading]   = useState(false);
  const [itens,   setItens]     = useState([]);
  const [buscado, setBuscado]   = useState(false);
  const [mes,     setMes]       = useState(new Date().getMonth() > 0 ? new Date().getMonth() - 1 : 0);
  const [busca,   setBusca]     = useState("");
  const [expandido, setExpandido] = useState(null);

  const buscar = useCallback(async () => {
    setLoading(true);
    const m   = MESES[mes];
    const ini = `${m.ini}/${ano}`;
    const fim = `${m.fim}/${ano}`;
    try {
      const match = (categoria.nome || "").match(/^(\d+)/);
      const code = match ? match[1] : "-1";
      const r = await fetch(
        `${PROXY}?endpoint=despesa&inicio=${encodeURIComponent(ini)}&fim=${encodeURIComponent(fim)}&funcao=${code}`
      );
      const d = await r.json();
      setItens(d.items || []);
      setBuscado(true);
    } catch (e) {
      console.error("Erro ao buscar detalhamento da categoria:", e);
      setBuscado(true);
    } finally {
      setLoading(false);
    }
  }, [mes, ano, categoria]);

  // Agrupar por sub-credor
  const subgrupos = {};
  itens.forEach(i => {
    const credor = i.detalhe?.credor || i.credor || "Sem descrição";
    if (!subgrupos[credor]) subgrupos[credor] = { total: 0, count: 0, itens: [] };
    subgrupos[credor].total += i.valor;
    subgrupos[credor].count++;
    if (subgrupos[credor].itens.length < 5) subgrupos[credor].itens.push(i);
  });

  const totalDrill = itens.reduce((s, i) => s + i.valor, 0);
  const filtradosB = buscado && busca
    ? itens.filter(i => {
        const txt = (i.detalhe?.credor || i.credor || "") + " " + (i.detalhe?.historico || "");
        return txt.toLowerCase().includes(busca.toLowerCase());
      })
    : itens;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onClose}
          className="p-1.5 rounded-lg bg-[#0D1F3C] border border-[#1A3356] hover:border-cyan-500/50">
          <ArrowLeft size={14} className="text-slate-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: categoria.cor }} />
            <h3 className="text-sm font-black text-white">{categoria.nome}</h3>
          </div>
          <p className="text-xs text-slate-500">Detalhamento por secretaria e servidor</p>
        </div>
      </div>

      {/* Seletor de mês */}
      <div className="flex gap-2">
        <select value={mes} onChange={e => setMes(Number(e.target.value))}
          className="bg-[#0D1F3C] border border-[#1A3356] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none flex-1">
          {MESES.map((m, i) => <option key={i} value={i}>{m.label} {ano}</option>)}
        </select>
        <button onClick={buscar} disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-xs font-bold hover:bg-cyan-400 transition-colors disabled:opacity-50">
          {loading ? <RefreshCw size={12} className="animate-spin" /> : "Buscar"}
        </button>
      </div>

      {!buscado && (
        <Card className="border-cyan-500/20 bg-cyan-500/5">
          <p className="text-xs text-cyan-400 text-center">
            Selecione um mês e clique em <strong>Buscar</strong> para ver cada lançamento
          </p>
        </Card>
      )}

      {buscado && (
        <>
          {/* Total */}
          <div className="bg-[#060F1E] rounded-xl p-3 border border-[#1A3356]">
            <p className="text-[10px] text-slate-500 mb-1">{MESES[mes].label} {ano} — {itens.length} lançamentos</p>
            <p className="text-xl font-black" style={{ color: categoria.cor }}>{fmtR(totalDrill)}</p>
          </div>

          {/* Sub-grupos por secretaria */}
          {Object.keys(subgrupos).length > 1 && (
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">Por secretaria / vínculo:</p>
              <div className="space-y-1.5">
                {Object.entries(subgrupos)
                  .sort((a,b) => b[1].total - a[1].total)
                  .slice(0, 8)
                  .map(([nome, dados], i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-0.5">
                          <p className="text-[10px] text-slate-400 truncate flex-1 pr-2">{nome}</p>
                          <p className="text-[10px] font-bold text-white flex-shrink-0">{fmtR(dados.total)}</p>
                        </div>
                        <div className="w-full bg-[#1A3356] rounded-full h-1">
                          <div className="h-1 rounded-full"
                            style={{ width: `${(dados.total/totalDrill)*100}%`, background: categoria.cor }} />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Busca */}
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar lançamento..."
              className="w-full bg-[#0D1F3C] border border-[#1A3356] rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60" />
          </div>

          {/* Lista de lançamentos */}
          <div className="space-y-1.5">
            {filtradosB.slice(0, 50).map((item, i) => (
              <div key={i}
                className="border border-[#1A3356] rounded-xl overflow-hidden"
                style={{ borderLeftColor: categoria.cor, borderLeftWidth: 2 }}>
                <button onClick={() => setExpandido(expandido === i ? null : i)}
                  className="w-full flex items-center gap-2.5 p-2.5 hover:bg-[#0D1F3C]/50 transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {item.detalhe?.credor || item.credor}
                    </p>
                    {item.detalhe?.historico && (
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.detalhe.historico}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <p className="text-xs font-black text-white">{fmtR(item.valor)}</p>
                    {expandido === i
                      ? <ChevronUp size={10} className="text-slate-500" />
                      : <ChevronDown size={10} className="text-slate-500" />}
                  </div>
                </button>
                {expandido === i && (
                  <div className="px-2.5 pb-2.5 grid grid-cols-2 gap-1.5">
                    {item.data && (
                      <div className="bg-[#060F1E] rounded-lg p-2">
                        <p className="text-[9px] text-slate-500">Data</p>
                        <p className="text-[10px] text-white font-bold mt-0.5">{item.data}</p>
                      </div>
                    )}
                    {item.detalhe?.empenho && (
                      <div className="bg-[#060F1E] rounded-lg p-2">
                        <p className="text-[9px] text-slate-500">Nº Empenho</p>
                        <p className="text-[10px] text-white font-mono mt-0.5">{item.detalhe.empenho}</p>
                      </div>
                    )}
                    {item.detalhe?.historico && (
                      <div className="bg-[#060F1E] rounded-lg p-2 col-span-2 border border-cyan-500/20">
                        <p className="text-[9px] text-cyan-400 font-bold mb-0.5">Descrição</p>
                        <p className="text-[10px] text-slate-300 leading-relaxed">{item.detalhe.historico}</p>
                      </div>
                    )}
                    {item.detalhe?.fonte && (
                      <div className="bg-[#060F1E] rounded-lg p-2 col-span-2">
                        <p className="text-[9px] text-slate-500">Fonte</p>
                        <p className="text-[10px] text-slate-300 mt-0.5">{item.detalhe.fonte}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="text-[9px] text-slate-600">{item.fase}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filtradosB.length === 0 && (
              <p className="text-center text-slate-500 py-8 text-xs">Nenhum lançamento encontrado.</p>
            )}
            {filtradosB.length > 50 && (
              <p className="text-center text-[10px] text-slate-600 py-2">
                Mostrando 50 de {filtradosB.length}. Use a busca para filtrar.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Aba principal ─────────────────────────────────────────────────────────────
export default function Despesas({ data }) {
  const { categorias, resumo } = data;
  const [expandida, setExpandida]   = useState(null);
  const [drillDown, setDrillDown]   = useState(null);
  const anoAtual = new Date().getFullYear();
  const ano = resumo.ano || anoAtual - 1;

  // Se tem drill-down ativo, mostrar tela de detalhamento
  if (drillDown) {
    return (
      <div className="space-y-6">
        <DrillDown
          categoria={drillDown}
          ano={ano}
          onClose={() => setDrillDown(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle sub="Toque em uma área para ver detalhes ou 🔍 para detalhar">
        💸 Para Onde Vai o Dinheiro
      </SectionTitle>

      <Card>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={categorias} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1A3356" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v => `${(v / 1e6).toFixed(1)}M`} />
            <YAxis type="category" dataKey="nome" tick={{ fill: "#cbd5e1", fontSize: 11 }} width={75} />
            <Tooltip
              contentStyle={{ background: "#0D1F3C", border: "1px solid #1A3356", borderRadius: 12, fontSize: 12 }}
              formatter={v => [fmtR(v), "Gasto"]}
            />
            <Bar dataKey="valor" radius={[0, 6, 6, 0]} cursor="pointer"
              onClick={(d) => setDrillDown({ nome: d.nome, cor: d.cor })}>
              {categorias.map((c, i) => <Cell key={i} fill={c.cor} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-slate-600 text-center mt-1">Toque nas barras para detalhar</p>
      </Card>

      <div className="space-y-2">
        {categorias.map((c, i) => {
          const Ic     = c.icone;
          const isOpen = expandida === i;
          return (
            <Card key={i}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: c.cor + "22" }}>
                  <Ic size={20} style={{ color: c.cor }} />
                </div>
                <div className="flex-1" onClick={() => setExpandida(isOpen ? null : i)}>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white">{c.nome}</p>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-sm">{c.pct}%</span>
                      {isOpen ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                    </div>
                  </div>
                  <div className="w-full bg-[#1A3356] rounded-full h-1 mt-2">
                    <div className="h-1 rounded-full" style={{ width: `${c.pct}%`, background: c.cor }} />
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 pt-4 border-t border-[#1A3356]">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-[#060F1E] rounded-xl p-3">
                      <p className="text-xs text-slate-500">Total gasto</p>
                      <p className="text-sm font-black text-white mt-1">{fmtR(c.valor)}</p>
                    </div>
                    <div className="bg-[#060F1E] rounded-xl p-3">
                      <p className="text-xs text-slate-500">Por morador</p>
                      <p className="text-sm font-black text-white mt-1">{pc(c.valor)}</p>
                    </div>
                  </div>
                  {/* Botão de drill-down */}
                  <button
                    onClick={() => setDrillDown({ nome: c.nome, cor: c.cor })}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                    style={{ background: c.cor + "22", color: c.cor, border: `1px solid ${c.cor}44` }}>
                    🔍 Ver cada lançamento de {c.nome}
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
