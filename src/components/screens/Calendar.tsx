"use client";
import { useState } from "react";
import { dateIn, dayOf, monthName, pad } from "@/lib/format";
import { debtsFor, dueInvoices, incomeName, type MonthBill } from "@/lib/finance";
import { Button, Card, EmptyState, IconButton, Money, Segmented, UpcomingItem } from "../ui";
import { CalendarMonth, EVENT_TYPES } from "../finance-ui";
import { useApp } from "../app/store";
import { payBill, unpayBill } from "../app/bills";
import { PageHead } from "./common";

type Ev = { date: string; type: string; label: string; amount: number; status?: string };

export function Calendar() {
  const app = useApp();
  const { data, c } = app;
  const [sel, setSel] = useState(c.month === c.tm ? dayOf(c.today) : 1);
  const events: Ev[] = [];
  c.incomes.forEach(i => events.push({ date: i.date, type: "income", label: incomeName(data, i), amount: i.amount }));
  c.expected.forEach(e => events.push({ date: e.date, type: "income", label: e.source.name + " (previsto)", amount: e.amount }));
  c.bills.forEach(b => events.push({ date: b.date, type: "bill", label: b.name, amount: b.amount, status: b.status }));
  dueInvoices(data, c).forEach(inv => {
    if (inv.fatura > 0 || inv.paid > 0) events.push({ date: inv.due, type: "card", label: "Fatura " + inv.card.name, amount: inv.paid || inv.fatura, status: inv.paid >= inv.fatura - 0.009 ? "paga" : undefined });
  });
  const openOf = new Map(debtsFor(data, "9999-12-31").flatMap(p => p.items.map(i => [i.tx.id, i.open] as const)));
  c.txs.filter(x => x.kind === "compartilhado").forEach(x => events.push({ date: x.date, type: "refund", label: "Pago por " + (x.paidBy || "outra pessoa") + ": " + x.desc, amount: x.amount, status: (openOf.get(x.id) ?? 0) > 0.009 ? "pendente" : "paga" }));
  c.repaid.forEach(r => events.push({ date: r.date, type: "refund", label: "Você devolveu para " + r.person, amount: r.amount, status: "paga" }));
  c.contribs.forEach(x => { const g = data.goals.find(k => k.id === x.goalId); events.push({ date: x.date, type: "goal", label: "Aporte: " + (g ? g.name : "meta"), amount: x.amount }); });
  const dayEv = events.filter(e => dayOf(e.date) === sel);
  const setStatus = (b: MonthBill, st: string) => {
    if (st === "paga") payBill(app, b.id, c.month, b.amount); else unpayBill(app, b.id, c.month);
  };
  return <>
    <PageHead title="Calendário" sub="O que entra e sai nos próximos dias" />
    <div className="b-cols">
      <div className="b-col-main">
        <Card>
          <CalendarMonth month={c.month} events={events} today={c.today} selected={sel} onSelect={setSel} />
          <div className="b-legend b-legend-ev">{EVENT_TYPES.map(t => <span key={t.type}><i className={"b-ev b-ev-" + t.type} />{t.label}</span>)}</div>
        </Card>
        <Card title={"Dia " + pad(sel) + " de " + monthName(c.month)} className="b-mt">
          {dayEv.length
            ? <div className="b-list">{dayEv.map((e, i) => <UpcomingItem key={i} date={dateIn(c.month, sel)} label={e.label} amount={e.amount} type={e.type} status={e.status} />)}</div>
            : <EmptyState icon="calendar" title="Nada neste dia" />}
        </Card>
      </div>
      <div className="b-col-side">
        <Card title="Contas fixas" subtitle="Marque como paga quando pagar" action={<IconButton icon="plus" label="Nova conta" onClick={() => app.openForm("bill")} />}>
          {c.bills.some(b => b.kind !== "assinatura") ? (
            <div className="b-list">
              {c.bills.filter(b => b.kind !== "assinatura").sort((a, z) => a.day - z.day).map(b => (
                <div key={b.id} className="b-bill">
                  <div className="b-bill-top">
                    <div className="b-tx-main"><span className="b-tx-desc">{b.name}</span><span className="b-tx-meta">{"Dia " + pad(b.day) + " · " + app.methodName(b.method)}</span></div>
                    <Money value={b.amount} className="b-strong" />
                    <IconButton icon="edit" label={"Editar " + b.name} onClick={() => app.openForm("bill", data.bills.find(x => x.id === b.id))} />
                  </div>
                  <Segmented size="sm" value={b.status} onChange={st => setStatus(b, st)} label={"Status de " + b.name}
                    options={[{ value: "paga", label: "Paga", icon: "check" }, { value: b.status === "atrasada" ? "atrasada" : "pendente", label: b.status === "atrasada" ? "Atrasada" : "Pendente", icon: b.status === "atrasada" ? "alert" : "clock" }]} />
                </div>
              ))}
            </div>
          ) : <EmptyState icon="repeat" title="Nenhuma conta fixa" action={<Button size="sm" onClick={() => app.openForm("bill")}>Adicionar conta</Button>} />}
        </Card>
      </div>
    </div>
  </>;
}
