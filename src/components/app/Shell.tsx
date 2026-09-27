"use client";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { addMonths, cx, monthLabel } from "@/lib/format";
import type { Data, Route } from "@/lib/types";
import { Badge, Button, Confirm, Icon, IconButton, PrivacyCtx, Sheet } from "../ui";
import { AddSheet, FormHost } from "./forms";
import { ROUTE_PATHS, StoreProvider, useApp } from "./store";

const NAV: { id: Route; label: string; icon: string }[] = [
  { id: "dashboard", label: "Início", icon: "home" },
  { id: "transacoes", label: "Transações", icon: "list" },
  { id: "cartoes", label: "Cartões", icon: "card" },
  { id: "caixinhas", label: "Caixinhas", icon: "piggy" },
  { id: "orcamento", label: "Orçamento", icon: "pie" },
  { id: "metas", label: "Metas", icon: "target" },
  { id: "calendario", label: "Calendário", icon: "calendar" },
  { id: "receitas", label: "Receitas", icon: "wallet" },
  { id: "config", label: "Configurações", icon: "sliders" },
];
const MAIN_MOBILE: Route[] = ["dashboard", "transacoes", "orcamento"];

function routeOf(path: string): Route {
  const hit = (Object.entries(ROUTE_PATHS) as [Route, string][]).find(([, p]) => p !== "/" && path.startsWith(p));
  return hit ? hit[0] : "dashboard";
}

export function Logo() {
  return <div className="b-logo"><span className="b-logo-mark" aria-hidden="true" /><span>Bolso</span></div>;
}

function Sidebar({ route, onAdd }: { route: Route; onAdd: () => void }) {
  const app = useApp();
  return (
    <aside className="b-sidebar">
      <Logo />
      <Button icon="plus" size="lg" block onClick={onAdd} className="b-side-add">Adicionar gasto</Button>
      <nav aria-label="Principal">
        {NAV.map(n => (
          <button key={n.id} type="button" className={cx("b-nav", route === n.id && "is-active")} aria-current={route === n.id ? "page" : undefined} onClick={() => app.go(n.id)}>
            <Icon name={n.icon} size={20} />{n.label}
          </button>
        ))}
      </nav>
      <div className="b-side-foot"><Icon name="lock" size={16} />{app.saving ? "Salvando…" : "Dados salvos na sua conta"}</div>
    </aside>
  );
}

function BottomNav({ route, onAdd, onMore }: { route: Route; onAdd: () => void; onMore: () => void }) {
  const app = useApp();
  const moreActive = !MAIN_MOBILE.includes(route);
  const items = [NAV[0], NAV[1], null, NAV[3], { id: "mais" as const, label: "Mais", icon: "sliders" }];
  return (
    <nav className="b-bottomnav" aria-label="Principal">
      {items.map(n => n ? (
        <button key={n.id} type="button" className={cx("b-bnav", (route === n.id || (n.id === "mais" && moreActive)) && "is-active")}
          onClick={() => n.id === "mais" ? onMore() : app.go(n.id)}>
          <Icon name={n.icon} size={22} /><span>{n.label}</span>
        </button>
      ) : (
        <button key="add" type="button" className="b-fab" onClick={onAdd} aria-label="Adicionar gasto"><Icon name="plus" size={26} strokeWidth={2.4} /></button>
      ))}
    </nav>
  );
}

function TopBar({ mobile, theme }: { mobile: boolean; theme: "light" | "dark" }) {
  const app = useApp();
  const { month, setMonth, hide, setHide, data } = app;
  return (
    <header className="b-topbar">
      {mobile ? <Logo /> : null}
      <div className="b-monthnav">
        <IconButton icon="chevL" label="Mês anterior" onClick={() => setMonth(addMonths(month, -1))} />
        <span className="b-monthnav-label">{monthLabel(month)}</span>
        <IconButton icon="chevR" label="Próximo mês" onClick={() => setMonth(addMonths(month, 1))} />
      </div>
      <div className="b-topbar-actions">
        {data.settings.demo && !mobile ? <Badge tone="neutral" icon="info">Dados de exemplo</Badge> : null}
        <IconButton icon={theme === "dark" ? "sun" : "moon"} label={theme === "dark" ? "Tema claro" : "Tema escuro"} onClick={() => app.setSettings({ theme: theme === "dark" ? "light" : "dark" })} />
        <IconButton icon={hide ? "eyeOff" : "eye"} label={hide ? "Mostrar valores" : "Ocultar valores"} active={hide} onClick={() => setHide(!hide)} />
      </div>
    </header>
  );
}

function LockScreen({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  return (
    <div className="b-lock">
      <div className="b-lock-box">
        <Logo />
        <span className="b-empty-icon"><Icon name="lock" size={26} /></span>
        <strong>Valores bloqueados</strong>
        <p className="b-muted">Digite seu PIN para ver suas finanças.</p>
        <input className="b-input b-pin" inputMode="numeric" maxLength={4} autoFocus value={v} aria-label="PIN" autoComplete="off"
          onChange={e => {
            const x = e.target.value.replace(/\D/g, "").slice(0, 4);
            setV(x); setErr(false);
            if (x.length === 4) { if (x === pin) onUnlock(); else { setErr(true); setV(""); } }
          }} />
        {err ? <span className="b-field-error"><Icon name="alert" size={14} />PIN incorreto</span> : null}
      </div>
    </div>
  );
}

// Lê uma media query do navegador. No servidor (e na hidratação) usa o palpite recebido.
function useMedia(query: string, serverGuess: boolean | null = null) {
  return useSyncExternalStore(
    cb => { const mq = window.matchMedia(query); mq.addEventListener("change", cb); return () => mq.removeEventListener("change", cb); },
    () => window.matchMedia(query).matches,
    () => serverGuess,
  );
}

function Frame({ children, mobileGuess }: { children: ReactNode; mobileGuess: boolean }) {
  const app = useApp();
  const { data } = app;
  const route = routeOf(usePathname());
  const [moreOpen, setMoreOpen] = useState(false);
  const pin = data.settings.pin;
  const [unlocked, setUnlocked] = useState(!(data.settings.lock && pin && /^\d{4}$/.test(pin)));
  const sysDark = useMedia("(prefers-color-scheme: dark)");
  // null enquanto não sabemos o tema do sistema; o script do <head> já aplicou o certo.
  const known = data.settings.theme !== "auto" || sysDark != null;
  const theme = data.settings.theme === "auto" ? (sysDark ? "dark" : "light") : data.settings.theme;

  useEffect(() => {
    if (!known) return;
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("bolso:theme", data.settings.theme); } catch { /* sem storage */ }
  }, [known, theme, data.settings.theme]);
  const mobile = useMedia("(max-width: 779.98px)", mobileGuess) === true;
  const del = app.del;

  return (
    <PrivacyCtx.Provider value={{ hide: app.hide }}>
      <div className={cx("b-app", mobile ? "is-mobile" : "is-desktop")} style={{ minHeight: "100dvh" }}>
        {!unlocked && pin ? <LockScreen pin={pin} onUnlock={() => setUnlocked(true)} /> : null}
        {mobile ? null : <Sidebar route={route} onAdd={() => app.openAdd()} />}
        <main className="b-main">
          <TopBar mobile={mobile} theme={theme} />
          <div className="b-page" key={app.month}>{children}</div>
        </main>
        {mobile ? <BottomNav route={route} onAdd={() => app.openAdd()} onMore={() => setMoreOpen(true)} /> : null}
        <Sheet open={moreOpen} title="Mais" onClose={() => setMoreOpen(false)}>
          <div className="b-moregrid">
            {NAV.filter(n => !MAIN_MOBILE.includes(n.id)).map(n => (
              <button key={n.id} type="button" className={cx("b-more", route === n.id && "is-active")} onClick={() => { setMoreOpen(false); app.go(n.id); }}>
                <Icon name={n.icon} size={24} />{n.label}
              </button>
            ))}
          </div>
        </Sheet>
        <AddSheet />
        <FormHost />
        <Confirm open={!!del} title={"Excluir " + (del ? del.label.toLowerCase() : "") + "?"} text="Essa ação não pode ser desfeita."
          onClose={() => app.setDel(null)}
          onConfirm={() => { if (del) { app.remove(del.coll, del.id); app.setForm(null); app.toast("Excluído"); } }} />
        {app.toastMsg ? <div className="b-toast" role="status"><Icon name="check" size={18} />{app.toastMsg}</div> : null}
      </div>
    </PrivacyCtx.Provider>
  );
}

export function AppShell({ initialData, mobileGuess, children }: { initialData: Data; mobileGuess: boolean; children: ReactNode }) {
  return <StoreProvider initialData={initialData}><Frame mobileGuess={mobileGuess}>{children}</Frame></StoreProvider>;
}
