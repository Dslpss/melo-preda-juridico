import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function exibirTelefone(telefone: string | null | undefined): string {
  if (!telefone) return "";
  if (telefone.startsWith("lid:")) return "WhatsApp";
  return telefone;
}
