import { Budget } from "@/components/screens/Budget";

export default async function Page({ searchParams }: PageProps<"/orcamento">) {
  const { cat } = await searchParams;
  return <Budget key={typeof cat === "string" ? cat : ""} focus={typeof cat === "string" ? cat : undefined} />;
}
