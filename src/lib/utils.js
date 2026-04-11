import { CONFIG } from "./config";

export const fmt  = (v) => v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : `R$ ${(v / 1e3).toFixed(0)}K`;
export const fmtR = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
export const pc   = (v) => fmtR(v / CONFIG.populacao);

export const statusCls = (s) =>
  s === "Concluída"    ? "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20" :
  s === "Em andamento" ? "text-amber-400 bg-amber-400/10 border border-amber-400/20" :
                         "text-sky-400 bg-sky-400/10 border border-sky-400/20";
