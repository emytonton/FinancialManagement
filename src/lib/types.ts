// Formato dos dados trocados entre o front e a API.
// Datas são sempre texto: dia "AAAA-MM-DD", mês "AAAA-MM".

export type Tone = "neutral" | "primary" | "positive" | "warning" | "caution" | "negative";
export type Route = "dashboard" | "transacoes" | "cartoes" | "caixinhas" | "orcamento" | "metas" | "calendario" | "receitas" | "config";
export type CatColor = "chart1" | "chart2" | "chart3" | "chart4" | "chart5" | "chart6" | "other";
export type CardColor = "nubank" | "mp";

export interface Category { id: string; name: string; icon: string; color: CatColor; mode: "fixo" | "pct"; limit: number; pct: number; thirdParty?: boolean }
export interface Tx {
  id: string; date: string; desc: string; categoryId: string; method: string; amount: number;
  kind: "pessoal" | "compartilhado"; total?: number; paidBy?: string; status?: "pendente" | "reembolsado";
}
export interface Source { id: string; name: string; icon: string; expected: number; days: number[]; kind: "fixa" | "variavel"; freq: "mensal" | "quinzenal" | "eventual" }
export interface Income { id: string; sourceId: string; date: string; amount: number; note: string }
export interface Bill { id: string; name: string; amount: number; day: number; categoryId: string; method: string; paid: Record<string, boolean> }
export interface CreditCard { id: string; name: string; limit: number; closeDay: number; dueDay: number; color: CardColor }
// fromBox = parte paga com a caixinha do cartão (não sai do saldo da conta).
export interface CardPayment { id: string; cardId: string; date: string; amount: number; fromBox?: number }
// Caixinha: dinheiro separado, fora do saldo da conta. Com cardId, está reservado para a fatura desse cartão.
export interface Box { id: string; name: string; icon: string; amount: number; cardId?: string }
// start = mês da 1ª parcela (fatura). Com date (dia da compra), start é recalculado pelo fechamento do cartão.
export interface Installment { id: string; desc: string; cardId: string; categoryId: string; amount: number; n: number; start: string; date?: string }
export interface Goal { id: string; name: string; icon: string; target: number; base: number; deadline: string; monthly: number }
export interface Contribution { id: string; goalId: string; date: string; amount: number }
// Dinheiro que quem usa uma categoria de terceiro (Mãe, Pai) te devolveu; month = mês dos gastos cobertos.
export interface PersonPayment { id: string; categoryId: string; month: string; date: string; amount: number }
export interface HistoryRow { m: string; receitas: number; gastos: number; guardado?: number }

export interface Settings {
  name: string; savePct: number; theme: "light" | "dark" | "auto"; lock: boolean; pin?: string; demo: boolean; demoToday: string;
}

export interface Data {
  version: 1;
  settings: Settings;
  carry: Record<string, number>;
  categories: Category[]; sources: Source[]; incomes: Income[]; txs: Tx[]; bills: Bill[];
  cards: CreditCard[]; cardPayments: CardPayment[]; installments: Installment[];
  goals: Goal[]; contributions: Contribution[]; personPayments: PersonPayment[]; boxes: Box[]; history: HistoryRow[];
}

export type Collection = "categories" | "sources" | "incomes" | "txs" | "bills" | "cards" | "cardPayments" | "installments" | "goals" | "contributions" | "personPayments" | "boxes";

export type ItemOf<C extends Collection> = Data[C][number];
