import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/Shell";
import { loadOrInit } from "@/server/repo";
import { SESSION_COOKIE, isValidSession } from "@/server/session";

export const dynamic = "force-dynamic";

// Carrega os dados no servidor para a primeira tela já vir preenchida.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) redirect("/login");
  const data = await loadOrInit();
  // O servidor não sabe a largura da tela; o navegador informa se é celular,
  // e isso evita mostrar o layout de computador por um instante no telefone.
  const ua = (await headers()).get("user-agent") || "";
  const mobileGuess = /Mobi|iPhone/i.test(ua);
  return <AppShell initialData={data} mobileGuess={mobileGuess}>{children}</AppShell>;
}
