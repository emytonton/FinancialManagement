"use client";
import { addMonths, dateIn, ddmm, monthName, round2, sum } from "@/lib/format";
import type { Box } from "@/lib/types";
import { Badge, Button, Card, EmptyState, Icon, Money, RowActions } from "../ui";
import { useApp } from "../app/store";
import { PageHead } from "./common";

// Caixinhas: dinheiro separado, fora do saldo da conta.
// As ligadas a um cartão abatem da fatura; as outras só aparecem como reservado.
export function Boxes() {
  const app = useApp();
  const { data, c } = app;
  const cardOf = (b: Box) => data.cards.find(k => k.id === b.cardId);
  // "Reservadas para pagar": ligadas a uma fatura ou às contas fixas.
  const forCards = data.boxes.filter(b => cardOf(b) || b.forBills);
  const others = data.boxes.filter(b => !cardOf(b) && !b.forBills);
  const totalCards = sum(forCards, b => b.amount);
  const totalOthers = sum(others, b => b.amount);

  const row = (b: Box) => {
    const card = cardOf(b);
    const st = card ? c.invoices.find(i => i.cardId === card.id) : undefined;
    const mc = card ? c.cards.find(k => k.id === card.id) : undefined;
    return (
      <div key={b.id} className="b-cardpay b-box" role="button" tabIndex={0} onClick={() => app.openForm("box", b)} onKeyDown={e => { if (e.key === "Enter") app.openForm("box", b); }}>
        <span className="b-stat-icon b-soft-primary"><Icon name={b.icon || "piggy"} size={18} /></span>
        <div className="b-tx-main">
          <span className="b-tx-desc">{b.name}</span>
          <span className="b-tx-meta">
            {card && st && mc ? <>
              {st.coveredPrev > 0 ? <>cobre <Money value={st.coveredPrev} /> da fatura que vence {ddmm(dateIn(c.month, card.dueDay))} · </> : null}
              {st.coveredCur > 0 ? <>cobre <Money value={st.coveredCur} /> da fatura que vence {ddmm(mc.due)}</> : st.coveredPrev > 0 ? null : <>reservada para a fatura {card.name}</>}
              {st.sobra > 0.009 ? <> · sobra <Money value={st.sobra} /></> : null}
            </> : b.forBills ? <>
              {c.contasCobertas > 0 ? <>cobre <Money value={c.contasCobertas} /> das contas a vencer de {monthName(c.month)}</> : <>reservada para as contas fixas</>}
              {c.caixinhaContas - c.contasCobertas > 0.009 ? <> · sobra <Money value={round2(c.caixinhaContas - c.contasCobertas)} /></> : null}
            </> : "Dinheiro separado"}
          </span>
        </div>
        <Money value={b.amount} className="b-strong" />
        <RowActions onEdit={() => app.openForm("box", b)} onDelete={() => app.askDelete("boxes", b.id, "Caixinha")} />
      </div>
    );
  };

  return <>
    <PageHead title="Caixinhas" sub="Dinheiro separado, fora do saldo da conta" actions={<Button icon="plus" variant="secondary" onClick={() => app.openForm("box")}>Nova caixinha</Button>} />
    <div className="b-cols">
      <div className="b-col-main">
        <Card title="Reservadas para pagar" subtitle="O valor delas abate da fatura do cartão ou das contas fixas. Toque para atualizar o valor.">
          {forCards.length ? <div className="b-list">{forCards.map(row)}</div>
            : <EmptyState icon="card" title="Nenhuma caixinha reservada para pagar" text="Edite uma caixinha e escolha o cartão em &quot;Reservada para pagar&quot;." />}
        </Card>
        <Card title="Outras caixinhas" subtitle="Separadas do dinheiro livre. Não mexem nas faturas." className="b-mt">
          {others.length ? <div className="b-list">{others.map(row)}</div>
            : <EmptyState icon="piggy" title="Nenhuma caixinha" action={<Button size="sm" onClick={() => app.openForm("box")}>Criar caixinha</Button>} />}
        </Card>
      </div>
      <div className="b-col-side">
        <Card title="Resumo">
          <div className="b-list">
            <div className="b-total-row"><span>Em conta agora</span><Money value={c.emConta} className="b-strong" /></div>
            <div className="b-total-row"><span>Reservadas para pagar</span><Money value={totalCards} /></div>
            <div className="b-total-row"><span>Outras caixinhas</span><Money value={totalOthers} /></div>
          </div>
          <div className="b-total-row is-big"><span>Total (conta + caixinhas)</span><Money value={c.emConta + totalCards + totalOthers} className="b-amount" /></div>
          <p className="b-muted b-small">O livre para gastar sai só do saldo da conta. A caixinha do cartão já paga parte da fatura, então só o restante é descontado.</p>
        </Card>
        {c.cards.length ? (
          <Card title="Faturas e caixinhas" subtitle={"Fatura que vence em " + ddmm(dateIn(addMonths(c.month, 1), c.cards[0].dueDay))}>
            <div className="b-list">
              {c.cards.map(k => (
                <div key={k.id} className="b-boxinv">
                  <div className="b-minicard-top"><span className={"b-dot b-dot-lg is-" + k.color} /><strong>{k.name}</strong>{k.caixinha > 0 ? <Badge tone="positive" icon="check">{k.restante <= 0.009 ? "Coberta" : "Em parte"}</Badge> : null}</div>
                  <div className="b-total-row"><span className="b-muted">Fatura</span><Money value={k.fatura} /></div>
                  {k.fatura - k.restante - k.caixinha > 0.009 ? <div className="b-total-row"><span className="b-muted">De outras pessoas</span><Money value={round2(k.fatura - k.restante - k.caixinha)} sign="out" /></div> : null}
                  <div className="b-total-row"><span className="b-muted">Na caixinha</span><Money value={k.caixinha} sign={k.caixinha > 0 ? "out" : undefined} /></div>
                  <div className="b-total-row"><span>Restante a pagar</span><Money value={k.restante} className="b-strong" /></div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  </>;
}
