"use client";
import { useState } from "react";
import { ddmm, round2, sum, uid } from "@/lib/format";
import { debtsFor, type PersonDebt } from "@/lib/finance";
import { Badge, Button, Card, CatIcon, EmptyState, Icon, IconButton, Money, ProgressBar } from "../ui";
import { useApp } from "../app/store";
import { PageHead } from "./common";

// Quanto você deve para cada pessoa que pagou compras por você (sua parte),
// menos o que você já devolveu. Pagamentos abatem as compras mais antigas primeiro.
export function Reimbursements() {
  const app = useApp();
  const { data, c } = app;
  const people = debtsFor(data, "9999-12-31");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const totalOwed = round2(sum(people, p => p.owed));
  const catOf = (id: string) => data.categories.find(k => k.id === id);

  const newPurchase = (paidBy = "") => app.openAdd("gasto", { kind: "compartilhado", method: "pix", paidBy });
  const payValue = (p?: PersonDebt) => app.openForm("repayment", undefined, p ? { person: p.name, amount: p.owed } : undefined);
  const payAll = (p: PersonDebt) => {
    app.upsert("repayments", { id: uid(), person: p.name, date: c.today, amount: p.owed, note: "Quitado" });
    app.toast("Tudo com " + p.name + " quitado");
  };

  const person = (p: PersonDebt) => {
    const pending = p.items.filter(i => i.open > 0.009).reverse();
    const done = p.items.filter(i => i.open <= 0.009).reverse();
    const showHist = !!open[p.key];
    return (
      <Card key={p.key} className="b-mt" title={p.name}
        subtitle={p.owed > 0 ? pending.length + (pending.length === 1 ? " compra em aberto" : " compras em aberto") : p.credit > 0 ? "Você mandou a mais" : "Tudo acertado"}
        action={p.owed > 0 ? <Money value={p.owed} className="b-amount b-tone-warning" /> : p.credit > 0 ? <Badge tone="neutral">Crédito <Money value={p.credit} /></Badge> : <Badge tone="positive" icon="check">Quitado</Badge>}>
        {p.total > 0 ? <ProgressBar value={p.paid} max={p.total} tone={p.owed > 0 ? "warning" : "positive"} height={8} label={"Devolvido para " + p.name} /> : null}
        <p className="b-muted b-small">Você devolveu <Money value={Math.min(p.paid, p.total)} /> de <Money value={p.total} /> no total.</p>
        {pending.length ? (
          <div className="b-list">
            {pending.map(i => (
              <div key={i.tx.id} className="b-cardpay b-box" role="button" tabIndex={0} onClick={() => app.openEdit("gasto", i.tx as unknown as Record<string, unknown>)}>
                <CatIcon cat={catOf(i.tx.categoryId)} size={36} />
                <div className="b-tx-main">
                  <span className="b-tx-desc">{i.tx.desc}</span>
                  <span className="b-tx-meta">
                    {ddmm(i.tx.date)} · total <Money value={i.tx.total ?? i.tx.amount} />{i.tx.total && i.tx.total > i.tx.amount ? <> · sua parte <Money value={i.tx.amount} /></> : " · toda sua"}
                    {i.paid > 0 ? <> · já devolveu <Money value={i.paid} /></> : null}
                  </span>
                </div>
                <Money value={i.open} className="b-strong" />
              </div>
            ))}
          </div>
        ) : null}
        <div className="b-savebar-row b-mt">
          {p.owed > 0 ? <>
            <Button variant="secondary" icon="cash" onClick={() => payValue(p)}>Paguei um valor</Button>
            <Button icon="check" onClick={() => payAll(p)}>Quitar tudo</Button>
          </> : <Button variant="secondary" icon="plus" onClick={() => newPurchase(p.name)}>Nova compra que {p.name} pagou</Button>}
        </div>
        {done.length || p.payments.length ? (
          <>
            <button type="button" className="b-linkbtn b-mt" onClick={() => setOpen(o => ({ ...o, [p.key]: !showHist }))}>
              {showHist ? "Esconder histórico" : "Ver histórico (" + p.payments.length + " pagamentos, " + done.length + " compras quitadas)"}
            </button>
            {showHist ? (
              <div className="b-list">
                {[...p.payments].reverse().map(r => (
                  <div key={r.id} className="b-cardpay">
                    <span className="b-caticon b-caticon-in" style={{ width: 36, height: 36 }}><Icon name="arrowUpRight" size={16} /></span>
                    <div className="b-tx-main"><span className="b-tx-desc">Você mandou</span><span className="b-tx-meta">{ddmm(r.date)}{r.note ? " · " + r.note : ""}</span></div>
                    <Money value={r.amount} sign="out" />
                    <IconButton icon="trash" label="Excluir pagamento" className="is-danger" onClick={() => app.askDelete("repayments", r.id, "Pagamento")} />
                  </div>
                ))}
                {done.map(i => (
                  <div key={i.tx.id} className="b-cardpay" style={{ opacity: 0.7 }}>
                    <CatIcon cat={catOf(i.tx.categoryId)} size={36} />
                    <div className="b-tx-main"><span className="b-tx-desc">{i.tx.desc}</span><span className="b-tx-meta">{ddmm(i.tx.date)} · quitada</span></div>
                    <Money value={i.tx.amount} />
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </Card>
    );
  };

  return <>
    <PageHead title="Reembolsos" sub="O que você deve para quem pagou por você"
      actions={<>
        <Button variant="secondary" icon="cash" onClick={() => payValue()}>Paguei</Button>
        <Button icon="plus" onClick={() => newPurchase()}>Compra de outra pessoa</Button>
      </>} />
    <Card title="Você deve no total" action={<Money value={totalOwed} className="b-amount b-tone-warning" />}>
      {people.some(p => p.owed > 0)
        ? <div className="b-list">{people.filter(p => p.owed > 0).map(p => <div key={p.key} className="b-total-row"><span>{p.name}</span><Money value={p.owed} className="b-strong" /></div>)}</div>
        : <p className="b-muted b-small">Nada pendente.</p>}
      <p className="b-muted b-small">Esse valor fica reservado no seu livre para gastar até você devolver. A sua parte de cada compra já entra nos seus gastos na data da compra.</p>
    </Card>
    {people.length ? people.map(person) : (
      <Card className="b-mt">
        <EmptyState icon="users" title="Nenhuma compra de outra pessoa"
          text="Quando alguém pagar algo por você (o mercado, uma compra no cartão dele), registre aqui. Depois é só anotar os valores que você for devolvendo."
          action={<Button icon="plus" onClick={() => newPurchase()}>Registrar compra</Button>} />
      </Card>
    )}
  </>;
}
