'use client';
import { cop } from '@lacajita/shared';

/** Piezas pequeñas del backoffice: gráficas SVG sin dependencias, tarjetas de KPI, barras de distribución. */
export function Kpi({ label, value, change, hint, money }: { label: string; value: number; change?: number | null; hint?: string; money?: boolean }) {
  return (
    <div className="kpi">
      <span>{label}</span>
      <strong>{money ? cop(value) : value.toLocaleString('es-CO')}</strong>
      <small>{change == null ? hint ?? '' : <><b className={change >= 0 ? 'up' : 'down'}>{change >= 0 ? '▲' : '▼'} {Math.abs(change)}%</b> vs. periodo anterior</>}</small>
    </div>
  );
}

export function BarChart({ data, money }: { data: { label: string; value: number }[]; money?: boolean }) {
  if (!data.length) return <p className="muted">Sin datos en este periodo.</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 100 / data.length;
  return (
    <div className="chart">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        {data.map((d, i) => { const h = (d.value / max) * 36; return <rect key={i} x={i * w + w * 0.15} y={40 - h} width={w * 0.7} height={h} rx="0.6" fill="var(--green)"><title>{d.label}: {money ? cop(d.value) : d.value}</title></rect>; })}
      </svg>
      <div className="chart-x"><span>{data[0].label}</span><span>{data[data.length - 1].label}</span></div>
    </div>
  );
}

export function Distribution({ rows, total, money }: { rows: { label: string; value: number }[]; total?: number; money?: boolean }) {
  const t = total ?? (rows.reduce((s, r) => s + r.value, 0) || 1);
  return (
    <ul className="dist">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="dist-head"><span>{r.label}</span><b>{money ? cop(r.value) : r.value}</b><small>{Math.round((r.value / t) * 100)}%</small></div>
          <div className="dist-bar"><span style={{ width: `${(r.value / t) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export const fmtDate = (d: string | Date) => new Date(d).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
export const fmtDay = (d: string | Date) => new Date(d).toLocaleDateString('es-CO', { dateStyle: 'medium' });
