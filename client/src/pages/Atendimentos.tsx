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
import { MessageSquare, Phone, Clock, User } from "lucide-react";
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

export default function Atendimentos() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("aberto");
  const [setorFilter, setSetorFilter] = useState<string>("todos");
  const [, navigate] = useLocation();

  const { data: atendimentos = [], isLoading } = trpc.atendimentos.list.useQuery(
    {
      status: statusFilter === "todos" ? undefined : statusFilter,
      setorId: setorFilter !== "todos" ? Number(setorFilter) : undefined,
    },
    { refetchInterval: 5000 }
  );

  const { data: setores = [] } = trpc.setores.list.useQuery();

  const abertos = atendimentos.filter((a) => a.status === "aberto").length;
  const emAtendimento = atendimentos.filter(
    (a) => a.status === "em_atendimento"
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Atendimentos WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {abertos} abertos · {emAtendimento} em atendimento
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
            <SelectItem value="encerrado">Encerrado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={setorFilter} onValueChange={setSetorFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {setores.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
