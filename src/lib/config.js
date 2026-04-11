// ╔══════════════════════════════════════════════════════╗
// ║  CONFIGURAÇÃO — edite aqui para seu município        ║
// ╚══════════════════════════════════════════════════════╝
export const CONFIG = {
  municipio:   "Piripá",
  uf:          "BA",
  ibgeCode:    "2924900",
  populacao:   9143,
  // Obtenha sua chave gratuita em:
  // portaldatransparencia.gov.br/api-de-dados/cadastrar-email
  chavePortal: import.meta.env.VITE_PORTAL_API_KEY ?? "SUA_CHAVE_AQUI",
};
