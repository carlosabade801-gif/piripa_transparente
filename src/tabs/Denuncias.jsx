import { Gavel, Shield, Landmark, MessageSquare, ExternalLink, Zap } from "lucide-react";
import Card from "../components/Card";
import { Pill, SectionTitle } from "../components/ui";

const canais = [
  { nome: "TCM-BA",               desc: "Irregularidades nas contas",        tel: "(77) 3424-4599", url: "https://www.tcm.ba.gov.br",              cor: "#EF4444", icon: Gavel,          anonimo: true  },
  { nome: "Ministério Público BA", desc: "Improbidade e corrupção",           tel: "(71) 3317-9000", url: "https://www.mpba.mp.br",                 cor: "#8B5CF6", icon: Shield,         anonimo: true  },
  { nome: "CGU Federal",           desc: "Verbas federais desviadas",         tel: "162",            url: "https://www.cgu.gov.br/falabr",           cor: "#3B82F6", icon: Landmark,       anonimo: true  },
  { nome: "Ouvidoria Piripá",      desc: "Reclamações e sugestões locais",    tel: "(77) 3440-2337", url: "https://www.piripa.ba.gov.br/site/contato",cor: "#10B981", icon: MessageSquare,  anonimo: false },
];

export default function Denuncias() {
  return (
    <div className="space-y-6">
      <SectionTitle sub="Seu direito de fiscalizar">🚨 Onde Denunciar</SectionTitle>

      <Card className="border-rose-500/20 bg-rose-500/5">
        <p className="text-sm text-slate-300 leading-relaxed">
          Suspeita de irregularidade?{" "}
          <strong className="text-white">Qualquer cidadão pode denunciar.</strong>{" "}
          A maioria dos canais aceita denúncias anônimas e é obrigatório investigar.
        </p>
      </Card>

      <div className="space-y-3">
        {canais.map((c, i) => {
          const Ic = c.icon;
          return (
            <Card key={i} onClick={() => window.open(c.url, "_blank")}>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl flex-shrink-0" style={{ background: c.cor + "22" }}>
                  <Ic size={20} style={{ color: c.cor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white">{c.nome}</p>
                    {c.anonimo && <Pill color="#10B981">Anônimo</Pill>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{c.desc}</p>
                  <p className="text-xs font-mono text-cyan-400 mt-1">{c.tel}</p>
                </div>
                <ExternalLink size={16} className="text-slate-600 flex-shrink-0" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* LAI */}
      <Card className="border-amber-500/20">
        <p className="text-sm font-bold text-amber-400 mb-2">📄 Pedido via Lei de Acesso à Informação (LAI)</p>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          Você pode solicitar qualquer documento público à prefeitura.
          Eles têm <strong className="text-white">20 dias úteis</strong> para responder.
          Gratuito, online e obrigatório por lei.
        </p>
        <a href="https://www.piripa.ba.gov.br/site/sic" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:underline">
          <ExternalLink size={11} /> Acessar SIC de Piripá
        </a>
      </Card>

      {/* Em breve */}
      <Card className="border-cyan-500/20 bg-cyan-500/5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={15} className="text-cyan-400" />
          <p className="text-sm font-bold text-cyan-400">Em breve neste app</p>
        </div>
        <div className="space-y-2">
          {[
            "🔔 Alertas de novas licitações por WhatsApp",
            "🗺️ Mapa de obras em andamento em Piripá",
            "📊 Comparação com outros municípios da região",
          ].map((f, i) => <p key={i} className="text-xs text-slate-400">{f}</p>)}
        </div>
      </Card>
    </div>
  );
}
