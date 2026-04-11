export default function Card({ children, className = "", onClick, glow }) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#0D1F3C] border border-[#1A3356] rounded-2xl p-5 transition-all
        ${onClick ? "cursor-pointer hover:border-cyan-500/50 active:scale-[0.98]" : ""}
        ${glow ? "border-cyan-500/30 shadow-lg shadow-cyan-500/5" : ""}
        ${className}`}
    >
      {children}
    </div>
  );
}
