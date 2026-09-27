// Datas como texto ("AAAA-MM-DD" e "AAAA-MM") e dinheiro em pt-BR.

export const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const MONTHS_S = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const WEEK = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");
export const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "").slice(0, 12) : Math.random().toString(36).slice(2, 14));
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const sum = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((s, x) => s + f(x), 0);
export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export const pad = (n: number) => String(n).padStart(2, "0");
export const ym = (d: string) => d.slice(0, 7);
export const dim = (m: string) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); };
export const addMonths = (m: string, k: number) => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 1 + k, 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1); };
export const monthDiff = (a: string, b: string) => { const [ya, ma] = a.split("-").map(Number); const [yb, mb] = b.split("-").map(Number); return (yb - ya) * 12 + (mb - ma); };
export const monthLabel = (m: string) => { const [y, mo] = m.split("-").map(Number); return MONTHS[mo - 1] + " " + y; };
export const monthName = (m: string) => MONTHS[Number(m.slice(5, 7)) - 1];
export const monthShort = (m: string) => MONTHS_S[Number(m.slice(5, 7)) - 1];
export const ddmm = (d: string) => d.slice(8, 10) + "/" + d.slice(5, 7);
export const dayOf = (d: string) => Number(d.slice(8, 10));
export const dateIn = (m: string, day: number) => m + "-" + pad(Math.min(day, dim(m)));
export const isoToday = () => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
export const weekday = (d: string) => WEEK[new Date(d + "T12:00:00").getDay()];
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const BRL0 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0, minimumFractionDigits: 0 });
export const fmt = (v: number, cents = true) => (cents ? BRL : BRL0).format(v).replace(/\s/g, " ");
export const pct = (v: number) => Math.round(v * 100) + "%";
