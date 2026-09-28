"use client";
import { useState } from "react";
import { addMonths, cx, dateIn, ddmm, monthLabel, sum, weekday, ym } from "@/lib/format";
import { billsFor, debtsFor, incomeName, parcelInfo } from "@/lib/finance";
import type { Category, Tx } from "@/lib/types";
import { Button, Card, EmptyState, Icon, Money, Segmented, Select, TransactionRow, type RowTx } from "../ui";
import { useApp } from "../app/store";
import { PageHead } from "./common";

type Item = { key: string; date: string; tx: RowTx; cat?: Category; income?: boolean; parcel?: boolean; edit?: () => void; del?: () => void };

export function Transactions({ dir: initialDir, flag: initialFlag }: { dir?: string; flag?: string }) {
  const app = useApp();
  const { data, c } = app;
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState("mes");
  const [dir, setDir] = useState<"todas" | "entradas" | "saidas">((initialDir as "entradas" | "saidas") || "todas");
  const [cat, setCat] = useState("");
  const [method, setMethod] = useState("");
  const [flag, setFlag] = useState(initialFlag || "");
  const catOf = (id: string) => data.categories.find(k => k.id === id);
  const last3 = [c.month, c.prev, addMonths(c.month, -2)];
  const months = period === "mes" ? [c.month] : period === "ant" ? [c.prev] : period === "3m" ? last3 : null;
  const inP = (d: string) => !months || months.includes(ym(d));

  let items: Item[] = [];
  // Compra compartilhada: "A reembolsar" enquanto ainda tiver valor em aberto com a pessoa.
  const debts = debtsFor(data, "9999-12-31");
  const openOf = new Map(debts.flatMap(p => p.items.map(i => [i.tx.id, i.open] as const)));
  const withStatus = (x: Tx): Tx => x.kind === "compartilhado" && x.status !== "reembolsado" ? { ...x, status: (openOf.get(x.id) ?? 0) > 0.009 ? "pendente" : "reembolsado" } : x;
  data.txs.filter(x => inP(x.date)).map(withStatus).forEach(x => items.push({
    key: "tx" + x.id, date: x.date, tx: x, cat: catOf(x.categoryId),
    // Edita a compra original (o status acima é só para exibir).
    edit: () => app.openEdit("gasto", data.txs.find(t => t.id === x.id) as unknown as Record<string, unknown>), del: () => app.askDelete("txs", x.id, "Gasto"),
  }));
  data.incomes.filter(x => inP(x.date)).forEach(x => {
    items.push({
      key: "in" + x.id, date: x.date, income: true, tx: { desc: incomeName(data, x), amount: x.amount, method: "" },
      edit: () => app.openEdit("receita", { ...x, desc: x.note }), del: () => app.askDelete("incomes", x.id, "Entrada"),
    });
  });
  // Parcelas e contas fixas pagas também são saídas do período.
  const allMonths = months || Array.from(new Set([...data.txs, ...data.incomes].map(x => ym(x.date)).concat(last3)));
  allMonths.forEach(m => {
    data.installments.forEach(i => {
      const p = parcelInfo(i, m);
      const card = data.cards.find(k => k.id === i.cardId);
      if (p.active) items.push({ key: "p" + i.id + m, date: dateIn(m, card?.closeDay || 1), parcel: true, tx: { desc: i.desc, amount: i.amount, method: i.cardId, installment: p.idx + "/" + i.n }, cat: catOf(i.categoryId), edit: () => app.openForm("installment", i) });
    });
    billsFor(data, m, c.today).forEach(b => {
      if (b.status === "paga") items.push({ key: "b" + b.id + m, date: b.date, tx: { desc: b.name, amount: b.amount, method: b.method, installment: b.kind === "assinatura" ? "assinatura" : "fixa" }, cat: catOf(b.categoryId), edit: () => app.openForm(b.kind === "assinatura" ? "subscription" : "bill", data.bills.find(x => x.id === b.id)) });
    });
  });
  items = items.filter(it => {
    if (dir === "entradas" && !it.income) return false;
    if (dir === "saidas" && it.income) return false;
    if (cat && (!it.cat || it.cat.id !== cat)) return false;
    if (method && it.tx.method !== method) return false;
    if (flag === "parcelado" && !it.parcel) return false;
    if (flag === "reembolso" && it.tx.kind !== "compartilhado") return false;
    if (flag === "pendente" && !(it.tx.kind === "compartilhado" && it.tx.status === "pendente")) return false;
    if (q && !(it.tx.desc + " " + (it.cat ? it.cat.name : "")).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((a, z) => z.date.localeCompare(a.date));
  const groups: { date: string; items: Item[] }[] = [];
  items.forEach(it => { const g = groups[groups.length - 1]; if (g && g.date === it.date) g.items.push(it); else groups.push({ date: it.date, items: [it] }); });
  const tin = sum(items.filter(i => i.income), i => i.tx.amount);
  // Gastos de outras pessoas só somam nas saídas quando você filtra pela categoria delas.
  const tout = sum(items.filter(i => !i.income && (!i.cat?.thirdParty || cat === i.cat.id)), i => i.tx.amount);
  const owing = debts.filter(p => p.owed > 0);
  const clear = () => { setQ(""); setDir("todas"); setCat(""); setMethod(""); setFlag(""); };

  return <>
    <PageHead title="Transações" sub="Tudo que entrou e saiu" actions={<Button icon="plus" onClick={() => app.openAdd()}>Adicionar</Button>} />
    {owing.length ? (
      <Card className="b-refunds" title="Você deve a outras pessoas" subtitle="Compras que alguém pagou por você" action={<Button size="sm" variant="secondary" icon="users" onClick={() => app.go("reembolsos")}>Abrir Reembolsos</Button>}>
        <div className="b-list">
          {owing.map(p => <div key={p.key} className="b-total-row"><span>{p.name}</span><Money value={p.owed} className="b-strong b-tone-warning" /></div>)}
        </div>
      </Card>
    ) : null}
    <Card flush className={owing.length ? "b-mt" : undefined}>
      <div className="b-filters">
        <div className="b-search"><Icon name="search" size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por descrição ou categoria" aria-label="Buscar" /></div>
        <div className="b-filter-row">
          <Select value={period} onChange={e => setPeriod(e.target.value)} aria-label="Período"
            options={[{ value: "mes", label: monthLabel(c.month) }, { value: "ant", label: monthLabel(c.prev) }, { value: "3m", label: "Últimos 3 meses" }, { value: "tudo", label: "Todo o período" }]} />
          <Segmented size="sm" value={dir} onChange={setDir} label="Direção" options={[{ value: "todas", label: "Todas" }, { value: "entradas", label: "Entradas" }, { value: "saidas", label: "Saídas" }]} />
          <Select value={cat} onChange={e => setCat(e.target.value)} aria-label="Categoria" options={[{ value: "", label: "Todas as categorias" }, ...data.categories.map(k => ({ value: k.id, label: k.name }))]} />
          <Select value={method} onChange={e => setMethod(e.target.value)} aria-label="Forma de pagamento" options={[{ value: "", label: "Qualquer pagamento" }, ...app.methods.map(m => ({ value: m.id, label: m.name }))]} />
        </div>
        <div className="b-chips">
          {[["", "Tudo"], ["parcelado", "Parceladas"], ["reembolso", "Compartilhadas"], ["pendente", "A reembolsar"]].map(([k, l]) => (
            <button key={k} type="button" className={cx("b-chip", flag === k && "is-on")} onClick={() => setFlag(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="b-tx-sum">
        <span>{items.length} movimentações</span>
        <span><Money value={tin} sign="always" tone="positive" /></span>
        <span><Money value={tout} sign="out" tone="negative" /></span>
      </div>
      {groups.length ? groups.map(g => (
        <div key={g.date} className="b-tx-group">
          <div className="b-tx-date"><strong>{ddmm(g.date)}</strong><span>{weekday(g.date)}</span></div>
          {g.items.map(it => <TransactionRow key={it.key} tx={it.tx} cat={it.cat} income={it.income} methodLabel={it.tx.method ? app.methodName(it.tx.method) : undefined} onClick={it.edit} onDelete={it.del} />)}
        </div>
      )) : <EmptyState icon="search" title="Nada encontrado" text="Tente outro período ou limpe os filtros." action={<Button variant="secondary" onClick={clear}>Limpar filtros</Button>} />}
    </Card>
  </>;
}
