"use client";
import { useState } from "react";
import { monthLabel, pct } from "@/lib/format";
import { Badge, Button, CatIcon, Card, EmptyState, Insight, Money, RowActions, Sheet, TransactionRow } from "../ui";
import { AllocationRule, BudgetBar } from "../finance-ui";
import { useApp } from "../app/store";
import { PageHead } from "./common";
import type { Tx } from "@/lib/types";

export function Budget({ focus }: { focus?: string }) {
  const app = useApp();
  const { data, c } = app;
  const [sel, setSel] = useState<string | null>(focus || null);
  const b = sel ? c.budgets.find(x => x.cat.id === sel) : null;
  const list = b ? c.expenses.filter(e => e.categoryId === sel).sort((a, z) => z.date.localeCompare(a.date)) : [];
  const alerts = c.budgets.filter(x => x.ratio >= 0.7 && x.limit > 0).sort((a, z) => z.ratio - a.ratio);
  return <>
    <PageHead title="Orçamento" sub={"Limites de " + monthLabel(c.month)} actions={<Button icon="plus" variant="secondary" onClick={() => app.openForm("category")}>Nova categoria</Button>} />
    <div className="b-cols">
      <div className="b-col-main">
        <Card title="Categorias" subtitle="Toque em uma categoria para ver os gastos">
          {c.budgets.length ? (
            <div className="b-stack-list">
              {c.budgets.map(x => (
                <div key={x.cat.id} className="b-budget-wrap">
                  <BudgetBar budget={x} onClick={() => setSel(x.cat.id)} />
                  <RowActions onEdit={() => app.openForm("category", x.cat)} onDelete={() => app.askDelete("categories", x.cat.id, "Categoria")} />
                </div>
              ))}
            </div>
          ) : <EmptyState icon="pie" title="Sem categorias" text="Crie categorias com limite fixo ou em % da renda." action={<Button onClick={() => app.openForm("category")}>Criar categoria</Button>} />}
        </Card>
      </div>
      <div className="b-col-side">
        <Card title="Como sua renda está dividida"><AllocationRule c={c} savePct={data.settings.savePct} onEditPct={() => app.go("config")} /></Card>
        {alerts.length ? (
          <Card title="Alertas">
            <div className="b-stack-list">
              {alerts.map(x => (
                <Insight key={x.cat.id} tone={x.state.tone} icon={x.ratio > 1 ? "alert" : "info"}>
                  {x.ratio > 1
                    ? <>Você ultrapassou seu limite de {x.cat.name.toLowerCase()} em <Money value={-x.rest} />.</>
                    : <>Você já utilizou {pct(x.ratio)} do orçamento de {x.cat.name.toLowerCase()}.</>}
                </Insight>
              ))}
            </div>
          </Card>
        ) : null}
        {c.terceiros.length ? (
          <Card title="Gastos de outras pessoas" subtitle="Não entram no seu orçamento. A cobrança fica em Cartões." action={<Button variant="ghost" size="sm" onClick={() => app.go("cartoes")}>Cobrar</Button>}>
            <div className="b-list">
              {c.terceiros.map(t => (
                <div key={t.cat.id} className="b-cardpay">
                  <CatIcon cat={t.cat} size={32} />
                  <div className="b-tx-main"><span className="b-tx-desc">{t.cat.name}</span><span className="b-tx-meta">{t.falta > 0 ? <>falta receber <Money value={t.falta} /></> : t.spent > 0 ? "tudo recebido" : "sem gastos no mês"}</span></div>
                  <Money value={t.spent} className="b-strong" />
                  <RowActions onEdit={() => app.openForm("category", t.cat)} onDelete={() => app.askDelete("categories", t.cat.id, "Categoria")} />
                </div>
              ))}
            </div>
          </Card>
        ) : null}
        <Card title="Legenda">
          <div className="b-legend-states">
            {([["positive", "check", "Abaixo de 70%"], ["warning", "info", "70% a 90%"], ["caution", "info", "90% a 100%"], ["negative", "alert", "Acima de 100%"]] as const).map(([t, i, l]) => <Badge key={t} tone={t} icon={i}>{l}</Badge>)}
          </div>
        </Card>
      </div>
    </div>
    <Sheet open={!!b} title={b ? b.cat.name : ""} onClose={() => setSel(null)} wide>
      {b ? <>
        <BudgetBar budget={b} />
        <div className="b-list b-mt">
          {list.length ? list.map(e => {
            const ref = e.ref as Partial<Tx>;
            return (
              <TransactionRow key={e.src + e.id} tx={{ desc: e.desc, amount: e.amount, method: e.method, kind: ref.kind, status: ref.status, total: ref.total }}
                cat={b.cat} methodLabel={app.methodName(e.method)}
                onClick={e.src === "tx" ? () => { setSel(null); app.openEdit("gasto", e.ref as unknown as Record<string, unknown>); } : undefined} />
            );
          }) : <EmptyState icon="list" title="Nenhum gasto nesta categoria" />}
        </div>
      </> : null}
    </Sheet>
  </>;
}
