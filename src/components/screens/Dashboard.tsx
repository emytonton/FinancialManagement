"use client";
import { useState } from "react";
import { addMonths, capitalize, clamp, dateIn, dayOf, ddmm, monthLabel, monthName, monthShort, pct, round2 } from "@/lib/format";
import { catColor, compute, dailySeries, goalStats, insightsFor, spendRows } from "@/lib/finance";
import { Button, Card, EmptyState, Icon, Insight, Money, ProgressBar, Segmented, StatTile, UpcomingItem } from "../ui";
import { BudgetBar, CashFlowChart, CategoryList, CompareBars, DonutChart, SafeToSpend } from "../finance-ui";
import { useApp } from "../app/store";
import { PageHead, greeting, upcomingFor } from "./common";

export function Dashboard() {
  const app = useApp();
  const { data, c } = app;
  const [view, setView] = useState<"donut" | "compare">("donut");
  const title = greeting() + (data.settings.name ? ", " + data.settings.name : "");
  if (!data.incomes.length && !data.txs.length) {
    return <>
      <PageHead title={title} sub={monthLabel(c.month)} />
      <Card>
        <EmptyState icon="wallet" title="Comece registrando o que entrou este mês"
          text="Com as entradas do mês, o Bolso calcula quanto guardar, seus limites em % e quanto ainda dá para gastar."
          action={<Button icon="plus" onClick={() => app.openAdd("receita")}>Registrar entrada</Button>} />
      </Card>
    </>;
  }
  const series = dailySeries(data, c);
  const rows = spendRows(c);
  const prevC = compute(data, c.prev, c.today);
  const ins = insightsFor(data, c).slice(0, 4);
  const tb = c.budgets.filter(b => b.limit > 0).sort((a, z) => z.ratio - a.ratio).slice(0, 4);
  const up = upcomingFor(data, c, 5);
  const goals = data.goals.slice(0, 2);
  const prevName = monthName(c.prev);
  return <>
    <PageHead title={title} sub={"Seu resumo de " + monthLabel(c.month)} />
    <div className="b-dash">
      <div className="d-hero"><SafeToSpend c={c} /></div>
      <div className="d-tiles">
        <StatTile icon="arrowDownLeft" tone="positive" label="Receitas" value={c.receitas} hint={c.aReceber > 0 ? <>+ <Money value={c.aReceber} cents={false} /> previstos</> : "Tudo recebido"} />
        <StatTile icon="arrowUpRight" tone="negative" label="Gastos" value={c.gastos} hint={prevC.gastos ? <>{capitalize(prevName)}: <Money value={prevC.gastos} cents={false} /></> : null} />
        <StatTile icon="piggy" tone="primary" label="Guardado" value={c.guardado} hint={<>Meta: <Money value={c.metaGuardar} cents={false} /> ({data.settings.savePct}%)</>} />
        <StatTile icon="card" tone="card" label="Cartões" value={c.faturas} hint={(c.faturasTotal !== c.faturas ? "Sua parte; " : "") + "vence em " + (c.cards[0] ? ddmm(c.cards[0].due) : "--")} />
      </div>
      <Card className="d-flow" title="Fluxo do mês" subtitle="Seu saldo em conta dia a dia">
        <CashFlowChart actual={series.actual} proj={series.proj} days={c.days} todayD={c.month === c.tm ? dayOf(c.today) : null} />
        {series.proj.length ? (
          <p className="b-flow-note">
            Se você seguir o planejado, seu saldo estimado em {ddmm(dateIn(c.month, c.days))} será <Money value={series.endProj} className="b-strong" />.
            {" "}Depois das faturas de {monthShort(addMonths(c.month, 1))}, <Money value={series.endProj - c.faturas} className="b-strong" />.
          </p>
        ) : null}
      </Card>
      <Card className="d-insights" title="Insights">
        {ins.length
          ? <div className="b-stack-list">{ins.map((i, k) => <Insight key={k} tone={i.tone} icon={i.icon}>{i.text}</Insight>)}</div>
          : <EmptyState icon="bulb" title="Ainda sem insights" text="Eles aparecem conforme você registra gastos." />}
      </Card>
      <Card className="d-spend" title="Para onde meu dinheiro está indo"
        action={<Segmented size="sm" value={view} onChange={setView} options={[{ value: "donut", label: "Categorias" }, { value: "compare", label: "vs. " + prevName }]} label="Visualização" />}>
        {view === "donut"
          ? (rows.length
            ? <div className="b-spend"><DonutChart data={rows} total={c.gastos} size={188} /><CategoryList rows={rows} total={c.gastos} onPick={id => app.go("orcamento", id === "_outros" ? undefined : { cat: id })} /></div>
            : <EmptyState icon="pie" title="Nenhum gasto neste mês" />)
          : <CompareBars rows={c.budgets.filter(b => b.spent || prevC.byCat[b.cat.id]).sort((a, z) => z.spent - a.spent).slice(0, 7).map(b => ({ label: b.cat.name, cur: b.spent, prev: round2(prevC.byCat[b.cat.id] || 0), color: catColor(b.cat) }))} prevLabel={capitalize(prevName)} />}
      </Card>
      <Card className="d-budget" title="Orçamento" action={<Button variant="ghost" size="sm" onClick={() => app.go("orcamento")}>Ver tudo</Button>}>
        {tb.length
          ? <div className="b-stack-list">{tb.map(b => <BudgetBar key={b.cat.id} budget={b} compact onClick={() => app.go("orcamento", { cat: b.cat.id })} />)}</div>
          : <EmptyState icon="pie" title="Sem limites definidos" />}
      </Card>
      <Card className="d-cards" title="Cartões" action={<Button variant="ghost" size="sm" onClick={() => app.go("cartoes")}>Detalhes</Button>}>
        {c.cards.length ? (
          <div className="b-stack-list">
            {c.cards.map(k => (
              <div key={k.id} className="b-minicard">
                <div className="b-minicard-top"><span className={"b-dot b-dot-lg is-" + k.color} /><strong>{k.name}</strong><span className="b-muted">{"vence " + ddmm(k.due)}</span></div>
                <div className="b-minicard-vals"><Money value={k.faturaMinha} className="b-strong" /><span className="b-muted">{k.faturaTerceiros > 0 ? " sua parte" : " fatura"} · {pct(k.ratio)} do limite</span></div>
                {k.caixinha > 0 ? <div className="b-muted b-small"><Money value={k.caixinha} /> na caixinha · restam <Money value={k.restante} className="b-strong" /></div> : null}
                <div className="b-progress" style={{ height: 8 }}><div className={"b-progress-fill b-fill-card is-" + k.color} style={{ width: clamp(k.ratio, 0, 1) * 100 + "%" }} /></div>
              </div>
            ))}
            <div className="b-total-row"><span>{c.faturasTotal !== c.faturas ? "Sua parte nas faturas" : "Total nas faturas"}</span><Money value={c.faturas} className="b-strong" /></div>
          </div>
        ) : <EmptyState icon="card" title="Nenhum cartão" action={<Button size="sm" onClick={() => app.openForm("card")}>Adicionar cartão</Button>} />}
      </Card>
      <Card className="d-goals" title="Metas" action={<Button variant="ghost" size="sm" onClick={() => app.go("metas")}>Ver metas</Button>}>
        {goals.length ? (
          <div className="b-stack-list">
            {goals.map(g => {
              const s = goalStats(g, data, c.month);
              return (
                <div key={g.id} className="b-minigoal">
                  <div className="b-minicard-top"><Icon name={g.icon || "target"} size={18} /><strong>{g.name}</strong><span className="b-goal-pct">{pct(s.ratio)}</span></div>
                  <ProgressBar value={s.saved} max={g.target} height={8} />
                  <span className="b-muted b-small"><Money value={s.saved} cents={false} /> de <Money value={g.target} cents={false} />{s.eta ? " · " + s.eta + " meses no ritmo atual" : ""}</span>
                </div>
              );
            })}
          </div>
        ) : <EmptyState icon="target" title="Nenhuma meta" action={<Button size="sm" onClick={() => app.openForm("goal")}>Criar meta</Button>} />}
      </Card>
      <Card className="d-next" title="Próximos compromissos" action={<Button variant="ghost" size="sm" onClick={() => app.go("calendario")}>Calendário</Button>}>
        {up.length ? <div className="b-list">{up.map((e, i) => <UpcomingItem key={i} {...e} />)}</div> : <EmptyState icon="calendar" title="Nada nos próximos dias" />}
      </Card>
      {data.boxes.length ? (
        <Card className="d-boxes" title="Caixinhas" subtitle={<>Total <Money value={c.caixinhas} />, fora do saldo da conta</>} action={<Button variant="ghost" size="sm" onClick={() => app.go("caixinhas")}>Ver caixinhas</Button>}>
          <div className="b-boxstrip">
            {data.boxes.map(b => {
              const card = data.cards.find(k => k.id === b.cardId);
              return (
                <button key={b.id} type="button" className="b-boxchip" onClick={() => app.openForm("box", b)}>
                  <small>{b.name}</small>
                  <Money value={b.amount} />
                  <small>{card ? "para a fatura " + card.name : "separado"}</small>
                </button>
              );
            })}
          </div>
        </Card>
      ) : null}
    </div>
  </>;
}
