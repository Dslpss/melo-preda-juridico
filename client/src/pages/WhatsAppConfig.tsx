import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Wifi, WifiOff, RefreshCw, LogOut, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WhatsAppConfig() {
  const [polling, setPolling] = useState(false);

  const { data: statusData, refetch: refetchStatus, isLoading: statusLoading } =
    trpc.whatsapp.status.useQuery(undefined, {
      refetchInterval: polling ? 4000 : false,
    });

  const { data: qrData, refetch: refetchQr } =
    trpc.whatsapp.qrcode.useQuery(undefined, {
      enabled: statusData?.status === "disconnected",
      refetchInterval: polling ? 8000 : false,
    });

  useEffect(() => {
    if (statusData?.status === "connected") setPolling(false);
  }, [statusData?.status]);

  const createMutation = trpc.whatsapp.createInstance.useMutation({
    onSuccess: () => { setPolling(true); refetchStatus(); refetchQr(); },
    onError: (e) => toast.error(e.message),
  });

  const disconnectMutation = trpc.whatsapp.disconnect.useMutation({
    onSuccess: () => { toast.success("WhatsApp desconectado"); refetchStatus(); },
    onError: (e) => toast.error(e.message),
  });

  const connected = statusData?.status === "connected";
  const disconnected = statusData?.status === "disconnected";
  const notConfigured = statusData?.status === "not_configured";

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WhatsApp</h1>
        <p className="text-muted-foreground text-sm mt-1">Conexão do número central do escritório</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Status da conexão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <p className="text-sm text-muted-foreground">Verificando...</p>
          ) : notConfigured ? (
            <Badge variant="outline" className="text-orange-600 border-orange-300">Não configurado</Badge>
          ) : connected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-green-600" />
                <Badge className="bg-green-100 text-green-800 border-green-300">Conectado</Badge>
              </div>
              {statusData.phone && (
                <p className="text-sm text-muted-foreground">Número: +{statusData.phone}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-red-500" />
              <Badge variant="destructive">Desconectado</Badge>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {!connected && !notConfigured && (
              <Button
                size="sm"
                onClick={() => { createMutation.mutate(); setPolling(true); }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Aguarde..." : "Gerar QR Code"}
              </Button>
            )}
            {disconnected && (
              <Button size="sm" variant="outline" onClick={() => { refetchQr(); refetchStatus(); }}>
                <RefreshCw className="h-3 w-3 mr-1" /> Atualizar QR
              </Button>
            )}
            {connected && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                <LogOut className="h-3 w-3 mr-1" />
                Desconectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {disconnected && qrData?.base64 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Escanear QR Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No WhatsApp do número central: <strong>Menu (⋮) → Dispositivos conectados → Conectar dispositivo</strong>
            </p>
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              <img src={qrData.base64} alt="QR Code WhatsApp" className="w-48 h-48" />
            </div>
            <p className="text-xs text-muted-foreground text-center">QR code expira em ~60s. Clique em "Atualizar QR" se expirar.</p>
          </CardContent>
        </Card>
      )}

      {connected && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              WhatsApp conectado. Mensagens recebidas aparecem automaticamente em <strong>Atendimentos</strong>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
