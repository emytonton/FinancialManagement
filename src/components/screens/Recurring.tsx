"use client";
import { useState } from "react";
import { ddmm, monthName, monthShort, pct, round2, sum } from "@/lib/format";
import { billActive, billAmount, billTypeOf, billsFor, type MonthBill } from "@/lib/finance";
import type { Bill } from "@/lib/types";
import { Badge, Button, Card, EmptyState, Field, Icon, IconButton, Money, MoneyInput, Sheet } from "../ui";
import { useApp } from "../app/store";
import { payBill, unpayBill } from "../app/bills";
import { PageHead } from "./common";

const monthTxt = (m: string) => monthShort(m) + "/" + m.slice(2, 4);

// Assinaturas (cobradas sozinhas todo mês) e contas fixas (marcadas como pagas, com o valor do mês).
export function Recurring() {
  const app = useApp();
  const { data, c } = app;
  const [paying, setPaying] = useState<{ bill: MonthBill; value: number } | null>(null);

  const month = billsFor(data, c.month, c.today);
  const contas = month.filter(b => b.kind !== "assinatura").sort((a, z) => a.day - z.day);
  const subs = data.bills.filter(b => b.kind === "assinatura").sort((a, z) => Number(billActive(z, c.month)) - Number(billActive(a, c.month)) || a.day - z.day);
  const subsActive = subs.filter(b => billActive(b, c.month));
  const totalSubs = round2(sum(subsActive, b => billAmount(b, c.month)));
  const totalContas = round2(sum(contas, b => b.amount));
  const pagas = round2(sum(contas.filter(b => b.status === "paga"), b => b.amount));
  const original = (id: string) => data.bills.find(b => b.id === id)!;

  const confirmPay = () => {
    if (!paying) return;
    payBill(app, paying.bill.id, c.month, paying.value);
    setPaying(null);
  };
  const unpay = (id: string) => unpayBill(app, id, c.month);
  const methodTxt = (b: Bill) => app.methodName(b.method);

  return <>
    <PageHead title="Assinaturas e contas" sub="Tudo que se repete todo mês"
      actions={<>
        <Button icon="plus" variant="secondary" onClick={() => app.openForm("subscription")}>Assinatura</Button>
        <Button icon="plus" onClick={() => app.openForm("bill")}>Conta fixa</Button>
      </>} />
    <div className="b-cols">
      <div className="b-col-main">
        <Card title={"Contas fixas de " + monthName(c.month)} subtitle="Toque em Paguei e confirme o valor do mês">
          {contas.length ? (
            <div className="b-list">
              {contas.map(b => {
                const t = billTypeOf(b);
                const custom = b.amounts?.[c.month] != null;
                return (
                  <div key={b.id} className="b-cardpay b-box" role="button" tabIndex={0} onClick={() => app.openForm("bill", original(b.id))} onKeyDown={e => { if (e.key === "Enter") app.openForm("bill", original(b.id)); }}>
                    <span className="b-stat-icon b-soft-primary"><Icon name={t.icon} size={18} /></span>
                    <div className="b-tx-main">
                      <span className="b-tx-desc">{b.name}</span>
                      <span className="b-tx-meta">
                        {t.name} · vence {ddmm(b.date)} · {methodTxt(b)}
                        {b.status === "atrasada" ? <> · <span className="b-tone-negative">atrasada</span></> : null}
                      </span>
                    </div>
                    <span className="b-tx-amount">
                      <Money value={b.amount} className="b-strong" />
                      {!custom && b.status !== "paga" ? <span className="b-tx-sub">previsto</span> : null}
                    </span>
                    {b.status === "paga"
                      ? <span onClick={e => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Badge tone="positive" icon="check">Paga</Badge>
                          <IconButton icon="refresh" label="Desmarcar como paga" onClick={() => unpay(b.id)} />
                        </span>
                      : <Button size="sm" variant="secondary" icon="check" onClick={e => { e.stopPropagation(); setPaying({ bill: b, value: b.amount }); }}>Paguei</Button>}
                  </div>
                );
              })}
            </div>
          ) : <EmptyState icon="file" title="Nenhuma conta fixa" text="Luz, água, internet, aluguel... Cadastre uma vez e marque como paga todo mês."
              action={<Button size="sm" onClick={() => app.openForm("bill")}>Adicionar conta</Button>} />}
          {contas.length ? <>
            <div className="b-total-row"><span>Pago</span><Money value={pagas} /></div>
            <div className="b-total-row"><span>Falta pagar</span><Money value={round2(totalContas - pagas)} className="b-strong" /></div>
          </> : null}
        </Card>

        <Card title="Assinaturas" subtitle="Entram sozinhas na fatura (ou saem da conta) todo mês" className="b-mt">
          {subs.length ? (
            <div className="b-list">
              {subs.map(b => {
                const on = billActive(b, c.month);
                return (
                  <div key={b.id} className="b-cardpay b-box" role="button" tabIndex={0} style={on ? undefined : { opacity: 0.6 }}
                    onClick={() => app.openForm("subscription", b)} onKeyDown={e => { if (e.key === "Enter") app.openForm("subscription", b); }}>
                    <span className="b-stat-icon b-soft-primary"><Icon name="repeat" size={18} /></span>
                    <div className="b-tx-main">
                      <span className="b-tx-desc">{b.name}</span>
                      <span className="b-tx-meta">
                        dia {String(b.day).padStart(2, "0")} · {methodTxt(b)}
                        {b.start ? " · desde " + monthTxt(b.start) : ""}
                        {b.end ? " · última em " + monthTxt(b.end) : ""}
                      </span>
                    </div>
                    <span className="b-tx-amount"><Money value={billAmount(b, c.month)} className="b-strong" /><span className="b-tx-sub">por mês</span></span>
                    {on ? <Badge tone="positive">Ativa</Badge> : <Badge tone="neutral">{b.start && c.month < b.start ? "Ainda não começou" : "Encerrada"}</Badge>}
                  </div>
                );
              })}
            </div>
          ) : <EmptyState icon="repeat" title="Nenhuma assinatura" text="Spotify, streaming, academia... Cadastre uma vez e ela entra na fatura todo mês."
              action={<Button size="sm" onClick={() => app.openForm("subscription")}>Adicionar assinatura</Button>} />}
          {subsActive.length ? <div className="b-total-row"><span>Total por mês</span><Money value={totalSubs} className="b-strong" /></div> : null}
        </Card>
      </div>

      <div className="b-col-side">
        <Card title={"Fixos de " + monthName(c.month)}>
          <div className="b-list">
            <div className="b-total-row"><span>Assinaturas</span><Money value={totalSubs} /></div>
            <div className="b-total-row"><span>Contas fixas</span><Money value={totalContas} /></div>
          </div>
          <div className="b-total-row is-big"><span>Total</span><Money value={round2(totalSubs + totalContas)} className="b-amount" /></div>
          {c.receitas > 0 ? <p className="b-muted b-small">{pct((totalSubs + totalContas) / c.receitas)} do que entrou em {monthName(c.month)}.</p> : null}
        </Card>
        {subsActive.length ? (
          <Card title="Assinaturas por forma de pagamento">
            <div className="b-list">
              {Object.entries(subsActive.reduce<Record<string, number>>((acc, b) => { acc[b.method] = round2((acc[b.method] || 0) + billAmount(b, c.month)); return acc; }, {}))
                .map(([m, v]) => <div key={m} className="b-total-row"><span>{app.methodName(m)}</span><Money value={v} /></div>)}
            </div>
          </Card>
        ) : null}
      </div>
    </div>

    <Sheet open={!!paying} title={paying ? "Pagar " + paying.bill.name : ""} onClose={() => setPaying(null)}
      footer={<><Button variant="secondary" onClick={() => setPaying(null)}>Cancelar</Button><Button icon="check" onClick={confirmPay}>Confirmar</Button></>}>
      {paying ? <>
        <Field label={"Valor de " + monthName(c.month)} hint={<>Previsto: <Money value={original(paying.bill.id).amount} />. Ajuste se veio diferente.</>}>
          <MoneyInput value={paying.value} onChange={v => setPaying(p => (p ? { ...p, value: v } : p))} autoFocus />
        </Field>
      </> : null}
    </Sheet>
  </>;
}
