"use client";
// Estado do app no navegador + sincronização com a API.
// Toda alteração aparece na tela na hora (otimista) e é enviada ao servidor;
// se o servidor recusar, avisa e recarrega os dados verdadeiros.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { compute, installmentStart, methodsOf, type Month } from "@/lib/finance";
import { dateIn, isoToday, ym } from "@/lib/format";
import type { Collection, Data, ItemOf, Route, Settings } from "@/lib/types";

export const ROUTE_PATHS: Record<Route, string> = {
  dashboard: "/", transacoes: "/transacoes", cartoes: "/cartoes", caixinhas: "/caixinhas", orcamento: "/orcamento",
  metas: "/metas", calendario: "/calendario", receitas: "/receitas", config: "/config",
};

export type AddTab = "gasto" | "receita" | "aporte";
export type FormKind = "category" | "source" | "bill" | "card" | "installment" | "goal" | "income" | "contribution" | "personPayment" | "box";
export type AddState = { tab: AddTab; preset?: Record<string, unknown>; edit?: { tab: AddTab; item: Record<string, unknown> } } | null;
export type FormState = { kind: FormKind; item?: Record<string, unknown>; preset?: Record<string, unknown> } | null;
export type DeleteState = { coll: Collection; id: string; label: string } | null;

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function call(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (res.status === 401) {
    // Recarga completa de propósito: descarta o estado em memória da sessão expirada.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
    throw new ApiError(401, "Sessão expirada");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, json?.error || "Erro " + res.status);
  return json;
}

// "Ocultar valores" vale por aparelho: fica no localStorage, não no servidor.
const HIDE_KEY = "bolso:hide";
const hideStore = {
  subscribe(cb: () => void) {
    window.addEventListener("storage", cb);
    window.addEventListener(HIDE_KEY, cb);
    return () => { window.removeEventListener("storage", cb); window.removeEventListener(HIDE_KEY, cb); };
  },
  get() { try { return localStorage.getItem(HIDE_KEY) === "1"; } catch { return false; } },
  set(v: boolean) {
    try { localStorage.setItem(HIDE_KEY, v ? "1" : "0"); } catch { /* sem storage */ }
    window.dispatchEvent(new Event(HIDE_KEY));
  },
};

function useStoreValue(initialData: Data) {
  const router = useRouter();
  const [raw, setData] = useState<Data>(initialData);
  // O mês da 1ª parcela sai da data da compra + fechamento do cartão (muda junto se você editar o cartão).
  const data = useMemo<Data>(() => ({ ...raw, installments: raw.installments.map(i => ({ ...i, start: installmentStart(raw, i) })) }), [raw]);
  const today = data.settings.demo ? data.settings.demoToday : isoToday();
  const [month, setMonth] = useState(ym(today));
  const hide = useSyncExternalStore(hideStore.subscribe, hideStore.get, () => false);
  const [add, setAdd] = useState<AddState>(null);
  const [form, setForm] = useState<FormState>(null);
  const [del, setDel] = useState<DeleteState>(null);
  const [toastMsg, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(0);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => { if (!toastMsg) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toastMsg]);

  const reload = useCallback(async () => {
    try { setData(await call("GET", "/api/data")); } catch { /* 401 já redireciona */ }
  }, []);

  // Envia ao servidor; em caso de erro, avisa e volta ao estado do servidor.
  const sync = useCallback((p: () => Promise<unknown>) => {
    setSaving(s => s + 1);
    p().catch(e => {
      if (e instanceof ApiError && e.status === 401) return;
      setToast("Não foi possível salvar: " + (e?.message || "sem conexão") + ". Recarregando.");
      reload();
    }).finally(() => setSaving(s => s - 1));
  }, [reload]);

  // Para campos digitados (nome, saldo inicial, % guardar): espera parar de digitar.
  const debounced = useCallback((key: string, p: () => Promise<unknown>, ms = 600) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => sync(p), ms);
  }, [sync]);

  const upsert = useCallback(<C extends Collection>(coll: C, item: ItemOf<C>) => {
    setData(d => {
      const list = d[coll] as ItemOf<C>[];
      const i = list.findIndex(x => x.id === item.id);
      const next = i >= 0 ? list.map((x, k) => (k === i ? item : x)) : [...list, item];
      return { ...d, [coll]: next };
    });
    sync(() => call("PUT", `/api/${coll}/${encodeURIComponent(item.id)}`, item));
  }, [sync]);

  const remove = useCallback((coll: Collection, id: string) => {
    setData(d => ({ ...d, [coll]: (d[coll] as { id: string }[]).filter(x => x.id !== id) }));
    sync(() => call("DELETE", `/api/${coll}/${encodeURIComponent(id)}`));
  }, [sync]);

  const setSettings = useCallback((patch: Partial<Settings>, opts: { debounce?: boolean } = {}) => {
    setData(d => ({ ...d, settings: { ...d.settings, ...patch } }));
    if ("theme" in patch) { try { localStorage.setItem("bolso:theme", patch.theme!); } catch { /* sem storage */ } }
    const send = () => call("PATCH", "/api/settings", patch);
    if (opts.debounce) debounced("settings:" + Object.keys(patch).join(","), send);
    else sync(send);
  }, [sync, debounced]);

  const setCarry = useCallback((m: string, v: number) => {
    setData(d => ({ ...d, carry: { ...d.carry, [m]: v } }));
    debounced("carry:" + m, () => call("PUT", `/api/carry/${m}`, { amount: v }));
  }, [debounced]);

  const replace = useCallback(async (d: Data) => {
    const saved: Data = await call("PUT", "/api/data", d);
    setData(saved);
    setMonth(ym(saved.settings.demo ? saved.settings.demoToday : isoToday()));
  }, []);

  const setHide = useCallback((v: boolean) => hideStore.set(v), []);

  const c: Month = useMemo(() => compute(data, month, today), [data, month, today]);
  const methods = useMemo(() => methodsOf(data), [data]);

  return {
    data, c, month, setMonth, today, hide, setHide, saving: saving > 0,
    defaultDate: month === ym(today) ? today : dateIn(month, 1),
    methods,
    methodName: (id: string) => methods.find(m => m.id === id)?.name ?? id,
    isCard: (id: string) => data.cards.some(k => k.id === id),
    go: (r: Route, params?: Record<string, string>) => {
      const q = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : "";
      router.push(ROUTE_PATHS[r] + (q ? "?" + q : ""));
    },
    add, setAdd, form, setForm, del, setDel, toastMsg, toast: setToast,
    openAdd: (tab?: AddTab, preset?: Record<string, unknown>) => setAdd({ tab: tab || "gasto", preset }),
    openEdit: (tab: AddTab, item: Record<string, unknown>) => setAdd({ tab, edit: { tab, item } }),
    openForm: (kind: FormKind, item?: object, preset?: Record<string, unknown>) => setForm({ kind, item: item as Record<string, unknown> | undefined, preset }),
    askDelete: (coll: Collection, id: string, label: string) => setDel({ coll, id, label }),
    upsert, remove, setSettings, setCarry, replace, reload,
  };
}

export type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ initialData, children }: { initialData: Data; children: ReactNode }) {
  const value = useStoreValue(initialData);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp fora do StoreProvider");
  return v;
}
