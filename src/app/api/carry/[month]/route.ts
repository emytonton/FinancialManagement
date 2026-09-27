import { HttpError, api } from "@/server/http";
import { setCarry } from "@/server/repo";
import { carryBody } from "@/server/schemas";

// Saldo da conta no dia 1º do mês.
export const PUT = api(async (req, ctx: { params: Promise<{ month: string }> }) => {
  const { month } = await ctx.params;
  if (!/^\d{4}-\d{2}$/.test(month)) throw new HttpError(400, "Mês inválido");
  const { amount } = carryBody.parse(await req.json());
  await setCarry(month, amount);
});
