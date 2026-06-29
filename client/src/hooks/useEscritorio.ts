import { trpc } from "@/lib/trpc";

export function useEscritorio() {
  const { data } = trpc.configuracoes.getEscritorio.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  return {
    nome: data?.nome || "Castro Sociedade de Advogados",
    advogado: data?.advogado || "",
    oab: data?.oab || "",
    cidade: data?.cidade || "",
  };
}
