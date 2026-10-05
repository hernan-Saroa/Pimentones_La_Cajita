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
  const n = Math.max(data.length, 7);
  const step = 100 / n;
  const barW = step * 0.55;
  return (
    <div className="chart">
      <svg viewBox="0 0 100 44" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="chartBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        {/* Línea base sutil */}
        <line x1="0" y1="40" x2="100" y2="40" stroke="#e2e8f0" strokeWidth="0.5" />
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * 34, 1.5);
          const x = i * step + (step - barW) / 2;
          const y = 40 - h;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx="1"
              fill="url(#chartBarGrad)"
            >
              <title>{d.label}: {money ? cop(d.value) : d.value}</title>
            </rect>
          );
        })}
      </svg>
      <div className="chart-x">
        <span>{data[0]?.label}</span>
        {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.label}</span>}
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function Distribution({ rows, total, money }: { rows: { label: string; value: number }[]; total?: number; money?: boolean }) {
  const t = total ?? (rows.reduce((s, r) => s + r.value, 0) || 1);
  return (
    <ul className="dist">
      {rows.map((r) => {
        const pct = Math.round((r.value / t) * 100);
        return (
          <li key={r.label}>
            <div className="dist-head">
              <span>{r.label}</span>
              <div>
                <b>{money ? cop(r.value) : r.value}</b>
                <small>{pct}%</small>
              </div>
            </div>
            <div className="dist-bar">
              <span style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export const fmtDate = (d: string | Date) => new Date(d).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
export const fmtDay = (d: string | Date) => new Date(d).toLocaleDateString('es-CO', { dateStyle: 'medium' });
