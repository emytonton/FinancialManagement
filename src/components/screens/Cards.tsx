"use client";
import { useState } from "react";
import { addMonths, capitalize, ddmm, fmt, monthName, monthShort, round2, sum, uid } from "@/lib/format";
import { dueInvoices, futureCommitments, parcelInfo, thirdPartyFor, type ThirdParty } from "@/lib/finance";
import { Badge, Button, CatIcon, Card, EmptyState, IconButton, Money, TransactionRow } from "../ui";
import { CreditCardPanel, InstallmentRow } from "../finance-ui";
import { useApp } from "../app/store";
import { PageHead } from "./common";

export function Cards() {
  const app = useApp();
  const { data, c } = app;
  const fut = futureCommitments(data, c.month, 6);
  const maxF = Math.max(1, ...fut.map(f => f.total));
  const active = data.installments.filter(i => { const p = parcelInfo(i, c.month); return p.active || p.idx < 1; });
  // Já terminaram antes do mês visto (continuam salvas, só não estão mais ativas).
  const ended = data.installments.filter(i => parcelInfo(i, c.month).idx > i.n);
  const [showEnded, setShowEnded] = useState(false);
  const invoices = dueInvoices(data, c).filter(i => i.fatura > 0 || i.paid > 0);
  const cardName = (id: string) => data.cards.find(k => k.id === id)?.name ?? id;
  // Pagar a fatura: usa primeiro o que está na caixinha do cartão (e tira de lá); o resto sai da conta.
  const pay = (cardId: string, amount: number, fromBox: number) => {
    const useBox = round2(Math.min(fromBox, amount));
    app.upsert("cardPayments", { id: uid(), cardId, date: c.month === c.tm ? c.today : c.month + "-" + String(data.cards.find(k => k.id === cardId)?.dueDay ?? 10).padStart(2, "0"), amount, fromBox: useBox });
    let rest = useBox;
    data.boxes.filter(b => b.cardId === cardId && b.amount > 0).forEach(b => {
      const take = round2(Math.min(rest, b.amount));
      if (take > 0) { app.upsert("boxes", { ...b, amount: round2(b.amount - take) }); rest = round2(rest - take); }
    });
    app.toast(useBox <= 0 ? "Pagamento da fatura registrado" : useBox >= amount ? "Fatura paga com a caixinha (" + fmt(useBox) + ")" : "Pago: " + fmt(useBox) + " da caixinha e " + fmt(round2(amount - useBox)) + " da conta");
  };
  // Gastos de outras pessoas: o mês visto e, se ainda faltar algo, o mês anterior (fatura que vence agora).
  const people = c.terceiros;
  const prevPending = thirdPartyFor(data, c.prev, c.today).filter(t => t.falta > 0);
  const cardIds = new Set(data.cards.map(k => k.id));
  const onCards = (t: ThirdParty) => round2(sum(Object.entries(t.byMethod).filter(([m]) => cardIds.has(m)), ([, v]) => v));
  const receive = (t: ThirdParty, month: string) => app.openForm("personPayment", undefined, {
    categoryId: t.cat.id, month, amount: t.falta, date: c.today < month + "-01" ? month + "-01" : c.today,
  });
  const undo = (t: ThirdParty) => { t.payments.forEach(p => app.remove("personPayments", p.id)); app.toast("Recebimento desfeito"); };
  const personRow = (t: ThirdParty, month: string, key: string) => (
    <div key={key} className="b-cardpay">
      <CatIcon cat={t.cat} size={36} />
      <div className="b-tx-main">
        <span className="b-tx-desc">{t.cat.name}{month !== c.month ? " · " + monthName(month) : ""}</span>
        <span className="b-tx-meta">
          {Object.keys(t.byMethod).length
            ? Object.entries(t.byMethod).map(([m, v], i) => <span key={m}>{i ? " · " : ""}{app.methodName(m)} <Money value={v} /></span>)
            : "Nenhum gasto"}
          {t.received > 0 ? <> · recebido <Money value={t.received} /></> : null}
        </span>
      </div>
      <Money value={t.falta > 0 ? t.falta : t.spent} className="b-strong" />
      {t.falta > 0.009
        ? <Button size="sm" variant="secondary" icon="check" onClick={() => receive(t, month)}>Recebi</Button>
        : t.spent > 0 ? <><Badge tone="positive" icon="check">Pago</Badge>{t.payments.length ? <IconButton icon="refresh" label="Desfazer recebimento" onClick={() => undo(t)} /> : null}</> : null}
    </div>
  );
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
          {c.faturasTotal !== c.faturas ? <>
            <div className="b-total-row"><span>Total das faturas</span><Money value={c.faturasTotal} className="b-strong" /></div>
            {people.filter(t => onCards(t) > 0).map(t => <div key={t.cat.id} className="b-total-row"><span className="b-muted">{"Gastos de " + t.cat.name}</span><Money value={onCards(t)} sign="out" /></div>)}
          </> : null}
          <div className="b-total-row is-big"><span>{c.faturasTotal !== c.faturas ? "Sua parte" : "Total das faturas"}</span><Money value={c.faturas} className="b-amount" /></div>
          {sum(c.cards, k => k.caixinha) > 0 ? <>
            <div className="b-total-row"><span className="b-muted">Já reservado nas caixinhas</span><Money value={sum(c.cards, k => k.caixinha)} sign="out" /></div>
            <div className="b-total-row"><span>Restante a pagar</span><Money value={round2(sum(c.cards, k => k.restante))} className="b-strong" /></div>
          </> : null}
          <p className="b-muted b-small">Essas faturas vencem em {monthName(addMonths(c.month, 1))} e entram no livre para gastar de lá.</p>
        </Card>
      </div>
    ) : <Card><EmptyState icon="card" title="Nenhum cartão cadastrado" action={<Button onClick={() => app.openForm("card")}>Adicionar cartão</Button>} /></Card>}

    {people.length ? (
      <Card className="b-mt" title={"Quanto cobrar em " + monthName(c.month)} subtitle="Gastos de outras pessoas no seu cartão. Ficam fora das suas métricas."
        action={<Money value={sum(people, t => t.falta) + sum(prevPending, t => t.falta)} className="b-amount b-tone-warning" />}>
        <div className="b-list">
          {prevPending.map(t => personRow(t, c.prev, "prev" + t.cat.id))}
          {people.map(t => personRow(t, c.month, t.cat.id))}
        </div>
        {prevPending.length ? <p className="b-muted b-small">{capitalize(monthName(c.prev))} ainda tem valor a receber (fatura que vence este mês).</p> : null}
      </Card>
    ) : null}

    {invoices.length ? (
      <Card className="b-mt" title={"Faturas que vencem em " + monthName(c.month)} subtitle={"Compras de " + monthName(c.prev) + ". Saem do seu livre de " + monthName(c.month) + "; marque Paguei quando pagar."}>
        <div className="b-list">
          {invoices.map(inv => {
            const open = Math.max(0, inv.fatura - inv.paid);
            return (
              <div key={inv.card.id} className="b-cardpay">
                <span className={"b-dot b-dot-lg is-" + inv.card.color} />
                <div className="b-tx-main">
                  <span className="b-tx-desc">{"Fatura " + inv.card.name}</span>
                  <span className="b-tx-meta">{"Vence " + ddmm(inv.due)}{inv.paid > 0 ? <> · pago <Money value={inv.paid} /></> : null}{open > 0.009 && inv.fromBox > 0 ? <> · <Money value={Math.min(inv.fromBox, open)} /> na caixinha, restam <Money value={round2(open - Math.min(inv.fromBox, open))} /></> : null}</span>
                </div>
                <Money value={inv.fatura} className="b-strong" />
                {open > 0.009
                  ? <Button size="sm" variant="secondary" icon="check" onClick={() => pay(inv.card.id, round2(open), inv.fromBox)}>Paguei</Button>
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
        {ended.length ? (
          <Card className="b-mt" title="Parcelamentos encerrados" subtitle={ended.length + (ended.length === 1 ? " compra já quitada" : " compras já quitadas") + " até " + monthName(c.month)}
            action={<Button variant="ghost" size="sm" onClick={() => setShowEnded(v => !v)}>{showEnded ? "Esconder" : "Mostrar"}</Button>}>
            {showEnded ? <div className="b-list">{ended.map(i => <InstallmentRow key={i.id} inst={i} month={c.month} cardName={cardName(i.cardId)} onEdit={() => app.openForm("installment", i)} onDelete={() => app.askDelete("installments", i.id, "Parcelamento")} />)}</div> : null}
          </Card>
        ) : null}
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
      <Card key={k.id} className="b-mt" title={"Compras na fatura " + k.name} subtitle={"Fecha dia " + String(k.closeDay).padStart(2, "0") + " · vence " + ddmm(k.due) + ". Compras no dia do fechamento ou depois vão para a próxima."}>
        <div className="b-list">
          {k.items.map(it => <TransactionRow key={it.src + it.id} tx={{ desc: it.desc, amount: it.amount, method: k.id, installment: (it.src === "parcel" ? "compra " : "") + ddmm(it.date) }} methodLabel={k.name} cat={data.categories.find(x => x.id === it.categoryId)} />)}
        </div>
      </Card>
    ) : null)}
  </>;
}
