import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { exibirTelefone } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Phone, Clock, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type StatusFilter = "todos" | "aberto" | "em_atendimento" | "encerrado";

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

function ConfirmDeleteModal({
  nome,
  onConfirm,
  onCancel,
}: {
  nome: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-background rounded-xl shadow-lg w-full max-w-sm mx-4 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-sm">Deletar atendimento</p>
            <p className="text-xs text-muted-foreground">{nome}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Todas as mensagens serão apagadas permanentemente. Essa ação não pode ser desfeita.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Deletar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Atendimentos() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [setorFilter, setSetorFilter] = useState<string>("todos");
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [, navigate] = useLocation();

  // Busca todos para contagem, filtra no client
  const { data: todos = [], isLoading } = trpc.atendimentos.list.useQuery(
    { setorId: setorFilter !== "todos" ? Number(setorFilter) : undefined },
    { refetchInterval: 5000 }
  );

  const atendimentos = statusFilter === "todos"
    ? todos
    : todos.filter((a) => a.status === statusFilter);

  const { data: setores = [] } = trpc.setores.list.useQuery();
  const utils = trpc.useUtils();
  const deletar = trpc.atendimentos.deletar.useMutation({
    onSuccess: () => {
      setConfirmId(null);
      utils.atendimentos.list.invalidate();
    },
  });

  const contagem = {
    todos: todos.length,
    aberto: todos.filter((a) => a.status === "aberto").length,
    em_atendimento: todos.filter((a) => a.status === "em_atendimento").length,
    encerrado: todos.filter((a) => a.status === "encerrado").length,
  };

  const confirmTarget = confirmId != null
    ? atendimentos.find((a) => a.id === confirmId)
    : null;

  return (
    <div className="p-6 space-y-6">
      {confirmTarget && (
        <ConfirmDeleteModal
          nome={confirmTarget.nomeCliente ?? confirmTarget.telefoneCliente}
          onConfirm={() => deletar.mutate({ id: confirmTarget.id })}
          onCancel={() => setConfirmId(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Atendimentos WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {contagem.aberto} aguardando · {contagem.em_atendimento} em atendimento · {contagem.encerrado} encerrados
          </p>
        </div>
      </div>

      {/* Tabs de status */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["todos", "aberto", "em_atendimento", "encerrado"] as StatusFilter[]).map((s) => {
          const labels: Record<StatusFilter, string> = {
            todos: "Todos",
            aberto: "Aguardando",
            em_atendimento: "Em Atendimento",
            encerrado: "Encerrados",
          };
          const colors: Record<StatusFilter, string> = {
            todos: "bg-gray-100 text-gray-700 hover:bg-gray-200",
            aberto: "bg-orange-100 text-orange-700 hover:bg-orange-200",
            em_atendimento: "bg-amber-100 text-amber-800 hover:bg-amber-200",
            encerrado: "bg-gray-100 text-gray-500 hover:bg-gray-200",
          };
          const activeColors: Record<StatusFilter, string> = {
            todos: "bg-gray-800 text-white",
            aberto: "bg-orange-500 text-white",
            em_atendimento: "bg-amber-600 text-white",
            encerrado: "bg-gray-500 text-white",
          };
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? activeColors[s] : colors[s]}`}
            >
              {labels[s]}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-black/10"}`}>
                {contagem[s]}
              </span>
            </button>
          );
        })}

        {setores.length > 0 && (
          <Select value={setorFilter} onValueChange={setSetorFilter}>
            <SelectTrigger className="w-44 h-8 text-sm ml-2">
              <SelectValue placeholder="Setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os setores</SelectItem>
              {setores.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando...
        </div>
      ) : atendimentos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>Nenhum atendimento encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {atendimentos.map((a) => (
            <div
              key={a.id}
              className="border rounded-lg p-4 space-y-3 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => navigate(`/atendimento/${a.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium truncate">
                    {a.nomeCliente ?? a.telefoneCliente}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={statusVariant[a.status] ?? "outline"}>
                    {statusLabel[a.status] ?? a.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${
                      a.clienteId
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-orange-100 text-orange-800 border-orange-200"
                    }`}
                  >
                    {a.clienteId ? "Recorrente" : "Novo"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{exibirTelefone(a.telefoneCliente)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {format(new Date(a.updatedAt), "dd/MM HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/atendimento/${a.id}`);
                    }}
                  >
                    Abrir chat
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmId(a.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
