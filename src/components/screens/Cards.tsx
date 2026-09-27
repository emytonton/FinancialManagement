"use client";
import { ddmm, monthName, monthShort, sum, uid } from "@/lib/format";
import { dueInvoices, futureCommitments, parcelInfo } from "@/lib/finance";
import { Badge, Button, Card, EmptyState, Money, TransactionRow } from "../ui";
import { CreditCardPanel, InstallmentRow } from "../finance-ui";
import { useApp } from "../app/store";
import { PageHead } from "./common";

export function Cards() {
  const app = useApp();
  const { data, c } = app;
  const fut = futureCommitments(data, c.month, 6);
  const maxF = Math.max(1, ...fut.map(f => f.total));
  const active = data.installments.filter(i => { const p = parcelInfo(i, c.month); return p.active || p.idx < 1; });
  const invoices = dueInvoices(data, c).filter(i => i.fatura > 0 || i.paid > 0);
  const cardName = (id: string) => data.cards.find(k => k.id === id)?.name ?? id;
  const pay = (cardId: string, amount: number) => {
    app.upsert("cardPayments", { id: uid(), cardId, date: c.month === c.tm ? c.today : c.month + "-" + String(data.cards.find(k => k.id === cardId)?.dueDay ?? 10).padStart(2, "0"), amount });
    app.toast("Pagamento da fatura registrado");
  };
  return <>
    <PageHead title="Cartões" sub="Faturas, limites e parcelas" actions={<Button icon="plus" variant="secondary" onClick={() => app.openForm("card")}>Novo cartão</Button>} />
    {c.cards.length ? (
      <div className="b-cardgrid">
        {c.cards.map(k => (
          <CreditCardPanel key={k.id} card={k} onEdit={() => app.openForm("card", data.cards.find(x => x.id === k.id))} onDelete={() => app.askDelete("cards", k.id, "Cartão")} />
        ))}
        <Card className="b-cardtotal" title="Total comprometido nos cartões">
          <div className="b-list">
            {c.cards.map(k => <div key={k.id} className="b-total-row"><span><span className={"b-dot b-dot-lg is-" + k.color} /> {k.name}</span><Money value={k.fatura} /></div>)}
          </div>
          <div className="b-total-row is-big"><span>Total das faturas</span><Money value={c.faturas} className="b-amount" /></div>
          <p className="b-muted b-small">Esse valor já foi descontado do seu disponível para gastar.</p>
        </Card>
      </div>
    ) : <Card><EmptyState icon="card" title="Nenhum cartão cadastrado" action={<Button onClick={() => app.openForm("card")}>Adicionar cartão</Button>} /></Card>}

    {invoices.length ? (
      <Card className="b-mt" title={"Faturas que vencem em " + monthName(c.month)} subtitle={"Compras de " + monthName(c.prev) + ". Marque quando pagar para o saldo em conta ficar certo."}>
        <div className="b-list">
          {invoices.map(inv => {
            const open = Math.max(0, inv.fatura - inv.paid);
            return (
              <div key={inv.card.id} className="b-cardpay">
                <span className={"b-dot b-dot-lg is-" + inv.card.color} />
                <div className="b-tx-main">
                  <span className="b-tx-desc">{"Fatura " + inv.card.name}</span>
                  <span className="b-tx-meta">{"Vence " + ddmm(inv.due)}{inv.paid > 0 ? <> · pago <Money value={inv.paid} /></> : null}</span>
                </div>
                <Money value={inv.fatura} className="b-strong" />
                {open > 0.009
                  ? <Button size="sm" variant="secondary" icon="check" onClick={() => pay(inv.card.id, Math.round(open * 100) / 100)}>Paguei</Button>
                  : <Badge tone="positive" icon="check">Paga</Badge>}
              </div>
            );
          })}
        </div>
      </Card>
    ) : null}

    <div className="b-cols b-mt">
      <div className="b-col-main">
        <Card title="Parcelamentos ativos" subtitle={active.length + " compras"} action={<Button variant="ghost" size="sm" icon="plus" onClick={() => app.openForm("installment")}>Adicionar</Button>}>
          {active.length
            ? <div className="b-list">{active.map(i => <InstallmentRow key={i.id} inst={i} month={c.month} cardName={cardName(i.cardId)} onEdit={() => app.openForm("installment", i)} onDelete={() => app.askDelete("installments", i.id, "Parcelamento")} />)}</div>
            : <EmptyState icon="layers" title="Nenhuma compra parcelada" text={'Ao adicionar um gasto no cartão, marque "Parcelado".'} />}
        </Card>
      </div>
      <div className="b-col-side">
        <Card title="Renda futura comprometida" subtitle="Parcelas dos próximos 6 meses">
          <div className="b-futbars">
            {fut.map(f => (
              <div key={f.m} className="b-futbar">
                <span className="b-futbar-m">{monthShort(f.m)}</span>
                <div className="b-futbar-track"><span style={{ width: f.total / maxF * 100 + "%" }} /></div>
                <Money value={f.total} cents={false} />
              </div>
            ))}
          </div>
          <div className="b-total-row"><span>Total futuro</span><Money value={sum(fut, f => f.total)} className="b-strong" /></div>
        </Card>
      </div>
    </div>
    {c.cards.map(k => k.items.length ? (
      <Card key={k.id} className="b-mt" title={"Compras na fatura " + k.name} subtitle={"Vence " + ddmm(k.due)}>
        <div className="b-list">
          {k.items.map((it, i) => <TransactionRow key={i} tx={{ desc: it.desc, amount: it.amount, method: k.id }} methodLabel={k.name} cat={data.categories.find(x => x.id === it.categoryId)} />)}
        </div>
      </Card>
    ) : null)}
  </>;
}
