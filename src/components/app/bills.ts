"use client";
// Marcar conta fixa como paga (ou desfazer), usando primeiro a caixinha das contas.
import { round2 } from "@/lib/format";
import { monthName } from "@/lib/format";
import type { Store } from "./store";

export function payBill(app: Store, billId: string, month: string, value: number) {
  const b = app.data.bills.find(x => x.id === billId);
  if (!b) return;
  let rest = round2(value);
  let used = 0;
  app.data.boxes.filter(x => x.forBills && x.amount > 0).forEach(box => {
    const take = round2(Math.min(rest, box.amount));
    if (take > 0) { app.upsert("boxes", { ...box, amount: round2(box.amount - take) }); rest = round2(rest - take); used = round2(used + take); }
  });
  app.upsert("bills", {
    ...b, paid: { ...b.paid, [month]: true }, amounts: { ...(b.amounts || {}), [month]: round2(value) },
    fromBox: { ...(b.fromBox || {}), [month]: used },
  });
  app.toast(b.name + " de " + monthName(month) + " paga" + (used > 0 ? (used >= value ? " com a caixinha" : ": " + used.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + " da caixinha, o resto da conta") : ""));
}

export function unpayBill(app: Store, billId: string, month: string) {
  const b = app.data.bills.find(x => x.id === billId);
  if (!b) return;
  const used = b.fromBox?.[month] || 0;
  const box = app.data.boxes.find(x => x.forBills);
  if (used > 0 && box) app.upsert("boxes", { ...box, amount: round2(box.amount + used) });
  const paid = { ...b.paid };
  const amounts = { ...(b.amounts || {}) };
  const fromBox = { ...(b.fromBox || {}) };
  delete paid[month];
  delete amounts[month];
  delete fromBox[month];
  app.upsert("bills", { ...b, paid, amounts, fromBox });
}
