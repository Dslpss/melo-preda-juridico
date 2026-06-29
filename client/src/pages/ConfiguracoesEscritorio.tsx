import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, User, Hash, MapPin, Save } from "lucide-react";

export default function ConfiguracoesEscritorio() {
  const { data, isLoading, refetch } = trpc.configuracoes.getEscritorio.useQuery();
  const setMutation = trpc.configuracoes.setEscritorio.useMutation({
    onSuccess: () => { toast.success("Configurações salvas"); refetch(); },
    onError: (e) => toast.error("Erro ao salvar: " + e.message),
  });

  const [form, setForm] = useState({ nome: "", advogado: "", oab: "", cidade: "" });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const handleSave = () => setMutation.mutate(form);

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações do Escritório</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Informações usadas em petições, relatórios e no sistema em geral.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-600" />
            Dados do Escritório
          </CardTitle>
          <CardDescription>
            Estes dados aparecem na interface, nos relatórios e nos prompts da IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              Nome do Escritório
            </Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Castro Sociedade de Advogados"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Advogado Responsável
            </Label>
            <Input
              value={form.advogado}
              onChange={(e) => setForm({ ...form, advogado: e.target.value })}
              placeholder="Ex: Dr. João Castro"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              OAB
            </Label>
            <Input
              value={form.oab}
              onChange={(e) => setForm({ ...form, oab: e.target.value })}
              placeholder="Ex: MG 98.234"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              Cidade/UF
            </Label>
            <Input
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              placeholder="Ex: Uberlândia/MG"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={setMutation.isPending}
            className="w-full"
            style={{ background: "linear-gradient(135deg, #B8860B, #DAA520)" }}
          >
            <Save className="h-4 w-4 mr-2" />
            {setMutation.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
