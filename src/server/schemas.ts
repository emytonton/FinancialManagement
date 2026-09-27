import { z } from "zod";

// Validação de tudo que chega do front. Mesmo sendo só você usando,
// o banco não deve aceitar lixo (ex.: valor negativo, data inválida).

const id = z.string().min(1).max(64);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data AAAA-MM-DD");
const month = z.string().regex(/^\d{4}-\d{2}$/, "mês AAAA-MM");
const money = z.number().finite().min(0).max(1e9);
const text = (max = 120) => z.string().trim().max(max);
const dayOfMonth = z.number().int().min(1).max(31);
const catColor = z.enum(["chart1", "chart2", "chart3", "chart4", "chart5", "chart6", "other"]);

export const schemas = {
  categories: z.object({
    id, name: text(60).min(1), icon: text(30), color: catColor,
    mode: z.enum(["fixo", "pct"]), limit: money, pct: z.number().min(0).max(100),
    thirdParty: z.boolean().default(false),
  }),
  sources: z.object({
    id, name: text(60).min(1), icon: text(30), expected: money,
    days: z.array(dayOfMonth).max(31), kind: z.enum(["fixa", "variavel"]), freq: z.enum(["mensal", "quinzenal", "eventual"]),
  }),
  incomes: z.object({ id, sourceId: z.string().max(64), date: day, amount: money, note: text(200).default("") }),
  txs: z.object({
    id, date: day, desc: text(120).min(1), categoryId: z.string().max(64), method: text(64), amount: money,
    kind: z.enum(["pessoal", "compartilhado"]),
    total: money.optional(), paidBy: text(60).optional(), status: z.enum(["pendente", "reembolsado"]).optional(),
  }),
  bills: z.object({
    id, name: text(60).min(1), amount: money, day: dayOfMonth, categoryId: z.string().max(64), method: text(64),
    paid: z.record(month, z.boolean()),
    kind: z.enum(["conta", "assinatura"]).default("conta"),
    type: text(30).optional(),
    start: z.union([month, z.literal("")]).optional(),
    end: z.union([month, z.literal("")]).optional(),
    amounts: z.record(month, money).default({}),
  }),
  cards: z.object({
    id, name: text(40).min(1), limit: money, closeDay: dayOfMonth, dueDay: dayOfMonth, color: z.enum(["nubank", "mp"]),
  }),
  cardPayments: z.object({ id, cardId: z.string().max(64), date: day, amount: money, fromBox: money.default(0) }),
  installments: z.object({
    id, desc: text(120).min(1), cardId: z.string().max(64), categoryId: z.string().max(64),
    amount: money, n: z.number().int().min(1).max(72), start: month,
    date: z.union([day, z.literal("")]).optional(),
  }),
  goals: z.object({
    id, name: text(60).min(1), icon: text(30), target: money, base: money,
    deadline: z.union([month, z.literal("")]), monthly: money,
  }),
  contributions: z.object({ id, goalId: z.string().max(64), date: day, amount: money }),
  personPayments: z.object({ id, categoryId: z.string().max(64), month, date: day, amount: money }),
  boxes: z.object({ id, name: text(60).min(1), icon: text(30), amount: z.number().finite().min(-1e9).max(1e9), cardId: z.string().max(64).optional() }),
};

export const settingsPatch = z.object({
  name: text(40),
  savePct: z.number().int().min(0).max(100),
  theme: z.enum(["light", "dark", "auto"]),
  lock: z.boolean(),
  pin: z.string().regex(/^\d{4}$/).optional(),
  demo: z.boolean(),
  demoToday: day,
}).partial();

export const carryBody = z.object({ amount: z.number().finite().min(-1e9).max(1e9) });

export const dataSchema = z.object({
  version: z.literal(1),
  settings: settingsPatch.required({ savePct: true }).extend({ name: text(40).default("") }),
  carry: z.record(month, z.number().finite()),
  categories: z.array(schemas.categories),
  sources: z.array(schemas.sources),
  incomes: z.array(schemas.incomes),
  txs: z.array(schemas.txs),
  bills: z.array(schemas.bills),
  cards: z.array(schemas.cards),
  cardPayments: z.array(schemas.cardPayments),
  installments: z.array(schemas.installments),
  goals: z.array(schemas.goals),
  contributions: z.array(schemas.contributions),
  // Backups antigos não têm esse campo.
  personPayments: z.array(schemas.personPayments).default([]),
  boxes: z.array(schemas.boxes).default([]),
  history: z.array(z.object({ m: month, receitas: money, gastos: money, guardado: money.optional() })),
});

export type CollectionName = keyof typeof schemas;
export const isCollection = (c: string): c is CollectionName => c in schemas;
