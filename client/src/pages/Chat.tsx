import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Send, UserCheck, XCircle, Phone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const statusLabel: Record<string, string> = {
  aberto: "Aberto",
  em_atendimento: "Em Atendimento",
  encerrado: "Encerrado",
};

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  aberto: "secondary",
  em_atendimento: "default",
  encerrado: "outline",
};

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const atendimentoId = Number(id ?? "0");
  const [, navigate] = useLocation();
  const [texto, setTexto] = useState("");
  const [transferDialog, setTransferDialog] = useState(false);
  const [transferSetorId, setTransferSetorId] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  const { data: atendimento } = trpc.atendimentos.getById.useQuery({
    id: atendimentoId,
  });
  const { data: mensagens = [] } = trpc.mensagens.listByAtendimento.useQuery(
    { atendimentoId },
    { refetchInterval: 5000 }
  );
  const { data: setores = [] } = trpc.setores.list.useQuery();

  const sendMutation = trpc.mensagens.send.useMutation({
    onSuccess: () => {
      setTexto("");
      utils.mensagens.listByAtendimento.invalidate({ atendimentoId });
    },
    onError: () => toast.error("Erro ao enviar mensagem"),
  });

  const closeMutation = trpc.atendimentos.close.useMutation({
    onSuccess: () => {
      toast.success("Atendimento encerrado");
      utils.atendimentos.getById.invalidate({ id: atendimentoId });
    },
    onError: () => toast.error("Erro ao encerrar atendimento"),
  });

  const transferMutation = trpc.atendimentos.transfer.useMutation({
    onSuccess: () => {
      setTransferDialog(false);
      toast.success("Atendimento transferido");
      utils.atendimentos.getById.invalidate({ id: atendimentoId });
      utils.mensagens.listByAtendimento.invalidate({ atendimentoId });
    },
    onError: () => toast.error("Erro ao transferir atendimento"),
  });

  const markReadMutation = trpc.mensagens.markRead.useMutation();

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length]);

  // Mark as read when page loads or new messages arrive
  useEffect(() => {
    if (mensagens.some((m) => !m.lida && m.origem === "cliente")) {
      markReadMutation.mutate({ atendimentoId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagens.length]);

  function handleSend() {
    const t = texto.trim();
    if (!t) return;
    sendMutation.mutate({ atendimentoId, texto: t });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const encerrado = atendimento?.status === "encerrado";

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/atendimentos")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">
              {atendimento?.nomeCliente ??
                atendimento?.telefoneCliente ??
                "Carregando..."}
            </span>
            {atendimento && (
              <Badge
                variant={statusVariant[atendimento.status] ?? "outline"}
              >
                {statusLabel[atendimento.status] ?? atendimento.status}
              </Badge>
            )}
          </div>
          {atendimento?.nomeCliente && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{atendimento.telefoneCliente}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {!encerrado && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTransferDialog(true)}
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Transferir
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => closeMutation.mutate({ id: atendimentoId })}
                disabled={closeMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Encerrar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mensagens.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            Nenhuma mensagem ainda
          </p>
        )}
        {mensagens.map((m) => (
          <div
            key={m.id}
            className={`flex ${
              m.origem === "atendente"
                ? "justify-end"
                : m.origem === "sistema"
                  ? "justify-center"
                  : "justify-start"
            }`}
          >
            {m.origem === "sistema" ? (
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {m.conteudo}
              </span>
            ) : (
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  m.origem === "atendente"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.conteudo}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    m.origem === "atendente"
                      ? "text-primary-foreground/70 text-right"
                      : "text-muted-foreground"
                  }`}
                >
                  {format(new Date(m.criadaEm), "HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!encerrado && (
        <div className="p-4 border-t bg-background flex gap-2">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem... (Enter para enviar)"
            className="resize-none min-h-[44px] max-h-32"
            rows={1}
            disabled={sendMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!texto.trim() || sendMutation.isPending}
            size="icon"
            className="shrink-0 h-11 w-11"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
      {encerrado && (
        <div className="p-4 border-t bg-muted/30 text-center text-sm text-muted-foreground">
          Atendimento encerrado
        </div>
      )}

      {/* Transfer Dialog */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Atendimento</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium mb-2 block">
              Setor de destino
            </label>
            <Select
              value={transferSetorId}
              onValueChange={setTransferSetorId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {setores
                  .filter((s) => Boolean(s.ativo))
                  .map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransferDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={!transferSetorId || transferMutation.isPending}
              onClick={() =>
                transferMutation.mutate({
                  id: atendimentoId,
                  setorId: Number(transferSetorId),
                })
              }
            >
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
