import { 
  Calculator, Search, Building2, Scale, TrendingUp, FileText, ShieldAlert, Flame
} from "lucide-react";
import Card from "../components/Card";
import { SectionTitle } from "../components/ui";

export default function Mais({ setTab }) {
  const modulos = [
    { 
      id: "festejos", 
      titulo: "Festejos Juninos", 
      desc: "Transparência exclusiva sobre os gastos do São João e São Pedro",
      icone: Flame,
      cor: "#F97316"
    },
    { 
      id: "licitacoes", 
      titulo: "Contratos e Licitações", 
      desc: "Veja todos os contratos e editais vigentes",
      icone: FileText,
      cor: "#6366F1"
    },
    { 
      id: "denuncias", 
      titulo: "Denunciar Irregularidades", 
      desc: "Canais oficiais e anônimos de denúncia",
      icone: ShieldAlert,
      cor: "#EF4444"
    },
    { 
      id: "custopramim", 
      titulo: "Custo Pra Mim", 
      desc: "Veja quanto você paga por cada serviço público baseado no seu salário",
      icone: Calculator,
      cor: "#10B981"
    },
    { 
      id: "gastos", 
      titulo: "Gastos Detalhados", 
      desc: "Pesquise por fornecedores, CNPJ ou palavras-chave",
      icone: Search,
      cor: "#3B82F6"
    },
    { 
      id: "secretarias", 
      titulo: "Gastos por Secretaria", 
      desc: "Veja qual departamento gasta mais",
      icone: Building2,
      cor: "#8B5CF6"
    },
    { 
      id: "licitaovivo", 
      titulo: "Licitações (SAI2)", 
      desc: "Acompanhe editais e contratos direto da fonte",
      icone: Scale,
      cor: "#F59E0B"
    },
    { 
      id: "recdetalhada", 
      titulo: "Receitas Detalhadas", 
      desc: "Entenda a arrecadação mês a mês",
      icone: TrendingUp,
      cor: "#06B6D4"
    }
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <SectionTitle sub="Explore mais relatórios e ferramentas">
        🧭 Mais Recursos
      </SectionTitle>

      <div className="grid grid-cols-1 gap-3">
        {modulos.map((mod) => {
          const Ic = mod.icone;
          return (
            <Card 
              key={mod.id} 
              onClick={() => setTab(mod.id)}
              className="hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div 
                  className="p-3 rounded-xl flex-shrink-0" 
                  style={{ background: `${mod.cor}22` }}
                >
                  <Ic size={20} style={{ color: mod.cor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm">{mod.titulo}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {mod.desc}
                  </p>
                </div>
                <div className="flex-shrink-0 text-slate-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
