import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Pencil, MapPin, Phone, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Filiais() {
  const { data: filiais = [], refetch } = trpc.filiais.list.useQuery();
  const createMutation = trpc.filiais.create.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Filial criada");
    },
  });
  const updateMutation = trpc.filiais.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Filial atualizada");
    },
  });
  const deleteMutation = trpc.filiais.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Filial desativada");
    },
  });

  const [form, setForm] = useState({
    nome: "",
    cidade: "",
    estado: "",
    endereco: "",
    telefone: "",
    responsavelNome: "",
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  function openNew() {
    setEditId(null);
    setForm({
      nome: "",
      cidade: "",
      estado: "",
      endereco: "",
      telefone: "",
      responsavelNome: "",
    });
    setOpen(true);
  }

  function openEdit(f: (typeof filiais)[0]) {
    setEditId(f.id);
    setForm({
      nome: f.nome ?? "",
      cidade: f.cidade ?? "",
      estado: f.estado ?? "",
      endereco: f.endereco ?? "",
      telefone: f.telefone ?? "",
      responsavelNome: f.responsavelNome ?? "",
    });
    setOpen(true);
  }

  function handleSave() {
    if (!form.nome) return toast.error("Nome obrigatório");
    if (editId) {
      updateMutation.mutate({ id: editId, ...form });
    } else {
      createMutation.mutate(form);
    }
    setOpen(false);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Filiais / Polos</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Filial
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editId ? "Editar Filial" : "Nova Filial"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nome: e.target.value }))
                  }
                  placeholder="Ex: Polo Goiânia"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={form.cidade}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, cidade: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Input
                    value={form.estado}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, estado: e.target.value }))
                    }
                    maxLength={2}
                    placeholder="GO"
                  />
                </div>
              </div>
              <div>
                <Label>Endereço</Label>
                <Input
                  value={form.endereco}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, endereco: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, telefone: e.target.value }))
                  }
                  placeholder="62999999999"
                />
              </div>
              <div>
                <Label>Responsável</Label>
                <Input
                  value={form.responsavelNome}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, responsavelNome: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleSave}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filiais.map((f) => (
          <Card key={f.id} className={Boolean(f.ativo) ? "" : "opacity-50"}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{f.nome}</CardTitle>
                <div className="flex gap-1">
                  <Badge variant={Boolean(f.ativo) ? "default" : "secondary"}>
                    {Boolean(f.ativo) ? "Ativa" : "Inativa"}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => openEdit(f)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-1 text-muted-foreground">
              {f.cidade && (
                <p className="flex gap-2">
                  <MapPin className="h-3 w-3 mt-0.5" />
                  {f.cidade}
                  {f.estado ? `, ${f.estado}` : ""}
                </p>
              )}
              {f.telefone && (
                <p className="flex gap-2">
                  <Phone className="h-3 w-3 mt-0.5" />
                  {f.telefone}
                </p>
              )}
              {f.responsavelNome && (
                <p className="flex gap-2">
                  <User className="h-3 w-3 mt-0.5" />
                  {f.responsavelNome}
                </p>
              )}
              {Boolean(f.ativo) ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive mt-2 h-7 px-2 text-xs"
                  onClick={() => deleteMutation.mutate({ id: f.id })}
                >
                  Desativar
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-7 px-2 text-xs"
                  onClick={() =>
                    updateMutation.mutate({ id: f.id, ativo: 1 })
                  }
                >
                  Reativar
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {filiais.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            Nenhuma filial cadastrada. Crie a primeira.
          </div>
        )}
      </div>
    </div>
  );
}
