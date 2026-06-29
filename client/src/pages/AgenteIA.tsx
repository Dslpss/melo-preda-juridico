import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bot, Send, Loader2, User, Wrench, CheckCircle2, XCircle,
  ChevronRight, Sparkles, Scale, FolderOpen, Brain, RefreshCw,
  ArrowLeft, Zap, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";

type ToolAction = { tool: string; args: any; resultado: string; sucesso: boolean };
type ChatMessage = { role: "user" | "assistant"; content: string; acoesExecutadas?: ToolAction[]; totalTools?: number };

const TOOL_LABELS: Record<string, string> = {
  buscar_cliente: "Buscar Cliente",
  buscar_processo: "Buscar Processo",
  diagnosticar_banco: "Diagnosticar Banco",
  listar_duplicados: "Listar Duplicados",
  merge_clientes: "Merge Clientes",
  remover_registro: "Remover Registro",
  completar_movimentacoes: "Completar Movimentações",
  analisar_processo_tecnico: "Análise Técnica",
  gerar_peticao: "Gerar Petição",
  atualizar_dados_cliente: "Atualizar Cliente",
  atualizar_dados_processo: "Atualizar Processo",
  consultar_estatisticas: "Estatísticas",
  editar_peticao: "Editar Petição",
  listar_peticoes: "Listar Petições",
};

function ToolActions({ acoes }: { acoes: ToolAction[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!acoes || acoes.length === 0) return null;
  return (
    <div className="mt-2 border border-amber-200/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-amber-50/50 hover:bg-amber-100/50 transition-colors"
      >
        <span className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
          <Wrench className="h-3 w-3" />
          {acoes.length} ação(ões) executada(s)
        </span>
        <div className="flex items-center gap-1">
          {acoes.map((a, i) => (
            <span key={i}>
              {a.sucesso ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
            </span>
          ))}
          <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-1 bg-white max-h-48 overflow-y-auto">
          {acoes.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              {a.sucesso ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0 mt-0.5" /> : <XCircle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />}
              <span className="font-medium text-gray-700">{TOOL_LABELS[a.tool] || a.tool}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgenteIA() {
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const clienteId = params.get("clienteId") ? parseInt(params.get("clienteId")!) : undefined;
  const processoId = params.get("processoId") ? parseInt(params.get("processoId")!) : undefined;

  const [mensagem, setMensagem] = useState("");
  const [historico, setHistorico] = useState<ChatMessage[]>([]);
  const [sessaoId] = useState(`agente_${Date.now()}`);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: cliente } = trpc.clientes.getById.useQuery(
    { id: clienteId! },
    { enabled: !!clienteId }
  );

  const sugestoes = useMemo(() => {
    if (clienteId && processoId) return [
      "Análise técnica completa deste processo",
      "Quais estratégias recomenda?",
      "Gerar petição de cumprimento de sentença",
      "Calcule os débitos atualizados",
      "Resumo das movimentações recentes",
    ];
    if (clienteId) return [
      "Analise todos os processos deste cliente",
      "Gere petição de cumprimento de sentença",
      "Calcule débitos atualizados",
      "Quais estratégias recomenda?",
      "Resuma a situação completa do cliente",
    ];
    return [
      "Diagnóstico completo do banco de dados",
      "Análise técnica do processo mais recente",
      "Gerar estratégia processual avançada",
      "Quais prazos vencem esta semana?",
      "Estatísticas do escritório",
    ];
  }, [clienteId, processoId]);

  const chatMutation = trpc.agente.chat.useMutation();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [historico, chatMutation.isPending]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const enviarMensagem = useCallback(async (msgOverride?: string) => {
    const msg = msgOverride || mensagem;
    if (!msg.trim() || chatMutation.isPending) return;

    const novaMensagem: ChatMessage = { role: "user", content: msg };
    const novoHistorico = [...historico, novaMensagem];
    setHistorico(novoHistorico);
    setMensagem("");

    try {
      const result = await chatMutation.mutateAsync({
        mensagem: msg,
        historico: historico.map(h => ({ role: h.role, content: h.content })),
        modo: "analise",
        sessaoId,
        clienteId,
      });
      setHistorico([...novoHistorico, {
        role: "assistant",
        content: result.resposta,
        acoesExecutadas: (result as any).acoesExecutadas || [],
        totalTools: (result as any).totalTools || 0,
      }]);
      if ((result as any).totalTools > 0) toast.success(`Agente executou ${(result as any).totalTools} ação(ões)`);
    } catch (error: any) {
      const msg = error.message || "Tente novamente.";
      if (msg.includes("Limite de requisições")) toast.error(msg, { duration: 6000 });
      setHistorico([...novoHistorico, { role: "assistant", content: `⚠️ ${msg}` }]);
    }
  }, [mensagem, historico, chatMutation, sessaoId, clienteId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarMensagem(); }
  };

  const voltar = () => {
    if (clienteId) setLocation(`/cliente/${clienteId}`);
    else setLocation("/clientes");
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="shrink-0" style={{ background: "linear-gradient(135deg, #8B6914 0%, #B8860B 40%, #DAA520 70%, #B8860B 100%)" }}>
        <div className="flex items-center justify-between px-6 py-3 text-white">
          <div className="flex items-center gap-4">
            <button onClick={voltar} className="p-1.5 hover:bg-white/15 rounded-lg transition-colors" title="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide">MELO & PREDA — AGENTE IA</h1>
              <p className="text-[11px] opacity-75">Modo avançado · Análise, peticionamento e execução de ações</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {clienteId && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">
                <FolderOpen className="h-3.5 w-3.5 text-white/80" />
                <span className="text-xs text-white/90 font-medium">
                  {cliente?.nomeCompleto ?? `Cliente #${clienteId}`}
                </span>
              </div>
            )}
            {processoId && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">
                <FileText className="h-3.5 w-3.5 text-white/80" />
                <span className="text-xs text-white/80">Processo #{processoId}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">
              <Brain className="h-3.5 w-3.5 text-white/80" />
              <span className="text-xs text-white/80 font-medium">ANÁLISE</span>
            </div>
            <button
              onClick={() => { setHistorico([]); toast.info("Conversa reiniciada"); }}
              className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
              title="Nova conversa"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
        {historico.length === 0 ? (
          <div className="max-w-2xl mx-auto flex flex-col items-center pt-8">
            <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #B8860B20, #DAA52030)" }}>
              <Sparkles className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Agente IA Jurídico</h2>
            <p className="text-sm text-muted-foreground text-center mb-8">
              {clienteId
                ? `Analisando ${cliente?.nomeCompleto ?? `cliente #${clienteId}`}. Posso gerar petições, analisar processos, buscar dados e executar ações no sistema.`
                : "Modo avançado com todas as capacidades do escritório. Análise técnica, peticionamento, cálculos e estratégias."}
            </p>
            <div className="w-full space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Sugestões</p>
              {sugestoes.map((sug) => (
                <button
                  key={sug}
                  onClick={() => enviarMensagem(sug)}
                  className="w-full text-left text-sm px-4 py-3 rounded-xl bg-white hover:bg-amber-50 text-gray-700 hover:text-amber-800 transition-all border border-gray-200 hover:border-amber-200 flex items-center gap-3 shadow-sm hover:shadow"
                >
                  <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                  {sug}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {historico.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, #B8860B20, #DAA52030)" }}>
                    <Scale className="h-4 w-4 text-amber-700" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === "user"
                  ? "rounded-2xl rounded-br-sm px-4 py-2.5 text-white"
                  : "bg-white rounded-2xl rounded-bl-sm px-4 py-3 border border-gray-100 shadow-sm"
                }`}
                style={msg.role === "user" ? { background: "linear-gradient(135deg, #B8860B, #DAA520)" } : undefined}
                >
                  {msg.role === "assistant" ? (
                    <div className="text-sm prose prose-sm max-w-none">
                      <Streamdown>{msg.content}</Streamdown>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                  {msg.acoesExecutadas && msg.acoesExecutadas.length > 0 && (
                    <ToolActions acoes={msg.acoesExecutadas} />
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                )}
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #B8860B20, #DAA52030)" }}>
                  <Scale className="h-4 w-4 text-amber-700" />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                    <span className="text-sm text-muted-foreground">Analisando e executando...</span>
                  </div>
                  <div className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <div key={d} className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Textarea
            ref={textareaRef}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Faça uma pergunta ou dê um comando ao agente..."
            className="min-h-[48px] max-h-[150px] text-sm resize-none flex-1 rounded-xl border-gray-200 focus:border-amber-400 focus:ring-amber-400/20"
            rows={1}
          />
          <Button
            onClick={() => enviarMensagem()}
            disabled={!mensagem.trim() || chatMutation.isPending}
            className="h-12 w-12 rounded-xl shrink-0 text-white shadow-md hover:shadow-lg transition-all"
            style={{ background: "linear-gradient(135deg, #B8860B, #DAA520)" }}
          >
            {chatMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2">Enter para enviar · Shift+Enter para nova linha</p>
      </div>
    </div>
  );
}
