import { Wifi, WifiOff, TrendingUp, TrendingDown } from "lucide-react";
import Card from "./Card";

export function Pill({ children, color = "#06B6D4" }) {
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: color + "22", color }}>
      {children}
    </span>
  );
}

export function Skeleton() {
  return <div className="h-5 bg-[#1A3356] rounded-lg animate-pulse" />;
}

export function ApiStatus({ source }) {
  const live = source === "api";
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full
      ${live ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"}`}>
      {live ? <Wifi size={10} /> : <WifiOff size={10} />}
      {live ? "Dados ao vivo" : "Demonstração"}
    </div>
  );
}

export function SectionTitle({ children, sub, action }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h2 className="text-lg font-black text-white">{children}</h2>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function KpiCard({ label, value, sub, trend, icon: Icon, color = "#06B6D4", loading }) {
  const up = trend > 0;
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl" style={{ background: color + "22" }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-bold ${up ? "text-emerald-400" : "text-rose-400"}`}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {loading ? <Skeleton /> : <p className="text-xl font-black text-white">{value}</p>}
      <p className="text-xs font-semibold text-slate-400 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </Card>
  );
}
