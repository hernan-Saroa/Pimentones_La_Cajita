'use client';
import { useMemo, useRef, useState } from 'react';
import { Bar, cls, fmtShortDay, money, moneyShort } from './kit';

/** Gráficas SVG sin dependencias para el backoffice. */

export { fmtDate, fmtDay } from './kit';

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};

/** Rellena los días sin datos para que la serie sea continua. */
export function fillDays(rows: { day: string; [k: string]: any }[], range: number | { from?: string; to?: string; days?: number }, key: string) {
  const by = new Map(rows.map((r) => [r.day, Number(r[key]) || 0]));
  const out: { label: string; value: number }[] = [];

  if (typeof range === 'object' && range.from && range.to) {
    const start = new Date(`${range.from}T12:00:00`);
    const end = new Date(`${range.to}T12:00:00`);
    const cur = new Date(start);
    while (cur <= end) {
      const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      out.push({ label: k, value: by.get(k) ?? 0 });
      cur.setDate(cur.getDate() + 1);
    }
  } else {
    const days = typeof range === 'number' ? range : (range?.days || 30);
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({ label: k, value: by.get(k) ?? 0 });
    }
  }
  return out;
}

export function AreaChart({ data, isMoney, height = 240, color = '#1b7a47' }: { data: { label: string; value: number }[]; isMoney?: boolean; height?: number; color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 720; const H = height; const L = 56; const R = 12; const T = 16; const B = 28;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const x = (i: number) => L + (data.length <= 1 ? (W - L - R) / 2 : (i / (data.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const path = useMemo(() => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' '), [data, max]); // eslint-disable-line react-hooks/exhaustive-deps
  const fmt = (v: number) => (isMoney ? moneyShort(v) : v.toLocaleString('es-CO'));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect(); if (!r || !data.length) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };
  const h = hover != null ? data[hover] : null;
  return (
    <div className="bo-chart" ref={ref} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfica de la serie diaria">
        <defs><linearGradient id="boArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".18" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {ticks.map((t, i) => <g key={i}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#eef0f3" strokeDasharray={i === 0 ? undefined : '3 4'} /><text x={L - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#98a2b3">{fmt(t)}</text></g>)}
        {data.map((d, i) => (i % labelEvery === 0 || i === data.length - 1) && <text key={d.label} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#98a2b3">{fmtShortDay(d.label + 'T12:00:00')}</text>)}
        {data.length > 0 && <path d={`${path} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#boArea)" />}
        <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => d.value > 0 && <circle key={i} cx={x(i)} cy={y(d.value)} r={hover === i ? 5 : 2.5} fill="#fff" stroke={color} strokeWidth="2" />)}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#d0d5dd" strokeDasharray="3 3" />}
      </svg>
      {h && <div className="bo-chart-tip" style={{ left: `${(x(hover!) / W) * 100}%` }}><span style={{ opacity: .7 }}>{new Date(h.label + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</span><b>{isMoney ? money(h.value) : `${h.value} ${h.value === 1 ? 'pedido' : 'pedidos'}`}</b></div>}
    </div>
  );
}

export function Distribution({ rows, isMoney, color }: { rows: { label: string; value: number; color?: string; sub?: string }[]; isMoney?: boolean; color?: string }) {
  const t = rows.reduce((s, r) => s + r.value, 0) || 1;
  if (!rows.length) return <p className="muted small">Sin datos en este periodo.</p>;
  return (
    <div className="bo-dist">
      {rows.map((r) => {
        const pct = Math.round((r.value / t) * 100);
        return (
          <div key={r.label} className="bo-dist-row">
            <div className="bo-dist-head"><span>{r.label}{r.sub && <span className="faint"> · {r.sub}</span>}</span><span><b>{isMoney ? money(r.value) : r.value.toLocaleString('es-CO')}</b><small>{pct}%</small></span></div>
            <Bar value={pct} color={r.color ?? color} />
          </div>
        );
      })}
    </div>
  );
}

export function Funnel({ steps }: { steps: { label: string; sessions: number }[] }) {
  const top = steps[0]?.sessions || 1;
  return (
    <div className="bo-funnel">
      {steps.map((s, i) => {
        const pct = Math.round((s.sessions / top) * 100);
        const prev = i > 0 ? steps[i - 1].sessions : null;
        const conv = prev ? Math.round((s.sessions / prev) * 100) : null;
        return (
          <div key={s.label} className="bo-funnel-row">
            <span className={cls(i === steps.length - 1 && 'strong')}>{s.label}</span>
            <div className="bo-funnel-bar"><span style={{ width: `${Math.max(pct, s.sessions ? 6 : 0)}%` }}>{s.sessions}</span></div>
            <span className="bo-funnel-drop">{conv == null ? '100%' : `${conv}%`}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Dona simple para participación (medios de pago). */
export function Donut({ rows, size = 120 }: { rows: { label: string; value: number; color: string }[]; size?: number }) {
  const t = rows.reduce((s, r) => s + r.value, 0);
  const r = 42; const c = 2 * Math.PI * r; let acc = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#eef0f3" strokeWidth="12" />
      {t > 0 && rows.map((row) => { const len = (row.value / t) * c; const el = <circle key={row.label} cx="50" cy="50" r={r} fill="none" stroke={row.color} strokeWidth="12" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} transform="rotate(-90 50 50)" />; acc += len; return el; })}
    </svg>
  );
}
