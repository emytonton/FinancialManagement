"use client";
import { useState } from "react";
import { cx, dayOf, fmt, pct, round2, uid, ym } from "@/lib/format";
import type { Collection, Data } from "@/lib/types";
import { Button, CatIcon, Field, Icon, Input, MoneyInput, Notice, Segmented, Select, Sheet, Toggle } from "../ui";
import { useApp, type AddState, type AddTab, type FormKind } from "./store";

type Values = Record<string, unknown>;
type FieldDef = {
  key: string; label: string; type?: "text" | "money" | "select" | "seg" | "toggle" | "number" | "date" | "month";
  required?: boolean; half?: boolean; placeholder?: string; min?: number; max?: number;
  options?: { value: string; label: string }[]; hint?: string | ((v: Values) => string | null); show?: (v: Values) => boolean; toggleLabel?: string;
};

function EntityForm({ title, fields, value, onSave, onDelete, onClose, saveLabel = "Salvar" }: {
  title: string; fields: FieldDef[]; value: Values; onSave: (v: Values) => void; onDelete?: (v: Values) => void; onClose: () => void; saveLabel?: string;
}) {
  const [v, setV] = useState<Values>(value);
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: string, x: unknown) => setV(prev => ({ ...prev, [k]: x }));
  const submit = () => {
    const e: Record<string, string> = {};
    fields.forEach(f => {
      if (f.show && !f.show(v)) return;
      const val = v[f.key];
      if (f.required && (val == null || val === "" || (f.type === "money" && !((val as number) > 0)))) e[f.key] = f.type === "money" ? "Informe um valor maior que zero" : "Campo obrigatório";
      if (f.type === "number" && val !== "" && val != null && ((f.min != null && (val as number) < f.min) || (f.max != null && (val as number) > f.max))) e[f.key] = `Entre ${f.min} e ${f.max}`;
    });
    setErr(e);
    if (Object.keys(e).length) return;
    onSave(v);
    onClose();
  };
  const input = (f: FieldDef) => {
    const val = v[f.key];
    if (f.type === "money") return <MoneyInput value={(val as number) || 0} onChange={x => set(f.key, x)} />;
    if (f.type === "select") return <Select value={val == null ? "" : String(val)} options={f.options || []} onChange={e => set(f.key, e.target.value)} />;
    if (f.type === "seg") return <Segmented value={val as string} options={f.options || []} onChange={x => set(f.key, x)} label={f.label} />;
    if (f.type === "toggle") return <Toggle checked={!!val} onChange={x => set(f.key, x)} label={f.toggleLabel || f.label} />;
    if (f.type === "number") return <Input type="number" inputMode="numeric" min={f.min} max={f.max} value={val == null ? "" : String(val)} onChange={e => set(f.key, e.target.value === "" ? "" : Number(e.target.value))} />;
    return <Input type={f.type || "text"} value={val == null ? "" : String(val)} placeholder={f.placeholder} onChange={e => set(f.key, e.target.value)} />;
  };
  return (
    <Sheet open title={title} onClose={onClose} footer={<>
      {onDelete ? <Button variant="ghost-danger" icon="trash" onClick={() => onDelete(v)}>Excluir</Button> : null}
      <span className="b-spacer" />
      <Button variant="secondary" onClick={onClose}>Cancelar</Button>
      <Button onClick={submit}>{saveLabel}</Button>
    </>}>
      <div className="b-form">
        {fields.filter(f => !f.show || f.show(v)).map(f => f.type === "toggle"
          ? <div key={f.key} className="b-field">{input(f)}</div>
          : <Field key={f.key} label={f.label} hint={typeof f.hint === "function" ? f.hint(v) : f.hint} error={err[f.key]} className={f.half ? "is-half" : undefined}>{input(f)}</Field>)}
      </div>
    </Sheet>
  );
}

const ICON_OPTIONS = ["utensils", "cart", "car", "sparkles", "ticket", "bag", "house", "repeat", "heart", "laptop", "box", "gift", "briefcase", "users", "shield", "target", "piggy"].map(i => ({ value: i, label: i }));
const COLOR_OPTIONS = [
  { value: "chart1", label: "Azul" }, { value: "chart2", label: "Laranja" }, { value: "chart3", label: "Verde-água" },
  { value: "chart4", label: "Amarelo" }, { value: "chart5", label: "Rosa" }, { value: "chart6", label: "Violeta" }, { value: "other", label: "Cinza (agrupa em Outras)" },
];

type FormDef = { title: string; coll: Collection; fields: FieldDef[]; blank?: (d: Data, month: string, today: string) => Values; load?: (x: Values) => Values; save?: (x: Values) => Values };

const FORMS: Record<FormKind, FormDef> = {
  category: { title: "Categoria", coll: "categories", fields: [
    { key: "name", label: "Nome", required: true },
    { key: "mode", label: "Limite mensal", type: "seg", options: [{ value: "fixo", label: "Valor fixo" }, { value: "pct", label: "% da renda do mês" }] },
    { key: "limit", label: "Limite em R$", type: "money", show: v => v.mode !== "pct" },
    { key: "pct", label: "Percentual da renda", type: "number", min: 0, max: 100, show: v => v.mode === "pct", hint: "Recalculado com base em tudo que entrou no mês." },
    { key: "icon", label: "Ícone", type: "select", options: ICON_OPTIONS, half: true },
    { key: "color", label: "Cor no gráfico", type: "select", options: COLOR_OPTIONS, half: true }],
    blank: () => ({ id: uid(), name: "", mode: "fixo", limit: 0, pct: 5, icon: "box", color: "other" }),
    save: v => ({ ...v, limit: Number(v.limit) || 0, pct: Number(v.pct) || 0 }) },
  source: { title: "Fonte de renda", coll: "sources", fields: [
    { key: "name", label: "Nome", required: true, placeholder: "Ex.: Emprego 1" },
    { key: "expected", label: "Valor previsto no mês", type: "money", hint: "Só uma referência. O que conta é o valor que você registrar como recebido." },
    { key: "freq", label: "Frequência", type: "seg", options: [{ value: "mensal", label: "Mensal" }, { value: "quinzenal", label: "Quinzenal" }, { value: "eventual", label: "Eventual" }] },
    { key: "daysTxt", label: "Dia(s) previstos", placeholder: "Ex.: 5 ou 15, 28", half: true },
    { key: "kind", label: "Tipo", type: "seg", options: [{ value: "fixa", label: "Fixa" }, { value: "variavel", label: "Variável" }], half: true },
    { key: "icon", label: "Ícone", type: "select", options: ICON_OPTIONS }],
    blank: () => ({ id: uid(), name: "", expected: 0, freq: "mensal", daysTxt: "5", kind: "fixa", icon: "briefcase" }),
    load: s => ({ ...s, daysTxt: ((s.days as number[]) || []).join(", ") }),
    save: s => {
      const { daysTxt, ...o } = s;
      const days = String(daysTxt || "").split(/[^0-9]+/).map(Number).filter(n => n >= 1 && n <= 31);
      return { ...o, days: o.freq === "eventual" ? [] : days };
    } },
  bill: { title: "Conta fixa", coll: "bills", fields: [
    { key: "name", label: "Nome", required: true, placeholder: "Ex.: Internet" },
    { key: "amount", label: "Valor", type: "money", required: true, half: true },
    { key: "day", label: "Vence todo dia", type: "number", min: 1, max: 31, half: true, required: true },
    { key: "categoryId", label: "Categoria", type: "select", half: true },
    { key: "method", label: "Paga com", type: "select", half: true }],
    blank: d => ({ id: uid(), name: "", amount: 0, day: 10, categoryId: d.categories.find(c => c.id === "casa")?.id || d.categories[0]?.id || "", method: "pix", paid: {} }) },
  card: { title: "Cartão", coll: "cards", fields: [
    { key: "name", label: "Nome", required: true, placeholder: "Ex.: Nubank" },
    { key: "limit", label: "Limite", type: "money", required: true },
    { key: "closeDay", label: "Dia de fechamento", type: "number", min: 1, max: 31, half: true, required: true },
    { key: "dueDay", label: "Dia de vencimento", type: "number", min: 1, max: 31, half: true, required: true },
    { key: "color", label: "Cor do cartão", type: "seg", options: [{ value: "nubank", label: "Roxo" }, { value: "mp", label: "Amarelo" }] }],
    blank: () => ({ id: uid(), name: "", limit: 0, closeDay: 3, dueDay: 10, color: "nubank" }) },
  installment: { title: "Compra parcelada", coll: "installments", fields: [
    { key: "desc", label: "Descrição", required: true },
    { key: "amount", label: "Valor da parcela", type: "money", required: true, half: true },
    { key: "n", label: "Nº de parcelas", type: "number", min: 1, max: 72, half: true, required: true },
    { key: "start", label: "Mês da 1ª parcela", type: "month", half: true, required: true },
    { key: "cardId", label: "Cartão", type: "select", half: true },
    { key: "categoryId", label: "Categoria", type: "select" }],
    blank: (d, month) => ({ id: uid(), desc: "", amount: 0, n: 10, start: month, cardId: d.cards[0]?.id || "", categoryId: d.categories.find(c => c.id === "comp")?.id || d.categories[0]?.id || "" }) },
  goal: { title: "Meta", coll: "goals", fields: [
    { key: "name", label: "Nome da meta", required: true, placeholder: "Ex.: Reserva de emergência" },
    { key: "target", label: "Valor desejado", type: "money", required: true, half: true },
    { key: "base", label: "Já tenho guardado", type: "money", half: true, hint: "Valor inicial, antes de usar o app." },
    { key: "deadline", label: "Prazo", type: "month", half: true },
    { key: "monthly", label: "Quero guardar por mês", type: "money", half: true },
    { key: "icon", label: "Ícone", type: "select", options: ICON_OPTIONS }],
    blank: () => ({ id: uid(), name: "", target: 0, base: 0, deadline: "", monthly: 0, icon: "target" }) },
  income: { title: "Entrada", coll: "incomes", fields: [
    { key: "amount", label: "Valor recebido", type: "money", required: true },
    { key: "sourceId", label: "Fonte", type: "select", half: true },
    { key: "date", label: "Data", type: "date", half: true, required: true },
    { key: "note", label: "Observação" }] },
  contribution: { title: "Aporte", coll: "contributions", fields: [
    { key: "amount", label: "Valor guardado", type: "money", required: true },
    { key: "goalId", label: "Meta", type: "select", half: true },
    { key: "date", label: "Data", type: "date", half: true, required: true }] },
};

export function FormHost() {
  const app = useApp();
  const { form, data } = app;
  if (!form) return null;
  const def = FORMS[form.kind];
  const fields = def.fields.map(x => {
    if (x.key === "categoryId") return { ...x, options: data.categories.map(c => ({ value: c.id, label: c.name })) };
    if (x.key === "sourceId") return { ...x, options: data.sources.map(s => ({ value: s.id, label: s.name })) };
    if (x.key === "goalId") return { ...x, options: data.goals.map(g => ({ value: g.id, label: g.name })) };
    if (x.key === "cardId") return { ...x, options: data.cards.map(c => ({ value: c.id, label: c.name })) };
    if (x.key === "method") return { ...x, options: app.methods.map(m => ({ value: m.id, label: m.name })) };
    return x;
  });
  const value = form.item ? (def.load ? def.load(form.item) : form.item) : def.blank ? def.blank(data, app.month, app.today) : { id: uid() };
  const close = () => app.setForm(null);
  return (
    <EntityForm key={String(value.id)} title={(form.item ? "Editar " : "Nova ") + def.title.toLowerCase()} fields={fields} value={value} onClose={close}
      onSave={v => {
        const o = def.save ? def.save(v) : v;
        app.upsert(def.coll, { ...(form.item || {}), ...o } as never);
        app.toast(form.item ? "Alterações salvas" : "Adicionado");
      }}
      onDelete={form.item ? v => app.askDelete(def.coll, String(v.id), def.title) : undefined} />
  );
}

type AddValues = {
  amount: number; categoryId: string; desc: string; method: string; date: string; kind: "pessoal" | "compartilhado" | "fixa";
  parcelado: boolean; n: number; total: number; paidBy: string; status: "pendente" | "reembolsado"; sourceId: string; goalId: string;
};

// Monta do zero a cada abertura, então o estado inicial vem direto do que foi pedido.
export function AddSheet() {
  const { add } = useApp();
  return add ? <AddSheetBody add={add} /> : null;
}

function AddSheetBody({ add }: { add: NonNullable<AddState> }) {
  const app = useApp();
  const { data } = app;
  const edit = add.edit;
  const [tab, setTab] = useState<AddTab>(edit ? edit.tab : add.tab || "gasto");
  const [v, setV] = useState<AddValues>(() => {
    const blank: AddValues = {
      amount: 0, categoryId: data.categories[0]?.id || "", desc: "", method: "pix", date: app.defaultDate, kind: "pessoal",
      parcelado: false, n: 2, total: 0, paidBy: "", status: "pendente", sourceId: data.sources[0]?.id || "", goalId: data.goals[0]?.id || "",
    };
    if (edit) return { ...blank, ...(edit.item as Partial<AddValues>), desc: String(edit.item.desc ?? edit.item.note ?? "") };
    return { ...blank, ...(add.preset as Partial<AddValues>) };
  });
  const [err, setErr] = useState<string | null>(null);
  const [amtRev, setAmtRev] = useState(0); // força o campo de valor a mostrar um valor preenchido por botão
  const close = () => app.setAdd(null);
  const set = (patch: Partial<AddValues>) => setV(prev => ({ ...prev, ...patch }));
  const cats = data.categories;
  const isCard = app.isCard(v.method);
  const editId = edit ? String(edit.item.id) : null;

  const save = () => {
    if (!(v.amount > 0)) { setErr("Informe o valor."); return; }
    if (!v.date) { setErr("Informe a data."); return; }
    if (tab === "gasto") {
      if (!v.categoryId) { setErr("Escolha uma categoria."); return; }
      if (v.kind === "compartilhado" && !(v.total >= v.amount)) { setErr("O total da compra precisa ser maior ou igual à sua parte."); return; }
      if (v.parcelado && isCard && !edit) {
        app.upsert("installments", { id: uid(), desc: v.desc || "Compra parcelada", cardId: v.method, categoryId: v.categoryId, amount: round2(v.amount / v.n), n: Number(v.n), start: ym(v.date) });
        app.toast("Compra parcelada em " + v.n + "x adicionada");
      } else if (v.kind === "fixa" && !edit) {
        app.upsert("bills", { id: uid(), name: v.desc || "Conta fixa", amount: v.amount, day: dayOf(v.date), categoryId: v.categoryId, method: v.method, paid: { [ym(v.date)]: true } });
        app.toast("Despesa fixa criada e marcada como paga neste mês");
      } else {
        const shared = v.kind === "compartilhado";
        app.upsert("txs", {
          id: editId || uid(), date: v.date, desc: v.desc.trim() || cats.find(c => c.id === v.categoryId)?.name || "Gasto",
          categoryId: v.categoryId, method: shared ? "pix" : v.method, amount: round2(v.amount), kind: shared ? "compartilhado" : "pessoal",
          ...(shared ? { total: round2(v.total), paidBy: v.paidBy.trim() || "Outra pessoa", status: v.status } : {}),
        });
        app.toast(edit ? "Gasto atualizado" : "Gasto adicionado");
      }
    } else if (tab === "receita") {
      if (!v.sourceId) { setErr("Cadastre uma fonte de renda antes."); return; }
      app.upsert("incomes", { id: editId || uid(), sourceId: v.sourceId, date: v.date, amount: round2(v.amount), note: v.desc || "" });
      app.toast("Entrada registrada. Percentuais do mês recalculados.");
    } else {
      if (!v.goalId) { setErr("Crie uma meta antes."); return; }
      app.upsert("contributions", { id: editId || uid(), goalId: v.goalId, date: v.date, amount: round2(v.amount) });
      app.toast("Valor guardado na meta");
    }
    close();
  };
  const remove = () => {
    if (!editId) return;
    app.remove(tab === "gasto" ? "txs" : tab === "receita" ? "incomes" : "contributions", editId);
    app.toast("Excluído");
    close();
  };
  const tabs = [{ value: "gasto" as const, label: "Gasto", icon: "arrowUpRight" }, { value: "receita" as const, label: "Entrada", icon: "arrowDownLeft" }, { value: "aporte" as const, label: "Guardar", icon: "piggy" }];
  const kinds = [{ value: "pessoal" as const, label: "Pessoal" }, { value: "compartilhado" as const, label: "Compartilhado" }, { value: "fixa" as const, label: "Despesa fixa" }];
  const src = data.sources.find(s => s.id === v.sourceId);
  const perSource = src ? round2(src.expected / (src.days.length || 1)) : 0;
  const amountKey = tab + amtRev;

  return (
    <Sheet open title={edit ? "Editar" : "Adicionar"} onClose={close} footer={<>
      {edit ? <Button variant="ghost-danger" icon="trash" onClick={remove}>Excluir</Button> : null}
      <span className="b-spacer" />
      <Button size="lg" icon="check" onClick={save} className="b-save">{edit ? "Salvar alterações" : tab === "gasto" ? "Adicionar gasto" : tab === "receita" ? "Registrar entrada" : "Guardar"}</Button>
    </>}>
      {edit ? null : <Segmented options={tabs} value={tab} onChange={t => { setTab(t); setErr(null); }} label="Tipo de lançamento" />}
      <div className="b-add-amount">
        <span className="b-field-label">{tab === "gasto" && v.kind === "compartilhado" ? "Minha parte" : tab === "gasto" && v.parcelado ? "Valor total da compra" : "Valor"}</span>
        <MoneyInput key={amountKey} value={v.amount} onChange={x => set({ amount: x })} autoFocus big />
        {err ? <span className="b-field-error"><Icon name="alert" size={14} />{err}</span> : null}
      </div>
      {tab === "gasto" ? <>
        <Field label="Categoria">
          <div className="b-catpick">
            {cats.map(c => (
              <button key={c.id} type="button" className={cx("b-catpick-opt", v.categoryId === c.id && "is-on")} onClick={() => set({ categoryId: c.id })}>
                <CatIcon cat={c} size={32} /><span>{c.name}</span>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Descrição"><Input value={v.desc} placeholder="Ex.: almoço, Uber, farmácia" onChange={e => set({ desc: e.target.value })} /></Field>
        <Field label="Tipo"><Segmented options={edit ? kinds.filter(k => k.value !== "fixa") : kinds} value={v.kind} onChange={k => set({ kind: k, parcelado: false })} size="sm" label="Tipo de gasto" /></Field>
        {v.kind === "compartilhado" ? (
          <div className="b-form b-form-inset">
            <Field label="Total da compra" className="is-half"><MoneyInput key={"tot" + amountKey} value={v.total} onChange={x => set({ total: x })} /></Field>
            <Field label="Pago por" className="is-half"><Input value={v.paidBy} placeholder="Quem pagou" onChange={e => set({ paidBy: e.target.value })} /></Field>
            <Field label="Status"><Segmented options={[{ value: "pendente" as const, label: "Preciso reembolsar" }, { value: "reembolsado" as const, label: "Já reembolsei" }]} value={v.status} onChange={s => set({ status: s })} size="sm" /></Field>
            {v.total > 0 ? <p className="b-muted b-small">Sua parte é {pct(v.amount / v.total)} da compra. Só ela entra nos seus gastos.</p> : null}
          </div>
        ) : (
          <Field label="Forma de pagamento">
            <div className="b-chips">
              {app.methods.map(m => (
                <button key={m.id} type="button" className={cx("b-chip", v.method === m.id && "is-on", m.card && "is-card-" + m.color)} onClick={() => set({ method: m.id, parcelado: m.card ? v.parcelado : false })}>
                  <Icon name={m.icon} size={16} />{m.name}
                </button>
              ))}
            </div>
          </Field>
        )}
        <div className="b-form">
          <Field label="Data" className="is-half"><Input type="date" value={v.date} onChange={e => set({ date: e.target.value })} /></Field>
          {isCard && v.kind === "pessoal" && !edit ? (
            <Field label="Parcelado?" className="is-half">
              <Segmented options={[{ value: false, label: "Não" }, { value: true, label: "Sim" }]} value={v.parcelado} onChange={p => set({ parcelado: p })} size="sm" />
            </Field>
          ) : null}
          {v.parcelado ? (
            <Field label="Número de parcelas" hint={v.amount > 0 ? v.n + "x de " + fmt(v.amount / v.n) : undefined}>
              <div className="b-chips">
                {[2, 3, 4, 5, 6, 10, 12].map(n => <button key={n} type="button" className={cx("b-chip", v.n === n && "is-on")} onClick={() => set({ n })}>{n}x</button>)}
              </div>
            </Field>
          ) : null}
        </div>
      </> : tab === "receita" ? (
        <div className="b-form">
          <Field label="Fonte">
            {data.sources.length ? (
              <div className="b-chips">
                {data.sources.map(s => (
                  <button key={s.id} type="button" className={cx("b-chip", v.sourceId === s.id && "is-on")} onClick={() => set({ sourceId: s.id })}>
                    <Icon name={s.icon || "briefcase"} size={16} />{s.name}
                  </button>
                ))}
              </div>
            ) : <p className="b-muted b-small">Cadastre uma fonte de renda na tela Receitas.</p>}
          </Field>
          {src && perSource > 0 ? <button type="button" className="b-linkbtn" onClick={() => { set({ amount: perSource }); setAmtRev(r => r + 1); }}>Usar valor previsto: {fmt(perSource)}</button> : null}
          <Field label="Data" className="is-half"><Input type="date" value={v.date} onChange={e => set({ date: e.target.value })} /></Field>
          <Field label="Observação" className="is-half"><Input value={v.desc} placeholder="Opcional" onChange={e => set({ desc: e.target.value })} /></Field>
          {v.amount > 0 ? <Notice tone="neutral" icon="piggy">Com {data.settings.savePct}% para guardar, {fmt(v.amount * data.settings.savePct / 100)} desta entrada vão para a sua meta do mês.</Notice> : null}
        </div>
      ) : (
        <div className="b-form">
          <Field label="Meta">
            {data.goals.length ? (
              <div className="b-chips">
                {data.goals.map(g => (
                  <button key={g.id} type="button" className={cx("b-chip", v.goalId === g.id && "is-on")} onClick={() => set({ goalId: g.id })}>
                    <Icon name={g.icon || "target"} size={16} />{g.name}
                  </button>
                ))}
              </div>
            ) : <p className="b-muted b-small">Crie uma meta na tela Metas.</p>}
          </Field>
          <Field label="Data" className="is-half"><Input type="date" value={v.date} onChange={e => set({ date: e.target.value })} /></Field>
        </div>
      )}
    </Sheet>
  );
}
