import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Layers, Plus, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DEFAULT_SETORES = [
  { nome: "Primeiro Atendimento", cor: "#22c55e" },
  { nome: "Financeiro", cor: "#f59e0b" },
  { nome: "Jurídico", cor: "#6366f1" },
  { nome: "Administrativo", cor: "#64748b" },
  { nome: "Processos", cor: "#0ea5e9" },
];

export default function Setores() {
  const { data: setores = [], refetch } = trpc.setores.list.useQuery();
  const createMutation = trpc.setores.create.useMutation({ onSuccess: () => { refetch(); toast.success("Setor criado"); } });
  const updateMutation = trpc.setores.update.useMutation({ onSuccess: () => { refetch(); toast.success("Setor atualizado"); } });
  const deleteMutation = trpc.setores.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Setor desativado"); } });

  const [form, setForm] = useState({ nome: "", descricao: "", cor: "#6366f1" });
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  function openNew() {
    setEditId(null);
    setForm({ nome: "", descricao: "", cor: "#6366f1" });
    setOpen(true);
  }

  function openEdit(s: typeof setores[0]) {
    setEditId(s.id);
    setForm({ nome: s.nome ?? "", descricao: s.descricao ?? "", cor: s.cor ?? "#6366f1" });
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

  async function seedDefaultSetores() {
    setSeeding(true);
    try {
      for (const s of DEFAULT_SETORES) {
        await createMutation.mutateAsync(s);
      }
      toast.success("Setores padrão criados");
    } catch {
      toast.error("Erro ao criar setores padrão");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Setores</h1>
        </div>
        <div className="flex gap-2">
          {setores.length === 0 && (
            <Button variant="outline" onClick={seedDefaultSetores} disabled={seeding}>
              {seeding ? "Criando..." : "Criar Setores Padrão"}
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Setor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? "Editar Setor" : "Novo Setor"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Financeiro" /></div>
                <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} rows={2} /></div>
                <div>
                  <Label>Cor</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <input type="color" value={form.cor} onChange={e => setForm(p => ({ ...p, cor: e.target.value }))} className="h-10 w-16 rounded cursor-pointer border" />
                    <span className="text-sm text-muted-foreground">{form.cor}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleSave}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {setores.map(s => (
          <Card key={s.id} className={Boolean(s.ativo) ? "" : "opacity-50"}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: s.cor ?? "#6366f1" }} />
                  <CardTitle className="text-sm font-semibold">{s.nome}</CardTitle>
                </div>
                <div className="flex gap-1 items-center">
                  <Badge variant={Boolean(s.ativo) ? "default" : "secondary"} className="text-xs">
                    {Boolean(s.ativo) ? "Ativo" : "Inativo"}
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(s)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {s.descricao && <p className="text-xs text-muted-foreground mb-2">{s.descricao}</p>}
              {Boolean(s.ativo) ? (
                <Button size="sm" variant="ghost" className="text-destructive h-7 px-2 text-xs"
                  onClick={() => deleteMutation.mutate({ id: s.id })}>
                  Desativar
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                  onClick={() => updateMutation.mutate({ id: s.id, ativo: 1 })}>
                  Reativar
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {setores.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            Nenhum setor cadastrado. Use "Criar Setores Padrão" para começar.
          </div>
        )}
      </div>
    </div>
  );
}
