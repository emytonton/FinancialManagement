import { Transactions } from "@/components/screens/Transactions";

export default async function Page({ searchParams }: PageProps<"/transacoes">) {
  const { dir, flag } = await searchParams;
  return <Transactions dir={typeof dir === "string" ? dir : undefined} flag={typeof flag === "string" ? flag : undefined} />;
}
