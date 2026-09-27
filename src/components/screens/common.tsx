"use client";
import type { ReactNode } from "react";
import { addMonths, dateIn, round2 } from "@/lib/format";
import { billsFor, type Month, type BillStatus } from "@/lib/finance";
import type { Data } from "@/lib/types";

export function PageHead({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="b-pagehead">
      <div><h1 className="b-display">{title}</h1>{sub ? <p className="b-muted">{sub}</p> : null}</div>
      {actions ? <div className="b-pagehead-actions">{actions}</div> : null}
    </div>
  );
}

export function greeting() {
  const hr = new Date().getHours();
  return hr < 12 ? "Bom dia" : hr < 18 ? "Boa tarde" : "Boa noite";
}

export type Upcoming = { date: string; label: string; amount: number; type: "income" | "bill" | "card" | "refund" | "goal"; status?: BillStatus };

// Próximos compromissos: o que falta entrar e sair a partir de hoje (e contas atrasadas).
export function upcomingFor(data: Data, c: Month, limit = 99): Upcoming[] {
  const ev: Upcoming[] = [];
  c.expected.forEach(e => ev.push({ date: e.date, label: e.source.name, amount: e.amount, type: "income" }));
  c.pendingBills.forEach(b => ev.push({ date: b.date, label: b.name, amount: b.amount, type: "bill", status: b.status }));
  c.cards.filter(k => k.fatura > 0).forEach(k => ev.push({ date: k.due, label: "Fatura " + k.name, amount: k.fatura, type: "card" }));
  c.reembolsos.forEach(x => ev.push({ date: c.today, label: "Devolver para " + x.desc, amount: x.amount, type: "refund" }));
  const nm = addMonths(c.month, 1);
  data.sources.forEach(s => s.days.forEach(d => ev.push({ date: dateIn(nm, d), label: s.name, amount: round2(s.expected / s.days.length), type: "income" })));
  // Mês que vem: só contas a pagar (assinaturas são cobradas sozinhas no cartão).
  billsFor(data, nm, c.today).filter(b => b.kind !== "assinatura").forEach(b => ev.push({ date: b.date, label: b.name, amount: b.amount, type: "bill" }));
  return ev
    .filter(e => e.status === "atrasada" || e.date >= c.today)
    .sort((a, z) => a.date.localeCompare(z.date) || (a.type === "income" ? -1 : 1))
    .slice(0, limit);
}
