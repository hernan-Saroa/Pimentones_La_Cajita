'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin, useCan, useShell } from './AdminShell';
import {
  Badge, Bar, Button, Card, Chips, Drawer, EmptyState, Field, Icon, Input, PageHeader, SearchInput, Section, Segmented, Select, Stat,
  TableSkeleton, Tabs, Textarea, Thumb, cls, fmtDate, fmtDay, money, moneyShort, norm, plural, relTime, useUI,
} from './kit';

/**
 * Inventario: salud de cada producto en lenguaje claro, lotes de producción con vencimiento (trazabilidad)
 * y ajustes rápidos con motivos predefinidos. Todo movimiento queda registrado con quién y por qué.
 */
const LOW = 5;
type Row = { id: number; name: string; stock: number; active: boolean; sold30d: number; daysOfStock: number | null; price: number; image: string | null; slug: string };
type Batch = { id: number; productId: number; code: string; quantity: number; producedAt: string; expiresAt: string | null; note: string | null };
type Tab = 'batch' | 'adjust' | 'history';

/** Fecha del calendario local (no UTC: en Bogotá, después de las 7 p. m. UTC ya es “mañana”). */
const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayISO = () => localISO(new Date());
const addMonths = (base: string, m: number) => { const d = new Date(base + 'T00:00:00'); d.setMonth(d.getMonth() + m); return localISO(d); };
const toISO = (d: string) => new Date(d + 'T00:00:00').toISOString();
const initials = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter((w) => w.length > 2).map((w) => w[0]).join('').toUpperCase().slice(0, 3) || 'LC';
const suggestCode = (name: string) => { const d = new Date(); return `L${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${initials(name)}`; };

/** Cobertura en palabras: cuánto dura el inventario al ritmo de venta de los últimos 30 días. */
function coverage(r: Pick<Row, 'stock' | 'daysOfStock' | 'sold30d'>): { label: string; sub: string; tone: 'red' | 'amber' | 'green' | 'gray' } {
  if (r.stock <= 0) return { label: 'Agotado', sub: r.sold30d ? `Se vendieron ${r.sold30d} en 30 días` : 'Registra un lote para volver a vender', tone: 'red' };
  if (r.daysOfStock == null) return { label: 'Sin ventas recientes', sub: 'No hubo ventas en 30 días', tone: 'gray' };
  const d = r.daysOfStock;
  const label = d < 1 ? 'Menos de un día' : d < 14 ? `≈ ${plural(d, 'día', 'días')}` : d < 60 ? `≈ ${plural(Math.round(d / 7), 'semana', 'semanas')}` : `≈ ${plural(Math.round(d / 30), 'mes', 'meses')}`;
  return { label, sub: `Al ritmo de ${r.sold30d} por mes`, tone: d <= 7 ? 'red' : d <= 21 ? 'amber' : 'green' };
}
const needsAttention = (r: Row) => r.active && (r.stock <= LOW || (r.daysOfStock != null && r.daysOfStock <= 14));
const TONE_COLOR = { red: 'var(--red)', amber: '#f79009', green: 'var(--brand)', gray: '#98a2b3' } as const;

export function Inventory() {
  const api = useAdmin(); const can = useCan(); const canWrite = can('ops');
  const sp = useSearchParams(); const router = useRouter(); const pathname = usePathname();
  const [rows, setRows] = useState<Row[] | null>(() => {
    const inv = api.getCache?.('admin:inventory');
    const prods = api.getCache?.('admin:products');
    if (inv?.products && Array.isArray(inv.products) && Array.isArray(prods)) {
      const byId = new Map<number, any>(prods.map((p: any) => [p.id, p]));
      return inv.products.map((r: any) => ({ ...r, price: byId.get(r.id)?.price ?? 0, image: byId.get(r.id)?.image ?? null, slug: byId.get(r.id)?.slug ?? '' }));
    }
    return null;
  });
  const [expiring, setExpiring] = useState<Batch[]>(() => api.getCache?.('admin:inventory')?.expiringBatches ?? []);
  const [error, setError] = useState('');
  const [q, setQ] = useState(''); const [f, setF] = useState<'all' | 'attention' | 'expiring' | 'hidden'>((sp.get('f') as any) || 'all');
  const [batchOpen, setBatchOpen] = useState(sp.get('lote') === '1');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const openId = Number(sp.get('id')) || null;
  const openTab = (sp.get('tab') as Tab) || 'batch';

  const load = useCallback(async () => {
    try {
      const [inv, prods] = await Promise.all([api.inventory(), api.products()]);
      const prodArr = Array.isArray(prods) ? prods : [];
      const invProds = Array.isArray(inv?.products) ? inv.products : [];
      const byId = new Map<number, any>(prodArr.map((p: any) => [p.id, p]));
      setRows(invProds.map((r: any) => ({ ...r, price: byId.get(r.id)?.price ?? 0, image: byId.get(r.id)?.image ?? null, slug: byId.get(r.id)?.slug ?? '' })));
      setExpiring(inv?.expiringBatches ?? []); setError('');
    } catch (e) { setError((e as Error).message); }
  }, [api]);
  useEffect(() => { load(); }, [load]);
  // La URL manda: «Requieren atención», «Por vencer» o «Ingresar lote» desde el menú lateral funcionan aunque ya estés aquí.
  useEffect(() => {
    setF((sp.get('f') as any) || 'all');
    if (sp.get('lote') === '1') setBatchOpen(true);
  }, [sp]);

  const setParams = (patch: Record<string, string | null>) => { const p = new URLSearchParams(sp.toString()); Object.entries(patch).forEach(([k, v]) => (v == null ? p.delete(k) : p.set(k, v))); router.replace(`${pathname}${p.toString() ? `?${p}` : ''}`, { scroll: false }); };
  const open = (id: number, tab: Tab = 'batch') => setParams({ id: String(id), tab });

  const all = rows ?? [];
  const m = useMemo(() => ({
    units: all.filter((r) => r.active).reduce((s, r) => s + r.stock, 0),
    value: all.reduce((s, r) => s + r.stock * r.price, 0),
    attention: all.filter(needsAttention).length,
    hidden: all.filter((r) => !r.active).length,
  }), [all]);
  const expiringProductIds = useMemo(() => new Set(expiring.map((b) => b.productId)), [expiring]);
  const list = useMemo(() => {
    const s = norm(q.trim());
    const r = all.filter((x) => {
      if (s && !norm(x.name).includes(s)) return false;
      if (f === 'attention') return needsAttention(x);
      if (f === 'expiring') return expiringProductIds.has(x.id);
      if (f === 'hidden') return !x.active;
      return true;
    });
    // Primero lo urgente: agotados, luego por cobertura ascendente
    return r.sort((a, b) => Number(b.active) - Number(a.active) || (a.stock <= 0 ? -1 : 0) - (b.stock <= 0 ? -1 : 0) || (a.daysOfStock ?? 9999) - (b.daysOfStock ?? 9999));
  }, [all, q, f, expiringProductIds]);
  const sel = openId ? all.find((r) => r.id === openId) ?? null : null;
  const nameOf = (id: number) => all.find((r) => r.id === id)?.name ?? `Producto ${id}`;

  return (
    <>
      <PageHeader
        title="Inventario"
        description={
          rows ? (
            <span className="bo-row" style={{ gap: 8, alignItems: 'center', fontSize: 13, flexWrap: 'wrap' }}>
              <span>{plural(m.units, 'frasco en bodega', 'frascos en bodega')}</span>
              <span className="muted">·</span>
              <span>{moneyShort(m.value)} a precio de venta</span>
              {m.attention > 0 ? (
                <Badge tone="amber" icon="alert">
                  {plural(m.attention, 'requiere atención', 'requieren atención')}
                </Badge>
              ) : (
                <Badge tone="green" icon="checkCircle">
                  Stock al día
                </Badge>
              )}
              {expiring.length > 0 && (
                <Badge tone="pink" icon="calendar">
                  {plural(expiring.length, 'lote por vencer', 'lotes por vencer')}
                </Badge>
              )}
            </span>
          ) : 'Cargando inventario…'
        }
        actions={
          canWrite && (
            <div className="bo-row" style={{ gap: 10, alignItems: 'center' }}>
              <Button variant="secondary" icon="sliders" onClick={() => setAdjustOpen(true)}>
                Ajuste rápido
              </Button>
              <Button variant="primary" icon="plus" onClick={() => setBatchOpen(true)}>
                Ingresar lote
              </Button>
            </div>
          )
        }
      />

      <div className="bo-grid bo-grid-4" style={{ marginBottom: 16 }}>
        <Stat label="Frascos en bodega" icon="box" value={rows ? m.units.toLocaleString('es-CO') : '—'} hint="De productos visibles en la tienda" />
        <Stat label="Valor del inventario" icon="cash" tone="#1b7a47" value={rows ? moneyShort(m.value) : '—'} hint="A precio de venta" />
        <Stat label="Requieren atención" icon="alert" tone="#b54708" value={rows ? m.attention : '—'} hint={`Con ${LOW} frascos o menos, o para menos de 2 semanas`} />
        <Stat label="Lotes por vencer" icon="calendar" tone="#c11574" value={rows ? expiring.length : '—'} hint="En los próximos 30 días" />
      </div>

      {expiring.length > 0 && (
        <div className="bo-callout bo-callout--pink" style={{ marginBottom: 16 }}>
          <Icon name="calendar" size={16} />
          <div style={{ flex: 1 }}>
            <b>{plural(expiring.length, 'lote vence', 'lotes vencen')} pronto.</b> Dales salida primero (degustaciones, combos o un cupón).
            <div className="bo-chips" style={{ marginTop: 8 }}>
              {expiring.map((b) => <button key={b.id} className="bo-chip" onClick={() => open(b.productId, 'history')}><Icon name="layers" size={13} /><span className="mono">{b.code}</span> · {nameOf(b.productId)} · vence {relTime(b.expiresAt!)}</button>)}
            </div>
          </div>
        </div>
      )}

      <Card flush>
        <Tabs
          value={f}
          onChange={(v) => { setF(v as any); setParams({ f: v === 'all' ? null : v }); }}
          items={[
            { value: 'all', label: 'Todos', icon: 'box', count: all.length },
            { value: 'attention', label: 'Requieren atención', icon: 'alert', count: m.attention, alert: m.attention > 0 },
            ...(expiring.length > 0
              ? [{ value: 'expiring', label: 'Por vencer (30d)', icon: 'calendar', count: expiring.length, alert: true } as const]
              : []),
            { value: 'hidden', label: 'Ocultos', icon: 'eyeOff', count: m.hidden },
          ]}
        />
        <div className="bo-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar producto por nombre..." />
          {(q || f !== 'all') && (
            <Button size="sm" variant="ghost" icon="x" onClick={() => { setQ(''); setF('all'); setParams({ f: null }); }}>
              Limpiar filtros
            </Button>
          )}
          {canWrite && (
            <div className="bo-toolbar-right">
              <Button size="sm" variant="secondary" icon="plus" onClick={() => setBatchOpen(true)}>
                Ingresar lote
              </Button>
            </div>
          )}
        </div>
        {error ? <EmptyState icon="alert" title="No pudimos cargar el inventario" action={<Button onClick={load}>Reintentar</Button>}>{error}</EmptyState>
          : !rows ? <TableSkeleton rows={4} cols={5} />
          : list.length === 0 ? (f === 'attention' ? <EmptyState icon="checkCircle" title="Todo en orden">Ningún producto está por agotarse.</EmptyState> : <EmptyState icon="search" title="Sin resultados">Prueba con otro nombre o quita los filtros.</EmptyState>)
          : (
            <div className="bo-table-wrap">
              <table className="bo-table">
                <thead><tr><th>Producto</th><th>En bodega</th><th>Te alcanza para</th><th className="r bo-hide-sm">Vendidos 30 días</th><th className="r bo-hide-sm">Valor</th><th className="w-act" style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
                <tbody>
                  {list.map((r) => {
                    const c = coverage(r); const max = Math.max(r.stock, r.sold30d * 2, 24);
                    return (
                      <tr key={r.id} className="is-click" onClick={() => open(r.id, 'history')} style={!r.active ? { opacity: .6 } : undefined}>
                        <td><div className="bo-cell-main"><Thumb src={r.image} size={40} /><div><b className="bo-row" style={{ gap: 6 }}>{r.name}{!r.active && <Badge tone="outline">Oculto</Badge>}</b><span>{money(r.price)} c/u</span></div></div></td>
                        <td>
                          <div className="bo-health">
                            <div className="bo-health-top"><b className={cls(r.active && r.stock <= 0 && 'bo-t-red')}>{r.stock}</b>{r.active && r.stock > 0 && r.stock <= LOW && <Badge tone="amber">Bajo</Badge>}{r.active && r.stock <= 0 && <Badge tone="red">Agotado</Badge>}</div>
                            <Bar value={r.stock} max={max} color={TONE_COLOR[r.active ? c.tone : 'gray']} />
                          </div>
                        </td>
                        <td>
                          <div className="bo-cover">
                            <div className="bo-row" style={{ gap: 6, alignItems: 'center' }}>
                              <Badge tone={r.active ? c.tone : 'gray'}>{c.label}</Badge>
                            </div>
                            <span className="small muted" style={{ marginTop: 2 }}>{c.sub}</span>
                          </div>
                        </td>
                        <td className="r tnum bo-hide-sm">{r.sold30d}</td>
                        <td className="r money bo-hide-sm">{money(r.stock * r.price)}</td>
                        <td className="w-act" onClick={(e) => e.stopPropagation()}>
                          <div className="bo-row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                            {canWrite && (
                              <Button
                                size="sm"
                                variant="soft"
                                icon="plus"
                                onClick={() => open(r.id, 'batch')}
                                title={`Ingresar nuevo lote de ${r.name}`}
                              >
                                Lote
                              </Button>
                            )}
                            {canWrite && (
                              <Button
                                size="sm"
                                variant="secondary"
                                icon="sliders"
                                onClick={() => open(r.id, 'adjust')}
                                title={`Ajustar stock de ${r.name}`}
                              >
                                Ajustar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              icon="history"
                              onClick={() => open(r.id, 'history')}
                              title={`Ver historial de lotes y movimientos de ${r.name}`}
                            >
                              Historial
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        <div className="bo-card-foot small muted" style={{ justifyContent: 'flex-start', gap: 6 }}><Icon name="info" size={14} />“Te alcanza para” estima cuánto dura el inventario al ritmo de venta de los últimos 30 días. Las ventas descuentan frascos automáticamente.</div>
      </Card>

      {sel && <ProductDrawer key={sel.id} row={sel} tab={openTab} canWrite={canWrite} onTab={(t) => setParams({ tab: t })} onClose={() => setParams({ id: null, tab: null })} onChanged={load} />}
      {batchOpen && canWrite && (
        <Drawer open onClose={() => { setBatchOpen(false); setParams({ lote: null }); }} title="Registrar lote de producción" subtitle="Suma frascos al inventario con su código y vencimiento para tener trazabilidad.">
          <BatchForm products={all.filter((r) => r.active).concat(all.filter((r) => !r.active))} onDone={() => { setBatchOpen(false); setParams({ lote: null }); load(); }} />
        </Drawer>
      )}
      {adjustOpen && canWrite && (
        <Drawer
          open
          onClose={() => setAdjustOpen(false)}
          size="md"
          title="Ajuste rápido de inventario"
          subtitle="Modifica el stock por conteo físico, degustación, rotura o devolución. Cada movimiento queda registrado."
        >
          <AdjustForm
            products={all.filter((r) => r.active).concat(all.filter((r) => !r.active))}
            onDone={() => { setAdjustOpen(false); load(); }}
          />
        </Drawer>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
function ProductDrawer({ row, tab, canWrite, onTab, onClose, onChanged }: { row: Row; tab: Tab; canWrite: boolean; onTab: (t: Tab) => void; onClose: () => void; onChanged: () => void }) {
  const api = useAdmin();
  const [moves, setMoves] = useState<any[] | null>(null); const [batches, setBatches] = useState<Batch[] | null>(null);
  const loadHistory = useCallback(() => { api.movements(row.id).then(setMoves).catch(() => setMoves([])); api.batches(row.id).then(setBatches).catch(() => setBatches([])); }, [api, row.id]);
  useEffect(() => { loadHistory(); }, [loadHistory]);
  const c = coverage(row);
  const t: Tab = canWrite ? tab : 'history';
  const done = () => { onChanged(); loadHistory(); onTab('history'); };

  return (
    <Drawer open onClose={onClose} size="md" title={<span className="bo-row" style={{ gap: 10 }}><Thumb src={row.image} size={36} /><span>{row.name}</span></span>}
      subtitle={<>{row.active ? <Badge tone="green" dot>Visible</Badge> : <Badge tone="gray" dot>Oculto</Badge>}<span>{money(row.price)} por frasco</span></>}>
      <div className="bo-mini-stats bo-box" style={{ padding: 0, marginBottom: 18 }}>
        <div className="bo-mini-stat"><span>En bodega</span><b className={cls(row.stock <= 0 && 'bo-t-red')}>{row.stock}</b></div>
        <div className="bo-mini-stat"><span>Vendidos 30 días</span><b>{row.sold30d}</b></div>
        <div className="bo-mini-stat"><span>Te alcanza para</span><b style={{ fontSize: 14 }} className={cls(c.tone === 'red' && 'bo-t-red', c.tone === 'amber' && 'bo-t-amber')}>{c.label}</b></div>
        <div className="bo-mini-stat"><span>Valor</span><b>{moneyShort(row.stock * row.price)}</b></div>
      </div>
      {canWrite && (
        <div style={{ marginBottom: 18 }}>
          <Tabs
            value={t}
            onChange={onTab}
            items={[
              { value: 'batch', label: 'Registrar lote', icon: 'plus' },
              { value: 'adjust', label: 'Ajuste rápido', icon: 'sliders' },
              { value: 'history', label: 'Historial', icon: 'history' },
            ]}
          />
        </div>
      )}
      {t === 'batch' && <BatchForm product={row} onDone={done} />}
      {t === 'adjust' && <AdjustForm product={row} onDone={done} />}
      {t === 'history' && <History moves={moves} batches={batches} />}
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
function Stepper({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div className="bo-stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="Restar uno"><Icon name="minus" size={16} /></button>
      <input inputMode="numeric" value={value || ''} onChange={(e) => onChange(Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))} aria-label="Cantidad" />
      <button type="button" onClick={() => onChange(value + 1)} aria-label="Sumar uno"><Icon name="plus" size={16} /></button>
    </div>
  );
}

function BatchForm({ product, products, onDone }: { product?: Row; products?: Row[]; onDone: () => void }) {
  const api = useAdmin(); const { toast } = useUI(); const { refreshCounts } = useShell();
  const [pid, setPid] = useState<number>(product?.id ?? products?.[0]?.id ?? 0);
  const p = product ?? products?.find((x) => x.id === pid);
  const [code, setCode] = useState(() => suggestCode(p?.name ?? ''));
  const [qty, setQty] = useState(24); const [produced, setProduced] = useState(todayISO()); const [shelf, setShelf] = useState<number | 'custom' | 0>(6);
  const [expires, setExpires] = useState(addMonths(todayISO(), 6)); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (shelf && shelf !== 'custom') setExpires(addMonths(produced, shelf)); }, [shelf, produced]);
  useEffect(() => { if (!product && p) setCode(suggestCode(p.name)); }, [pid]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return <EmptyState small icon="tag" title="No hay productos">Crea un producto primero.</EmptyState>;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return toast('Escribe el código del lote.', 'error');
    if (qty < 1) return toast('La cantidad debe ser al menos 1.', 'error');
    setBusy(true);
    try {
      await api.addBatch({ productId: p.id, code: code.trim(), quantity: qty, producedAt: toISO(produced), expiresAt: shelf === 0 ? null : toISO(expires), note });
      toast(`Lote ${code.trim()} registrado: +${qty} frascos de ${p.name}`); refreshCounts(); onDone();
    } catch (err) { toast((err as Error).message, 'error'); }
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="bo-stack" style={{ gap: 18 }}>
      {!product && products && (
        <Field label="Producto">
          <Select value={pid} onChange={(e) => setPid(Number(e.target.value))}>{products.map((x) => <option key={x.id} value={x.id}>{x.name}{!x.active ? ' (oculto)' : ''} · {x.stock} en bodega</option>)}</Select>
        </Field>
      )}
      <div className="bo-form-grid">
        <Field group label="Código del lote" hint="Va impreso en la etiqueta del frasco.">
          <div className="bo-inline"><Input className="grow mono" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={40} /><Button size="sm" variant="ghost" icon="refresh" onClick={() => setCode(suggestCode(p.name))} title="Sugerir código" aria-label="Sugerir código" iconOnly /></div>
        </Field>
        <Field label="Fecha de producción"><Input type="date" value={produced} max={todayISO()} onChange={(e) => setProduced(e.target.value)} /></Field>
      </div>
      <Field group label="Frascos producidos">
        <div className="bo-row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <Stepper value={qty} onChange={setQty} />
          <div className="bo-chips">{[12, 24, 36, 48].map((n) => <button type="button" key={n} className={cls('bo-chip', qty === n && 'is-active')} onClick={() => setQty(n)}>{n} frascos</button>)}</div>
        </div>
      </Field>
      <Field group label="Consumir antes de" hint={shelf === 0 ? 'Sin fecha de vencimiento.' : `Vence el ${fmtDay(expires + 'T12:00:00')}.`}>
        <div className="bo-stack" style={{ gap: 10 }}>
          <div className="bo-chips">
            {([3, 6, 12] as const).map((n) => <button type="button" key={n} className={cls('bo-chip', shelf === n && 'is-active')} onClick={() => setShelf(n)}>+{n} meses</button>)}
            <button type="button" className={cls('bo-chip', shelf === 'custom' && 'is-active')} onClick={() => setShelf('custom')}><Icon name="calendar" size={13} />Otra fecha</button>
            <button type="button" className={cls('bo-chip', shelf === 0 && 'is-active')} onClick={() => setShelf(0)}>Sin vencimiento</button>
          </div>
          {shelf === 'custom' && <Input type="date" value={expires} min={produced} onChange={(e) => setExpires(e.target.value)} style={{ maxWidth: 220 }} />}
        </div>
      </Field>
      <Field label="Nota" optional><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Proveedor del pimentón, observaciones de la tanda" /></Field>
      <div className="bo-box bo-box--subtle bo-between">
        <div><span className="small muted">Inventario de {p.name}</span><div className="bo-preview-delta">{p.stock}<Icon name="arrowRight" size={18} /><span className="bo-t-green">{p.stock + qty}</span></div></div>
        <Button type="submit" variant="primary" icon="check" loading={busy}>Registrar +{qty}</Button>
      </div>
    </form>
  );
}

const REASONS = [
  { value: 'Conteo físico', icon: 'list', dir: 0 },
  { value: 'Feria gastronómica / Evento', icon: 'sparkle', dir: -1 },
  { value: 'Frasco roto o dañado', icon: 'alert', dir: -1 },
  { value: 'Degustación', icon: 'sparkle', dir: -1 },
  { value: 'Obsequio', icon: 'gift', dir: -1 },
  { value: 'Muestra a cliente', icon: 'user', dir: -1 },
  { value: 'Devolución de cliente', icon: 'undo', dir: 1 },
  { value: 'Otro motivo', icon: 'edit', dir: 0 },
] as const;

function AdjustForm({ product, products, onDone }: { product?: Row; products?: Row[]; onDone: () => void }) {
  const api = useAdmin(); const { toast } = useUI(); const { refreshCounts } = useShell();
  const [pid, setPid] = useState<number>(product?.id ?? products?.[0]?.id ?? 0);
  const p = product ?? products?.find((x) => x.id === pid);
  const [dir, setDir] = useState<-1 | 1>(-1); const [qty, setQty] = useState(1);
  const [reason, setReason] = useState<string>(''); const [detail, setDetail] = useState(''); const [busy, setBusy] = useState(false);
  const [counted, setCounted] = useState<number>(p?.stock ?? 0);

  useEffect(() => {
    if (p) setCounted(p.stock);
  }, [p?.id, p?.stock]);

  if (!p) return <EmptyState small icon="tag" title="No hay productos">Crea un producto primero.</EmptyState>;

  // En un conteo físico se escribe lo que hay en la bodega y el sistema calcula la diferencia.
  const isCount = reason === 'Conteo físico';
  const delta = isCount ? counted - p.stock : dir * qty; const after = p.stock + delta;
  const note = [isCount ? `Conteo físico: ${counted} (antes ${p.stock})` : reason, detail.trim()].filter(Boolean).join(' · ');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return toast('Elige el motivo del ajuste.', 'error');
    if (reason === 'Otro motivo' && detail.trim().length < 3) return toast('Explica brevemente el motivo.', 'error');
    if (delta === 0) return toast(isCount ? 'El conteo coincide con el sistema: no hay nada que ajustar.' : 'La cantidad debe ser al menos 1.', isCount ? 'info' : 'error');
    if (after < 0) return toast(`No puedes dejar el inventario en negativo (hay ${p.stock}).`, 'error');
    setBusy(true);
    try { const r = await api.adjustStock({ productId: p.id, delta, note }); toast(`Inventario de ${p.name}: ${r.stock} frascos`); refreshCounts(); onDone(); }
    catch (err) { toast((err as Error).message, 'error'); }
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="bo-stack" style={{ gap: 18 }}>
      {!product && products && (
        <Field label="Producto a ajustar">
          <Select value={pid} onChange={(e) => setPid(Number(e.target.value))}>
            {products.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}{!x.active ? ' (oculto)' : ''} · {x.stock} en bodega
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field group label="¿Qué pasó?">
        <div className="bo-choices">
          {REASONS.map((r) => (
            <button type="button" key={r.value} className={cls('bo-choice', reason === r.value && 'is-active')} onClick={() => { setReason(r.value); if (r.dir) setDir(r.dir as -1 | 1); }}>
              <Icon name={r.icon} size={16} /><div><b>{r.value}</b></div>
            </button>
          ))}
        </div>
      </Field>
      {isCount ? (
        <Field group label="¿Cuántos frascos contaste?" hint={`El sistema tiene ${p.stock}. ${delta === 0 ? 'Coincide: no hay diferencia.' : delta > 0 ? `Sobran ${delta}: se sumarán.` : `Faltan ${-delta}: se restarán.`}`}>
          <Stepper value={counted} onChange={setCounted} min={0} />
        </Field>
      ) : (
        <Field group label="Cantidad">
          <div className="bo-row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Segmented value={dir} onChange={setDir} items={[{ value: -1, label: 'Restar', icon: 'minus' }, { value: 1, label: 'Sumar', icon: 'plus' }]} />
            <Stepper value={qty} onChange={setQty} />
            <div className="bo-chips">
              {[1, 2, 6, 12].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={cls('bo-chip', qty === n && 'is-active')}
                  onClick={() => setQty(n)}
                >
                  {n} {n === 1 ? 'frasco' : 'frascos'}
                </button>
              ))}
            </div>
          </div>
        </Field>
      )}
      <Field label={reason === 'Otro motivo' ? 'Explica el motivo' : 'Detalle'} optional={reason !== 'Otro motivo'}>
        <Textarea rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={200} placeholder={isCount ? 'Ej.: conteo del viernes en bodega' : 'Para quién, qué pasó…'} />
      </Field>
      {after < 0 && <div className="bo-callout bo-callout--red"><Icon name="alert" size={16} /><div>Solo hay <b>{p.stock}</b> frascos: no puedes restar {qty}.</div></div>}
      <div className="bo-box bo-box--subtle bo-between">
        <div><span className="small muted">Inventario de {p.name}</span><div className="bo-preview-delta">{p.stock}<Icon name="arrowRight" size={18} /><span className={after < 0 ? 'bo-t-red' : delta < 0 ? 'bo-t-amber' : 'bo-t-green'}>{after}</span></div></div>
        <Button type="submit" variant={delta < 0 ? 'dark' : 'primary'} icon="check" loading={busy} disabled={after < 0 || delta === 0}>{delta === 0 ? 'Sin cambios' : `Aplicar ${delta > 0 ? '+' : ''}${delta}`}</Button>
      </div>
    </form>
  );
}

const MOVE: Record<string, { label: string; icon: string; tone: string }> = {
  sale: { label: 'Venta', icon: 'orders', tone: 't-blue' },
  release: { label: 'Pedido cancelado · vuelve al inventario', icon: 'undo', tone: 't-violet' },
  batch: { label: 'Lote de producción', icon: 'layers', tone: 't-green' },
  adjust: { label: 'Ajuste', icon: 'sliders', tone: 't-amber' },
};
function History({ moves, batches }: { moves: any[] | null; batches: Batch[] | null }) {
  const [show, setShow] = useState(30);
  const days = useMemo(() => {
    const g: { day: string; items: any[] }[] = [];
    (moves ?? []).slice(0, show).forEach((m) => { const d = fmtDay(m.createdAt); const last = g[g.length - 1]; if (last?.day === d) last.items.push(m); else g.push({ day: d, items: [m] }); });
    return g;
  }, [moves, show]);
  const now = Date.now();
  return (
    <>
      <Section title={`Lotes${batches ? ` · ${batches.length}` : ''}`}>
        {!batches ? <TableSkeleton rows={2} cols={3} /> : batches.length === 0 ? <EmptyState small icon="layers" title="Sin lotes registrados">Registra cada tanda de producción para saber qué vence y cuándo.</EmptyState> : (
          <div className="bo-list bo-box" style={{ padding: 0 }}>
            {batches.map((b) => {
              const exp = b.expiresAt ? new Date(b.expiresAt).getTime() : null;
              const tag = exp == null ? null : exp < now ? <Badge tone="red">Vencido</Badge> : exp - now < 30 * 86400000 ? <Badge tone="pink">Vence {relTime(b.expiresAt!)}</Badge> : <Badge tone="gray">Vence {fmtDay(b.expiresAt!)}</Badge>;
              return (
                <div key={b.id} className="bo-list-item" style={{ padding: '10px 14px' }}>
                  <span className="bo-tl-icon t-green"><Icon name="layers" size={14} /></span>
                  <div className="grow"><b className="mono">{b.code}</b><div className="sub">Producido el {fmtDay(b.producedAt)}{b.note ? ` · ${b.note}` : ''}</div></div>
                  {tag}
                  <b className="tnum" style={{ minWidth: 44, textAlign: 'right' }}>+{b.quantity}</b>
                </div>
              );
            })}
          </div>
        )}
      </Section>
      <Section title="Movimientos">
        {!moves ? <TableSkeleton rows={4} cols={3} /> : moves.length === 0 ? <EmptyState small icon="history" title="Sin movimientos">Cuando haya ventas, lotes o ajustes los verás aquí.</EmptyState> : (
          <div className="bo-timeline">
            {days.map((g) => (
              <div key={g.day}>
                <div className="bo-tl-day">{g.day}</div>
                {g.items.map((mv) => {
                  const meta = MOVE[mv.reason] ?? { label: mv.reason, icon: 'info', tone: '' };
                  return (
                    <div key={mv.id} className="bo-tl-item">
                      <span className={cls('bo-tl-icon', meta.tone)}><Icon name={meta.icon} size={14} /></span>
                      <div className="bo-tl-body">
                        <div className="bo-row" style={{ alignItems: 'flex-start' }}><b>{meta.label}</b><span className={cls('bo-tl-delta', mv.delta < 0 ? 'bo-t-red' : 'bo-t-green')}>{mv.delta > 0 ? '+' : ''}{mv.delta}</span></div>
                        <div className="bo-tl-meta">{new Date(mv.createdAt).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}{mv.actor ? ` · ${mv.actor}` : ''}{mv.note ? ` · ${mv.note}` : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {moves.length > show && <Button size="sm" variant="ghost" icon="chevronDown" onClick={() => setShow((s) => s + 50)}>Ver más movimientos</Button>}
          </div>
        )}
      </Section>
      <p className="small faint" style={{ marginTop: 16 }} title={moves?.[0] ? fmtDate(moves[0].createdAt) : undefined}>Se muestran los últimos 200 movimientos.</p>
    </>
  );
}
