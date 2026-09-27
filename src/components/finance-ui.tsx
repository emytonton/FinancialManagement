"use client";
// Componentes que mostram os números do mês: herói, gráficos, cartões, metas.
import { useEffect, useRef, useState } from "react";
import { addMonths, clamp, cx, dateIn, dayOf, ddmm, dim, monthLabel, monthName, monthShort, pad, pct, round2, sum, WEEK } from "@/lib/format";
import { parcelInfo, stateOf, type Budget, type GoalStats, type Month, type MonthCard, type Point, type SpendRow } from "@/lib/finance";
import type { Goal, Installment, Source } from "@/lib/types";
import { Badge, Button, CatIcon, EmptyState, Icon, Money, ProgressBar, RowActions } from "./ui";

export function BudgetBar({ budget, onClick, compact }: { budget: Budget; onClick?: () => void; compact?: boolean }) {
  const { cat, limit, spent, pend, ratio, rest, state } = budget;
  const pctTxt = limit > 0 ? Math.floor(ratio * 100) + "%" : "sem limite";
  const inner = (
    <>
      <div className="b-budget-top">
        <CatIcon cat={cat} size={compact ? 30 : 36} />
        <div className="b-budget-name">
          <span className="b-budget-title">{cat.name}</span>
          {compact ? null : <span className="b-budget-mode">{cat.mode === "pct" ? cat.pct + "% da renda do mês" : "Valor fixo"}</span>}
        </div>
        <div className="b-budget-vals">
          <span className="b-budget-spent"><Money value={spent} cents={false} /><span className="b-budget-of"> / <Money value={limit} cents={false} /></span></span>
          <Badge tone={state.tone} icon={state.key === "over" ? "alert" : state.key === "ok" ? "check" : "info"}>{pctTxt}</Badge>
        </div>
      </div>
      <ProgressBar value={spent} max={limit || 1} tone={state.tone} height={compact ? 8 : 10} label={cat.name} />
      <div className="b-budget-foot">
        {rest >= 0
          ? <span>Restam <Money value={rest} className="b-strong" /></span>
          : <span className="b-tone-negative">Passou <Money value={-rest} className="b-strong" /></span>}
        {pend > 0 ? <span className="b-muted">+ <Money value={pend} /> a vencer</span> : null}
      </div>
    </>
  );
  const cls = cx("b-budget", compact && "is-compact", onClick && "is-clickable", "is-" + state.key);
  return onClick ? <button type="button" className={cls} onClick={onClick}>{inner}</button> : <div className={cls}>{inner}</div>;
}

export function SafeToSpend({ c, compact }: { c: Month; compact?: boolean }) {
  const parts = [
    { key: "faturas", label: "Faturas que vencem em " + monthName(c.month), hint: c.cards.length ? ("vence " + ddmm(dateIn(c.month, c.cards[0].dueDay)) + (c.invoices.some(i => i.coveredPrev > 0) ? ", já tirando a caixinha" : "") + "; toque Paguei em Cartões ao pagar") : "sem cartões", value: c.faturasAbertas, o: 1 },
    { key: "contas", label: "Contas a vencer", hint: c.pendingBills.length + " conta" + (c.pendingBills.length === 1 ? "" : "s"), value: c.contasAVencer, o: 0.72 },
    { key: "reemb", label: "Reembolsos pendentes", hint: "sua parte a devolver", value: sum(c.reembolsos, x => x.amount), o: 0.5 },
    { key: "guardar", label: "Falta guardar", hint: "meta de " + pct(c.metaGuardar / (c.receitas || 1)), value: c.faltaGuardar, o: 0.3 },
  ];
  const total = Math.max(c.emConta, 1);
  const free = c.livre;
  const over = c.budgets.filter(b => b.ratio > 1);
  const status = free < 0 ? { tone: "negative" as const, icon: "alert", text: "Você já comprometeu mais do que tem em conta." }
    : over.length ? { tone: "warning" as const, icon: "info", text: "No plano, mas " + over.map(b => b.cat.name.toLowerCase()).join(", ") + " passou do limite" }
    : { tone: "positive" as const, icon: "check", text: "Você está dentro do seu orçamento." };
  return (
    <section className={cx("b-hero", compact && "is-compact")}>
      <div className="b-hero-main">
        <span className="b-hero-label">Quanto ainda posso gastar?</span>
        <div className="b-hero-amount"><Money value={free} /></div>
        <div className="b-hero-status"><Badge tone={status.tone} icon={status.icon}>{status.text}</Badge></div>
        {c.aReceber > 0 ? <p className="b-hero-note"><Icon name="clock" size={14} /><span><Money value={c.aReceber} cents={false} /> ainda vão entrar e não estão contados aqui.</span></p> : null}
        {c.daysLeft > 0 ? <p className="b-hero-perday"><Money value={c.porDia} cents={false} className="b-strong" /> por dia nos próximos {c.daysLeft} dias</p> : null}
      </div>
      <div className="b-hero-break">
        <div className="b-waterfall-head"><span>Em conta agora</span><Money value={c.emConta} className="b-strong" /></div>
        {c.caixinhas > 0 ? <p className="b-hero-note"><Icon name="piggy" size={14} /><span>Fora da conta: <Money value={c.caixinhas} /> em caixinhas{c.caixinhasNasFaturas > 0 ? <>, <Money value={c.caixinhasNasFaturas} /> delas já pagando faturas</> : null}.</span></p> : null}
        <div className="b-stack" role="img" aria-label="Divisão do saldo em conta">
          {parts.filter(p => p.value > 0).map(p => <span key={p.key} className="b-stack-seg b-seg-commit" style={{ flexGrow: p.value / total, opacity: p.o }} title={p.label} />)}
          {free > 0 ? <span className="b-stack-seg b-seg-free" style={{ flexGrow: free / total }} title="Livre" /> : null}
        </div>
        <ul className="b-waterfall">
          {parts.map(p => (
            <li key={p.key}>
              <span className="b-wf-dot b-seg-commit" style={{ opacity: p.o }} />
              <span className="b-wf-label">{p.label}<small>{p.hint}</small></span>
              <Money value={p.value} sign="out" />
            </li>
          ))}
          <li className="b-wf-total">
            <span className="b-wf-dot b-seg-free" />
            <span className="b-wf-label">Livre para gastar</span>
            <Money value={free} tone={free < 0 ? "negative" : "positive"} />
          </li>
        </ul>
        {c.faturasReservadas > 0 && c.cards.length ? (
          <p className="b-hero-note"><Icon name="card" size={14} /><span>Próxima fatura: <Money value={c.faturasReservadas} /> vence em {ddmm(c.cards[0].due)}{c.cards.some(k => k.caixinha > 0) ? " (já tirando a caixinha)" : ""} e entra no livre de {monthName(addMonths(c.month, 1))}.</span></p>
        ) : null}
      </div>
    </section>
  );
}

export function DonutChart({ data, total, size = 200, thickness = 26, centerLabel = "Gasto no mês" }: { data: SpendRow[]; total: number; size?: number; thickness?: number; centerLabel?: string }) {
  const [hi, setHi] = useState<string | null>(null);
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const gap = data.length > 1 ? 3 : 0;
  const active = hi != null ? data.find(d => d.id === hi) : null;
  const offsets = data.reduce<number[]>((acc, d, i) => { acc.push(i === 0 ? 0 : acc[i - 1] + (total > 0 ? data[i - 1].value / total * C : 0)); return acc; }, []);
  return (
    <div className="b-donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Gastos por categoria">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const len = total > 0 ? d.value / total * C : 0;
          return (
            <circle key={d.id} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={hi === d.id ? thickness + 6 : thickness}
              strokeDasharray={Math.max(len - gap, 0.5) + " " + C} strokeDashoffset={-offsets[i]} transform={`rotate(-90 ${size / 2} ${size / 2})`}
              opacity={hi && hi !== d.id ? 0.35 : 1} onMouseEnter={() => setHi(d.id)} onMouseLeave={() => setHi(null)}
              style={{ transition: "opacity .15s, stroke-width .15s", cursor: "default" }} />
          );
        })}
      </svg>
      <div className="b-donut-center">
        <span>{active ? active.label : centerLabel}</span>
        <Money value={active ? active.value : total} cents={false} className="b-donut-total" />
        {active ? <small>{pct(active.value / total)}</small> : null}
      </div>
    </div>
  );
}

export function CategoryList({ rows, total, onPick }: { rows: { id: string; label: string; value: number; color: string }[]; total: number; onPick?: (id: string) => void }) {
  return (
    <ul className="b-catlist">
      {rows.map(r => {
        const inner = <>
          <span className="b-dot" style={{ background: r.color }} />
          <span className="b-catlist-name">{r.label}</span>
          <Money value={r.value} cents={false} />
          <span className="b-catlist-pct">{total > 0 ? pct(r.value / total) : "0%"}</span>
        </>;
        return <li key={r.id}>{onPick ? <button type="button" className="b-catlist-row" onClick={() => onPick(r.id)}>{inner}</button> : <div className="b-catlist-row">{inner}</div>}</li>;
      })}
    </ul>
  );
}

export function CompareBars({ rows, curLabel = "Este mês", prevLabel = "Mês anterior" }: { rows: { label: string; cur: number; prev: number; color: string }[]; curLabel?: string; prevLabel?: string }) {
  const max = Math.max(1, ...rows.map(r => Math.max(r.cur, r.prev)));
  const [hi, setHi] = useState<string | null>(null);
  return (
    <div className="b-compare">
      <div className="b-legend">
        <span><i className="b-dot b-dot-cur" />{curLabel}</span>
        <span><i className="b-dot" style={{ background: "var(--chart-other)" }} />{prevLabel}</span>
      </div>
      {rows.map(r => {
        const d = r.prev > 0 ? r.cur / r.prev - 1 : null;
        return (
          <div key={r.label} className={cx("b-compare-row", hi === r.label && "is-hi")} onMouseEnter={() => setHi(r.label)} onMouseLeave={() => setHi(null)}>
            <span className="b-compare-label">{r.label}</span>
            <div className="b-compare-bars">
              <span className="b-cbar" style={{ width: r.cur / max * 100 + "%", background: r.color }} />
              <span className="b-cbar b-cbar-prev" style={{ width: r.prev / max * 100 + "%" }} />
            </div>
            <span className="b-compare-val">
              <Money value={r.cur} cents={false} />
              {d == null ? null : <small className={d > 0.05 ? "b-tone-negative" : d < -0.05 ? "b-tone-positive" : "b-muted"}>{(d > 0 ? "▲ " : d < 0 ? "▼ " : "") + pct(Math.abs(d))}</small>}
            </span>
            {hi === r.label ? <div className="b-tip b-tip-row"><strong>{r.label}</strong><span>{curLabel}: <Money value={r.cur} /></span><span>{prevLabel}: <Money value={r.prev} /></span></div> : null}
          </div>
        );
      })}
    </div>
  );
}

export function CashFlowChart({ actual, proj, days, height = 200, todayD }: { actual: Point[]; proj: Point[]; days: number; height?: number; todayD?: number | null }) {
  const [hv, setHv] = useState<(Point & { proj: boolean }) | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(560);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(e => setW(Math.max(260, e[0].contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const all = actual.concat(proj);
  if (!all.length) return <EmptyState icon="trendUp" title="Sem movimentações ainda" text="Quando entrar ou sair dinheiro, a linha do mês aparece aqui." />;
  const vals = all.map(p => p.v);
  const lo = Math.min(0, ...vals), hiV = Math.max(...vals, 1) * 1.1;
  const padL = 56, padR = 12, padT = 12, padB = 26;
  const X = (d: number) => padL + (d - 1) / (days - 1) * (w - padL - padR);
  const Y = (v: number) => padT + (1 - (v - lo) / (hiV - lo || 1)) * (height - padT - padB);
  const path = (pts: Point[]) => pts.map((p, i) => (i ? "L" : "M") + X(p.d).toFixed(1) + " " + Y(p.v).toFixed(1)).join(" ");
  const raw = (hiV - lo) / 3, mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(k => k >= raw) || mag * 10;
  const ticks: number[] = []; for (let t = Math.ceil(lo / step) * step; t <= hiV; t += step) ticks.push(t);
  const area = actual.length ? path(actual) + " L" + X(actual[actual.length - 1].d) + " " + Y(lo) + " L" + X(actual[0].d) + " " + Y(lo) + " Z" : "";
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const d = clamp(Math.round((e.clientX - rect.left - padL) / (w - padL - padR) * (days - 1) + 1), 1, days);
    const a = actual.find(q => q.d === d);
    const p = a || proj.find(q => q.d === d);
    setHv(p ? { ...p, proj: !a } : null);
  };
  return (
    <div className="b-flow" ref={ref}>
      <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} style={{ maxWidth: "100%", height: "auto" }} role="img" aria-label="Evolução do saldo no mês" onMouseMove={onMove} onMouseLeave={() => setHv(null)}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={Y(t)} y2={Y(t)} className="b-grid" />
            <text x={padL - 8} y={Y(t) + 4} textAnchor="end" className="b-axis">{Math.abs(t) >= 1000 ? (t / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil" : String(t)}</text>
          </g>
        ))}
        {[1, 5, 10, 15, 20, 25, days].map(d => <text key={d} x={X(d)} y={height - 6} textAnchor="middle" className="b-axis">{pad(d)}</text>)}
        {area ? <path d={area} className="b-flow-area" /> : null}
        {actual.length ? <path d={path(actual)} className="b-flow-line" /> : null}
        {proj.length ? <path d={path(proj)} className="b-flow-proj" /> : null}
        {todayD ? <g><line x1={X(todayD)} x2={X(todayD)} y1={padT} y2={height - padB} className="b-flow-today" /><text x={X(todayD) + 6} y={padT + 10} className="b-axis b-axis-strong">hoje</text></g> : null}
        {proj.length ? <circle cx={X(proj[proj.length - 1].d)} cy={Y(proj[proj.length - 1].v)} r={4.5} className="b-flow-enddot" /> : null}
        {hv ? <g><line x1={X(hv.d)} x2={X(hv.d)} y1={padT} y2={height - padB} className="b-flow-cross" /><circle cx={X(hv.d)} cy={Y(hv.v)} r={5} className="b-flow-dot" /></g> : null}
      </svg>
      {hv ? <div className="b-tip" style={{ left: clamp(X(hv.d), 70, w - 70), top: 0 }}><strong>{"Dia " + pad(hv.d) + (hv.proj ? " · previsto" : "")}</strong><Money value={hv.v} /></div> : null}
      <div className="b-legend">
        <span><i className="b-line-key" />Saldo real</span>
        {proj.length ? <span><i className="b-line-key is-dashed" />Projeção</span> : null}
      </div>
    </div>
  );
}

export function IncomeSplit({ items, total }: { items: { source: Source; amount: number }[]; total: number }) {
  const colors = ["var(--primary)", "var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  const rows = items.map((it, i) => ({ color: colors[i % colors.length], ...it }));
  return (
    <div className="b-split">
      <div className="b-stack b-stack-lg" role="img" aria-label="Renda por fonte">
        {rows.filter(r => r.amount > 0).map(r => <span key={r.source.id} className="b-stack-seg" style={{ flexGrow: r.amount, background: r.color }} title={r.source.name} />)}
      </div>
      <ul className="b-catlist">
        {rows.map(r => (
          <li key={r.source.id}><div className="b-catlist-row">
            <span className="b-dot" style={{ background: r.color }} />
            <span className="b-catlist-name">{r.source.name}</span>
            <Money value={r.amount} cents={false} />
            <span className="b-catlist-pct">{total > 0 ? pct(r.amount / total) : "0%"}</span>
          </div></li>
        ))}
      </ul>
    </div>
  );
}

export function TrendBars({ rows, height = 180 }: { rows: { m: string; receitas: number; gastos: number }[]; height?: number }) {
  const max = Math.max(1, ...rows.map(r => Math.max(r.receitas, r.gastos)));
  const [hi, setHi] = useState<string | null>(null);
  return (
    <div className="b-trend">
      <div className="b-trend-plot" style={{ height }}>
        {rows.map(r => (
          <div key={r.m} className={cx("b-trend-col", hi === r.m && "is-hi")} onMouseEnter={() => setHi(r.m)} onMouseLeave={() => setHi(null)}>
            <div className="b-trend-bars">
              <span className="b-tbar b-tbar-in" style={{ height: r.receitas / max * 100 + "%" }} />
              <span className="b-tbar b-tbar-out" style={{ height: r.gastos / max * 100 + "%" }} />
            </div>
            <span className="b-axis-label">{monthShort(r.m)}</span>
            {hi === r.m ? (
              <div className="b-tip b-tip-col">
                <strong>{monthLabel(r.m)}</strong>
                <span>Receitas: <Money value={r.receitas} cents={false} /></span>
                <span>Gastos: <Money value={r.gastos} cents={false} /></span>
                <span>Sobrou: <Money value={r.receitas - r.gastos} cents={false} /></span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="b-legend">
        <span><i className="b-dot" style={{ background: "var(--positive)" }} />Receitas</span>
        <span><i className="b-dot" style={{ background: "var(--negative)" }} />Gastos</span>
      </div>
    </div>
  );
}

export function CreditCardPanel({ card, onEdit, onDelete }: { card: MonthCard; onEdit?: () => void; onDelete?: () => void }) {
  const st = stateOf(card.ratio);
  const fat = card.limit ? clamp(card.fatura / card.limit, 0, 1) : 0;
  return (
    <div className={cx("b-ccard", "is-" + card.color)}>
      <div className="b-ccard-face">
        <div className="b-ccard-row"><strong>{card.name}</strong><Icon name="card" size={22} /></div>
        <div><span className="b-ccard-k">Fatura atual</span><div className="b-ccard-v"><Money value={card.fatura} /></div></div>
        <div className="b-ccard-row b-ccard-meta"><span>{"Fecha dia " + pad(card.closeDay)}</span><span>{"Vence " + ddmm(card.due)}</span></div>
      </div>
      <div className="b-ccard-body">
        <div className="b-ccard-limit">
          <span><Money value={card.usado} cents={false} /> / <Money value={card.limit} cents={false} /></span>
          <Badge tone={st.tone}>{pct(card.ratio) + " do limite"}</Badge>
        </div>
        <div className="b-progress" style={{ height: 10 }}>
          <div className="b-progress-fill b-fill-card" style={{ width: fat * 100 + "%" }} />
          <div className="b-progress-fill b-fill-card is-future" style={{ width: (card.limit ? clamp(card.futuro / card.limit, 0, 1 - fat) : 0) * 100 + "%" }} />
        </div>
        <div className="b-ccard-grid">
          <div><small>Disponível</small><Money value={card.disponivel} tone={card.disponivel < 0 ? "negative" : undefined} /></div>
          <div><small>Parcelas futuras</small><Money value={card.futuro} /></div>
          {card.caixinha > 0 ? <div><small>Na caixinha</small><Money value={card.caixinha} /></div> : null}
          {card.caixinha > 0 ? <div><small>Restante a pagar</small><Money value={card.restante} className="b-strong" /></div> : null}
          {card.faturaTerceiros > 0 ? <div><small>Sua parte da fatura</small><Money value={card.faturaMinha} /></div> : null}
          {card.faturaTerceiros > 0 ? <div><small>De outras pessoas</small><Money value={card.faturaTerceiros} /></div> : null}
        </div>
        {onEdit || onDelete ? <div className="b-ccard-actions"><RowActions onEdit={onEdit} onDelete={onDelete} /></div> : null}
      </div>
    </div>
  );
}

export function InstallmentRow({ inst, month, cardName, onEdit, onDelete }: { inst: Installment; month: string; cardName: string; onEdit?: () => void; onDelete?: () => void }) {
  const pi = parcelInfo(inst, month);
  const done = Math.min(Math.max(pi.idx, 0), inst.n);
  return (
    <div className="b-inst">
      <div className="b-inst-main">
        <strong>{inst.desc}</strong>
        <span className="b-muted">{inst.n}x de <Money value={inst.amount} /> · {cardName}{inst.date ? " · compra em " + ddmm(inst.date) + "/" + inst.date.slice(2, 4) : ""} · 1ª fatura de {monthName(inst.start)}</span>
      </div>
      <div className="b-inst-steps" aria-label={"Parcela " + done + " de " + inst.n}>
        {Array.from({ length: inst.n }, (_, i) => <span key={i} className={cx(i < done - 1 && "is-paid", i === done - 1 && "is-now")} />)}
      </div>
      <div className="b-inst-nums">
        <span>Parcela <strong>{done + "/" + inst.n}</strong></span>
        <span>{pi.idx > inst.n ? "Quitada em " + monthName(addMonths(inst.start, inst.n - 1)) : pi.remaining > 0 ? <>Faltam {pi.remaining} · <Money value={pi.remaining * inst.amount} /></> : "Última parcela"}</span>
      </div>
      {onEdit || onDelete ? <RowActions onEdit={onEdit} onDelete={onDelete} /> : null}
    </div>
  );
}

export function GoalCard({ goal, stats, month, onEdit, onDelete, onContribute, simulate = true }: { goal: Goal; stats: GoalStats; month: string; onEdit?: () => void; onDelete?: () => void; onContribute?: () => void; simulate?: boolean }) {
  const [sim, setSim] = useState(goal.monthly || 0);
  const eta = sim > 0 ? Math.ceil(stats.left / sim) : null;
  return (
    <div className="b-goal">
      <div className="b-goal-head">
        <span className="b-goal-icon"><Icon name={goal.icon || "target"} size={20} /></span>
        <div className="b-goal-title"><strong>{goal.name}</strong><span className="b-muted">{goal.deadline ? "Até " + monthLabel(goal.deadline) : "Sem prazo"}</span></div>
        {onEdit || onDelete ? <RowActions onEdit={onEdit} onDelete={onDelete} /> : null}
      </div>
      <div className="b-goal-nums">
        <Money value={stats.saved} cents={false} className="b-goal-saved" />
        <span className="b-muted"> de <Money value={goal.target} cents={false} /></span>
        <span className="b-goal-pct">{pct(stats.ratio)}</span>
      </div>
      <ProgressBar value={stats.saved} max={goal.target} tone={stats.ratio >= 1 ? "positive" : "primary"} height={12} label={goal.name} />
      <div className="b-goal-facts">
        {stats.needed != null ? <div><small>Precisa guardar</small><span><Money value={stats.needed} cents={false} />/mês</span></div> : null}
        <div><small>Você planeja</small><span><Money value={goal.monthly || 0} cents={false} />/mês</span></div>
        {stats.needed != null ? <Badge tone={stats.onTrack ? "positive" : "warning"} icon={stats.onTrack ? "check" : "alert"}>{stats.onTrack ? "No ritmo" : "Abaixo do ritmo"}</Badge> : null}
      </div>
      {simulate ? (
        <div className="b-goal-sim">
          <label>Se eu guardar <strong><Money value={sim} cents={false} /></strong> por mês</label>
          <input type="range" min={50} max={Math.max(1000, Math.ceil(stats.left / 100) * 10)} step={50} value={sim} onChange={e => setSim(Number(e.target.value))} aria-label="Simular valor mensal" />
          <p>{stats.left <= 0 ? "Meta atingida." : eta ? <>atinjo a meta em <strong>{eta + (eta === 1 ? " mês" : " meses")}</strong> ({monthLabel(addMonths(month, eta))}).</> : ""}</p>
        </div>
      ) : null}
      {onContribute ? <Button variant="secondary" icon="plus" block onClick={onContribute}>Guardar nesta meta</Button> : null}
    </div>
  );
}

export const EVENT_TYPES = [
  { type: "income", label: "Recebimento", icon: "arrowDownLeft" },
  { type: "bill", label: "Conta", icon: "repeat" },
  { type: "card", label: "Fatura de cartão", icon: "card" },
  { type: "refund", label: "Reembolso", icon: "users" },
  { type: "goal", label: "Aporte em meta", icon: "target" },
];

export function CalendarMonth({ month, events, today, selected, onSelect }: { month: string; events: { date: string; type: string }[]; today: string; selected?: number; onSelect?: (d: number) => void }) {
  const first = new Date(month + "-01T12:00:00").getDay();
  const n = dim(month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= n; d++) cells.push(d);
  const byDay: Record<number, { type: string }[]> = {};
  events.forEach(e => { const k = dayOf(e.date); (byDay[k] = byDay[k] || []).push(e); });
  return (
    <div className="b-cal">
      {WEEK.map(w => <span key={w} className="b-cal-wd">{w}</span>)}
      {cells.map((d, i) => d == null ? <span key={"e" + i} /> : (
        <button key={d} type="button" className={cx("b-cal-day", dateIn(month, d) === today && "is-today", selected === d && "is-sel", dateIn(month, d) < today && "is-past")}
          onClick={() => onSelect?.(d)} aria-label={d + " de " + monthLabel(month) + (byDay[d] ? ", " + byDay[d].length + " eventos" : "")}>
          <span className="b-cal-n">{d}</span>
          {byDay[d] ? <span className="b-cal-dots">{byDay[d].slice(0, 4).map((e, j) => <i key={j} className={"b-ev b-ev-" + e.type} />)}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function AllocationRule({ c, savePct, onEditPct }: { c: Month; savePct: number; onEditPct?: () => void }) {
  const guardar = c.metaGuardar;
  const orc = c.orcado;
  const sobra = round2(c.receitas - guardar - orc);
  const items = [
    { k: "Guardar e investir", v: guardar, cls: "b-seg-save", note: savePct + "% de tudo que entrou" },
    { k: "Orçamento das categorias", v: orc, cls: "b-seg-budget", note: "soma dos limites" },
    { k: sobra >= 0 ? "Sem destino" : "Planejado além da renda", v: sobra, cls: sobra >= 0 ? "b-seg-free" : "b-seg-over", note: sobra >= 0 ? "folga do plano" : "reduza limites" },
  ];
  return (
    <div className="b-alloc">
      <div className="b-alloc-head">
        <div><span className="b-muted">{"Entrou em " + monthLabel(c.month)}</span><div className="b-alloc-total"><Money value={c.receitas} /></div></div>
        {onEditPct ? <Button variant="secondary" size="sm" icon="sliders" onClick={onEditPct}>{"Guardar " + savePct + "%"}</Button> : null}
      </div>
      <div className="b-stack b-stack-lg">{items.filter(i => i.v > 0).map(i => <span key={i.k} className={cx("b-stack-seg", i.cls)} style={{ flexGrow: i.v }} />)}</div>
      <ul className="b-waterfall">
        {items.map(i => (
          <li key={i.k}>
            <span className={cx("b-wf-dot", i.cls)} />
            <span className="b-wf-label">{i.k}<small>{i.note}</small></span>
            <Money value={i.v} tone={i.v < 0 ? "negative" : undefined} />
          </li>
        ))}
      </ul>
      <p className="b-alloc-note"><Icon name="info" size={16} />Os valores em % são recalculados sempre que você registra uma nova entrada no mês.</p>
    </div>
  );
}
