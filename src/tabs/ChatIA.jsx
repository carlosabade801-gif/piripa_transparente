import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, RefreshCw } from "lucide-react";
import Card from "../components/Card";
import { fmtR, fmt } from "../lib/utils";
import { CONFIG } from "../lib/config";

// Gera o system prompt com os dados reais do município
function buildSystemPrompt(data) {
  const { resumo, categorias, transferencias, licitacoes } = data;

  const catTexto = categorias
    .map(c => `  - ${c.nome}: ${fmtR(c.valor)} (${c.pct}%)`)
    .join("\n");

  const transTexto = transferencias
    .map(t => `  - ${t.programa} [${t.origem}]: ${fmtR(t.valor)}`)
    .join("\n");

  const licitTexto = licitacoes
    .map(l => `  - Nº ${l.id}: ${l.objeto} — ${fmtR(l.valor)} (${l.status})`)
    .join("\n");

  return `Você é o Assistente de Transparência de ${CONFIG.municipio}-BA, um chatbot educativo embutido no app "Piripá Transparente".

Seu papel é ajudar cidadãos comuns a entender as finanças públicas do município de forma clara, simples e acessível.
Responda sempre em português brasileiro, de forma direta e sem jargões técnicos. Use emojis com moderação para tornar a resposta mais amigável.
Seja conciso: prefira respostas curtas (3-5 linhas) a menos que o usuário peça mais detalhes.
Nunca invente dados. Use apenas os dados fornecidos abaixo.

═══ DADOS REAIS DE ${CONFIG.municipio.toUpperCase()} — ANO ${resumo.ano} ═══

RESUMO ORÇAMENTÁRIO:
  - Receita total: ${fmtR(resumo.receita)}
  - Despesa total: ${fmtR(resumo.despesa)}
  - Superávit: ${fmtR(resumo.superavit)}
  - População: ${CONFIG.populacao.toLocaleString("pt-BR")} habitantes
  - Gasto por morador: ${fmtR(resumo.despesa / CONFIG.populacao)}

DESPESAS POR ÁREA:
${catTexto}

FONTES DE RECEITA:
${transTexto}

LICITAÇÕES RECENTES:
${licitTexto}

═══ INSTRUÇÕES DE COMPORTAMENTO ═══
- Se perguntarem algo fora do escopo municipal ou que você não sabe, diga educadamente e sugira o canal correto (Portal da Transparência, TCM-BA, etc.)
- Se o cidadão parecer indignado ou revoltado com algum gasto, valide o sentimento e explique o contexto de forma equilibrada.
- Sempre que citar valores, use o formato monetário brasileiro (ex: R$ 14,2 milhões).
- Nunca faça julgamentos políticos sobre gestores ou partidos.`;
}

const SUGESTOES = [
  "Quanto foi gasto com saúde?",
  "De onde vem o dinheiro da prefeitura?",
  "O que é o FPM?",
  "Qual foi o superávit em 2024?",
  "Como funciona uma licitação?",
  "Quanto custa cada morador por ano?",
];

function Bolha({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
        ${isUser ? "bg-cyan-500/20" : "bg-violet-500/20"}`}>
        {isUser
          ? <User size={14} className="text-cyan-400" />
          : <Bot  size={14} className="text-violet-400" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
        ${isUser
          ? "bg-cyan-500/15 text-white rounded-tr-sm"
          : "bg-[#0D1F3C] border border-[#1A3356] text-slate-200 rounded-tl-sm"}`}>
        {msg.content}
      </div>
    </div>
  );
}

function DigitandoBolha() {
  return (
    <div className="flex gap-2.5">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center">
        <Bot size={14} className="text-violet-400" />
      </div>
      <div className="bg-[#0D1F3C] border border-[#1A3356] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

export default function ChatIA({ data }) {
  const [mensagens, setMensagens] = useState([
    {
      role: "assistant",
      content: `Olá! 👋 Sou o assistente de transparência de ${CONFIG.municipio}. Pode me perguntar qualquer coisa sobre o orçamento, gastos, receitas ou licitações do município. Estou aqui para te ajudar a entender para onde vai o dinheiro público!`,
    },
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, loading]);

  async function enviar(texto) {
    const pergunta = (texto ?? input).trim();
    if (!pergunta || loading) return;

    setInput("");
    const novasMensagens = [...mensagens, { role: "user", content: pergunta }];
    setMensagens(novasMensagens);
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: buildSystemPrompt(data),
          messages: novasMensagens.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const result = await response.json();
      const resposta = result?.content?.[0]?.text ?? "Desculpe, não consegui processar sua pergunta. Tente novamente.";

      setMensagens(prev => [...prev, { role: "assistant", content: resposta }]);
    } catch (err) {
      setMensagens(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Erro ao conectar com a IA. Verifique sua conexão e tente novamente.",
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function limpar() {
    setMensagens([{
      role: "assistant",
      content: `Conversa reiniciada! 👋 Como posso te ajudar a entender as finanças de ${CONFIG.municipio}?`,
    }]);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-violet-400" />
            <h2 className="text-lg font-black text-white">Assistente IA</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Tire dúvidas sobre as finanças de {CONFIG.municipio}</p>
        </div>
        <button onClick={limpar}
          className="p-1.5 rounded-lg bg-[#0D1F3C] border border-[#1A3356] hover:border-violet-500/50 transition-colors">
          <RefreshCw size={13} className="text-slate-500" />
        </button>
      </div>

      {/* Sugestões (só quando só tem a mensagem inicial) */}
      {mensagens.length === 1 && (
        <div className="flex-shrink-0 mb-4">
          <p className="text-xs text-slate-500 mb-2">Perguntas frequentes:</p>
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s, i) => (
              <button key={i} onClick={() => enviar(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-[#0D1F3C] border border-[#1A3356]
                  text-slate-300 hover:border-violet-500/50 hover:text-white transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2 pr-1">
        {mensagens.map((m, i) => <Bolha key={i} msg={m} />)}
        {loading && <DigitandoBolha />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 pt-3 flex gap-2 border-t border-[#1A3356] mt-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()}
          placeholder="Pergunte sobre os gastos..."
          disabled={loading}
          className="flex-1 bg-[#0D1F3C] border border-[#1A3356] rounded-xl px-4 py-2.5 text-sm text-white
            placeholder-slate-500 focus:outline-none focus:border-violet-500/60 disabled:opacity-50"
        />
        <button
          onClick={() => enviar()}
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40
            disabled:cursor-not-allowed transition-colors flex-shrink-0">
          <Send size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}
