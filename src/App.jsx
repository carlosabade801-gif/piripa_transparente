import { useState, useEffect, useCallback, useRef } from "react";

// ── PWA Install Banner ────────────────────────────────────────────────────────
function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner,     setShowBanner]     = useState(false);
  const [showModal,      setShowModal]      = useState(false);
  const [dismissed,      setDismissed]      = useState(false);
  const [platform,       setPlatform]       = useState("android"); // android | ios

  useEffect(() => {
    // Não mostrar se já instalado (standalone)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.navigator.standalone === true) return;
    // Não mostrar se já dispensou nesta sessão
    if (sessionStorage.getItem("pwa-dismissed")) return;

    // Detectar plataforma
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    setPlatform(isIOS ? "ios" : "android");

    // Android/Chrome: esperar evento beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Mostrar banner após 3 segundos
      setTimeout(() => setShowBanner(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS: mostrar banner após 5 segundos (não tem evento)
    if (isIOS) {
      const t = setTimeout(() => setShowBanner(true), 5000);
      return () => clearTimeout(t);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dispensar = () => {
    setShowBanner(false);
    setShowModal(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-dismissed", "1");
  };

  const instalarAndroid = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") dispensar();
      setDeferredPrompt(null);
    } else {
      setShowModal(true);
    }
    setShowBanner(false);
  };

  const instalarIOS = () => {
    setShowBanner(false);
    setShowModal(true);
  };

  if (dismissed) return null;

  return (
    <>
      {/* ── Banner deslizante na parte de baixo ── */}
      {showBanner && (
        <div className="fixed bottom-16 left-0 right-0 z-50 px-4 animate-fade-in">
          <div className="max-w-lg mx-auto bg-[#0D1F3C] border border-cyan-500/50 rounded-2xl p-3.5 shadow-2xl shadow-cyan-500/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-xl">🏛️</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white">Instalar Piripá Transparente</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {platform === "ios"
                    ? "Adicione à tela inicial do iPhone"
                    : "Instale o app no seu celular"}
                </p>
              </div>
              <button onClick={dispensar}
                className="text-slate-600 hover:text-slate-400 p-1 flex-shrink-0 text-lg leading-none">
                ×
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={dispensar}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors">
                Agora não
              </button>
              <button
                onClick={platform === "ios" ? instalarIOS : instalarAndroid}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold text-white bg-cyan-500 hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/30">
                {platform === "ios" ? "Como instalar" : "Instalar grátis"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal com instruções de instalação ── */}
      {showModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-end justify-center p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && dispensar()}>
          <div className="max-w-lg w-full bg-[#0D1F3C] border border-[#1A3356] rounded-3xl p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🏛️</span>
                </div>
                <div>
                  <p className="text-sm font-black text-white">Piripá Transparente</p>
                  <p className="text-[10px] text-slate-400">Instalar na tela inicial</p>
                </div>
              </div>
              <button onClick={dispensar}
                className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-600">
                ×
              </button>
            </div>

            {/* Instruções por plataforma */}
            {platform === "ios" ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-cyan-400 mb-4">Siga os passos no Safari:</p>
                {[
                  { step: "1", icon: "⬆️", text: 'Toque no botão de compartilhar (ícone de seta para cima) na barra inferior do Safari' },
                  { step: "2", icon: "📲", text: 'Role para baixo e toque em "Adicionar à Tela de Início"' },
                  { step: "3", icon: "✅", text: 'Toque em "Adicionar" no canto superior direito' },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-3 bg-[#060F1E] rounded-xl p-3">
                    <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <span className="text-base mr-1">{item.icon}</span>
                      <span className="text-xs text-slate-300 leading-relaxed">{item.text}</span>
                    </div>
                  </div>
                ))}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mt-2">
                  <p className="text-[10px] text-amber-400">⚠️ Funciona apenas no Safari. Se estiver no Chrome ou outro browser, copie o link e abra no Safari.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold text-cyan-400 mb-4">Siga os passos no Chrome:</p>
                {[
                  { step: "1", icon: "⋮",  text: 'Toque no menu (três pontos ⋮) no canto superior direito do Chrome' },
                  { step: "2", icon: "📲", text: 'Toque em "Adicionar à tela inicial" ou "Instalar aplicativo"' },
                  { step: "3", icon: "✅", text: 'Confirme tocando em "Instalar" ou "Adicionar"' },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-3 bg-[#060F1E] rounded-xl p-3">
                    <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <span className="text-base mr-1">{item.icon}</span>
                      <span className="text-xs text-slate-300 leading-relaxed">{item.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={dispensar}
              className="w-full mt-5 py-3 rounded-xl text-sm font-bold text-white bg-cyan-500 hover:bg-cyan-400 transition-colors">
              Entendi!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
import { RefreshCw } from "lucide-react";
import { loadMunicipioData } from "./lib/api";
import { CONFIG } from "./lib/config";

import Visao       from "./tabs/Visao";
import CustoPraMim from "./tabs/CustoPraMim";
import Despesas    from "./tabs/Despesas";
import Receitas    from "./tabs/Receitas";
import Licitacoes  from "./tabs/Licitacoes";
import Denuncias   from "./tabs/Denuncias";
import ChatIA           from "./tabs/ChatIA";
import GastosDetalhados    from "./tabs/GastosDetalhados";
import GastosPorSecretaria from "./tabs/GastosPorSecretaria";
import LicitacoesAoVivo   from "./tabs/LicitacoesAoVivo";
import ReceitasDetalhadas from "./tabs/ReceitasDetalhadas";

const TABS = [
  { id: "visao",       label: "Geral",      emoji: "🏛️" },
  { id: "custopramim", label: "Pra Mim",    emoji: "🧮" },
  { id: "despesas",    label: "Despesas",   emoji: "💸" },
  { id: "receitas",    label: "Receitas",   emoji: "💰" },
  { id: "licitacoes",  label: "Contratos",  emoji: "📋" },
  { id: "denuncias",   label: "Denunciar",  emoji: "🚨" },
  { id: "chatia",      label: "IA",         emoji: "🤖" },
  { id: "gastos",      label: "Gastos",     emoji: "🔍" },
  { id: "secretarias",  label: "Secretarias",emoji: "🏛️" },
  { id: "licitaovivo", label: "Licitações", emoji: "⚖️" },
  { id: "recdetalhada",label: "Receitas+",  emoji: "💹" },
];

export default function App() {
  // Ano padrão = ano anterior (dados mais completos no SICONFI)
  const anoAtual        = new Date().getFullYear();
  const anoDefault      = anoAtual - 1;
  const anosDisponiveis = Array.from({ length: anoAtual - 2018 }, (_, i) => anoAtual - i);

  const [tab,        setTab]    = useState("visao");
  const [data,       setData]   = useState(null);
  const [dataSource, setSource] = useState("mock");
  const [sources,    setSources]= useState({});
  const [loading,    setLoading]= useState(true);
  const [ano,        setAno]    = useState(anoDefault);
  const tabsRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: d, source: s, _debug, _sources } = await loadMunicipioData(ano);
    if (_debug) {
      console.group("🏛️ Piripá Transparente — status das APIs");
      console.log("SICONFI:        ", _debug.siconfi);
      console.log("Categorias:     ", _debug.categorias);
      console.log("Transferências: ", _debug.transferencias);
      console.log("Histórico:      ", _debug.historico);
      console.groupEnd();
    }
    setData(d);
    setSource(s);
    setSources(_sources || {});
    setLoading(false);
  }, [ano]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Scroll aba ativa para o centro
  useEffect(() => {
    const el = tabsRef.current?.querySelector("[data-active='true']");
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [tab]);

  return (
    <div className="min-h-screen bg-[#060F1E] text-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-[#060F1E]/95 backdrop-blur-md border-b border-[#1A3356]">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase leading-none">Transparência Pública</p>
            <h1 className="text-base font-black text-white leading-tight">{CONFIG.municipio} · BA</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
              className="bg-[#0D1F3C] border border-[#1A3356] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none">
              {anosDisponiveis.map(y => <option key={y} value={y}>{y}{y === anoAtual ? " ⚠️" : y === anoDefault ? " ✓" : ""}</option>)}
            </select>
            <button
              onClick={fetchData}
              className="p-1.5 rounded-lg bg-[#0D1F3C] border border-[#1A3356] hover:border-cyan-500/50 transition-colors">
              <RefreshCw size={13} className={loading ? "animate-spin text-cyan-400" : "text-slate-500"} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div ref={tabsRef} className="max-w-lg mx-auto px-4 pb-2.5 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button
              key={t.id}
              data-active={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === t.id
                  ? t.id === "chatia"
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                    : "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                  : "bg-[#0D1F3C] text-slate-400 hover:text-white border border-[#1A3356]"
              }`}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Loading ── */}
      {loading && (
        <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-cyan-500/30 rounded-full" />
            <div className="w-12 h-12 border-2 border-t-cyan-500 rounded-full animate-spin absolute inset-0" />
          </div>
          <p className="text-slate-300 text-sm font-semibold">Carregando dados públicos...</p>
          <p className="text-slate-600 text-xs text-center leading-relaxed max-w-xs">
            Consultando SICONFI (Tesouro Nacional),<br />IBGE e Portal da Transparência
          </p>
        </div>
      )}

      {/* ── Conteúdo ── */}
      {!loading && data && (
        <main className="max-w-lg mx-auto px-4 py-5 pb-20">
          {tab === "visao"       && <Visao       data={data} dataSource={dataSource} loading={loading} sources={sources} />}
          {tab === "custopramim" && <CustoPraMim data={data} />}
          {tab === "despesas"    && <Despesas    data={data} />}
          {tab === "receitas"    && <Receitas    data={data} sources={sources} />}
          {tab === "licitacoes"  && <Licitacoes  data={data} />}
          {tab === "denuncias"   && <Denuncias />}
          {tab === "chatia"      && <ChatIA      data={data} />}
          {tab === "gastos"      && <GastosDetalhados />}
          {tab === "secretarias" && <GastosPorSecretaria />}
          {tab === "licitaovivo" && <LicitacoesAoVivo />}
          {tab === "recdetalhada" && <ReceitasDetalhadas />}
        </main>
      )}

      <InstallBanner />

      {/* ── Footer ── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#060F1E]/95 backdrop-blur border-t border-[#1A3356] py-2.5">
        <p className="text-center text-[10px] text-slate-700">
          Dados públicos • SICONFI · Fator Sistemas · SAI2 · IBGE · TCM-BA
        </p>
      </footer>
    </div>
  );
}
