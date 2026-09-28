// Toda a matemática do Bolso. Funções puras: recebem os dados e o mês,
// devolvem os números. Rodam no navegador (telas) e no servidor (dados iniciais).
import type { Bill, Category, CreditCard, Data, Goal, Installment, Source, Tone, Tx, Income, Contribution, CardPayment, PersonPayment, Box, Repayment } from "./types";
import { MONTHS, addMonths, dateIn, dayOf, dim, fmt, monthDiff, pct, round2, sum, uid, ym } from "./format";

export const BASE_METHODS = [
  { id: "pix", name: "Pix", icon: "zap" },
  { id: "debito", name: "Débito", icon: "wallet" },
  { id: "dinheiro", name: "Dinheiro", icon: "cash" },
];

export type Method = { id: string; name: string; icon: string; card?: boolean; color?: string };

// Formas de pagamento = as fixas + um item por cartão cadastrado.
export const methodsOf = (data: Data): Method[] =>
  [...BASE_METHODS, ...data.cards.map(c => ({ id: c.id, name: c.name, icon: "card", card: true, color: c.color }))];
export const methodName = (data: Data, id: string) => methodsOf(data).find(m => m.id === id)?.name ?? id;
export const cardIdsOf = (data: Data) => new Set(data.cards.map(c => c.id));

export const CAT_COLORS: Record<string, string> = {
  chart1: "var(--chart-1)", chart2: "var(--chart-2)", chart3: "var(--chart-3)", chart4: "var(--chart-4)",
  chart5: "var(--chart-5)", chart6: "var(--chart-6)", other: "var(--chart-other)",
};
export const catColor = (c?: Category | null) => (c && CAT_COLORS[c.color]) || "var(--chart-other)";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "alim", name: "Alimentação", icon: "utensils", color: "chart1", mode: "fixo", limit: 440, pct: 0 },
  { id: "merc", name: "Mercado", icon: "cart", color: "chart3", mode: "pct", limit: 0, pct: 12 },
  { id: "transp", name: "Transporte", icon: "car", color: "chart4", mode: "fixo", limit: 200, pct: 0 },
  { id: "bel", name: "Beleza", icon: "sparkles", color: "chart5", mode: "fixo", limit: 180, pct: 0 },
  { id: "laz", name: "Lazer", icon: "ticket", color: "chart6", mode: "pct", limit: 0, pct: 6 },
  { id: "comp", name: "Compras", icon: "bag", color: "chart2", mode: "fixo", limit: 380, pct: 0 },
  { id: "casa", name: "Casa", icon: "house", color: "other", mode: "fixo", limit: 300, pct: 0 },
  { id: "assin", name: "Assinaturas", icon: "repeat", color: "other", mode: "fixo", limit: 130, pct: 0 },
  { id: "saude", name: "Saúde", icon: "heart", color: "other", mode: "fixo", limit: 80, pct: 0 },
  { id: "estudo", name: "Estudo", icon: "laptop", color: "other", mode: "fixo", limit: 200, pct: 0 },
  { id: "outros", name: "Outros", icon: "box", color: "other", mode: "fixo", limit: 50, pct: 0 },
];

export function mockData(): Data {
  const t = (date: string, desc: string, categoryId: string, method: string, amount: number, extra?: Partial<Tx>): Tx =>
    ({ id: uid(), date, desc, categoryId, method, amount, kind: "pessoal", ...extra });
  const shared = (date: string, desc: string, categoryId: string, total: number, amount: number, status: "pendente" | "reembolsado") =>
    t(date, desc, categoryId, "pix", amount, { kind: "compartilhado", total, paidBy: "Namorado", status });
  return {
    version: 1,
    settings: { name: "Emy", savePct: 30, theme: "auto", lock: false, demo: true, demoToday: "2026-09-26" },
    carry: { "2026-08": 1310, "2026-09": 1520 },
    categories: [
      ...DEFAULT_CATEGORIES.map(c => ({ ...c })),
      { id: "mae", name: "Mãe", icon: "heart", color: "other", mode: "fixo", limit: 0, pct: 0, thirdParty: true },
      { id: "pai", name: "Pai", icon: "users", color: "other", mode: "fixo", limit: 0, pct: 0, thirdParty: true },
    ],
    sources: [
      { id: "job1", name: "Emprego 1", icon: "briefcase", expected: 2300, days: [5], kind: "fixa", freq: "mensal" },
      { id: "job2", name: "Emprego 2", icon: "laptop", expected: 1240, days: [15, 28], kind: "variavel", freq: "quinzenal" },
      { id: "pensao", name: "Pensão", icon: "users", expected: 800, days: [10], kind: "fixa", freq: "mensal" },
    ],
    incomes: [
      { id: uid(), sourceId: "job1", date: "2026-08-05", amount: 2300, note: "" },
      { id: uid(), sourceId: "pensao", date: "2026-08-10", amount: 800, note: "" },
      { id: uid(), sourceId: "job2", date: "2026-08-15", amount: 580, note: "" },
      { id: uid(), sourceId: "job2", date: "2026-08-28", amount: 670, note: "" },
      { id: uid(), sourceId: "job1", date: "2026-09-05", amount: 2350, note: "Com horas extras" },
      { id: uid(), sourceId: "pensao", date: "2026-09-10", amount: 800, note: "" },
      { id: uid(), sourceId: "job2", date: "2026-09-15", amount: 640, note: "" },
    ],
    txs: [
      t("2026-08-04", "Restaurantes e delivery", "alim", "nubank", 455),
      shared("2026-08-09", "Mercado do mês", "merc", 520, 260, "reembolsado"),
      t("2026-08-12", "Uber e ônibus", "transp", "pix", 140),
      t("2026-08-14", "Cabelo e skincare", "bel", "mp", 180),
      t("2026-08-16", "Saídas e cinema", "laz", "pix", 190),
      t("2026-08-20", "Roupas", "comp", "nubank", 240),
      t("2026-08-22", "Utensílios", "casa", "debito", 45),
      t("2026-08-24", "Farmácia", "saude", "debito", 60),
      t("2026-08-27", "Presentes", "outros", "pix", 50),
      t("2026-09-01", "iFood", "alim", "nubank", 42.9),
      t("2026-09-02", "Uber", "transp", "pix", 18.4),
      t("2026-09-03", "Padaria", "alim", "debito", 15.8),
      shared("2026-09-04", "Mercado", "merc", 186.4, 93.2, "reembolsado"),
      t("2026-09-05", "Farmácia", "saude", "debito", 38.6),
      t("2026-09-06", "Cinema", "laz", "nubank", 64),
      t("2026-09-07", "Almoço", "alim", "pix", 32),
      t("2026-09-08", "Protetor solar", "bel", "mp", 79.9),
      t("2026-09-09", "Uber", "transp", "pix", 22.7),
      t("2026-09-11", "Blusa", "comp", "nubank", 139.9),
      t("2026-09-12", "Recarga ônibus", "transp", "pix", 60),
      t("2026-09-13", "Restaurante japonês", "alim", "nubank", 88.5),
      shared("2026-09-14", "Mercado", "merc", 142, 71, "reembolsado"),
      t("2026-09-15", "Show", "laz", "mp", 120),
      t("2026-09-16", "Cafeteria", "alim", "debito", 24.5),
      t("2026-09-17", "Manicure", "bel", "pix", 45),
      t("2026-09-18", "Uber", "transp", "pix", 26.3),
      t("2026-09-19", "Tênis de corrida", "comp", "mp", 149),
      t("2026-09-20", "Presente de aniversário", "outros", "pix", 35),
      t("2026-09-21", "iFood", "alim", "nubank", 51.4),
      t("2026-09-22", "Bar com amigas", "laz", "pix", 58),
      t("2026-09-23", "Pizza", "alim", "nubank", 64.9),
      t("2026-09-23", "Organizadores", "casa", "mp", 48.9),
      shared("2026-09-24", "Mercado", "merc", 180, 72, "pendente"),
      shared("2026-09-25", "Restaurante", "alim", 70, 35, "pendente"),
      t("2026-09-26", "Lanche", "alim", "debito", 19.9),
      t("2026-08-18", "Farmácia", "mae", "nubank", 86.4),
      t("2026-08-25", "Posto", "pai", "mp", 150),
      t("2026-09-06", "Supermercado", "mae", "nubank", 212.3),
      t("2026-09-19", "Farmácia", "mae", "nubank", 64.8),
      t("2026-09-12", "Posto", "pai", "mp", 180),
    ],
    bills: [
      { id: "b1", name: "Spotify", amount: 21.9, day: 8, categoryId: "assin", method: "nubank", paid: {}, kind: "assinatura", start: "2026-01" },
      { id: "b2", name: "Streaming", amount: 39.9, day: 12, categoryId: "assin", method: "nubank", paid: {}, kind: "assinatura", start: "2026-03" },
      { id: "b3", name: "Celular", amount: 45, day: 15, categoryId: "assin", method: "pix", paid: { "2026-08": true, "2026-09": true }, kind: "conta", type: "celular" },
      { id: "b4", name: "Internet", amount: 99.9, day: 20, categoryId: "casa", method: "pix", paid: { "2026-08": true, "2026-09": true }, kind: "conta", type: "internet" },
      { id: "b5", name: "Conta de luz", amount: 85, day: 27, categoryId: "casa", method: "pix", paid: { "2026-08": true }, kind: "conta", type: "luz", amounts: { "2026-08": 92.4 } },
      { id: "b6", name: "Academia", amount: 90, day: 30, categoryId: "saude", method: "pix", paid: { "2026-08": true }, kind: "conta", type: "outros" },
    ],
    cards: [
      { id: "nubank", name: "Nubank", limit: 3000, closeDay: 3, dueDay: 10, color: "nubank" },
      { id: "mp", name: "Mercado Pago", limit: 1500, closeDay: 3, dueDay: 10, color: "mp" },
    ],
    cardPayments: [
      { id: uid(), cardId: "nubank", date: "2026-08-10", amount: 812.4 },
      { id: uid(), cardId: "mp", date: "2026-08-10", amount: 356 },
      { id: uid(), cardId: "nubank", date: "2026-09-10", amount: 986.9 },
      { id: uid(), cardId: "mp", date: "2026-09-10", amount: 250 },
    ],
    installments: [
      { id: "i1", desc: "Notebook", cardId: "nubank", categoryId: "estudo", amount: 180, n: 10, start: "2026-06" },
      { id: "i2", desc: "Cadeira de escritório", cardId: "nubank", categoryId: "casa", amount: 90, n: 5, start: "2026-05" },
      { id: "i3", desc: "Fone de ouvido", cardId: "mp", categoryId: "comp", amount: 70, n: 6, start: "2026-08" },
    ],
    goals: [
      { id: "g1", name: "Reserva de emergência", icon: "shield", target: 10000, base: 2100, deadline: "2027-12", monthly: 500 },
      { id: "g2", name: "Viagem", icon: "gift", target: 3000, base: 1150, deadline: "2027-07", monthly: 200 },
      { id: "g3", name: "Certificação cloud", icon: "laptop", target: 1200, base: 300, deadline: "2027-03", monthly: 150 },
    ],
    contributions: [
      { id: uid(), goalId: "g1", date: "2026-08-06", amount: 600 },
      { id: uid(), goalId: "g2", date: "2026-08-11", amount: 300 },
      { id: uid(), goalId: "g1", date: "2026-09-07", amount: 500 },
      { id: uid(), goalId: "g2", date: "2026-09-11", amount: 100 },
    ],
    boxes: defaultBoxes([{ id: "nubank", name: "Nubank", limit: 0, closeDay: 3, dueDay: 10, color: "nubank" }, { id: "mp", name: "Mercado Pago", limit: 0, closeDay: 3, dueDay: 10, color: "mp" }])
      .map(b => ({ ...b, amount: ({ "cx-nubank": 300, "cx-mp": 150, "cx-casa": 420, "cx-reserva": 1800, "cx-academia": 90 } as Record<string, number>)[b.id] ?? 0 })),
    repayments: [{ id: uid(), person: "Namorado", date: "2026-09-25", amount: 50, note: "Pix" }],
    personPayments: [
      { id: uid(), categoryId: "mae", month: "2026-08", date: "2026-09-09", amount: 86.4 },
      { id: uid(), categoryId: "pai", month: "2026-08", date: "2026-09-10", amount: 150 },
    ],
    history: [
      { m: "2026-04", receitas: 3620, gastos: 2980, guardado: 380 },
      { m: "2026-05", receitas: 3710, gastos: 2870, guardado: 520 },
      { m: "2026-06", receitas: 3950, gastos: 3105, guardado: 610 },
      { m: "2026-07", receitas: 4080, gastos: 2790, guardado: 700 },
    ],
  };
}

// Dados vazios, mantendo as configurações e as categorias padrão.
// Caixinhas iniciais. As dos cartões ficam ligadas ao cartão quando ele existe.
export function defaultBoxes(cards: CreditCard[] = []): Box[] {
  const find = (re: RegExp) => cards.find(k => re.test(k.name))?.id;
  const card = (id: string, name: string, re: RegExp): Box => { const cardId = find(re); return { id, name, icon: "card", amount: 0, ...(cardId ? { cardId } : {}) }; };
  return [
    card("cx-nubank", "Cartão Nubank", /nubank/i),
    card("cx-mp", "Cartão Mercado Pago", /mercado/i),
    { id: "cx-casa", name: "Contas de Casa", icon: "house", amount: 0 },
    { id: "cx-reserva", name: "Reserva", icon: "shield", amount: 0 },
    { id: "cx-academia", name: "Academia", icon: "heart", amount: 0 },
  ];
}

export function emptyData(prev?: Data): Data {
  const settings = prev ? { ...prev.settings, demo: false } : { name: "", savePct: 30, theme: "auto" as const, lock: false, demo: false, demoToday: "2026-09-26" };
  return {
    version: 1, settings, carry: {}, categories: DEFAULT_CATEGORIES.map(c => ({ ...c })),
    sources: [], incomes: [], txs: [], bills: [], cards: [], cardPayments: [], installments: [], goals: [], contributions: [], personPayments: [], boxes: defaultBoxes(), repayments: [], history: [],
  };
}

export function budgetLimit(cat: Category, income: number) {
  return cat.mode === "pct" ? round2(income * (cat.pct || 0) / 100) : (cat.limit || 0);
}

export type BudgetState = { key: "ok" | "warn" | "edge" | "over"; tone: Tone; label: string };
export function stateOf(ratio: number): BudgetState {
  if (ratio > 1) return { key: "over", tone: "negative", label: "Acima do limite" };
  if (ratio >= 0.9) return { key: "edge", tone: "caution", label: "No limite" };
  if (ratio >= 0.7) return { key: "warn", tone: "warning", label: "Atenção" };
  return { key: "ok", tone: "positive", label: "Tranquilo" };
}

export function parcelInfo(inst: Installment, month: string) {
  const idx = monthDiff(inst.start, month) + 1;
  return { idx, active: idx >= 1 && idx <= inst.n, remaining: Math.max(0, inst.n - Math.max(idx, 0)) };
}

// Fatura em que uma compra no cartão cai, identificada pelo mês da tabela (a que vence no mês seguinte).
// Compra antes do dia de fechamento entra na fatura que fecha neste mês; no dia do fechamento ou depois, na próxima.
export function invoiceMonth(card: Pick<CreditCard, "closeDay" | "dueDay">, date: string) {
  const m = ym(date);
  const close = Math.min(card.closeDay, dim(m));
  const closeMonth = dayOf(date) < close ? m : addMonths(m, 1);
  const dueMonth = card.dueDay > card.closeDay ? closeMonth : addMonths(closeMonth, 1);
  return addMonths(dueMonth, -1);
}

// Mês da 1ª parcela: pela data da compra quando existe; parcelas antigas usam o mês gravado.
export function installmentStart(data: Data, inst: Installment) {
  const card = data.cards.find(c => c.id === inst.cardId);
  return inst.date && card ? invoiceMonth(card, inst.date) : inst.start;
}

// Tipos de conta fixa, com ícone.
export const BILL_TYPES = [
  { id: "luz", name: "Luz", icon: "zap" },
  { id: "agua", name: "Água", icon: "drop" },
  { id: "internet", name: "Internet", icon: "wifi" },
  { id: "aluguel", name: "Aluguel", icon: "house" },
  { id: "condominio", name: "Condomínio", icon: "building" },
  { id: "gas", name: "Gás", icon: "flame" },
  { id: "celular", name: "Celular", icon: "phone" },
  { id: "escola", name: "Escola/Curso", icon: "book" },
  { id: "outros", name: "Outros", icon: "file" },
];
export const billTypeOf = (b: Bill) => BILL_TYPES.find(t => t.id === b.type) || BILL_TYPES[BILL_TYPES.length - 1];

// A conta/assinatura existe neste mês? (entre o primeiro e o último mês, quando informados)
export const billActive = (b: Bill, month: string) => (!b.start || month >= b.start) && (!b.end || month <= b.end);
// Valor do mês: o efetivo, se você informou ao pagar; senão, o previsto.
export const billAmount = (b: Bill, month: string) => b.amounts?.[month] ?? b.amount;

export type BillStatus = "paga" | "pendente" | "atrasada";
export function billStatus(bill: Bill, month: string, today: string): BillStatus {
  // Assinatura é cobrada sozinha: conta como paga em todo mês em que está ativa.
  if (bill.kind === "assinatura") return "paga";
  if (bill.paid && bill.paid[month]) return "paga";
  const tm = ym(today);
  if (month < tm) return "atrasada";
  if (month === tm && bill.day < dayOf(today)) return "atrasada";
  return "pendente";
}

export type InvoiceItem = { src: "tx" | "bill" | "parcel"; id: string; date: string; desc: string; amount: number; categoryId: string };

// Tudo que cai numa fatura (mês da tabela = fatura que vence no mês seguinte):
// compras no cartão e contas fixas pagas nele, pelo dia de fechamento; e as parcelas do mês.
export function invoiceItems(data: Data, card: CreditCard, month: string, today: string): InvoiceItem[] {
  const tx = data.txs.filter(x => x.method === card.id && x.kind !== "compartilhado" && invoiceMonth(card, x.date) === month)
    .map(x => ({ src: "tx" as const, id: x.id, date: x.date, desc: x.desc, amount: x.amount, categoryId: x.categoryId }));
  const bills = [addMonths(month, -1), month, addMonths(month, 1)].flatMap(m => billsFor(data, m, today)
    .filter(b => b.method === card.id && b.status === "paga" && invoiceMonth(card, b.date) === month)
    .map(b => ({ src: "bill" as const, id: b.id + m, date: b.date, desc: b.name, amount: b.amount, categoryId: b.categoryId })));
  const parcels = data.installments.filter(i => i.cardId === card.id).flatMap(i => {
    const p = parcelInfo(i, month);
    return p.active ? [{ src: "parcel" as const, id: i.id, date: i.date || dateIn(month, card.closeDay), desc: i.desc + " " + p.idx + "/" + i.n, amount: i.amount, categoryId: i.categoryId }] : [];
  });
  return [...tx, ...bills, ...parcels].sort((a, b) => b.date.localeCompare(a.date));
}

// Valor de uma fatura. Com onlyMine, deixa de fora as categorias de outras pessoas (Mãe, Pai).
export function cardInvoice(data: Data, card: CreditCard, month: string, today: string, onlyMine = false) {
  const third = thirdIdsOf(data);
  return round2(sum(invoiceItems(data, card, month, today).filter(i => !onlyMine || !third.has(i.categoryId)), i => i.amount));
}

// Categorias de outra pessoa: o gasto passa pelo seu cartão/conta, mas quem paga é ela.
export const thirdIdsOf = (data: Data) => new Set(data.categories.filter(c => c.thirdParty).map(c => c.id));

export type ThirdParty = { cat: Category; spent: number; onCards: number; owedOnCards: number; owedByCard: Record<string, number>; byMethod: Record<string, number>; received: number; falta: number; payments: PersonPayment[] };

// Quanto cada pessoa gastou no mês (em qualquer forma de pagamento) e quanto já te devolveu.
export function thirdPartyFor(data: Data, month: string, today: string): ThirdParty[] {
  const inMonth = (x: { date: string }) => ym(x.date) === month;
  const cardIds = cardIdsOf(data);
  return data.categories.filter(c => c.thirdParty).map(cat => {
    // No cartão, conta a fatura do mês (respeita o fechamento); no Pix/débito/dinheiro, a data do gasto.
    const items = [
      ...data.cards.flatMap(k => invoiceItems(data, k, month, today).filter(i => i.categoryId === cat.id).map(i => ({ method: k.id, amount: i.amount }))),
      ...data.txs.filter(x => inMonth(x) && x.categoryId === cat.id && !cardIds.has(x.method)).map(x => ({ method: x.method, amount: x.amount })),
      ...billsFor(data, month, today).filter(b => b.categoryId === cat.id && !cardIds.has(b.method) && b.status === "paga").map(b => ({ method: b.method, amount: b.amount })),
    ];
    const byMethod: Record<string, number> = {};
    items.forEach(i => { byMethod[i.method] = round2((byMethod[i.method] || 0) + i.amount); });
    const spent = round2(sum(items, i => i.amount));
    const payments = data.personPayments.filter(p => p.categoryId === cat.id && p.month === month);
    const received = round2(sum(payments, p => p.amount));
    const falta = round2(Math.max(0, spent - received));
    const cards = cardIdsOf(data);
    const onCards = round2(sum(Object.entries(byMethod).filter(([m]) => cards.has(m)), ([, v]) => v));
    // Parte da fatura que a pessoa ainda não te devolveu (o que ela já devolveu fica reservado para pagar o cartão).
    // O que ainda falta receber, distribuído pelos cartões (na ordem dos cartões).
    const owedByCard: Record<string, number> = {};
    let rest = Math.min(falta, onCards);
    data.cards.forEach(k => { const v = round2(Math.min(rest, byMethod[k.id] || 0)); if (v > 0) { owedByCard[k.id] = v; rest -= v; } });
    return { cat, spent, onCards, owedOnCards: round2(Math.min(falta, onCards)), owedByCard, byMethod, received, falta, payments };
  });
}

// ---- Reembolsos: o que você deve para quem pagou compras por você ----
// Dívida = sua parte nas compras compartilhadas pendentes. Pagamentos (repayments) abatem
// do saldo de cada pessoa, cobrindo primeiro as compras mais antigas.
// Compras antigas marcadas como "reembolsado" (antes desta aba) contam como já quitadas.
// Nome de uma entrada: a fonte, ou a descrição quando é avulsa.
export const incomeName = (data: Data, i: Income) => data.sources.find(s => s.id === i.sourceId)?.name ?? (i.note || "Entrada avulsa");

export const personKey = (name?: string) => (name || "").trim().toLowerCase();

export type DebtItem = { tx: Tx; paid: number; open: number };
export type PersonDebt = { key: string; name: string; items: DebtItem[]; payments: Repayment[]; total: number; paid: number; owed: number; credit: number };

export function debtsFor(data: Data, until: string): PersonDebt[] {
  const by = new Map<string, PersonDebt>();
  const get = (name: string) => {
    const key = personKey(name);
    if (!by.has(key)) by.set(key, { key, name: name.trim() || "Sem nome", items: [], payments: [], total: 0, paid: 0, owed: 0, credit: 0 });
    return by.get(key)!;
  };
  data.txs.filter(x => x.kind === "compartilhado" && x.status !== "reembolsado" && x.date <= until)
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(x => get(x.paidBy || "").items.push({ tx: x, paid: 0, open: x.amount }));
  data.repayments.filter(r => r.date <= until).sort((a, b) => a.date.localeCompare(b.date)).forEach(r => get(r.person).payments.push(r));
  return [...by.values()].map(p => {
    let pool = sum(p.payments, r => r.amount);
    p.items.forEach(i => { const use = round2(Math.min(pool, i.tx.amount)); i.paid = use; i.open = round2(i.tx.amount - use); pool = round2(pool - use); });
    p.total = round2(sum(p.items, i => i.tx.amount));
    p.paid = round2(sum(p.payments, r => r.amount));
    p.owed = round2(Math.max(0, p.total - p.paid));
    p.credit = round2(Math.max(0, p.paid - p.total));
    return p;
  }).sort((a, b) => b.owed - a.owed || a.name.localeCompare(b.name));
}

export type Expense = { src: "tx" | "parcel" | "bill"; id: string; date: string; desc: string; categoryId: string; amount: number; method: string; ref: Tx | (Installment & { idx: number }) | Bill };
export type Budget = { cat: Category; limit: number; spent: number; pend: number; ratio: number; rest: number; state: BudgetState };
export type MonthBill = Bill & { status: BillStatus; date: string };

// Contas e assinaturas de um mês, com o valor e a situação daquele mês.
export function billsFor(data: Data, month: string, today: string): MonthBill[] {
  return data.bills.filter(b => billActive(b, month)).map(b => ({ ...b, amount: billAmount(b, month), status: billStatus(b, month, today), date: dateIn(month, b.day) }));
}
// Situação das faturas de um cartão no mês, já contando a caixinha dele.
export type CardInvoiceStatus = { cardId: string; box: number; prevOpen: number; prevOwed: number; coveredPrev: number; cur: number; coveredCur: number; sobra: number };
export type MonthCard = CreditCard & {
  caixinha: number; restante: number;
  fatura: number; faturaMinha: number; faturaTerceiros: number; futuro: number; usado: number; disponivel: number; ratio: number; due: string;
  items: InvoiceItem[];
};
export type Expected = { source: Source; date: string; amount: number };
export type Month = ReturnType<typeof compute>;

export function compute(data: Data, month: string, today: string) {
  const inMonth = (x: { date: string }) => ym(x.date) === month;
  const tm = ym(today);
  const isCard = (id: string) => cardIdsOf(data).has(id);
  const incomes: Income[] = data.incomes.filter(inMonth);
  const receitas = round2(sum(incomes, i => i.amount));
  const carry = (data.carry && data.carry[month]) || 0;
  const catById = Object.fromEntries(data.categories.map(c => [c.id, c]));
  const third = thirdIdsOf(data);
  const mine = (categoryId: string) => !third.has(categoryId);

  const txs = data.txs.filter(inMonth);
  const parcels = data.installments.map(i => ({ ...i, ...parcelInfo(i, month) })).filter(i => i.active);
  const bills: MonthBill[] = billsFor(data, month, today);
  const closeDayOf = (cardId: string) => (data.cards.find(c => c.id === cardId) || { closeDay: 1 }).closeDay;

  const allExpenses: Expense[] = [
    ...txs.map(x => ({ src: "tx" as const, id: x.id, date: x.date, desc: x.desc, categoryId: x.categoryId, amount: x.amount, method: x.method, ref: x })),
    ...parcels.map(p => ({ src: "parcel" as const, id: p.id, date: dateIn(month, closeDayOf(p.cardId)), desc: p.desc + " " + p.idx + "/" + p.n, categoryId: p.categoryId, amount: p.amount, method: p.cardId, ref: p })),
    ...bills.filter(b => b.status === "paga").map(b => ({ src: "bill" as const, id: b.id, date: b.date, desc: b.name, categoryId: b.categoryId, amount: b.amount, method: b.method, ref: b })),
  ];
  // Gastos de outras pessoas ficam fora de todas as métricas (gastos, orçamento, gráficos, insights).
  const expenses = allExpenses.filter(e => mine(e.categoryId));
  const gastos = round2(sum(expenses, e => e.amount));
  // De onde vieram os gastos do mês (para o resumo do Início).
  const cardSet = cardIdsOf(data);
  const gastosOrigem = {
    cartao: round2(sum(expenses.filter(e => cardSet.has(e.method) && !(e.src === "tx" && (e.ref as Tx).kind === "compartilhado")), e => e.amount)),
    conta: round2(sum(expenses.filter(e => e.src === "tx" && !cardSet.has(e.method) && (e.ref as Tx).kind !== "compartilhado"), e => e.amount)),
    contas: round2(sum(expenses.filter(e => e.src === "bill" && !cardSet.has(e.method)), e => e.amount)),
    outros: round2(sum(expenses.filter(e => e.src === "tx" && (e.ref as Tx).kind === "compartilhado"), e => e.amount)),
  };

  const byCat: Record<string, number> = {};
  expenses.forEach(e => { byCat[e.categoryId] = (byCat[e.categoryId] || 0) + e.amount; });

  const pendingBills = bills.filter(b => b.status !== "paga");
  const contasAVencer = round2(sum(pendingBills, b => b.amount));
  // O que você ainda deve para cada pessoa até o fim do mês fica reservado no livre.
  const devedor = debtsFor(data, dateIn(month, dim(month)));
  const reembolsos = devedor.filter(p => p.owed > 0).map(p => ({ desc: p.name, amount: p.owed }));
  const reembolsoTotal = round2(sum(reembolsos, x => x.amount));
  const repaid: Repayment[] = data.repayments.filter(inMonth);

  const cards: MonthCard[] = data.cards.map(c => {
    const items = invoiceItems(data, c, month, today);
    const fatura = round2(sum(items, i => i.amount));
    const faturaTerceiros = round2(sum(items.filter(i => !mine(i.categoryId)), i => i.amount));
    const futuro = round2(sum(data.installments.filter(i => i.cardId === c.id), i => { const pi = parcelInfo(i, month); return pi.idx < 1 ? i.n * i.amount : pi.remaining * i.amount; }));
    const usado = round2(fatura + futuro);
    const due = dateIn(addMonths(month, 1), c.dueDay);
    return { ...c, caixinha: 0, restante: fatura, fatura, faturaMinha: round2(fatura - faturaTerceiros), faturaTerceiros, futuro, usado, disponivel: round2(c.limit - usado), ratio: c.limit ? usado / c.limit : 0, due, items };
  });
  // faturas = só a sua parte; faturasTotal = o valor real que vem na fatura.
  const faturas = round2(sum(cards, c => c.faturaMinha));
  const faturasTotal = round2(sum(cards, c => c.fatura));
  const cardPaid: CardPayment[] = data.cardPayments.filter(inMonth);
  // Fatura do mês anterior vence neste mês; o que ainda não foi pago também tem dono.
  const prevMonth = addMonths(month, -1);
  // Dinheiro que Mãe/Pai te devolveram neste mês: entra na conta, mas não é receita.
  const personReceived = data.personPayments.filter(inMonth);
  const terceiros = thirdPartyFor(data, month, today);
  // Reservado para as faturas = valor real menos o que outras pessoas ainda te devem.
  // Antes delas pagarem, sobra só a sua parte; quando pagam, o dinheiro delas entra na conta e fica reservado aqui.
  // Por cartão: a caixinha abate da próxima fatura a vencer. A anterior só recebe a caixinha
  // enquanto ainda não venceu; depois do vencimento, tudo vai para a fatura atual.
  // O que ela cobre não sai do saldo da conta, então não é descontado do livre.
  const prevThird = thirdPartyFor(data, prevMonth, today);
  const owedOn = (list: ThirdParty[], cardId: string) => sum(list, t => t.owedByCard[cardId] || 0);
  const invoices: CardInvoiceStatus[] = cards.map(k => {
    const box = round2(Math.max(0, sum(data.boxes.filter(b => b.cardId === k.id), b => b.amount)));
    const prevOwedK = round2(owedOn(prevThird, k.id));
    const prevOpen = round2(Math.max(0, cardInvoice(data, k, prevMonth, today) - sum(cardPaid.filter(p => p.cardId === k.id), p => p.amount) - prevOwedK));
    const cur = round2(Math.max(0, k.fatura - owedOn(terceiros, k.id)));
    const coveredPrev = today <= dateIn(month, k.dueDay) ? round2(Math.min(box, prevOpen)) : 0;
    const coveredCur = round2(Math.min(box - coveredPrev, cur));
    return { cardId: k.id, box, prevOpen, prevOwed: prevOwedK, coveredPrev, cur, coveredCur, sobra: round2(box - coveredPrev - coveredCur) };
  });
  cards.forEach(k => { const st = invoices.find(i => i.cardId === k.id)!; k.caixinha = st.coveredCur; k.restante = round2(Math.max(0, k.faturaMinha - st.coveredCur)); });
  const faturasReservadas = round2(sum(invoices, i => i.cur - i.coveredCur));
  const faturasAbertas = round2(sum(invoices, i => i.prevOpen - i.coveredPrev));
  const caixinhasNasFaturas = round2(sum(invoices, i => i.coveredPrev + i.coveredCur));
  const caixinhas = round2(sum(data.boxes, b => b.amount));
  // Faturas que vencem NESTE mês (compras do mês anterior), por cartão: é o que entra no livre do mês.
  const faturasDoMes = cards.map(k => {
    const st = invoices.find(i => i.cardId === k.id)!;
    return {
      id: k.id, name: k.name, color: k.color, due: dateIn(month, k.dueDay),
      total: cardInvoice(data, k, prevMonth, today), mine: cardInvoice(data, k, prevMonth, today, true),
      paid: round2(sum(cardPaid.filter(p => p.cardId === k.id), p => p.amount)), box: st.coveredPrev, aPagar: round2(st.prevOpen - st.coveredPrev),
    };
  });

  const contribs: Contribution[] = data.contributions.filter(inMonth);
  const guardado = round2(sum(contribs, c => c.amount));
  const metaGuardar = round2(receitas * (data.settings.savePct || 0) / 100);
  const faltaGuardar = round2(Math.max(0, metaGuardar - guardado));

  const cashOutTx = txs.filter(x => !isCard(x.method) && !(x.kind === "compartilhado" && x.status === "pendente"));
  const cashOutBills = bills.filter(b => b.status === "paga" && !isCard(b.method));
  // Compras compartilhadas pendentes não saem da conta; o que sai é o dinheiro que você devolve (repayments).
  const saidas = round2(sum(cashOutTx, x => x.amount) + sum(cashOutBills, b => b.amount) + guardado + sum(cardPaid, p => p.amount - (p.fromBox || 0)) + sum(repaid, r => r.amount));
  const emConta = round2(carry + receitas + sum(personReceived, p => p.amount) - saidas);
  // Do cartão, o livre do mês só desconta a fatura que vence NESTE mês (compras do mês anterior) e ainda não foi paga.
  // A fatura das compras deste mês vence no mês seguinte e entra no livre de lá (faturasReservadas fica só como informação).
  const livre = round2(emConta - faturasAbertas - contasAVencer - sum(reembolsos, x => x.amount) - faltaGuardar);

  const days = dim(month);
  const daysLeft = month === tm ? days - dayOf(today) + 1 : month > tm ? days : 0;
  const porDia = daysLeft > 0 ? round2(Math.max(0, livre) / daysLeft) : 0;

  const budgets: Budget[] = data.categories.filter(c => mine(c.id)).map(c => {
    const limit = budgetLimit(c, receitas);
    const spent = round2(byCat[c.id] || 0);
    const pend = round2(sum(pendingBills.filter(b => b.categoryId === c.id), b => b.amount));
    const ratio = limit > 0 ? spent / limit : (spent > 0 ? 1.01 : 0);
    return { cat: c, limit, spent, pend, ratio, rest: round2(limit - spent), state: stateOf(ratio) };
  });
  const orcado = round2(sum(budgets, b => b.limit));

  const expected: Expected[] = [];
  data.sources.forEach(s => {
    const got = incomes.filter(i => i.sourceId === s.id).length;
    const per = round2(s.expected / (s.days.length || 1));
    s.days.slice(got).forEach(d => expected.push({ source: s, date: dateIn(month, d), amount: per }));
  });
  const aReceber = round2(sum(expected, e => e.amount));
  const bySource = data.sources.map(s => ({ source: s, amount: round2(sum(incomes.filter(i => i.sourceId === s.id), i => i.amount)) }));
  // Entradas sem fonte (Pix da avó, presente...) aparecem juntas como "Outras entradas".
  const avulsas = round2(sum(incomes.filter(i => !data.sources.some(s => s.id === i.sourceId)), i => i.amount));
  if (avulsas > 0) bySource.push({ source: { id: "_avulsa", name: "Outras entradas", icon: "gift", expected: 0, days: [], kind: "variavel", freq: "eventual" }, amount: avulsas });

  const prev = addMonths(month, -1);
  return {
    month, today, tm, receitas, carry, incomes, txs, expenses, gastos, byCat, catById, bills, pendingBills, contasAVencer,
    reembolsos, reembolsoTotal, repaid, cards, faturas, faturasTotal, faturasReservadas, faturasAbertas, invoices, caixinhasNasFaturas, caixinhas, cardPaid, personReceived, terceiros, contribs, guardado, metaGuardar, faltaGuardar, emConta, livre,
    days, daysLeft, porDia, budgets, orcado, expected, aReceber, bySource, parcels, prev, faturasDoMes, gastosOrigem,
  };
}

export function futureCommitments(data: Data, month: string, n: number) {
  const out: { m: string; total: number }[] = [];
  for (let k = 1; k <= n; k++) {
    const m = addMonths(month, k);
    const items = data.installments.map(i => ({ ...i, ...parcelInfo(i, m) })).filter(i => i.active);
    out.push({ m, total: round2(sum(items, i => i.amount)) });
  }
  return out;
}

export type GoalStats = { saved: number; left: number; ratio: number; monthsLeft: number | null; needed: number | null; eta: number | null; etaMonth: string | null; onTrack: boolean };
export function goalStats(goal: Goal, data: Data, month: string): GoalStats {
  const saved = round2((goal.base || 0) + sum(data.contributions.filter(c => c.goalId === goal.id && ym(c.date) <= month), c => c.amount));
  const left = Math.max(0, goal.target - saved);
  const monthsLeft = goal.deadline ? Math.max(1, monthDiff(month, goal.deadline)) : null;
  const needed = monthsLeft ? round2(left / monthsLeft) : null;
  const eta = goal.monthly > 0 ? Math.ceil(left / goal.monthly) : null;
  return { saved, left, ratio: goal.target ? saved / goal.target : 0, monthsLeft, needed, eta, etaMonth: eta != null ? addMonths(month, eta) : null, onTrack: needed != null && goal.monthly >= needed };
}

export type Point = { d: number; v: number };
export function dailySeries(data: Data, c: Month) {
  const n = c.days;
  const isCard = (id: string) => cardIdsOf(data).has(id);
  const ev = Array.from({ length: n + 1 }, () => 0);
  const add = (d: string, v: number) => { const k = dayOf(d); if (k >= 1 && k <= n) ev[k] += v; };
  c.incomes.forEach(i => add(i.date, i.amount));
  c.txs.filter(x => !isCard(x.method) && !(x.kind === "compartilhado" && x.status === "pendente")).forEach(x => add(x.date, -x.amount));
  c.repaid.forEach(r => add(r.date, -r.amount));
  c.bills.filter(b => b.status === "paga" && !isCard(b.method)).forEach(b => add(b.date, -b.amount));
  c.contribs.forEach(x => add(x.date, -x.amount));
  c.cardPaid.forEach(x => add(x.date, -(x.amount - (x.fromBox || 0))));
  c.personReceived.forEach(x => add(x.date, x.amount));
  const todayD = c.month === c.tm ? dayOf(c.today) : (c.month < c.tm ? n : 0);
  const actual: Point[] = [];
  let bal = c.carry;
  for (let d = 1; d <= n; d++) { bal += ev[d]; if (d <= todayD) actual.push({ d, v: round2(bal) }); }
  const proj: Point[] = [];
  if (todayD < n) {
    const pev = Array.from({ length: n + 1 }, () => 0);
    c.expected.forEach(e => { const k = Math.max(dayOf(e.date), todayD + 1); pev[k] += e.amount; });
    c.pendingBills.forEach(b => { const k = Math.max(dayOf(b.date), todayD + 1); pev[Math.min(k, n)] -= b.amount; });
    c.reembolsos.forEach(x => { pev[Math.min(todayD + 1, n)] -= x.amount; });
    data.cards.forEach(k => {
      const st = c.invoices.find(i => i.cardId === k.id);
      const open = st ? st.prevOpen - st.coveredPrev + st.prevOwed : 0;
      if (open > 0) pev[Math.min(Math.max(k.dueDay, todayD + 1), n)] -= open;
    });
    // O que Mãe/Pai ainda devem da fatura que vence este mês deve voltar para a conta.
    thirdPartyFor(data, c.prev, c.today).forEach(t => { if (t.falta > 0) pev[Math.min(todayD + 1, n)] += t.falta; });
    const extraSave = round2(c.faltaGuardar + (c.aReceber * (data.settings.savePct || 0) / 100));
    pev[n] -= extraSave;
    let pb = todayD > 0 ? actual[actual.length - 1].v : c.carry;
    if (todayD > 0) proj.push({ d: todayD, v: pb });
    for (let d = Math.max(todayD + 1, 1); d <= n; d++) { pb += pev[d]; proj.push({ d, v: round2(pb) }); }
  }
  const endProj = proj.length ? proj[proj.length - 1].v : (actual.length ? actual[actual.length - 1].v : c.carry);
  return { actual, proj, endProj: round2(endProj) };
}

export type InsightItem = { tone: Tone; icon: string; text: string };
export function insightsFor(data: Data, c: Month): InsightItem[] {
  const out: InsightItem[] = [];
  const prevC = compute(data, c.prev, c.today);
  const prevName = MONTHS[Number(c.prev.slice(5)) - 1];
  if (prevC.gastos > 0 && c.month === c.tm) {
    const frac = dayOf(c.today) / c.days;
    const top = c.budgets.filter(b => (prevC.byCat[b.cat.id] || 0) > 0).map(b => ({ b, d: b.spent / prevC.byCat[b.cat.id] - 1 })).sort((a, z) => z.d - a.d)[0];
    if (top && top.d > 0.1) out.push({ tone: "warning", icon: "trendUp", text: "Você gastou " + pct(top.d) + " a mais com " + top.b.cat.name.toLowerCase() + " do que em " + prevName + "." });
    const diff = c.gastos / prevC.gastos - 1;
    out.push(diff <= 0
      ? { tone: "positive", icon: "trendDown", text: "Até agora você gastou " + pct(-diff) + " menos que no mês passado inteiro." }
      : { tone: frac < 0.9 ? "warning" : "neutral", icon: "trendUp", text: "Seus gastos já passaram o total de " + prevName + " em " + pct(diff) + "." });
  }
  const over = c.budgets.filter(b => b.ratio > 1).sort((a, z) => z.ratio - a.ratio)[0];
  if (over) out.push({ tone: "negative", icon: "alert", text: "Você ultrapassou o limite de " + over.cat.name.toLowerCase() + " em " + fmt(-over.rest) + "." });
  const near = c.budgets.filter(b => b.ratio >= 0.7 && b.ratio <= 1).sort((a, z) => z.ratio - a.ratio)[0];
  if (near) out.push({ tone: near.ratio >= 0.9 ? "caution" : "warning", icon: "info", text: "Você já usou " + pct(near.ratio) + " do orçamento de " + near.cat.name.toLowerCase() + "." });
  const futTotal = sum(futureCommitments(data, c.month, 12), f => f.total);
  if (futTotal > 0) out.push({ tone: "neutral", icon: "layers", text: "Você tem " + fmt(futTotal) + " comprometidos em parcelas futuras." });
  if (c.daysLeft > 0 && c.livre > 0) out.push({ tone: "positive", icon: "bulb", text: "Dá para gastar cerca de " + fmt(c.porDia, false) + " por dia até o fim do mês sem sair do plano." });
  if (c.faltaGuardar > 0) {
    const g = data.goals[0];
    if (g) {
      const gs = goalStats(g, data, c.month);
      const inc = g.target ? c.faltaGuardar / g.target : 0;
      out.push({ tone: "neutral", icon: "target", text: "Guardando mais " + fmt(c.faltaGuardar, false) + " este mês, " + g.name.toLowerCase() + " fica " + pct(inc) + " mais perto (hoje em " + pct(gs.ratio) + ")." });
    }
  }
  return out;
}

export type SpendRow = { id: string; label: string; value: number; color: string; fixed?: boolean };
export function spendRows(c: Month, topN = 5): SpendRow[] {
  const rows = c.budgets.filter(b => b.spent > 0).map(b => ({ id: b.cat.id, label: b.cat.name, value: b.spent, color: catColor(b.cat), fixed: b.cat.color !== "other" })).sort((a, z) => z.value - a.value);
  const main: SpendRow[] = rows.filter(r => r.fixed).slice(0, topN);
  const rest = rows.filter(r => !main.includes(r));
  if (rest.length) main.push({ id: "_outros", label: rest.length === 1 ? rest[0].label : "Outras (" + rest.length + ")", value: round2(sum(rest, r => r.value)), color: "var(--chart-other)" });
  return main;
}

// Fatura do mês anterior (a que vence neste mês) e se já foi paga.
export function dueInvoices(data: Data, c: Month) {
  return data.cards.map(card => {
    const fatura = cardInvoice(data, card, c.prev, c.today);
    const paid = c.cardPaid.filter(p => p.cardId === card.id);
    const st = c.invoices.find(i => i.cardId === card.id);
    return { card, fatura, due: dateIn(c.month, card.dueDay), paid: round2(sum(paid, p => p.amount)), payments: paid, fromBox: st ? st.coveredPrev : 0, box: st ? st.box : 0 };
  });
}
