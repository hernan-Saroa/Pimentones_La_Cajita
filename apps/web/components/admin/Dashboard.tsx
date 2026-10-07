'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { METHOD_LABEL, type PaymentMethod } from '@lacajita/shared';
import { useAdmin, useMe, useShell } from './AdminShell';
import { Avatar, Bar, Card, EmptyState, Icon, PageHeader, PageSkeleton, Segmented, Skeleton, Stat, StatusBadge, Thumb, cls, firstName, money, plural, relTime, type IconName } from './kit';
import { AreaChart, Distribution, Donut, Funnel, fillDays } from './ui';

const METHOD_COLOR: Record<string, string> = { wompi: '#175cd3', transfer: '#1b7a47', cod: '#b54708' };

function greeting() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function getTodayBogota() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDaysAgoBogota(days: number) {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatCustomRange(fromStr?: string, toStr?: string) {
  if (!fromStr || !toStr) return '';
  const f = new Date(`${fromStr}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  const t = new Date(`${toStr}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${f} al ${t}`;
}

export function Dashboard() {
  const api = useAdmin();
  const me = useMe();
  const { counts } = useShell();

  // Selector de periodo: estándar (7, 30, 90, 365) o personalizado con fechas libres
  const todayStr = useMemo(() => getTodayBogota(), []);
  const [rangeMode, setRangeMode] = useState<number | 'custom'>(30);
  const [customFrom, setCustomFrom] = useState(() => getDaysAgoBogota(30));
  const [customTo, setCustomTo] = useState(() => getTodayBogota());
  const [filterQuery, setFilterQuery] = useState<{ days?: number; from?: string; to?: string }>({ days: 30 });

  const [d, setD] = useState<any>(() => api.getCache?.('admin:analytics?days=30') || null);
  const [f, setF] = useState<any>(() => api.getCache?.('admin:funnel?days=30') || null);
  const [recent, setRecent] = useState<any[] | null>(() => { const c = api.getCache?.('admin:orders?limit=6'); return Array.isArray(c) ? c : null; });
  const [products, setProducts] = useState<any[]>(() => { const c = api.getCache?.('admin:products'); return Array.isArray(c) ? c : []; });
  const [inv, setInv] = useState<any>(() => api.getCache?.('admin:inventory') || null);
  const [series, setSeries] = useState<'sales' | 'count'>('sales');
  const [error, setError] = useState('');

  useEffect(() => {
    const qKey = typeof filterQuery === 'number' ? `days=${filterQuery}` : new URLSearchParams(Object.entries(filterQuery).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString();
    const cachedD = api.getCache?.(`admin:analytics?${qKey}`);
    if (cachedD) setD(cachedD);
    api.analytics(filterQuery).then(setD).catch((e: Error) => setError(e.message));
    api.funnel(filterQuery).then(setF).catch(() => setF(null));
  }, [api, filterQuery]);

  useEffect(() => {
    api.orders({ limit: '6' }).then((r) => setRecent(Array.isArray(r) ? r : [])).catch(() => setRecent([]));
    api.products().then((r) => setProducts(Array.isArray(r) ? r : [])).catch(() => {});
    api.inventory().then(setInv).catch(() => {});
  }, [api]);

  const sales = useMemo(() => (d ? fillDays(d.daily, d.isCustom ? { from: d.from, to: d.to } : (d.days || 30), 'sales') : []), [d]);
  const ordersSeries = useMemo(() => (d ? fillDays(d.daily, d.isCustom ? { from: d.from, to: d.to } : (d.days || 30), 'count') : []), [d]);
  const imgBy = useMemo(() => new Map(products.map((p) => [p.name, p.image])), [products]);

  const handleApplyCustom = () => {
    if (!customFrom || !customTo) return;
    setFilterQuery({ from: customFrom, to: customTo });
  };

  if (error) return <EmptyState icon="alert" title="No pudimos cargar el tablero">{error}</EmptyState>;
  if (!d) return <PageSkeleton />;

  const k = d.kpis;
  const expiring = inv?.expiringBatches?.length ?? 0;
  const tasks: { n: number; label: string; done: string; icon: IconName; color: string; bg: string; href: string }[] = [
    { n: counts.pendingConfirmation, label: counts.pendingConfirmation === 1 ? 'pago por confirmar' : 'pagos por confirmar', done: 'Pagos al día', icon: 'card', color: '#b54708', bg: '#fef4e6', href: '/admin/pedidos?tab=pending' },
    { n: counts.toShip, label: counts.toShip === 1 ? 'pedido por despachar' : 'pedidos por despachar', done: 'Despachos al día', icon: 'truck', color: '#6941c6', bg: '#f4f0ff', href: '/admin/pedidos?tab=paid' },
    { n: counts.unread, label: counts.unread === 1 ? 'mensaje sin leer' : 'mensajes sin leer', done: 'Bandeja vacía', icon: 'inbox', color: '#175cd3', bg: '#eef4ff', href: '/admin/mensajes' },
    { n: counts.lowStock, label: counts.lowStock === 1 ? 'producto con inventario bajo' : 'productos con inventario bajo', done: 'Inventario sano', icon: 'layers', color: '#d1342f', bg: '#fdeceb', href: '/admin/inventario?f=attention' },
    { n: expiring, label: expiring === 1 ? 'lote por vencer' : 'lotes por vencer', done: 'Sin lotes por vencer', icon: 'calendar', color: '#0e7090', bg: '#ecfafd', href: '/admin/inventario' },
  ];
  const pending = tasks.filter((t) => t.n > 0).length;
  const periodSales = sales.reduce((s, x) => s + x.value, 0);
  const periodOrders = ordersSeries.reduce((s, x) => s + x.value, 0);
  const aovSpark = sales.map((s, i) => (ordersSeries[i].value ? s.value / ordersSeries[i].value : 0));
  const topMax = Math.max(...d.topProducts.map((t: any) => t.units), 1);
  const statusCount = (s: string) => d.byStatus.find((x: any) => x.status === s)?.n ?? 0;
  const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' });

  // Datos 100% reales provenientes de la base de datos (PostgreSQL events / orders)
  const trafficData = d.traffic || {};
  const topPages: any[] = trafficData.topPages || [];
  const devices: any[] = trafficData.devices || [];
  const sources: any[] = trafficData.sources || [];
  const assistantQueries: any[] = trafficData.assistantQueries || [];
  const totalSessions: number = trafficData.totalSessions || 0;
  const totalPageviews: number = trafficData.totalPageviews || 0;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName(me?.name || '') || 'equipo'}`}
        description={
          <>
            <span style={{ textTransform: 'capitalize' }}>{today}</span> ·{' '}
            {d.isCustom
              ? `Métricas ejecutivas para el rango personalizado del ${formatCustomRange(d.from, d.to)} (${d.days} días).`
              : `Métricas ejecutivas, atribución de tráfico y comportamiento de compra en los últimos ${d.days === 365 ? '12 meses' : `${d.days} días`}.`}
          </>
        }
        actions={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Segmented
                value={rangeMode}
                onChange={(val: any) => {
                  if (val === 'custom') {
                    setRangeMode('custom');
                    setFilterQuery({ from: customFrom, to: customTo });
                  } else {
                    setRangeMode(val);
                    setFilterQuery({ days: Number(val) });
                  }
                }}
                items={[
                  { value: 7, label: '7 días' },
                  { value: 30, label: '30 días' },
                  { value: 90, label: '90 días' },
                  { value: 365, label: '12 meses' },
                  { value: 'custom', label: 'Personalizado', icon: 'calendar' },
                ]}
              />
            </div>
            {rangeMode === 'custom' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '12px 14px',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div className="bo-row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="small muted" style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Atajos:</span>
                  {[
                    { id: 'today', label: 'Hoy' },
                    { id: 'yesterday', label: 'Ayer' },
                    { id: 'this_month', label: 'Este mes' },
                    { id: 'last_month', label: 'Mes anterior' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="bo-btn"
                      style={{ padding: '2px 8px', fontSize: 11, fontWeight: 600, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }}
                      onClick={() => {
                        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
                        const y = now.getFullYear();
                        const m = now.getMonth();
                        const d = now.getDate();
                        const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                        let from = '';
                        let to = '';
                        if (s.id === 'today') {
                          from = fmt(now);
                          to = fmt(now);
                        } else if (s.id === 'yesterday') {
                          const yDate = new Date(now);
                          yDate.setDate(d - 1);
                          from = fmt(yDate);
                          to = fmt(yDate);
                        } else if (s.id === 'this_month') {
                          from = fmt(new Date(y, m, 1));
                          to = fmt(now);
                        } else if (s.id === 'last_month') {
                          from = fmt(new Date(y, m - 1, 1));
                          to = fmt(new Date(y, m, 0));
                        }
                        setCustomFrom(from);
                        setCustomTo(to);
                        setFilterQuery({ from, to });
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="bo-row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="bo-row" style={{ gap: 4, alignItems: 'center' }}>
                    <span className="small muted" style={{ fontSize: 11, fontWeight: 650, color: 'var(--muted)' }}>Desde:</span>
                    <input
                      type="date"
                      value={customFrom}
                      max={customTo || todayStr}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      style={{
                        padding: '3px 8px',
                        fontSize: 12,
                        fontFamily: 'inherit',
                        border: '1px solid #d0d5dd',
                        borderRadius: 6,
                        background: '#fff',
                        color: 'var(--text)',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div className="bo-row" style={{ gap: 4, alignItems: 'center' }}>
                    <span className="small muted" style={{ fontSize: 11, fontWeight: 650, color: 'var(--muted)' }}>Hasta:</span>
                    <input
                      type="date"
                      value={customTo}
                      min={customFrom}
                      max={todayStr}
                      onChange={(e) => setCustomTo(e.target.value)}
                      style={{
                        padding: '3px 8px',
                        fontSize: 12,
                        fontFamily: 'inherit',
                        border: '1px solid #d0d5dd',
                        borderRadius: 6,
                        background: '#fff',
                        color: 'var(--text)',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCustom}
                    className="bo-btn bo-btn-primary"
                    style={{
                      padding: '3px 12px',
                      fontSize: 12,
                      fontWeight: 650,
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Icon name="check" size={13} /> Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
        }
      />

      {/* 1. Resumen Operativo Inmediato */}
      <section style={{ marginBottom: 24 }}>
        <div className="bo-between" style={{ marginBottom: 10 }}>
          <h2 style={{ fontSize: 14, fontWeight: 650 }}>Para hacer ahora en la tienda</h2>
          <span className="small muted">{pending ? plural(pending, 'frente con trabajo pendiente', 'frentes con trabajo pendiente') : 'Todo en orden'}</span>
        </div>
        {pending === 0 ? (
          <div className="bo-all-done"><Icon name="checkCircle" size={20} />Todo al día. No hay pagos por confirmar, despachos, mensajes ni alertas de inventario.</div>
        ) : (
          <div className="bo-tasks">
            {tasks.map((t) => (
              <Link key={t.href + t.label} href={t.href} prefetch={true} className={cls('bo-task', t.n === 0 && 'is-done')}>
                <div className="bo-task-top">
                  <span className="bo-task-icon" style={{ background: t.n ? t.bg : '#ecfdf3', color: t.n ? t.color : '#067647' }}>
                    <Icon name={t.n ? t.icon : 'checkCircle'} size={18} />
                  </span>
                  <Icon name="arrowRight" size={16} className="bo-task-arrow" />
                </div>
                <div className="bo-task-count">
                  {t.n > 0 ? (
                    t.n
                  ) : (
                    <span style={{ fontSize: 16, display: 'inline-flex', alignItems: 'center', gap: 5, color: '#067647' }}>
                      <Icon name="check" size={15} /> Al día
                    </span>
                  )}
                </div>
                <span className="bo-task-label">{t.n ? t.label : t.done}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 2. KPIs Financieros Principales */}
      <div className="bo-grid bo-grid-4" style={{ marginBottom: 16 }}>
        <Stat label="Ventas pagadas" icon="cash" tone="#1b7a47" value={money(k.sales.value)} delta={k.sales.change} spark={sales.map((s) => s.value)} />
        <Stat label="Pedidos pagados" icon="orders" tone="#175cd3" value={k.orders.value.toLocaleString('es-CO')} delta={k.orders.change} spark={ordersSeries.map((s) => s.value)} />
        <Stat label="Ticket promedio" icon="tag" tone="#6941c6" value={money(k.aov.value)} delta={k.aov.change} spark={aovSpark} />
        <Stat label="Frascos vendidos" icon="box" tone="#b54708" value={k.units.value.toLocaleString('es-CO')} hint={k.orders.value ? (() => { const avg = k.units.value / k.orders.value; return `${avg.toLocaleString('es-CO', { maximumFractionDigits: 1 })} ${avg === 1 ? 'frasco' : 'frascos'} por pedido`; })() : 'Sin ventas en el periodo'} />
      </div>

      <div className="bo-card bo-mini-stats" style={{ marginBottom: 24 }}>
        <div className="bo-mini-stat"><span>Clientes nuevos</span><b>{k.newCustomers.value}</b><small>{plural(k.newCustomers.repeat, 'recurrente', 'recurrentes')}</small></div>
        <div className="bo-mini-stat"><span>Conversión de visitas</span><b>{f ? `${f.conversion}%` : '—'}</b><small>{f ? `${f.steps[0]?.sessions ?? 0} sesiones únicas` : ''}</small></div>
        <div className="bo-mini-stat"><span>Pagos abandonados</span><b>{f ? f.abandoned : '—'}</b><small>iniciaron el pago y no compraron</small></div>
        <div className="bo-mini-stat"><span>Descuentos con cupones</span><b>{money(k.discounts.value)}</b><small>{plural(d.ops.subscribers, 'suscriptor', 'suscriptores')} al boletín</small></div>
      </div>

      {/* 3. Secciones Más Visitadas y su Conversión a Ventas (Datos 100% reales) */}
      <section style={{ marginBottom: 24 }}>
        <Card
          title="Secciones Más Visitadas y su Conversión a Ventas"
          description={`Tráfico real de la tienda (${totalPageviews} páginas vistas en ${totalSessions} sesiones). Analiza qué secciones despiertan más interés y cuáles convierten en carritos y compras.`}
          flush
        >
          {topPages.length === 0 ? (
            <EmptyState small icon="layers" title="Sin registros de navegación en el periodo" />
          ) : (
            <div className="bo-list">
              <div className="bo-section-item" style={{ background: '#f8fafc', fontWeight: 600, fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', borderBottom: '1px solid var(--border)' }}>
                <span>Página / Sección de la Tienda</span>
                <span style={{ textAlign: 'center' }}>Alcance de Sesiones</span>
                <span style={{ textAlign: 'right' }}>Vistas Totales</span>
                <span style={{ textAlign: 'right' }}>Agregaron al Carrito</span>
                <span style={{ textAlign: 'right' }}>Conversión a Compra</span>
              </div>
              {topPages.map((sec) => (
                <div key={sec.path} className="bo-section-item" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <div className="bo-row" style={{ gap: 8, alignItems: 'center' }}>
                      <b style={{ fontSize: 14 }}>{sec.label}</b>
                      {sec.path.startsWith('/producto') && <span className="bo-pill is-purple" style={{ fontSize: 10 }}>Producto</span>}
                      {sec.path === '/mi-pedido' && <span className="bo-pill is-blue" style={{ fontSize: 10 }}>Bolsa</span>}
                      {sec.path === '/pagar' && <span className="bo-pill is-green" style={{ fontSize: 10 }}>Checkout</span>}
                    </div>
                    <div className="small faint" style={{ marginTop: 2, fontFamily: 'monospace' }}>{sec.path} · {sec.desc}</div>
                  </div>

                  <div style={{ textAlign: 'center', minWidth: 120 }}>
                    <div className="bo-between small" style={{ marginBottom: 3 }}>
                      <span className="muted">{sec.sessions} ses.</span>
                      <b className="tnum">{sec.pct}%</b>
                    </div>
                    <Bar value={sec.pct} max={100} color="#175cd3" />
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <b className="tnum" style={{ fontSize: 14 }}>{sec.views.toLocaleString('es-CO')}</b>
                    <div className="small muted">vistas</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <b className="tnum" style={{ color: sec.cartAdds > 0 ? '#175cd3' : 'inherit', fontSize: 14 }}>{sec.cartAdds}</b>
                    <div className="small muted">sesiones</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {sec.conversion > 0 ? (
                      <div>
                        <span className="bo-pill is-green" style={{ fontSize: 12, fontWeight: 700 }}>{sec.conversion}% compra</span>
                        <div className="small muted" style={{ fontSize: 10.5, marginTop: 2 }}>{sec.buyers || 1} comp. / {sec.sessions} ses.</div>
                      </div>
                    ) : (
                      <span className="bo-pill" style={{ fontSize: 12, color: 'var(--muted)', background: '#f1f5f9' }}>0% compra</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* 4. Dispositivos & Fuentes de Tráfico (100% Reales) */}
      <div className="bo-grid bo-grid-2" style={{ marginBottom: 24 }}>
        {/* Dispositivos */}
        <Card
          title="Dispositivos: ¿En qué dispositivos ven la tienda?"
          description="Distribución real de sesiones por tipo de dispositivo detectado."
        >
          <div className="bo-stack" style={{ gap: 16 }}>
            {devices.map((dev) => {
              const tone = dev.device === 'mobile' ? '#175cd3' : dev.device === 'desktop' ? '#1b7a47' : '#b54708';
              return (
                <div key={dev.device} style={{ padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #eaecf0' }}>
                  <div className="bo-between" style={{ marginBottom: 6 }}>
                    <div className="bo-row" style={{ gap: 8, alignItems: 'center' }}>
                      <span style={{ width: 28, height: 28, borderRadius: 6, background: tone + '14', color: tone, display: 'grid', placeItems: 'center' }}>
                        <Icon name={dev.icon} size={16} />
                      </span>
                      <b>{dev.label}</b>
                    </div>
                    <span className="tnum strong" style={{ color: tone }}>{dev.pct}% ({dev.sessions} ses.)</span>
                  </div>
                  <Bar value={dev.pct} max={100} color={tone} />
                </div>
              );
            })}
            <p className="small muted">
              <Icon name="info" size={13} /> {devices.find((d) => d.device === 'mobile')?.pct ?? 0}% de los visitantes accede desde teléfonos móviles. Asegurar tiempos de carga rápidos en celulares es prioritario.
            </p>
          </div>
        </Card>

        {/* Fuentes de Tráfico */}
        <Card
          title="Fuentes de Tráfico"
          description="Canales de origen de los visitantes registrados."
        >
          {sources.length === 0 ? (
            <EmptyState small icon="globe" title="Sin fuentes registradas en el periodo" />
          ) : (
            <div className="bo-stack" style={{ gap: 16 }}>
              {sources.map((s) => (
                <div key={s.source} style={{ padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #eaecf0' }}>
                  <div className="bo-between" style={{ marginBottom: 6 }}>
                    <div className="bo-row" style={{ gap: 8, alignItems: 'center' }}>
                      <span style={{ width: 28, height: 28, borderRadius: 6, background: '#eff8ff', color: '#175cd3', display: 'grid', placeItems: 'center' }}>
                        <Icon name={s.icon} size={16} />
                      </span>
                      <b>{s.label}</b>
                    </div>
                    <span className="tnum strong" style={{ color: '#175cd3' }}>{s.pct}% ({s.sessions} ses.)</span>
                  </div>
                  <Bar value={s.pct} max={100} color="#175cd3" />
                </div>
              ))}
              <p className="small muted">
                <Icon name="link" size={13} /> El sistema rastrea parámetros UTM en campañas de Instagram, WhatsApp y Google para atribuir ventas directas a cada enlace.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* 5. Consultas Reales al Asistente Culinario */}
      <section style={{ marginBottom: 24 }}>
        <Card
          title="Consultas Reales al Asistente Culinario (“¿Qué vas a cocinar?”)"
          description="Platos y recetas que los visitantes buscaron en la tienda para saber con qué producto acompañarlos."
        >
          {assistantQueries.length === 0 ? (
            <p className="small muted">Aún no se han registrado preguntas en el asistente culinario en este periodo.</p>
          ) : (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                {assistantQueries.map((q) => (
                  <div key={q.query} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 20, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <Icon name="sparkle" size={14} style={{ color: '#16a34a' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>“{q.query}”</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#16a34a', color: '#fff' }}>{q.count} {q.count === 1 ? 'consulta' : 'consultas'}</span>
                  </div>
                ))}
              </div>
              <p className="small muted">
                <Icon name="sparkle" size={13} /> Estas búsquedas muestran las ocasiones de consumo más solicitadas por los clientes (desayunos, hamburguesas, asados). Puedes destacar estas recetas en la portada para elevar la conversión.
              </p>
            </div>
          )}
        </Card>
      </section>

      {/* 6. Tendencia Diaria y Pedidos Recientes */}
      <div className="bo-grid bo-grid-main" style={{ marginBottom: 16 }}>
        <Card
          title={series === 'sales' ? 'Ventas por día' : 'Pedidos por día'}
          description={series === 'sales' ? `${money(periodSales)} en el periodo` : `${plural(periodOrders, 'pedido pagado', 'pedidos pagados')} en el periodo`}
          actions={<Segmented value={series} onChange={setSeries} items={[{ value: 'sales', label: 'Ventas' }, { value: 'count', label: 'Pedidos' }]} />}
        >
          {periodOrders === 0 ? <EmptyState small icon="trendUp" title="Aún no hay ventas pagadas en este periodo">Cuando confirmes pagos, aquí verás la tendencia diaria.</EmptyState>
            : <AreaChart data={series === 'sales' ? sales : ordersSeries} isMoney={series === 'sales'} color={series === 'sales' ? '#1b7a47' : '#175cd3'} />}
        </Card>
        <Card title="Pedidos recientes" actions={<Link href="/admin/pedidos" className="bo-link small">Ver todos <Icon name="arrowRight" size={14} /></Link>} flush>
          <div className="bo-list" style={{ paddingBottom: 8, paddingTop: 8 }}>
            {!recent ? <ListSkeleton rows={5} /> : recent.length === 0 ? <EmptyState small icon="orders" title="Sin pedidos todavía" /> : recent.map((o) => (
              <Link key={o.id} href={`/admin/pedidos?id=${o.id}`} className="bo-list-item is-click">
                <Avatar name={o.customerName} size={34} />
                <div className="grow"><b>{o.customerName}</b><div className="sub">{o.reference} · {relTime(o.createdAt)}</div></div>
                <div style={{ textAlign: 'right' }}><div className="strong tnum">{money(o.total)}</div><div style={{ marginTop: 3 }}><StatusBadge status={o.status} /></div></div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* 7. Productos Más Vendidos, Embudo de Compra y Medios de Pago */}
      <div className="bo-grid bo-grid-3" style={{ marginBottom: 16 }}>
        <Card title="Más vendidos" description="Frascos vendidos en el periodo" flush>
          {d.topProducts.length === 0 ? <EmptyState small icon="tag" title="Sin ventas en el periodo" /> : (
            <div className="bo-list" style={{ padding: '8px 0' }}>
              {d.topProducts.slice(0, 5).map((t: any, i: number) => (
                <div key={t.name} className="bo-list-item">
                  <span className="faint tnum" style={{ width: 14, fontWeight: 600 }}>{i + 1}</span>
                  <Thumb src={imgBy.get(t.name)} size={38} />
                  <div className="grow"><b style={{ fontSize: 13 }}>{t.name}</b><div style={{ marginTop: 6 }}><Bar value={t.units} max={topMax} /></div></div>
                  <div style={{ textAlign: 'right' }}><div className="strong tnum">{t.units} u.</div><div className="small muted tnum">{money(t.sales)}</div></div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Embudo de compra" description={f ? `Conversión visita → compra: ${f.conversion}%` : 'Sesiones de la tienda'}>
          {f ? <><Funnel steps={f.steps} />{f.assistantQueries > 0 && <p className="small muted" style={{ marginTop: 14 }}><Icon name="sparkle" size={13} /> {plural(f.assistantQueries, 'consulta', 'consultas')} al asistente “¿Qué vas a cocinar?”</p>}</> : <p className="muted small">Sin datos de navegación.</p>}
        </Card>
        <Card title="Cómo pagan" description="Ventas pagadas por medio de pago">
          {d.byMethod.length === 0 ? <EmptyState small icon="card" title="Sin pagos en el periodo" /> : (
            <div className="bo-row" style={{ gap: 20, alignItems: 'center' }}>
              <Donut rows={d.byMethod.map((m: any) => ({ label: m.method, value: m.sales, color: METHOD_COLOR[m.method] ?? '#98a2b3' }))} />
              <div className="bo-stack" style={{ gap: 10, flex: 1 }}>
                {d.byMethod.map((m: any) => (
                  <div key={m.method} className="bo-between small">
                    <span className="bo-row" style={{ gap: 8 }}><i style={{ width: 9, height: 9, borderRadius: 3, background: METHOD_COLOR[m.method] }} />{METHOD_LABEL[m.method as PaymentMethod]}</span>
                    <span className="strong tnum">{money(m.sales)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 8. Ciudades e Inventario */}
      <div className="bo-grid bo-grid-2">
        <Card title="Ciudades" description="Dónde compran tus clientes">
          <Distribution isMoney rows={d.byCity.slice(0, 6).map((c: any) => ({ label: c.city, sub: `${c.n} ped.`, value: c.sales }))} />
        </Card>
        <Card title="Inventario de Conservas" description="Frascos disponibles por producto" actions={<Link href="/admin/inventario" className="bo-link small">Gestionar <Icon name="arrowRight" size={14} /></Link>}>
          {!inv ? <ListSkeleton rows={4} bare /> : (
            <div className="bo-stack" style={{ gap: 14 }}>
              {inv.products.filter((p: any) => p.active).map((p: any) => {
                const color = p.stock === 0 ? '#d1342f' : p.stock <= 5 ? '#d1342f' : p.stock <= 12 ? '#b54708' : '#1b7a47';
                return (
                  <div key={p.id} className="bo-row" style={{ gap: 12 }}>
                    <Thumb src={imgBy.get(p.name)} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="bo-between small"><span className="strong">{p.name}</span><span className="tnum" style={{ color, fontWeight: 650 }}>{p.stock} u.</span></div>
                      <div style={{ marginTop: 6 }}><Bar value={p.stock} max={Math.max(40, ...inv.products.map((x: any) => x.stock))} color={color} /></div>
                    </div>
                  </div>
                );
              })}
              <p className="small muted">Pedidos en el periodo: {statusCount('pending')} esperando pago · {statusCount('delivered')} entregados · {statusCount('cancelled') + statusCount('failed')} cancelados o rechazados.</p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

/** Filas fantasma mientras llegan los datos de una tarjeta (avatar + dos líneas). */
function ListSkeleton({ rows, bare }: { rows: number; bare?: boolean }) {
  return (
    <div className="bo-stack" style={{ gap: 14, padding: bare ? 0 : '12px 20px' }} aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="bo-row" style={{ gap: 12 }}>
          <Skeleton w={34} h={34} r={bare ? 8 : 17} />
          <div className="bo-stack" style={{ gap: 6, flex: 1 }}><Skeleton w={`${70 - i * 8}%`} h={12} /><Skeleton w="40%" h={10} /></div>
        </div>
      ))}
    </div>
  );
}
