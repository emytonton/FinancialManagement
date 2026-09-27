import { HttpError, api } from "@/server/http";
import { deleteItem, upsertItem } from "@/server/repo";
import { isCollection, schemas } from "@/server/schemas";

type Ctx = { params: Promise<{ collection: string; id: string }> };

async function target(ctx: Ctx) {
  const { collection, id } = await ctx.params;
  if (!isCollection(collection)) throw new HttpError(404, "Coleção desconhecida");
  return { collection, id };
}

// PUT /api/txs/abc123: cria ou atualiza o item com esse id.
export const PUT = api(async (req, ctx: Ctx) => {
  const { collection, id } = await target(ctx);
  const item = schemas[collection].parse(await req.json());
  if (item.id !== id) throw new HttpError(400, "id do corpo diferente da URL");
  await upsertItem(collection, item);
  return item;
});

export const DELETE = api(async (_req, ctx: Ctx) => {
  const { collection, id } = await target(ctx);
  await deleteItem(collection, id);
});
