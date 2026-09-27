"use client";
// Componentes base do design system Bolso.
import { createContext, useContext, useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { clamp, cx, fmt, monthShort, weekday } from "@/lib/format";
import { catColor } from "@/lib/finance";
import type { Category, Tone } from "@/lib/types";

const ICONS: Record<string, string> = {
  home: "M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5",
  list: "M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01",
  card: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM2 10h20M6 15h4",
  pie: "M21 12.5A9 9 0 1 1 11.5 3v9.5zM15 3.3A9 9 0 0 1 20.7 9H15z",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 12h.01",
  calendar: "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4",
  wallet: "M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11v3M16.5 13.5h.01",
  cash: "M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6.5 12h.01M17.5 12h.01",
  zap: "M13 3 5 13.5h6L10 21l8-10.5h-6z",
  sliders: "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeOff: "M3 3l18 18M10.6 5.1C11 5 11.5 5 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20.5 20.5 16 16",
  chevL: "M15 18l-6-6 6-6",
  chevR: "M9 6l6 6-6 6",
  chevD: "M6 9l6 6 6-6",
  x: "M18 6 6 18M6 6l12 12",
  trash: "M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13",
  edit: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  check: "M5 12.5l4.5 4.5L19 7",
  alert: "M12 3.5 2.5 20h19zM12 10v4.5M12 17.2h.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.8h.01",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z",
  utensils: "M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M18 3c-2.2 1.6-3.2 4.2-3.2 7.5H18V21",
  cart: "M3 4h2.2l2.3 11h10.8L20.5 8H6.3M9 20h.01M18 20h.01",
  car: "M4 16.5h16M3 16.5v-4l2.2-5.5h13.6l2.2 5.5v4M5 16.5V19h2.5v-2.5M16.5 16.5V19H19v-2.5M7 12.8h.01M17 12.8h.01",
  sparkles: "M11 3l1.8 4.9 4.9 1.8-4.9 1.8L11 16.4l-1.8-4.9-4.9-1.8 4.9-1.8zM18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z",
  ticket: "M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4zM14 6v12",
  bag: "M5.5 7.5h13l1 13.5h-15zM9 7.5V7a3 3 0 0 1 6 0v.5",
  house: "M4 20V10l8-6 8 6v10zM10 20v-5.5h4V20",
  repeat: "M17 2.5l3.5 3.5L17 9.5M4 11V9.5A3.5 3.5 0 0 1 7.5 6h12.5M7 21.5 3.5 18 7 14.5M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H4",
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z",
  laptop: "M5 5.5h14v10H5zM2.5 19h19",
  box: "M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5zM3.5 7.5 12 12l8.5-4.5M12 12v9",
  briefcase: "M4 7.5h16V19H4zM9 7.5V5h6v2.5M4 12.5h16",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M21.5 20a6.5 6.5 0 0 0-3.8-5.9",
  gift: "M4 11h16v9H4zM3 7.5h18V11H3zM12 7.5V20M12 7.5S10.5 3.5 8 4.2 8.5 7.5 12 7.5zM12 7.5s1.5-4 4-3.3-.5 3.3-4 3.3z",
  arrowUpRight: "M7 17 17 7M8.5 7H17v8.5",
  arrowDownLeft: "M17 7 7 17M15.5 17H7V8.5",
  trendUp: "M3 17l6-6 4 4 8-8M15 7h6v6",
  trendDown: "M3 7l6 6 4-4 8 8M15 17h6v-6",
  lock: "M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11",
  download: "M12 3.5v12M7 10.5l5 5 5-5M4 20.5h16",
  upload: "M12 20.5v-12M7 13.5l5-5 5 5M4 3.5h16",
  sun: "M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M20.5 13A8.5 8.5 0 1 1 11 3.5a6.6 6.6 0 0 0 9.5 9.5z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2",
  layers: "M12 3 2.5 8 12 13l9.5-5zM2.5 12.5 12 17.5l9.5-5M2.5 16.5 12 21.5l9.5-5",
  refresh: "M20 11a8 8 0 0 0-14.3-4.7L3.5 8.5M3.5 3.5v5h5M4 13a8 8 0 0 0 14.3 4.7l2.2-2.2M20.5 20.5v-5h-5",
  piggy: "M5 11.5C5 8 8.1 5.5 12 5.5c1.4 0 2.7.3 3.8.9L19 5v3.3c.8.8 1.4 1.8 1.6 2.9H22v3.5h-1.7a6.4 6.4 0 0 1-2.3 2.6V20h-3v-1.6a9 9 0 0 1-3 0V20h-3v-2.7C6.3 16.1 5 14 5 11.5zM15.5 10h.01",
  shield: "M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z",
  file: "M6 3h8.5L19 7.5V21H6zM14 3v5h5",
  logout: "M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10",
};

export function Icon({ name, size = 20, className, strokeWidth = 1.8, title }: { name: string; size?: number; className?: string; strokeWidth?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={cx("b-icon", className)} aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
      {title ? <title>{title}</title> : null}
      <path d={ICONS[name] || ICONS.box} />
    </svg>
  );
}

export const PrivacyCtx = createContext({ hide: false });

export function Money({ value, cents = true, sign, tone, className, hideable = true }: { value: number; cents?: boolean; sign?: "always" | "out"; tone?: Tone; className?: string; hideable?: boolean }) {
  const { hide } = useContext(PrivacyCtx);
  const hidden = hide && hideable;
  const neg = value < 0;
  let s = hidden ? "R$ ••••••" : fmt(Math.abs(value), cents);
  if (!hidden) {
    if (sign === "always") s = (neg ? "− " : "+ ") + s;
    else if (sign === "out" || neg) s = "− " + s;
  }
  return <span className={cx("b-money", tone && "b-tone-" + tone, className)}>{s}</span>;
}

type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "ghost-danger"; size?: "sm" | "md" | "lg"; icon?: string; block?: boolean };
export function Button({ variant = "primary", size = "md", icon, block, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={cx("b-btn", "b-btn-" + variant, "b-btn-" + size, block && "b-btn-block", !children && "b-btn-icononly", className)} {...rest}>
      {icon ? <Icon name={icon} size={size === "lg" ? 22 : size === "sm" ? 16 : 18} /> : null}
      {children ? <span>{children}</span> : null}
    </button>
  );
}

export function IconButton({ icon, label, className, active, ...rest }: Omit<ComponentProps<"button">, "type"> & { icon: string; label: string; active?: boolean }) {
  return (
    <button type="button" className={cx("b-iconbtn", active && "is-active", className)} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={20} />
    </button>
  );
}

export function Card({ title, subtitle, action, children, className, flush }: { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children?: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cx("b-card", flush && "b-card-flush", className)}>
      {title || action ? (
        <header className="b-card-head">
          <div>
            {title ? <h3 className="b-card-title">{title}</h3> : null}
            {subtitle ? <p className="b-card-sub">{subtitle}</p> : null}
          </div>
          {action || null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Badge({ tone = "neutral", icon, children, className }: { tone?: Tone; icon?: string; children: ReactNode; className?: string }) {
  return <span className={cx("b-badge", "b-badge-" + tone, className)}>{icon ? <Icon name={icon} size={14} strokeWidth={2.2} /> : null}{children}</span>;
}

export function ProgressBar({ value, max, tone = "primary", color, height = 10, label, className }: { value: number; max: number; tone?: Tone | "card"; color?: string; height?: number; label?: string; className?: string }) {
  const r = max > 0 ? value / max : 0;
  const w = clamp(r, 0, 1) * 100;
  return (
    <div className={cx("b-progress", className)} style={{ height }} role="progressbar" aria-valuemin={0} aria-valuemax={Math.round(max)} aria-valuenow={Math.round(value)} aria-label={label}>
      <div className={cx("b-progress-fill", "b-fill-" + tone)} style={{ width: w + "%", ...(color ? { background: color } : null) }} />
      {r > 1 ? <div className="b-progress-over" style={{ width: clamp((r - 1) / r, 0.04, 0.5) * 100 + "%" }} /> : null}
    </div>
  );
}

export function CatIcon({ cat, size = 36 }: { cat?: Category | null; size?: number }) {
  return (
    <span className="b-caticon" style={{ width: size, height: size, ["--cat" as string]: catColor(cat) }}>
      <Icon name={cat?.icon || "box"} size={Math.round(size * 0.5)} />
    </span>
  );
}

export function StatTile({ icon, label, value, tone, hint, cents = false }: { icon?: string; label: ReactNode; value: number | ReactNode; tone?: string; hint?: ReactNode; cents?: boolean }) {
  return (
    <div className="b-stat">
      <div className="b-stat-label">{icon ? <span className={cx("b-stat-icon", tone && "b-soft-" + tone)}><Icon name={icon} size={16} /></span> : null}{label}</div>
      <div className="b-stat-value">{typeof value === "number" ? <Money value={value} cents={cents} /> : value}</div>
      {hint ? <div className="b-stat-hint">{hint}</div> : null}
    </div>
  );
}

export function Insight({ tone = "neutral", icon = "bulb", children }: { tone?: Tone; icon?: string; children: ReactNode }) {
  return (
    <div className={cx("b-insight", "b-insight-" + tone)}>
      <span className="b-insight-icon"><Icon name={icon} size={16} strokeWidth={2} /></span>
      <p>{children}</p>
    </div>
  );
}

export function Notice({ tone = "warning", icon, title, children, action }: { tone?: Tone; icon?: string; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={cx("b-notice", "b-notice-" + tone)} role={tone === "negative" ? "alert" : "status"}>
      <Icon name={icon || (tone === "positive" ? "check" : tone === "neutral" ? "info" : "alert")} size={20} />
      <div className="b-notice-body">{title ? <strong>{title}</strong> : null}{children ? <p>{children}</p> : null}</div>
      {action || null}
    </div>
  );
}

export function EmptyState({ icon = "file", title, text, action }: { icon?: string; title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="b-empty">
      <span className="b-empty-icon"><Icon name={icon} size={26} /></span>
      <strong>{title}</strong>
      {text ? <p>{text}</p> : null}
      {action || null}
    </div>
  );
}

export function Skeleton({ lines = 3, height = 14, block }: { lines?: number; height?: number; block?: number }) {
  return (
    <div className="b-skel-wrap" aria-busy="true" aria-label="Carregando">
      {block ? <div className="b-skel" style={{ height: block }} /> : null}
      {Array.from({ length: lines }, (_, i) => <div key={i} className="b-skel" style={{ height, width: 92 - i * 17 + "%" }} />)}
    </div>
  );
}

export function Segmented<T extends string | boolean>({ options, value, onChange, size = "md", label }: { options: { value: T; label: ReactNode; icon?: string }[]; value: T; onChange: (v: T) => void; size?: "sm" | "md"; label?: string }) {
  return (
    <div className={cx("b-seg", "b-seg-" + size)} role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value} className={cx("b-seg-opt", value === o.value && "is-on")} onClick={() => onChange(o.value)}>
          {o.icon ? <Icon name={o.icon} size={16} /> : null}{o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, error, children, className }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("b-field", !!error && "has-error", className)}>
      {label ? <span className="b-field-label">{label}</span> : null}
      {children}
      {error ? <span className="b-field-error"><Icon name="alert" size={14} />{error}</span> : hint ? <span className="b-field-hint">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx("b-input", className)} {...props} />;
}

export function Select({ options, className, ...rest }: ComponentProps<"select"> & { options: { value: string; label: string }[] }) {
  return (
    <div className="b-select">
      <select className={cx("b-input", className)} {...rest}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chevD" size={16} />
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="b-toggle">
      <span className="b-toggle-text"><span>{label}</span>{hint ? <small>{hint}</small> : null}</span>
      <input type="checkbox" role="switch" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <span className="b-toggle-ui" aria-hidden="true" />
    </label>
  );
}

// Campo de dinheiro: aceita "1.234,56" ou "12,5"; devolve número.
export function MoneyInput({ value, onChange, autoFocus, big, allowNegative }: { value: number; onChange: (v: number) => void; autoFocus?: boolean; big?: boolean; allowNegative?: boolean }) {
  const [txt, setTxt] = useState(value ? String(value).replace(".", ",") : "");
  return (
    <div className={cx("b-moneyinput", big && "is-big")}>
      <span>R$</span>
      <input inputMode="decimal" autoFocus={autoFocus} placeholder="0,00" value={txt} aria-label="Valor"
        onChange={e => {
          const v = e.target.value.replace(allowNegative ? /[^0-9,.\-]/g : /[^0-9,.]/g, "");
          setTxt(v);
          const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
          onChange(isNaN(n) ? 0 : n);
        }} />
    </div>
  );
}

export function Sheet({ open, title, onClose, children, footer, wide }: { open: boolean; title: string; onClose: () => void; children?: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="b-sheet-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={cx("b-sheet", wide && "is-wide")} role="dialog" aria-modal="true" aria-label={title}>
        <div className="b-sheet-grip" aria-hidden="true" />
        <header className="b-sheet-head"><h2>{title}</h2><IconButton icon="x" label="Fechar" onClick={onClose} /></header>
        <div className="b-sheet-body">{children}</div>
        {footer ? <footer className="b-sheet-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function Confirm({ open, title, text, confirmLabel = "Excluir", onConfirm, onClose, tone = "danger" }: { open: boolean; title: string; text: ReactNode; confirmLabel?: string; onConfirm: () => void; onClose: () => void; tone?: "danger" | "primary" }) {
  return (
    <Sheet open={open} title={title} onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose}>Cancelar</Button>
      <Button variant={tone} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
    </>}>
      <p className="b-body">{text}</p>
    </Sheet>
  );
}

export function RowActions({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  return (
    <span className="b-rowactions">
      {onEdit ? <IconButton icon="edit" label="Editar" onClick={e => { e.stopPropagation(); onEdit(); }} /> : null}
      {onDelete ? <IconButton icon="trash" label="Excluir" className="is-danger" onClick={e => { e.stopPropagation(); onDelete(); }} /> : null}
    </span>
  );
}

export type RowTx = { desc: string; amount: number; method?: string; kind?: string; status?: string; total?: number; installment?: string };
export function TransactionRow({ tx, cat, methodLabel, onClick, onDelete, income }: { tx: RowTx; cat?: Category | null; methodLabel?: string; onClick?: () => void; onDelete?: () => void; income?: boolean }) {
  const shared = tx.kind === "compartilhado";
  return (
    <div className={cx("b-tx", onClick && "is-clickable")} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === "Enter") onClick(); } : undefined}>
      {income ? <span className="b-caticon b-caticon-in"><Icon name="arrowDownLeft" size={18} /></span> : <CatIcon cat={cat} size={40} />}
      <div className="b-tx-main">
        <span className="b-tx-desc">{tx.desc}</span>
        <span className="b-tx-meta">
          {income ? "Receita" : cat ? cat.name : "Sem categoria"}
          {" · "}{income ? "Conta" : methodLabel || tx.method}
          {tx.installment ? " · " + tx.installment : ""}
          {shared ? (
            <Badge tone={tx.status === "pendente" ? "warning" : "positive"} icon={tx.status === "pendente" ? "clock" : "check"} className="b-tx-badge">
              {tx.status === "pendente" ? "A reembolsar" : "Reembolsado"}
            </Badge>
          ) : null}
        </span>
      </div>
      <div className="b-tx-amount">
        <Money value={tx.amount} sign={income ? "always" : "out"} tone={income ? "positive" : undefined} />
        {shared && tx.total != null ? <span className="b-tx-sub">de <Money value={tx.total} /></span> : null}
      </div>
      {onDelete ? <RowActions onDelete={onDelete} /> : null}
    </div>
  );
}

export type UpcomingType = "income" | "bill" | "card" | "refund" | "goal";
export function UpcomingItem({ date, label, amount, type, status }: { date: string; label: string; amount: number; type: UpcomingType | string; status?: string }) {
  const map: Record<string, [string, string, "always" | "out"]> = {
    income: ["positive", "arrowDownLeft", "always"], bill: ["negative", "repeat", "out"], card: ["card", "card", "out"],
    refund: ["warning", "users", "out"], goal: ["primary", "target", "out"],
  };
  const [tone, icon, sign] = map[type] || map.bill;
  return (
    <div className="b-upc">
      <div className="b-upc-date"><strong>{date.slice(8, 10)}</strong><span>{monthShort(date)}</span></div>
      <span className={cx("b-upc-icon", "b-soft-" + tone)}><Icon name={icon} size={16} /></span>
      <div className="b-upc-main">
        <span>{label}</span>
        <small className={status === "atrasada" ? "b-tone-negative" : undefined}>
          {status === "atrasada" ? "Atrasada" : status === "paga" ? "Paga" : weekday(date)}
        </small>
      </div>
      <Money value={amount} sign={sign} tone={type === "income" ? "positive" : undefined} className="b-upc-amount" />
    </div>
  );
}
