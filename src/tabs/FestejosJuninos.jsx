import { useState, useEffect, useCallback } from "react";
import { 
  Flame, Music, HardHat, Shield, ExternalLink, RefreshCw, 
  DollarSign, Info, Wifi, WifiOff, Award, TrendingUp
} from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from "recharts";
import Card from "../components/Card";
import { SectionTitle, Pill } from "../components/ui";
import { fmtR, fmt, statusCls } from "../lib/utils";

const PROXY = "/api/fator-proxy";

function eContratoJunino(objeto = "") {
  const obj = objeto.toLowerCase();
  // Critérios primários: menção direta a São João, São Pedro, Festas Juninas ou Festejos
  const primarios = ["são joão", "sao joao", "são pedro", "sao pedro", "junino", "junina", "festejo", "festejos"];
  if (primarios.some(p => obj.includes(p))) return true;
  
  // Critério secundário: Shows artísticos de bandas/eventos festivos
  if (obj.includes("shows") && (obj.includes("artísticos") || obj.includes("artistico") || obj.includes("bandas") || obj.includes("palco"))) return true;
  
  return false;
}

function categorizarContrato(objeto = "") {
  const obj = objeto.toLowerCase();
  // Shows / Atrações / Bandas
  const showsKeywords = ["show", "artista", "banda", "cantor", "atração", "atracao", "apresentação", "apresentacao", "musical", "locução", "locutor"];
  if (showsKeywords.some(k => obj.includes(k))) {
    return { label: "Shows e Atrações", cor: "#EF4444", bg: "#EF444422", icon: Music };
  }
  
  // Estrutura / Palco / Luz / Som
  const estruturaKeywords = ["palco", "som", "sonorização", "sonorizacao", "luz", "iluminação", "iluminacao", "gerador", "tenda", "toldo", "sanitário", "banheiro", "estrutura", "arquibancada", "decoração", "decoracao", "fogos", "pirotec"];
  if (estruturaKeywords.some(k => obj.includes(k))) {
    return { label: "Estrutura e Som", cor: "#F59E0B", bg: "#F59E0B22", icon: HardHat };
  }
  
  // Segurança / Logística / Outros
  return { label: "Logística e Outros", cor: "#10B981", bg: "#10B98122", icon: Shield };
}

export default function FestejosJuninos({ data }) {
  const anoAtual = new Date().getFullYear();
  // Anos disponíveis para consulta
  const anosDisp = Array.from({ length: anoAtual - 2020 }, (_, i) => anoAtual - i);
  
  const [ano, setAno]           = useState(anoAtual);
  const [licitacoes, setLicit]  = useState([]);
  const [loading, setLoading]   = useState(true);
  const [source, setSource]     = useState("mock");
  const [erro, setErro]         = useState(null);

  const fetchLicitacoes = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const r = await fetch(`${PROXY}?endpoint=licitacoes&ano=${ano}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      
      if (d.items?.length > 0) {
        setLicit(d.items);
        setSource("sai2");
      } else {
        setLicit(data.licitacoes || []);
        setSource("mock");
      }
    } catch (err) {
      console.error("[fetchLicitacoes]", err);
      // Fallback para os dados mock/locais se falhar a requisição
      setLicit(data.licitacoes || []);
      setSource("mock");
    } finally {
      setLoading(false);
    }
  }, [ano, data.licitacoes]);

  useEffect(() => {
    fetchLicitacoes();
  }, [fetchLicitacoes]);

  // Filtrar apenas contratos relacionados a festejos juninos
  const filtrados = licitacoes.filter(l => eContratoJunino(l.objeto || ""));

  // Processar estatísticas dos festejos
  const totalGasto = filtrados.reduce((s, l) => s + (l.valor || l.valorHomologado || 0), 0);
  const totalContratos = filtrados.length;
  
  // Encontrar o maior contrato (geralmente a banda principal ou a estrutura)
  const maiorContrato = filtrados.length > 0 
    ? [...filtrados].sort((a, b) => (b.valor || b.valorHomologado || 0) - (a.valor || a.valorHomologado || 0))[0]
    : null;

  // Agrupar por categorias para o gráfico
  const categoriasGrup = filtrados.reduce((acc, curr) => {
    const cat = categorizarContrato(curr.objeto || "");
    const valor = curr.valor || curr.valorHomologado || 0;
    if (!acc[cat.label]) {
      acc[cat.label] = { nome: cat.label, valor: 0, cor: cat.cor };
    }
    acc[cat.label].valor += valor;
    return acc;
  }, {});

  const chartData = Object.values(categoriasGrup).filter(c => c.valor > 0);
  const totalChart = chartData.reduce((s, c) => s + c.valor, 0);

  const live = source === "sai2";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner Junino */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600/35 via-amber-700/20 to-red-950/40 border border-orange-500/30 p-6 shadow-xl shadow-orange-950/10">
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-orange-500/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-red-500/10 rounded-full blur-2xl" />
        
        <div className="relative flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-orange-400 bg-orange-400/10 border border-orange-400/20">
              🔥 São João & São Pedro
            </span>
            <span className="text-xs text-slate-400 font-semibold bg-slate-900/50 px-2 py-1 rounded-lg">
              Exercício: {ano}
            </span>
          </div>
          <h2 className="text-xl font-black text-white leading-tight mt-2 flex items-center gap-2">
            🌽 Painel Junino de Piripá
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
            Portal de transparência dedicado aos gastos públicos com a realização das tradicionais festas juninas no município.
          </p>
        </div>
      </div>

      {/* Seleção de Ano e Status de Conexão */}
      <div className="flex items-center justify-between bg-[#0D1F3C]/60 border border-[#1A3356] rounded-2xl p-3 gap-4">
        <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
          ${live ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"}`}>
          {live ? <Wifi size={11} /> : <WifiOff size={11} />}
          {live ? "Dados ao vivo (SAI2)" : "Dados estimados"}
        </div>
        <div className="flex items-center gap-2">
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            className="bg-[#0D1F3C] border border-[#1A3356] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer hover:border-orange-500/45 transition-colors">
            {anosDisp.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={fetchLicitacoes} disabled={loading}
            className="p-2 rounded-lg bg-[#0D1F3C] border border-[#1A3356] hover:border-orange-500/40 transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin text-orange-400" : "text-slate-500"} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-orange-500/20 rounded-full" />
            <div className="w-12 h-12 border-2 border-t-orange-500 rounded-full animate-spin absolute inset-0" />
          </div>
          <p className="text-xs text-slate-400">Filtrando contratos festivos...</p>
        </div>
      ) : (
        <>
          {filtrados.length === 0 ? (
            <Card className="border-slate-800 text-center py-12">
              <span className="text-4xl block mb-3">🪗</span>
              <p className="text-slate-400 font-bold text-sm">Nenhum contrato específico de festejos juninos</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                Não foram identificadas licitações cadastradas com as palavras-chave festivas para o ano de {ano}. 
                Experimente consultar o ano de <span onClick={() => setAno(2022)} className="text-orange-400 font-bold underline cursor-pointer hover:text-orange-300">2022</span>.
              </p>
            </Card>
          ) : (
            <>
              {/* KPIs Juninos */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-orange-500/10">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-xl bg-orange-500/10">
                      <Flame size={16} className="text-orange-400" />
                    </div>
                    <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-md">Investimento</span>
                  </div>
                  <p className="text-lg font-black text-white mt-3 leading-none">
                    {totalGasto > 0 ? fmtR(totalGasto) : "R$ Sob Consulta"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1.5">Investido nos festejos</p>
                </Card>

                <Card>
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-xl bg-cyan-500/10">
                      <TrendingUp size={16} className="text-cyan-400" />
                    </div>
                  </div>
                  <p className="text-lg font-black text-white mt-3 leading-none">
                    {totalContratos}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1.5">Contratos e Licitações</p>
                </Card>
              </div>

              {/* Destaque do maior contrato */}
              {maiorContrato && (maiorContrato.valor > 0 || maiorContrato.valorHomologado > 0) && (
                <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent">
                  <div className="flex gap-3">
                    <div className="p-2.5 rounded-xl bg-orange-500/10 flex-shrink-0 flex items-center justify-center h-10 w-10">
                      <Award size={20} className="text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wide">🏆 Maior Contrato Individual</p>
                      <p className="text-xs text-slate-200 mt-1 font-semibold leading-relaxed line-clamp-2">
                        {maiorContrato.objeto}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
                        <span className="text-[10px] text-slate-500 font-mono">Processo: {maiorContrato.processo || "N/A"}</span>
                        <span className="text-xs font-black text-orange-400">{fmtR(maiorContrato.valor || maiorContrato.valorHomologado)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Gráfico de Distribuição */}
              {chartData.length > 0 && totalChart > 0 && (
                <div>
                  <SectionTitle sub="Percentual do gasto por setor dos festejos">
                    🍕 Divisão de Gastos Juninos
                  </SectionTitle>
                  <Card className="flex flex-col items-center">
                    <div className="w-full h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={chartData} 
                            dataKey="valor" 
                            nameKey="nome" 
                            cx="50%" 
                            cy="50%" 
                            outerRadius={65} 
                            innerRadius={35}
                          >
                            {chartData.map((c, i) => <Cell key={i} fill={c.cor} />)}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ background: "#0D1F3C", border: "1px solid #1A3356", borderRadius: 12, fontSize: 11 }}
                            formatter={(v) => [fmtR(v), "Total"]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full grid grid-cols-2 gap-y-2 gap-x-4 mt-2 border-t border-[#1A3356]/40 pt-3">
                      {chartData.map((c, i) => {
                        const pct = totalChart > 0 ? (c.valor / totalChart) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.cor }} />
                            <span className="text-[10px] text-slate-400 flex-1 truncate">{c.nome}</span>
                            <span className="text-[10px] font-black text-white">{pct.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              )}

              {/* Lista dos Contratos Filtrados */}
              <div>
                <SectionTitle sub={`${filtrados.length} contratos localizados no ano`}>
                  📋 Contratos Festivos Detalhados
                </SectionTitle>
                <div className="space-y-3">
                  {filtrados.map((l, i) => {
                    const cat = categorizarContrato(l.objeto || "");
                    const Ic = cat.icon;
                    const valorContrato = l.valor || l.valorHomologado || 0;
                    return (
                      <Card key={i} className="border-slate-800" style={{ borderLeftColor: cat.cor, borderLeftWidth: 3 }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 rounded-lg" style={{ background: cat.bg }}>
                              <Ic size={11} style={{ color: cat.cor }} />
                            </div>
                            <span className="text-[9px] font-bold" style={{ color: cat.cor }}>
                              {cat.label}
                            </span>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusCls(l.status)}`}>
                            {l.status}
                          </span>
                        </div>
                        
                        <p className="font-bold text-white text-xs leading-snug mb-3">
                          {l.objeto}
                        </p>
                        
                        <div className="flex items-end justify-between pt-1">
                          <div className="space-y-0.5">
                            <p className="text-[9px] text-slate-500 font-mono">
                              {l.numero ? `Nº ${l.numero}` : l.id ? `Nº ${l.id}` : ""}
                            </p>
                            {l.data && (
                              <p className="text-[9px] text-slate-600">
                                Publicado em: {new Date(l.data + "T12:00:00").toLocaleDateString("pt-BR")}
                              </p>
                            )}
                          </div>
                          <p className="font-black text-orange-400 text-sm">
                            {valorContrato > 0 ? fmtR(valorContrato) : <span className="text-[10px] text-slate-500 font-bold">Sob consulta</span>}
                          </p>
                        </div>

                        {l.links?.length > 0 && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800/60">
                            {l.links.map((link, j) => (
                              <a key={j} href={link.url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[9px] text-cyan-400 hover:underline">
                                <ExternalLink size={8} /> {link.label}
                              </a>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Nota educativa */}
      <Card className="border-slate-700/40 bg-slate-900/10">
        <div className="flex gap-2">
          <Info size={13} className="text-slate-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400">Sobre o Painel Junino</p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              O sistema busca automaticamente por palavras-chave ligadas às festividades de São João e São Pedro na base de dados de licitações.
              O volume exato de investimentos pode sofrer alterações ao longo do ano decorrente de aditivos contratuais ou cancelamentos parciais de empenhos.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
