"use client";
import { useState } from "react";
import { addMonths, cx, dateIn, dayOf, ddmm, fmt, monthName, pct, round2, uid, ym } from "@/lib/format";
import { BILL_TYPES, installmentStart, invoiceMonth, parcelInfo } from "@/lib/finance";
import type { Collection, Data, Installment } from "@/lib/types";
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
          ? <div key={f.key} className="b-field">{input(f)}{f.hint ? <span className="b-field-hint">{typeof f.hint === "function" ? f.hint(v) : f.hint}</span> : null}</div>
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

type FormDef = { title: string; coll: Collection; fields: FieldDef[]; blank?: (d: Data, month: string, today: string) => Values; load?: (x: Values) => Values; save?: (x: Values, d: Data) => Values };

const FORMS: Record<FormKind, FormDef> = {
  category: { title: "Categoria", coll: "categories", fields: [
    { key: "name", label: "Nome", required: true },
    { key: "thirdParty", label: "Gasto de outra pessoa", type: "toggle", toggleLabel: "Gasto de outra pessoa",
      hint: "Para quem usa seu cartão e te devolve (ex.: Mãe, Pai). Fica fora dos seus gastos e do orçamento e aparece em Cartões como valor a cobrar." },
    { key: "mode", label: "Limite mensal", type: "seg", options: [{ value: "fixo", label: "Valor fixo" }, { value: "pct", label: "% da renda do mês" }], show: v => !v.thirdParty },
    { key: "limit", label: "Limite em R$", type: "money", show: v => !v.thirdParty && v.mode !== "pct" },
    { key: "pct", label: "Percentual da renda", type: "number", min: 0, max: 100, show: v => !v.thirdParty && v.mode === "pct", hint: "Recalculado com base em tudo que entrou no mês." },
    { key: "icon", label: "Ícone", type: "select", options: ICON_OPTIONS, half: true },
    { key: "color", label: "Cor no gráfico", type: "select", options: COLOR_OPTIONS, half: true }],
    blank: () => ({ id: uid(), name: "", mode: "fixo", limit: 0, pct: 5, icon: "box", color: "other", thirdParty: false }),
    save: v => ({ ...v, limit: Number(v.limit) || 0, pct: Number(v.pct) || 0, thirdParty: !!v.thirdParty }) },
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
    { key: "name", label: "Nome", required: true, placeholder: "Ex.: Enel, Sanasa" },
    { key: "type", label: "Tipo", type: "select", options: BILL_TYPES.map(t => ({ value: t.id, label: t.name })) },
    { key: "amount", label: "Valor previsto", type: "money", required: true, half: true, hint: "Ao marcar como paga, você ajusta o valor do mês." },
    { key: "day", label: "Vence todo dia", type: "number", min: 1, max: 31, half: true, required: true },
    { key: "categoryId", label: "Categoria", type: "select", half: true },
    { key: "method", label: "Paga com", type: "select", half: true },
    { key: "start", label: "Começa em", type: "month", half: true, hint: "Antes desse mês ela não aparece." }],
    blank: (d, month) => ({ id: uid(), name: "", kind: "conta", type: "luz", amount: 0, day: 10, categoryId: d.categories.find(c => c.id === "casa")?.id || d.categories[0]?.id || "", method: "pix", paid: {}, amounts: {}, start: month }),
    save: v => ({ ...v, kind: "conta" }) },
  subscription: { title: "Assinatura", coll: "bills", fields: [
    { key: "name", label: "Nome", required: true, placeholder: "Ex.: Spotify, Netflix" },
    { key: "amount", label: "Valor por mês", type: "money", required: true, half: true },
    { key: "day", label: "Dia da cobrança", type: "number", min: 1, max: 31, half: true, required: true },
    { key: "method", label: "Cobrada em", type: "select", half: true },
    { key: "categoryId", label: "Categoria", type: "select", half: true },
    { key: "start", label: "Primeira cobrança", type: "month", half: true, required: true },
    { key: "end", label: "Última cobrança", type: "month", half: true, hint: "Deixe vazio enquanto estiver ativa. Ao cancelar, coloque o último mês cobrado." }],
    blank: (d, month) => ({ id: uid(), name: "", kind: "assinatura", amount: 0, day: 10, method: d.cards[0]?.id || "pix", categoryId: d.categories.find(c => c.id === "assin")?.id || d.categories[0]?.id || "", paid: {}, amounts: {}, start: month, end: "" }),
    save: v => ({ ...v, kind: "assinatura" }) },
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
    { key: "cardId", label: "Cartão", type: "select", half: true },
    { key: "date", label: "Data da compra", type: "date", half: true },
    { key: "start", label: "Mês da 1ª parcela", type: "month", half: true, required: true, show: v => !v.date, hint: "Sem a data da compra, informe o mês da fatura da 1ª parcela." },
    { key: "categoryId", label: "Categoria", type: "select" }],
    blank: (d, _month, today) => ({ id: uid(), desc: "", amount: 0, n: 10, date: today, start: ym(today), cardId: d.cards[0]?.id || "", categoryId: d.categories.find(c => c.id === "comp")?.id || d.categories[0]?.id || "" }),
    save: (v, d) => {
      const card = d.cards.find(c => c.id === v.cardId);
      return { ...v, date: v.date || "", start: v.date && card ? invoiceMonth(card, String(v.date)) : v.start };
    } },
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
  personPayment: { title: "Valor recebido", coll: "personPayments", fields: [
    { key: "amount", label: "Quanto recebeu", type: "money", required: true },
    { key: "date", label: "Data", type: "date", required: true }],
    blank: (_d, month, today) => ({ id: uid(), categoryId: "", month, date: today, amount: 0 }) },
  box: { title: "Caixinha", coll: "boxes", fields: [
    { key: "name", label: "Nome", required: true, placeholder: "Ex.: Reserva" },
    { key: "amount", label: "Valor disponível", type: "money", hint: "Quanto tem nela agora. Atualize sempre que guardar ou tirar dinheiro." },
    { key: "moveMode", label: "Essa diferença", type: "seg", show: v => round2(Number(v.amount) || 0) !== round2(Number(v._orig) || 0),
      options: [{ value: "conta", label: "Passei da/para a conta" }, { value: "ajuste", label: "Rendimento ou ajuste" }],
      hint: v => v.moveMode === "conta" ? "O saldo em conta acompanha: sai da conta o que entrou na caixinha (ou volta, se tirou)." : "Não mexe no saldo em conta (ex.: rendimento da caixinha)." },
    { key: "cardId", label: "Reservada para pagar", type: "select", hint: "Ligada a uma fatura ou às contas fixas, o valor abate do que você tem a pagar." },
    { key: "icon", label: "Ícone", type: "select", options: ICON_OPTIONS }],
    blank: () => ({ id: uid(), name: "", amount: 0, cardId: "", icon: "piggy", _orig: 0, moveMode: "conta" }),
    // "__contas" no seletor = caixinha das contas fixas.
    load: b => ({ ...b, cardId: b.forBills ? "__contas" : b.cardId || "", _orig: b.amount, moveMode: "conta" }),
    // undefined (e não ausente) para desligar do cartão ao editar.
    save: ({ _orig, moveMode, ...b }) => { void _orig; void moveMode; return { ...b, amount: Number(b.amount) || 0, forBills: b.cardId === "__contas", cardId: b.cardId && b.cardId !== "__contas" ? b.cardId : undefined }; } },
  repayment: { title: "Pagamento", coll: "repayments", fields: [
    { key: "person", label: "Para quem", required: true, placeholder: "Ex.: Namorado" },
    { key: "amount", label: "Quanto você mandou", type: "money", required: true, half: true },
    { key: "date", label: "Data", type: "date", required: true, half: true },
    { key: "note", label: "Observação", placeholder: "Opcional (ex.: Pix)" }],
    blank: (_d, _month, today) => ({ id: uid(), person: "", amount: 0, date: today, note: "" }) },
  contribution: { title: "Aporte", coll: "contributions", fields: [
    { key: "amount", label: "Valor guardado", type: "money", required: true },
    { key: "goalId", label: "Meta", type: "select", half: true },
    { key: "date", label: "Data", type: "date", half: true, required: true }] },
};

export function FormHost() {
  const app = useApp();
  const { form, data } = app;
  if (!form) return null;
  // Uma assinatura aberta de qualquer lugar (Calendário, Transações) usa o formulário de assinatura.
  const def = FORMS[form.kind === "bill" && form.item?.kind === "assinatura" ? "subscription" : form.kind];
  const fields = def.fields.map(x => {
    if (x.key === "categoryId") return { ...x, options: data.categories.map(c => ({ value: c.id, label: c.name })) };
    if (x.key === "sourceId") return { ...x, options: [...data.sources.map(s => ({ value: s.id, label: s.name })), { value: "", label: "Outra entrada (use a observação)" }] };
    if (x.key === "goalId") return { ...x, options: data.goals.map(g => ({ value: g.id, label: g.name })) };
    if (x.key === "cardId") return { ...x, options: [...(form.kind === "box" ? [{ value: "", label: "Nada (só dinheiro separado)" }, { value: "__contas", label: "Contas fixas" }] : []), ...data.cards.map(c => ({ value: c.id, label: form.kind === "box" ? "Fatura " + c.name : c.name }))] };
    if (x.key === "method") return { ...x, options: app.methods.map(m => ({ value: m.id, label: m.name })) };
    if (form.kind === "installment" && x.key === "date") return { ...x, hint: (v: Values) => invoiceHint(data, String(v.cardId || ""), String(v.date || ""), "1ª parcela na fatura que vence em ") };
    return x;
  });
  const value = form.item ? (def.load ? def.load(form.item) : form.item) : { ...(def.blank ? def.blank(data, app.month, app.today) : { id: uid() }), ...form.preset };
  const close = () => app.setForm(null);
  return (
    <EntityForm key={String(value.id)} title={(form.item ? "Editar " : "Nova ") + def.title.toLowerCase()} fields={fields} value={value} onClose={close}
      onSave={v => {
        const o = def.save ? def.save(v, data) : v;
        app.upsert(def.coll, { ...(form.item || {}), ...o } as never);
        // Caixinha: a diferença de valor "passada da/para a conta" vira uma transferência.
        if (form.kind === "box" && v.moveMode === "conta") {
          const diff = round2((Number(v.amount) || 0) - (Number(v._orig) || 0));
          if (diff !== 0) app.upsert("boxMoves", { id: uid(), boxId: String(v.id), date: app.today, amount: diff });
        }
        app.toast((def.coll === "installments" && endedMsg(data, { ...(form.item || {}), ...o } as unknown as Installment, app.month)) || (form.item ? "Alterações salvas" : "Adicionado"));
      }}
      onDelete={form.item ? v => app.askDelete(def.coll, String(v.id), def.title) : undefined} />
  );
}

// "Entra na fatura que vence em 10/10 (fecha dia 03)": mostra de que lado do fechamento a compra ficou.
function invoiceHint(data: Data, cardId: string, date: string, prefix: string) {
  const card = data.cards.find(c => c.id === cardId);
  if (!card || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const due = dateIn(addMonths(invoiceMonth(card, date), 1), card.dueDay);
  return prefix + ddmm(due) + " (fecha dia " + String(card.closeDay).padStart(2, "0") + ")";
}

// Parcelamento salvo que já terminou antes do mês visto: avisa onde ele foi parar.
function endedMsg(data: Data, inst: Installment, month: string) {
  const i = { ...inst, n: Number(inst.n), start: installmentStart(data, inst) };
  if (parcelInfo(i, month).idx <= i.n) return null;
  return "Salvo. As parcelas terminaram em " + monthName(addMonths(i.start, i.n - 1)) + ", então está em Parcelamentos encerrados";
}

type AddValues = {
  amount: number; categoryId: string; desc: string; method: string; date: string; kind: "pessoal" | "compartilhado" | "fixa";
  parcelado: boolean; n: number; total: number; paidBy: string; status: "pendente" | "reembolsado"; sourceId: string; goalId: string; boxId: string;
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
      parcelado: false, n: 2, total: 0, paidBy: "", status: "pendente", sourceId: data.sources[0]?.id || "", goalId: "", boxId: "",
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
        const card = data.cards.find(c => c.id === v.method);
        const inst = { id: uid(), desc: v.desc || "Compra parcelada", cardId: v.method, categoryId: v.categoryId, amount: round2(v.amount / v.n), n: Number(v.n), date: v.date, start: card ? invoiceMonth(card, v.date) : ym(v.date) };
        app.upsert("installments", inst);
        app.toast(endedMsg(data, inst, app.month) || "Compra parcelada em " + v.n + "x adicionada");
      } else if (v.kind === "fixa" && !edit) {
        app.upsert("bills", { id: uid(), name: v.desc || "Conta fixa", amount: v.amount, day: dayOf(v.date), categoryId: v.categoryId, method: v.method, paid: { [ym(v.date)]: true }, kind: "conta", type: "outros", start: ym(v.date), amounts: {} });
        app.toast("Despesa fixa criada e marcada como paga neste mês");
      } else {
        const shared = v.kind === "compartilhado";
        if (shared && !v.paidBy.trim()) { setErr("Diga quem pagou a compra."); return; }
        app.upsert("txs", {
          id: editId || uid(), date: v.date, desc: v.desc.trim() || cats.find(c => c.id === v.categoryId)?.name || "Gasto",
          categoryId: v.categoryId, method: shared ? "pix" : v.method, amount: round2(v.amount), kind: shared ? "compartilhado" : "pessoal",
          ...(shared ? { total: round2(v.total), paidBy: v.paidBy.trim() || "Outra pessoa", status: v.status } : {}),
        });
        app.toast(edit ? "Gasto atualizado" : "Gasto adicionado");
      }
    } else if (tab === "receita") {
      // Sem fonte (sourceId vazio) = entrada avulsa, ex.: Pix da avó. A descrição vira o nome.
      if (!v.sourceId && !v.desc.trim()) { setErr("Diga de onde veio (ex.: Pix da vó)."); return; }
      app.upsert("incomes", { id: editId || uid(), sourceId: v.sourceId, date: v.date, amount: round2(v.amount), note: v.desc.trim() });
      app.toast("Entrada registrada. Percentuais do mês recalculados.");
    } else {
      // Sem meta (goalId vazio) conta só para a meta de guardar do mês.
      app.upsert("contributions", { id: editId || uid(), goalId: v.goalId, date: v.date, amount: round2(v.amount) });
      const box = data.boxes.find(b => b.id === v.boxId);
      if (box && !edit) app.upsert("boxes", { ...box, amount: round2(box.amount + v.amount) });
      app.toast("Guardado" + (box && !edit ? " na caixinha " + box.name : ""));
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
  // Nomes já usados em "Pago por" e em pagamentos, para sugerir ao digitar.
  const people = [...new Set([...data.txs.map(x => x.paidBy || ""), ...data.repayments.map(r => r.person)].map(n => n.trim()).filter(Boolean))];
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
            <Field label="Pago por" className="is-half">
              <Input value={v.paidBy} placeholder="Quem pagou" list="b-people" onChange={e => set({ paidBy: e.target.value })} />
              <datalist id="b-people">{people.map(p => <option key={p} value={p} />)}</datalist>
            </Field>
            {v.total > 0 ? <p className="b-muted b-small">Sua parte é {pct(v.amount / v.total)} da compra. Só ela entra nos seus gastos e no que você deve na aba Reembolsos.</p> : null}
            <p className="b-muted b-small">Usou o cartão de outra pessoa numa compra só sua? Coloque o mesmo valor em &quot;Total da compra&quot; e em &quot;Minha parte&quot;.</p>
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
          <Field label="Data" className="is-half" hint={isCard ? invoiceHint(data, v.method, v.date, v.parcelado ? "1ª parcela na fatura que vence em " : "Entra na fatura que vence em ") : undefined}>
            <Input type="date" value={v.date} onChange={e => set({ date: e.target.value })} />
          </Field>
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
          <Field label="De onde veio">
            <div className="b-chips">
              {data.sources.map(s => (
                <button key={s.id} type="button" className={cx("b-chip", v.sourceId === s.id && "is-on")} onClick={() => set({ sourceId: s.id })}>
                  <Icon name={s.icon || "briefcase"} size={16} />{s.name}
                </button>
              ))}
              <button type="button" className={cx("b-chip", !v.sourceId && "is-on")} onClick={() => set({ sourceId: "" })}>
                <Icon name="gift" size={16} />Outra entrada
              </button>
            </div>
          </Field>
          {src && perSource > 0 ? <button type="button" className="b-linkbtn" onClick={() => { set({ amount: perSource }); setAmtRev(r => r + 1); }}>Usar valor previsto: {fmt(perSource)}</button> : null}
          <Field label="Data" className="is-half"><Input type="date" value={v.date} onChange={e => set({ date: e.target.value })} /></Field>
          <Field label={v.sourceId ? "Observação" : "Descrição"} className="is-half">
            <Input value={v.desc} placeholder={v.sourceId ? "Opcional" : "Ex.: Pix da vó"} onChange={e => set({ desc: e.target.value })} />
          </Field>
          {v.amount > 0 ? <Notice tone="neutral" icon="piggy">Com {data.settings.savePct}% para guardar, {fmt(v.amount * data.settings.savePct / 100)} desta entrada vão para a sua meta do mês.</Notice> : null}
        </div>
      ) : (
        <div className="b-form">
          <Field label="Para qual meta" hint={v.goalId ? undefined : "Conta para a sua meta de guardar " + data.settings.savePct + "% do mês."}>
            <div className="b-chips">
              <button type="button" className={cx("b-chip", !v.goalId && "is-on")} onClick={() => set({ goalId: "" })}>
                <Icon name="piggy" size={16} />Guardar do mês
              </button>
              {data.goals.map(g => (
                <button key={g.id} type="button" className={cx("b-chip", v.goalId === g.id && "is-on")} onClick={() => set({ goalId: g.id })}>
                  <Icon name={g.icon || "target"} size={16} />{g.name}
                </button>
              ))}
            </div>
          </Field>
          {!edit && data.boxes.some(b => !b.cardId && !b.forBills) ? (
            <Field label="Onde o dinheiro ficou" hint={v.boxId ? "O valor é somado nessa caixinha." : "Escolha a caixinha para ela já ficar atualizada."}>
              <div className="b-chips">
                <button type="button" className={cx("b-chip", !v.boxId && "is-on")} onClick={() => set({ boxId: "" })}>Não informar</button>
                {data.boxes.filter(b => !b.cardId && !b.forBills).map(b => (
                  <button key={b.id} type="button" className={cx("b-chip", v.boxId === b.id && "is-on")} onClick={() => set({ boxId: b.id })}>
                    <Icon name={b.icon || "piggy"} size={16} />{b.name}
                  </button>
                ))}
              </div>
            </Field>
          ) : null}
          <Field label="Data" className="is-half"><Input type="date" value={v.date} onChange={e => set({ date: e.target.value })} /></Field>
        </div>
      )}
    </Sheet>
  );
}
