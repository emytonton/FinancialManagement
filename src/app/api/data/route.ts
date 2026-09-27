import { api } from "@/server/http";
import { loadData, loadOrInit, replaceData } from "@/server/repo";
import { dataSchema } from "@/server/schemas";

export const dynamic = "force-dynamic";

// GET: tudo que o app precisa para montar as telas.
export const GET = api(async () => loadOrInit());

// PUT: substitui todos os dados (importar backup, restaurar exemplo, apagar tudo).
export const PUT = api(async req => {
  const body = dataSchema.parse(await req.json());
  await replaceData(body);
  return loadData();
});
