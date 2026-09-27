"use client";
import { monthLabel } from "@/lib/format";
import { goalStats } from "@/lib/finance";
import { Button, Card, EmptyState, Money, ProgressBar } from "../ui";
import { GoalCard } from "../finance-ui";
import { useApp } from "../app/store";
import { PageHead } from "./common";

export function Goals() {
  const app = useApp();
  const { data, c } = app;
  const pctDone = c.metaGuardar > 0 ? c.guardado / c.metaGuardar : 0;
  return <>
    <PageHead title="Metas" sub="Juntando dinheiro com constância" actions={<Button icon="plus" onClick={() => app.openForm("goal")}>Nova meta</Button>} />
    <Card className="b-savebar" title="Guardar este mês" subtitle={data.settings.savePct + "% de tudo que entrou em " + monthLabel(c.month)}>
      <div className="b-savebar-row">
        <div><Money value={c.guardado} className="b-amount" /><span className="b-muted"> de <Money value={c.metaGuardar} /></span></div>
        <Button variant="secondary" icon="piggy" onClick={() => app.openAdd("aporte")}>Guardar agora</Button>
      </div>
      <ProgressBar value={c.guardado} max={c.metaGuardar || 1} tone={pctDone >= 1 ? "positive" : "primary"} height={12} />
      <p className="b-muted b-small">
        {pctDone >= 1 ? "Meta do mês cumprida." : <>Faltam <Money value={c.faltaGuardar} />. Esse valor já está reservado no seu &quot;Disponível para gastar&quot;.</>}
      </p>
    </Card>
    {data.goals.length ? (
      <div className="b-goalgrid b-mt">
        {data.goals.map(g => (
          <GoalCard key={g.id} goal={g} stats={goalStats(g, data, c.month)} month={c.month}
            onEdit={() => app.openForm("goal", g)} onDelete={() => app.askDelete("goals", g.id, "Meta")} onContribute={() => app.openAdd("aporte", { goalId: g.id })} />
        ))}
      </div>
    ) : (
      <Card className="b-mt">
        <EmptyState icon="target" title="Crie sua primeira meta" text="Defina valor, prazo e quanto quer guardar por mês. O Bolso calcula o resto." action={<Button onClick={() => app.openForm("goal")}>Criar meta</Button>} />
      </Card>
    )}
  </>;
}
