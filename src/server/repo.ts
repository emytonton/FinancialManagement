import "server-only";
import type { z } from "zod";
import { prisma } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { dataSchema, type CollectionName, type schemas } from "./schemas";
import type { Data, Settings } from "@/lib/types";
import { emptyData } from "@/lib/finance";

// Conversão entre as linhas do banco e o formato do front.
// Dinheiro é Decimal no banco e number no front; datas são @db.Date no banco
// e "AAAA-MM-DD" no front (sempre em UTC para não andar um dia com fuso).

const num = (d: Prisma.Decimal | number | null | undefined) => (d == null ? 0 : Number(d));
const toDay = (d: Date) => d.toISOString().slice(0, 10);
const fromDay = (s: string) => new Date(s + "T00:00:00Z");

type Input<C extends CollectionName> = z.infer<(typeof schemas)[C]>;

/* eslint-disable @typescript-eslint/no-explicit-any */
// Cada coleção sabe: qual tabela usar, como gravar e como ler.
type Client = Prisma.TransactionClient;

const tables = {
  categories: {
    model: (db: Client) => db.category,
    toDb: (x: Input<"categories">) => x,
    fromDb: (r: any) => ({ id: r.id, name: r.name, icon: r.icon, color: r.color, mode: r.mode, limit: num(r.limit), pct: num(r.pct), thirdParty: r.thirdParty }),
  },
  sources: {
    model: (db: Client) => db.source,
    toDb: (x: Input<"sources">) => x,
    fromDb: (r: any) => ({ id: r.id, name: r.name, icon: r.icon, expected: num(r.expected), days: r.days, kind: r.kind, freq: r.freq }),
  },
  incomes: {
    model: (db: Client) => db.income,
    toDb: (x: Input<"incomes">) => ({ ...x, date: fromDay(x.date) }),
    fromDb: (r: any) => ({ id: r.id, sourceId: r.sourceId, date: toDay(r.date), amount: num(r.amount), note: r.note }),
  },
  txs: {
    model: (db: Client) => db.transaction,
    toDb: (x: Input<"txs">) => ({
      id: x.id, date: fromDay(x.date), desc: x.desc, categoryId: x.categoryId, method: x.method, amount: x.amount, kind: x.kind,
      total: x.kind === "compartilhado" ? x.total ?? null : null,
      paidBy: x.kind === "compartilhado" ? x.paidBy ?? null : null,
      status: x.kind === "compartilhado" ? x.status ?? null : null,
    }),
    fromDb: (r: any) => {
      const t: any = { id: r.id, date: toDay(r.date), desc: r.desc, categoryId: r.categoryId, method: r.method, amount: num(r.amount), kind: r.kind };
      if (r.kind === "compartilhado") Object.assign(t, { total: num(r.total), paidBy: r.paidBy ?? "", status: r.status ?? "pendente" });
      return t;
    },
  },
  bills: {
    model: (db: Client) => db.bill,
    toDb: ({ paid, ...x }: Input<"bills">) => ({ ...x, paidMonths: Object.keys(paid).filter(m => paid[m]).sort() }),
    fromDb: (r: any) => ({
      id: r.id, name: r.name, amount: num(r.amount), day: r.day, categoryId: r.categoryId, method: r.method,
      paid: Object.fromEntries((r.paidMonths as string[]).map(m => [m, true])),
    }),
  },
  cards: {
    model: (db: Client) => db.card,
    toDb: (x: Input<"cards">) => x,
    fromDb: (r: any) => ({ id: r.id, name: r.name, limit: num(r.limit), closeDay: r.closeDay, dueDay: r.dueDay, color: r.color }),
  },
  cardPayments: {
    model: (db: Client) => db.cardPayment,
    toDb: (x: Input<"cardPayments">) => ({ ...x, date: fromDay(x.date) }),
    fromDb: (r: any) => ({ id: r.id, cardId: r.cardId, date: toDay(r.date), amount: num(r.amount), fromBox: num(r.fromBox) }),
  },
  installments: {
    model: (db: Client) => db.installment,
    toDb: (x: Input<"installments">) => ({ ...x, date: x.date ? fromDay(x.date) : null }),
    fromDb: (r: any) => ({ id: r.id, desc: r.desc, cardId: r.cardId, categoryId: r.categoryId, amount: num(r.amount), n: r.n, start: r.start, ...(r.date ? { date: toDay(r.date) } : {}) }),
  },
  goals: {
    model: (db: Client) => db.goal,
    toDb: (x: Input<"goals">) => ({ ...x, deadline: x.deadline || null }),
    fromDb: (r: any) => ({ id: r.id, name: r.name, icon: r.icon, target: num(r.target), base: num(r.base), deadline: r.deadline ?? "", monthly: num(r.monthly) }),
  },
  contributions: {
    model: (db: Client) => db.contribution,
    toDb: (x: Input<"contributions">) => ({ ...x, date: fromDay(x.date) }),
    fromDb: (r: any) => ({ id: r.id, goalId: r.goalId, date: toDay(r.date), amount: num(r.amount) }),
  },
  personPayments: {
    model: (db: Client) => db.personPayment,
    toDb: (x: Input<"personPayments">) => ({ ...x, date: fromDay(x.date) }),
    fromDb: (r: any) => ({ id: r.id, categoryId: r.categoryId, month: r.month, date: toDay(r.date), amount: num(r.amount) }),
  },
  boxes: {
    model: (db: Client) => db.box,
    toDb: (x: Input<"boxes">) => ({ ...x, cardId: x.cardId || null }),
    fromDb: (r: any) => ({ id: r.id, name: r.name, icon: r.icon, amount: num(r.amount), ...(r.cardId ? { cardId: r.cardId } : {}) }),
  },
} as const;

type AnyDelegate = {
  findMany(args: any): Promise<any[]>;
  upsert(args: any): Promise<any>;
  deleteMany(args: any): Promise<any>;
  createMany(args: any): Promise<any>;
};
const model = (c: CollectionName, db: Client = prisma) => tables[c].model(db) as unknown as AnyDelegate;
const toDb = (c: CollectionName, x: any) => (tables[c].toDb as (v: any) => any)(x);
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function upsertItem<C extends CollectionName>(c: C, item: Input<C>) {
  const row = toDb(c, item);
  const { id, ...rest } = row;
  await model(c).upsert({ where: { id }, create: row, update: rest });
}

export async function deleteItem(c: CollectionName, id: string) {
  await model(c).deleteMany({ where: { id } });
}

function settingsFromDb(s: { name: string; savePct: number; theme: string; lock: boolean; pin: string | null; demo: boolean; demoToday: string } | null): Settings {
  if (!s) return { name: "", savePct: 30, theme: "auto", lock: false, demo: false, demoToday: "2026-09-26" };
  return { name: s.name, savePct: s.savePct, theme: s.theme as Settings["theme"], lock: s.lock, pin: s.pin ?? undefined, demo: s.demo, demoToday: s.demoToday };
}

export async function updateSettings(patch: Partial<Settings>) {
  await prisma.settings.upsert({ where: { id: 1 }, create: { id: 1, ...patch }, update: patch });
}

export async function setCarry(month: string, amount: number) {
  await prisma.carry.upsert({ where: { month }, create: { month, amount }, update: { amount } });
}

const ORDER = { orderBy: { seq: "asc" } } as const;

export async function loadData(): Promise<Data> {
  const [settings, carry, history, ...lists] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.carry.findMany(),
    prisma.history.findMany({ orderBy: { month: "asc" } }),
    ...(Object.keys(tables) as CollectionName[]).map(c => model(c).findMany(ORDER)),
  ]);
  const out = {
    version: 1 as const,
    settings: settingsFromDb(settings),
    carry: Object.fromEntries(carry.map(r => [r.month, num(r.amount)])),
    history: history.map(r => ({ m: r.month, receitas: num(r.receitas), gastos: num(r.gastos), guardado: num(r.guardado) })),
  } as Data;
  (Object.keys(tables) as CollectionName[]).forEach((c, i) => {
    (out as unknown as Record<string, unknown[]>)[c] = lists[i].map(tables[c].fromDb);
  });
  return out;
}

// Primeiro acesso: banco vazio ganha as categorias padrão.
export async function loadOrInit(): Promise<Data> {
  const exists = await prisma.settings.findUnique({ where: { id: 1 }, select: { id: true } });
  if (!exists) await replaceData(dataSchema.parse(emptyData()));
  return loadData();
}

// Substitui tudo de uma vez (importar backup, restaurar exemplo, apagar tudo).
// Numa transação: se algo falhar no meio, nada muda.
export async function replaceData(d: z.infer<typeof dataSchema>) {
  const names = Object.keys(tables) as CollectionName[];
  await prisma.$transaction(async db => {
    for (const c of names) await model(c, db).deleteMany({});
    await db.carry.deleteMany({});
    await db.history.deleteMany({});
    for (const c of names) {
      const rows = (d[c] as unknown[]).map(x => toDb(c, x));
      if (rows.length) await model(c, db).createMany({ data: rows });
    }
    const carry = Object.entries(d.carry);
    if (carry.length) await db.carry.createMany({ data: carry.map(([month, amount]) => ({ month, amount })) });
    if (d.history.length) await db.history.createMany({ data: d.history.map(h => ({ month: h.m, receitas: h.receitas, gastos: h.gastos, guardado: h.guardado ?? 0 })) });
    const { pin, ...s } = d.settings;
    await db.settings.upsert({ where: { id: 1 }, create: { id: 1, ...s, pin: pin ?? null }, update: { ...s, pin: pin ?? null } });
  }, { timeout: 30000 });
}
