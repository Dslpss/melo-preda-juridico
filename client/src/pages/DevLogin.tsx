import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Shield, UserCog } from "lucide-react";

type DbUser = { id: number; openId: string; name: string | null; email: string | null; role: string };

export default function DevLogin() {
  const [dbUsers, setDbUsers] = useState<DbUser[]>([]);
  const [custom, setCustom] = useState({ name: "", email: "", role: "user" as "admin" | "user" });

  useEffect(() => {
    fetch("/api/dev-users").then(r => r.json()).then(setDbUsers).catch(() => {});
  }, []);

  function entrar(openId: string, name: string, email: string, role: "admin" | "user") {
    const id = openId.startsWith("pending-") ? email : openId.replace("dev-user-", "");
    const params = new URLSearchParams({ id, name, email, role });
    window.location.href = `/api/dev-login?${params}`;
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            DEV MODE
          </div>
          <h1 className="text-2xl font-bold">Melo & Preda — Dev Login</h1>
          <p className="text-sm text-muted-foreground mt-1">Selecione um perfil para entrar</p>
        </div>

        <div className="space-y-2">
          {dbUsers.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-4">Nenhum usuário cadastrado ainda.</p>
          )}
          {dbUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => entrar(u.openId, u.name || "", u.email || "", (u.role as "admin" | "user"))}
              className="w-full text-left border rounded-lg p-3 bg-white hover:bg-amber-50 hover:border-amber-300 transition-colors flex items-center gap-3"
            >
              <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                {u.role === "admin" ? <Shield className="h-4 w-4 text-amber-700" /> : <User className="h-4 w-4 text-amber-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{u.name || "Sem nome"}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email || "—"}</div>
              </div>
              <Badge variant="outline" className={u.role === "admin" ? "bg-amber-50 text-amber-700 border-amber-300 text-[10px]" : "text-[10px]"}>
                {u.role === "admin" ? "Admin" : "Usuário"}
              </Badge>
            </button>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCog className="h-4 w-4" /> Perfil customizado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            <Input placeholder="Nome" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} className="h-8 text-sm" />
            <Input placeholder="Email" type="email" value={custom.email} onChange={(e) => setCustom({ ...custom, email: e.target.value })} className="h-8 text-sm" />
            <div className="flex gap-2">
              <Button size="sm" variant={custom.role === "user" ? "default" : "outline"} className="flex-1 h-8 text-xs" onClick={() => setCustom({ ...custom, role: "user" })}>Usuário</Button>
              <Button size="sm" variant={custom.role === "admin" ? "default" : "outline"} className="flex-1 h-8 text-xs" onClick={() => setCustom({ ...custom, role: "admin" })}>Admin</Button>
            </div>
            <Button
              className="w-full h-8 text-sm bg-amber-700 hover:bg-amber-800"
              disabled={!custom.name || !custom.email}
              onClick={() => entrar(`custom-${Date.now()}`, custom.name, custom.email, custom.role)}
            >
              Entrar como {custom.name || "..."}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
