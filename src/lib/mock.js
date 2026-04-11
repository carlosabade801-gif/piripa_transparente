import {
  Users, Heart, BookOpen, HardHat, Shield, TreePine, Building2,
} from "lucide-react";

export const MOCK = {
  resumo: { ano: 2024, receita: 60961505.77, despesa: 57131273.58, superavit: 3830232.19 },
  historico: [
    { ano: "2019", receita: 38.2, despesa: 36.8 },
    { ano: "2020", receita: 40.1, despesa: 39.4 },
    { ano: "2021", receita: 45.6, despesa: 44.2 },
    { ano: "2022", receita: 51.3, despesa: 49.7 },
    { ano: "2023", receita: 55.8, despesa: 53.1 },
    { ano: "2024", receita: 61.0, despesa: 57.1 },
  ],
  categorias: [
    { nome: "Pessoal",       valor: 15410318, icone: Users,     cor: "#8B5CF6", pct: 27.0 },
    { nome: "Saúde",         valor: 14280000, icone: Heart,     cor: "#EF4444", pct: 25.0 },
    { nome: "Educação",      valor: 13140000, icone: BookOpen,  cor: "#3B82F6", pct: 23.0 },
    { nome: "Obras",         valor:  5713000, icone: HardHat,   cor: "#F59E0B", pct: 10.0 },
    { nome: "Assistência",   valor:  4570000, icone: Shield,    cor: "#10B981", pct:  8.0 },
    { nome: "Meio Ambiente", valor:  1713000, icone: TreePine,  cor: "#059669", pct:  3.0 },
    { nome: "Outros",        valor:  2304955, icone: Building2, cor: "#6B7280", pct:  4.0 },
  ],
  transferencias: [
    { programa: "FPM",                    valor: 12300000, origem: "Federal",  area: "Geral" },
    { programa: "ICMS Municipal",         valor:  9800000, origem: "Estadual", area: "Geral" },
    { programa: "FUNDEB",                 valor:  8400000, origem: "Federal",  area: "Educação" },
    { programa: "SUS (Fundo a Fundo)",    valor:  4200000, origem: "Federal",  area: "Saúde" },
    { programa: "Bolsa Família",          valor:  2100000, origem: "Federal",  area: "Assistência" },
    { programa: "IPVA Cota-parte",        valor:   880000, origem: "Estadual", area: "Geral" },
    { programa: "ISS / ITBI próprios",    valor:   480000, origem: "Própria",  area: "Tributária" },
  ],
  licitacoes: [
    { id: "001/2024", objeto: "Reforma da UBS Central",             valor: 320000, status: "Concluída",     modalidade: "Tomada de Preços",       data: "mar/2024" },
    { id: "002/2024", objeto: "Aquisição de Merenda Escolar",       valor: 180000, status: "Em andamento",  modalidade: "Pregão Eletrônico",       data: "mai/2024" },
    { id: "003/2024", objeto: "Manutenção de Estradas Vicinais",    valor: 450000, status: "Em andamento",  modalidade: "Convite",                 data: "jun/2024" },
    { id: "004/2024", objeto: "Equipamentos para Academia da Saúde",valor:  95000, status: "Concluída",     modalidade: "Dispensa de Licitação",   data: "ago/2024" },
    { id: "005/2024", objeto: "Serviços de Iluminação Pública LED", valor: 210000, status: "Aberta",        modalidade: "Pregão Eletrônico",       data: "out/2024" },
    { id: "006/2024", objeto: "Transporte Escolar",                 valor: 380000, status: "Em andamento",  modalidade: "Tomada de Preços",        data: "jan/2024" },
  ],
};
