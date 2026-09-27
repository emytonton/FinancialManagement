"use client";
import { ddmm, monthLabel, sum } from "@/lib/format";
import { compute } from "@/lib/finance";
import { Badge, Button, Card, EmptyState, Icon, IconButton, Money, MoneyInput, TransactionRow } from "../ui";
import { IncomeSplit, TrendBars } from "../finance-ui";
import { useApp } from "../app/store";
import { PageHead } from "./common";
import { addMonths } from "@/lib/format";

export function Income() {
  const app = useApp();
  const { data, c } = app;
  // Últimos 6 meses: histórico salvo + meses calculados a partir dos lançamentos.
  const months = Array.from({ length: 6 }, (_, i) => addMonths(c.month, i - 5));
  const hist = months.map(m => {
    const h = data.history.find(x => x.m === m);
    if (h) return h;
    const k = compute(data, m, c.today);
    return { m, receitas: k.receitas, gastos: k.gastos };
  }).filter(r => r.receitas > 0 || r.gastos > 0 || r.m === c.month);
  return <>
    <PageHead title="Receitas" sub="Registre todo mês quanto entrou de verdade" actions={<Button icon="plus" onClick={() => app.openAdd("receita")}>Registrar entrada</Button>} />
    <div className="b-cols">
      <div className="b-col-main">
        <Card title={"Entrou em " + monthLabel(c.month)} action={<Money value={c.receitas} className="b-amount b-tone-positive" />}>
          {c.receitas > 0 ? <IncomeSplit items={c.bySource} total={c.receitas} /> : <EmptyState icon="wallet" title="Nenhuma entrada neste mês" text="Registre o que recebeu. Os limites em % e a meta de guardar se ajustam a esse valor." />}
        </Card>
        <Card title="Recebimentos do mês" className="b-mt">
          <div className="b-list">
            {c.incomes.map(i => {
              const s = data.sources.find(x => x.id === i.sourceId);
              return <TransactionRow key={i.id} income tx={{ desc: (s ? s.name : "Entrada") + (i.note ? " · " + i.note : ""), amount: i.amount }} onClick={() => app.openForm("income", i)} onDelete={() => app.askDelete("incomes", i.id, "Entrada")} />;
            })}
            {c.expected.map((e, k) => (
              <div key={"e" + k} className="b-expected">
                <span className="b-caticon b-caticon-dash"><Icon name="clock" size={18} /></span>
                <div className="b-tx-main">
                  <span className="b-tx-desc">{e.source.name}</span>
                  <span className="b-tx-meta">{"Previsto para " + ddmm(e.date) + " · " + (e.source.kind === "variavel" ? "valor variável" : "valor fixo")}</span>
                </div>
                <Money value={e.amount} className="b-muted" />
                <Button size="sm" variant="secondary" onClick={() => app.openAdd("receita", { sourceId: e.source.id, amount: e.amount, date: e.date <= c.today ? e.date : c.today })}>Recebi</Button>
              </div>
            ))}
            {!c.incomes.length && !c.expected.length ? <EmptyState icon="clock" title="Nada previsto" text="Cadastre suas fontes de renda para ver os recebimentos previstos." /> : null}
          </div>
        </Card>
        <Card title="Receitas x gastos" subtitle="Últimos 6 meses" className="b-mt"><TrendBars rows={hist} /></Card>
      </div>
      <div className="b-col-side">
        <Card title="Fontes de renda" action={<IconButton icon="plus" label="Nova fonte" onClick={() => app.openForm("source")} />}>
          {data.sources.length ? (
            <div className="b-list">
              {data.sources.map(s => (
                <div key={s.id} className="b-source" onClick={() => app.openForm("source", s)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter") app.openForm("source", s); }}>
                  <span className="b-caticon b-caticon-in"><Icon name={s.icon || "briefcase"} size={18} /></span>
                  <div className="b-tx-main">
                    <span className="b-tx-desc">{s.name}</span>
                    <span className="b-tx-meta">{s.freq + (s.days.length ? " · dia " + s.days.join(" e ") : "")} · <Badge tone={s.kind === "fixa" ? "neutral" : "warning"}>{s.kind === "fixa" ? "Fixa" : "Variável"}</Badge></span>
                  </div>
                  <Money value={s.expected} cents={false} />
                </div>
              ))}
              <div className="b-total-row"><span>Previsto por mês</span><Money value={sum(data.sources, s => s.expected)} className="b-strong" /></div>
            </div>
          ) : <EmptyState icon="briefcase" title="Nenhuma fonte" action={<Button size="sm" onClick={() => app.openForm("source")}>Adicionar fonte</Button>} />}
        </Card>
        <Card title="Saldo do mês anterior" subtitle="Quanto havia na conta no dia 1º">
          <MoneyInput key={c.month} value={c.carry} allowNegative onChange={v => app.setCarry(c.month, v)} />
          <p className="b-muted b-small">Entra no saldo em conta, mas não conta como receita para os percentuais.</p>
        </Card>
      </div>
    </div>
  </>;
}
