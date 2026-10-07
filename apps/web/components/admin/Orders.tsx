'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { METHOD_LABEL, type OrderStatus, type PaymentMethod } from '@lacajita/shared';
import { useAdmin, useCan, useShell } from './AdminShell';
import {
  Avatar, Badge, Button, Card, Drawer, EmptyState, Field, FilterMenu, Icon, Input, LinkButton, Menu, NEXT_STEP, PageHeader, Pager, STATUS_META, SearchInput,
  Section, Select, SortMenu, StatusBadge, TableSkeleton, Tabs, Textarea, cls, copyText, fmtDate, firstName, money, norm, plural, relTime, useUI, waLink, type IconName,
} from './kit';

// ---------------------------------------------------------------------------
type TabKey = 'all' | 'pending' | 'to_ship' | 'shipped' | 'delivered' | 'closed';
const TABS: { value: TabKey; label: string; statuses?: string[]; alert?: 'amber' | 'blue'; icon: IconName }[] = [
  { value: 'all', label: 'Todos', icon: 'orders' },
  { value: 'pending', label: 'Por confirmar pago', statuses: ['pending'], alert: 'amber', icon: 'clock' },
  { value: 'to_ship', label: 'Por despachar', statuses: ['paid', 'preparing'], alert: 'blue', icon: 'box' },
  { value: 'shipped', label: 'Enviados', statuses: ['shipped'], icon: 'truck' },
  { value: 'delivered', label: 'Entregados', statuses: ['delivered'], icon: 'checkCircle' },
  { value: 'closed', label: 'Cancelados', statuses: ['cancelled', 'failed', 'refunded'], icon: 'x' },
];
const LEGACY: Record<string, TabKey> = {
  pending: 'pending',
  paid: 'to_ship',
  preparing: 'to_ship',
  to_ship: 'to_ship',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'closed',
  failed: 'closed',
  refunded: 'closed',
};
const METHOD_ICON: Record<string, IconName> = { wompi: 'card', transfer: 'bank', cod: 'cash' };
const CARRIERS = ['Servientrega', 'Interrapidísimo', 'Coordinadora', 'Envía', 'TCC', 'Deprisa', 'Mensajero propio'];
const PER_PAGE = 25;
const GIFT_MARK = '[🎁 PEDIDO DE REGALO]';
const CLOSED = ['cancelled', 'failed', 'refunded'];

/** Separa la dedicatoria de regalo de la nota normal del cliente. */
export function parseNotes(notes?: string | null) {
  if (!notes) return { gift: null as null | { recipient: string; sender: string; message: string }, note: '' };
  if (!notes.includes(GIFT_MARK)) return { gift: null, note: notes.trim() };
  const para = notes.match(/Para:\s*([^\n|]+)/); const de = notes.match(/De(?:\s*parte\s*de)?:\s*([^\n|]+)/); const msg = notes.match(/Dedicatoria:\s*"([^"]+)"/);
  const rest = notes.split('\n').filter((l) => !l.includes(GIFT_MARK) && !/^\s*(Para|De parte de|De|Dedicatoria):/.test(l)).join('\n').trim();
  return { gift: { recipient: para?.[1].trim() ?? '', sender: de?.[1].trim() ?? '', message: msg?.[1].trim() ?? '' }, note: rest };
}

// ---------------------------------------------------------------------------
export function Orders() {
  const api = useAdmin(); const can = useCan(); const { toast, confirm } = useUI(); const { refreshCounts } = useShell();
  const sp = useSearchParams(); const router = useRouter(); const pathname = usePathname();
  const [rows, setRows] = useState<any[] | null>(() => api.getCache?.('admin:orders?limit=200') || null); const [error, setError] = useState('');
  const [tab, setTab] = useState<TabKey>(() => (sp.get('tab') as TabKey) || LEGACY[sp.get('status') ?? ''] || 'all');
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [method, setMethod] = useState(''); const [period, setPeriod] = useState('all'); const [giftOnly, setGiftOnly] = useState(false); const [sort, setSort] = useState('new');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<number | 'bulk' | null>(null);
  const openId = sp.get('id') ? Number(sp.get('id')) : null;

  const load = useCallback(() => api.orders({ limit: '200' }).then((r: any[]) => { const arr = Array.isArray(r) ? r : []; setRows(arr); setError(Array.isArray(r) ? '' : (r as any)?.error || ''); }).catch((e: Error) => setError(e.message)), [api]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = sp.get('tab') as TabKey; if (t) setTab(t); const qq = sp.get('q'); if (qq != null) setQ(qq); }, [sp]);
  useEffect(() => { setPage(0); setSel(new Set()); }, [tab, q, method, period, giftOnly, sort]);

  const setParam = (k: string, v: string | null) => { const p = new URLSearchParams(sp.toString()); if (v == null) p.delete(k); else p.set(k, v); router.replace(`${pathname}${p.toString() ? `?${p}` : ''}`, { scroll: false }); };
  const openOrder = (id: number) => setParam('id', String(id));
  const closeOrder = () => setParam('id', null);
  const changeTab = (t: TabKey) => { setTab(t); const p = new URLSearchParams(sp.toString()); p.delete('status'); if (t === 'all') p.delete('tab'); else p.set('tab', t); router.replace(`${pathname}${p.toString() ? `?${p}` : ''}`, { scroll: false }); };

  // Filtro base (todo menos la pestaña) para que los contadores reflejen la búsqueda
  const base = useMemo(() => {
    if (!rows || !Array.isArray(rows)) return [];
    const s = norm(q.trim()); const since = period === 'all' ? 0 : period === 'today' ? new Date().setHours(0, 0, 0, 0) : Date.now() - Number(period) * 86400000;
    return rows.filter((o) =>
      (!s || norm(`${o.reference} ${o.customerName} ${o.customerEmail} ${o.customerPhone} ${o.city} ${o.couponCode ?? ''}`).includes(s)) &&
      (!method || o.paymentMethod === method) && (!since || new Date(o.createdAt).getTime() >= since) && (!giftOnly || (o.notes ?? '').includes(GIFT_MARK)));
  }, [rows, q, method, period, giftOnly]);
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.value, t.statuses ? base.filter((o) => t.statuses!.includes(o.status)).length : base.length])), [base]);
  const list = useMemo(() => {
    const st = TABS.find((t) => t.value === tab)?.statuses;
    const r = st ? base.filter((o) => st.includes(o.status)) : [...base];
    const cmp: Record<string, (a: any, b: any) => number> = { new: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt), old: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt), high: (a, b) => b.total - a.total, low: (a, b) => a.total - b.total };
    return r.sort(cmp[sort]);
  }, [base, tab, sort]);
  const pages = Math.ceil(list.length / PER_PAGE); const pageRows = list.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const listTotal = list.reduce((s, o) => s + o.total, 0);
  const filtersOn = !!(q || method || period !== 'all' || giftOnly);

  const advance = async (o: any) => {
    const step = NEXT_STEP[o.status as OrderStatus]; if (!step) return;
    if (step.to === 'shipped') { openOrder(o.id); return; }
    if (step.to === 'paid' && !(await confirm({ title: `¿Confirmar el pago de ${o.reference}?`, body: `${money(o.total)} · ${METHOD_LABEL[o.paymentMethod as PaymentMethod]} · ${o.customerName}. El pedido pasará a “Por preparar”.`, confirm: 'Sí, confirmar pago', icon: 'card' }))) return;
    setBusy(o.id);
    try { await api.updateOrder(o.id, { status: step.to }); toast(`${o.reference}: ${STATUS_META[step.to].label}`); await load(); refreshCounts(); }
    catch (e) { toast((e as Error).message, 'error'); }
    setBusy(null);
  };
  const bulkStatus = async (to: OrderStatus) => {
    // Solo se mueven pedidos que siguen en el flujo y que no están ya en ese estado.
    const chosen = (rows ?? []).filter((o) => sel.has(o.id));
    const ids = chosen.filter((o) => o.status !== to && !CLOSED.includes(o.status)).map((o) => o.id);
    const skipped = chosen.length - ids.length; const label = STATUS_META[to].label;
    if (!ids.length) { toast(`Ninguno de los seleccionados se puede mover a “${label}” (ya están ahí o están cerrados).`, 'info'); return; }
    if (!(await confirm({ title: `¿Cambiar ${plural(ids.length, 'pedido', 'pedidos')} a “${label}”?`, body: <>{to === 'shipped' ? 'Cada cliente recibirá un correo de envío. Recuerda registrar las guías en cada pedido.' : to === 'cancelled' ? 'Los pedidos pendientes devolverán sus frascos al inventario.' : null}{skipped > 0 && <> Se omiten {plural(skipped, 'pedido', 'pedidos')} que ya están en ese estado o cerrados.</>}</>, confirm: 'Cambiar estado', danger: to === 'cancelled' }))) return;
    setBusy('bulk'); let ok = 0;
    for (const id of ids) { try { await api.updateOrder(id, { status: to }); ok++; } catch { /* sigue */ } }
    toast(ok === ids.length ? `${plural(ok, 'pedido actualizado', 'pedidos actualizados')}` : `Se actualizaron ${ok} de ${ids.length}`, ok === ids.length ? 'success' : 'error');
    setSel(new Set()); setBusy(null); await load(); refreshCounts();
  };
  const bulkPrint = async () => { setBusy('bulk'); try { printOrders(await Promise.all([...sel].map((id) => api.order(id)))); } catch (e) { toast((e as Error).message, 'error'); } setBusy(null); };
  const allOnPage = pageRows.length > 0 && pageRows.every((o) => sel.has(o.id));
  const toggleAll = () => { const n = new Set(sel); if (allOnPage) pageRows.forEach((o) => n.delete(o.id)); else pageRows.forEach((o) => n.add(o.id)); setSel(n); };
  const toggle = (id: number) => { const n = new Set(sel); if (n.has(id)) n.delete(id); else n.add(id); setSel(n); };

  return (
    <>
      <PageHeader
        title="Pedidos"
        description={
          rows ? (
            <span className="bo-row" style={{ gap: 8, alignItems: 'center', fontSize: 13, flexWrap: 'wrap' }}>
              <span>{plural(rows.length, 'pedido registrado', 'pedidos registrados')}</span>
              {counts.pending > 0 && (
                <button
                  type="button"
                  onClick={() => changeTab('pending')}
                  className="bo-badge-btn"
                  title="Filtrar pedidos por confirmar"
                >
                  <Badge tone="amber" icon="clock">
                    {plural(counts.pending, 'pago por confirmar', 'pagos por confirmar')}
                  </Badge>
                </button>
              )}
              {counts.to_ship > 0 && (
                <button
                  type="button"
                  onClick={() => changeTab('to_ship')}
                  className="bo-badge-btn"
                  title="Filtrar pedidos por despachar"
                >
                  <Badge tone="blue" icon="box">
                    {plural(counts.to_ship, 'por despachar', 'por despachar')}
                  </Badge>
                </button>
              )}
            </span>
          ) : 'Cargando pedidos…'
        }
        actions={<>
          <Button icon="refresh" variant="ghost" onClick={() => { api.invalidate?.('orders'); setRows(null); load(); }}>Actualizar</Button>
          <Button icon="download" onClick={() => api.download('orders/export.csv', 'pedidos.csv').catch((e: Error) => toast(e.message, 'error'))}>Exportar CSV</Button>
        </>}
      />

      <Card flush>
        <Tabs
          value={tab}
          onChange={changeTab}
          items={TABS.map((t) => ({
            value: t.value,
            label: t.label,
            icon: t.icon,
            count: rows ? counts[t.value] : undefined,
            alert: !!t.alert,
          }))}
        />
        <div className="bo-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar por referencia, cliente, celular o ciudad" />
          <FilterMenu
            groups={[
              { key: 'method', label: 'Medio de pago', value: method, onChange: setMethod, options: [{ value: '', label: 'Todos' }, ...Object.entries(METHOD_LABEL).map(([k, v]) => ({ value: k, label: v }))] },
              { key: 'period', label: 'Fecha', value: period, onChange: setPeriod, options: [{ value: 'all', label: 'Cualquier fecha' }, { value: 'today', label: 'Hoy' }, { value: '7', label: 'Últimos 7 días' }, { value: '30', label: 'Últimos 30 días' }] },
              { key: 'gift', label: 'Tipo de pedido', value: giftOnly ? 'gift' : 'all', onChange: (v) => setGiftOnly(v === 'gift'), options: [{ value: 'all', label: 'Todos' }, { value: 'gift', label: 'Solo regalos' }] },
            ]}
          />
          <div className="bo-toolbar-right">
            <SortMenu value={sort} onChange={setSort} options={[{ value: 'new', label: 'Más recientes' }, { value: 'old', label: 'Más antiguos' }, { value: 'high', label: 'Mayor valor' }, { value: 'low', label: 'Menor valor' }]} />
          </div>
        </div>
        {rows && <div className="bo-result-line"><b>{plural(list.length, 'pedido', 'pedidos')}</b> · {money(listTotal)}{filtersOn && <button className="bo-link" style={{ marginLeft: 8 }} onClick={() => { setQ(''); setMethod(''); setPeriod('all'); setGiftOnly(false); }}>Limpiar filtros</button>}</div>}

        {error ? <EmptyState icon="alert" title="No pudimos cargar los pedidos" action={<Button onClick={load}>Reintentar</Button>}>{error}</EmptyState>
          : !rows ? <TableSkeleton />
          : list.length === 0 ? (
            filtersOn ? <EmptyState icon="search" title="Ningún pedido coincide" action={<Button onClick={() => { setQ(''); setMethod(''); setPeriod('all'); setGiftOnly(false); }}>Limpiar filtros</Button>}>Prueba con otra búsqueda o quita algún filtro.</EmptyState>
              : <EmptyState icon={tab === 'all' ? 'orders' : 'checkCircle'} title={tab === 'all' ? 'Aún no hay pedidos' : 'Nada pendiente aquí'}>
                  {tab === 'all' ? 'Cuando un cliente compre en la tienda, el pedido aparecerá aquí.'
                    : tab === 'pending' ? '¡Todo al día! No hay pagos pendientes por verificar.'
                    : tab === 'to_ship' ? '¡Todo empacado! No hay pedidos pendientes por despachar.'
                    : 'No hay pedidos en esta etapa. ¡Buen trabajo!'}
                </EmptyState>
          ) : (
            <>
              <div className="bo-table-wrap">
                <table className="bo-table">
                  <thead><tr>
                    {can('ops') && <th className="w-check"><input type="checkbox" className="bo-check" checked={allOnPage} onChange={toggleAll} aria-label="Seleccionar todos" /></th>}
                    <th>Pedido</th><th>Cliente</th><th className="bo-hide-sm">Pago</th><th>Estado</th><th className="r">Total</th><th className="w-act" />
                  </tr></thead>
                  <tbody>
                    {pageRows.map((o) => {
                      const step = NEXT_STEP[o.status as OrderStatus]; const gift = (o.notes ?? '').includes(GIFT_MARK);
                      return (
                        <tr key={o.id} className={cls('is-click', sel.has(o.id) && 'is-selected')} onClick={() => openOrder(o.id)}>
                          {can('ops') && <td className="w-check" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="bo-check" checked={sel.has(o.id)} onChange={() => toggle(o.id)} aria-label={`Seleccionar ${o.reference}`} /></td>}
                          <td>
                            <div className="bo-row" style={{ gap: 6 }}><span className="mono strong">{o.reference}</span>{gift && <span title="Pedido para regalo" style={{ color: 'var(--pink)', display: 'inline-flex' }}><Icon name="gift" size={15} /></span>}</div>
                            <div className="small muted" title={fmtDate(o.createdAt)}>{relTime(o.createdAt)}</div>
                          </td>
                          <td>
                            <div className="bo-cell-main">
                              <Avatar name={o.customerName} size={30} />
                              <div>
                                <div className="bo-row" style={{ gap: 6, alignItems: 'center' }}>
                                  <b>{o.customerName}</b>
                                  {o.customerPhone && (
                                    <a
                                      href={waLink(o.customerPhone, `Hola ${firstName(o.customerName)}, te escribimos de Pimentones La Cajita sobre tu pedido ${o.reference}.`)}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      title={`Abrir WhatsApp con ${firstName(o.customerName)} (${o.customerPhone})`}
                                      style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', padding: '2px', borderRadius: 4 }}
                                    >
                                      <Icon name="whatsapp" size={14} />
                                    </a>
                                  )}
                                </div>
                                <span className="small muted">{o.city}{o.customerPhone ? ` · ${o.customerPhone}` : ''}</span>
                              </div>
                            </div>
                          </td>
                          <td className="bo-hide-sm"><span className="bo-row" style={{ gap: 6 }}><Icon name={METHOD_ICON[o.paymentMethod] ?? 'card'} size={15} className="faint" />{METHOD_LABEL[o.paymentMethod as PaymentMethod]}</span></td>
                          <td><StatusBadge status={o.status} /></td>
                          <td className="r money">{money(o.total)}</td>
                          <td className="w-act" onClick={(e) => e.stopPropagation()}>
                            <div className="bo-row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                              {step && can('ops') && <Button size="sm" variant={o.status === 'pending' ? 'primary' : 'secondary'} icon={step.icon} loading={busy === o.id} onClick={() => advance(o)}>{o.status === 'pending' && o.paymentMethod === 'cod' ? 'Aprobar' : step.short}</Button>}
                              <Button size="sm" variant="ghost" iconOnly icon="printer" title="Imprimir remisión" onClick={() => printOrders([o])} aria-label="Imprimir remisión" />
                              <Button size="sm" variant="ghost" iconOnly icon="chevronRight" onClick={() => openOrder(o.id)} aria-label="Ver detalle" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pager page={page} pages={pages} total={list.length} perPage={PER_PAGE} onPage={setPage} />
            </>
          )}
      </Card>

      {sel.size > 0 && (
        <div className="bo-bulk" role="toolbar" aria-label="Acciones sobre pedidos seleccionados">
          <b>{plural(sel.size, 'seleccionado', 'seleccionados')}</b>
          <Menu up trigger={(t) => <Button size="sm" variant="ghost" icon="refresh" iconRight="chevronUp" onClick={t} loading={busy === 'bulk'}>Cambiar estado</Button>} items={[
            { group: 'Mover a' },
            { label: 'Pagado · por preparar', icon: 'card', onClick: () => bulkStatus('paid') },
            { label: 'En preparación', icon: 'box', onClick: () => bulkStatus('preparing') },
            { label: 'Enviado', icon: 'truck', onClick: () => bulkStatus('shipped') },
            { label: 'Entregado', icon: 'checkCircle', onClick: () => bulkStatus('delivered') },
            'sep',
            { label: 'Cancelar pedidos', icon: 'x', danger: true, onClick: () => bulkStatus('cancelled') },
          ]} />
          <Button size="sm" variant="ghost" icon="printer" onClick={bulkPrint} disabled={busy === 'bulk'}>Imprimir remisiones</Button>
          <span className="bo-sep" />
          <Button size="sm" variant="ghost" iconOnly icon="x" onClick={() => setSel(new Set())} aria-label="Quitar selección" />
        </div>
      )}

      {openId && <OrderDrawer id={openId} onClose={closeOrder} onChanged={() => { load(); refreshCounts(); }} />}
    </>
  );
}

// ---------------------------------------------------------------------------
function OrderDrawer({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const api = useAdmin(); const can = useCan(); const { toast, confirm } = useUI();
  const [o, setO] = useState<any>(null); const [err, setErr] = useState('');
  const [carrier, setCarrier] = useState(''); const [tracking, setTracking] = useState(''); const [notes, setNotes] = useState(''); const [manual, setManual] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(() => api.order(id).then((r: any) => { setO(r); setCarrier(r.carrier || ''); setTracking(r.tracking || ''); setNotes(r.adminNotes || ''); setManual(r.status); }).catch((e: Error) => setErr(e.message)), [api, id]);
  useEffect(() => { setO(null); load(); }, [load]);

  const patch = async (body: Record<string, unknown>, msg: string, key: string) => {
    setSaving(key);
    try { await api.updateOrder(id, body); toast(msg); await load(); onChanged(); }
    catch (e) { toast((e as Error).message, 'error'); }
    setSaving(null);
  };

  if (err) return <Drawer open onClose={onClose} title="Pedido"><EmptyState icon="alert" title="No pudimos abrir el pedido">{err}</EmptyState></Drawer>;
  if (!o) return <Drawer open onClose={onClose} title="Cargando pedido…"><TableSkeleton rows={5} cols={2} /></Drawer>;

  const { gift, note } = parseNotes(o.notes);
  const step = NEXT_STEP[o.status as OrderStatus];
  const closed = ['cancelled', 'failed', 'refunded'].includes(o.status);
  const reached: Record<string, number> = { pending: 0, paid: 1, preparing: 2, shipped: 3, delivered: 4 };
  const r = reached[o.status] ?? -1;
  const first = firstName(o.customerName);
  const units = o.items.reduce((s: number, i: any) => s + i.quantity, 0);
  const editable = can('ops');
  const templates: { label: string; text: string }[] = [
    { label: 'Pedido recibido', text: `Hola ${first}, ¡gracias por tu pedido ${o.reference} en Pimentones La Cajita! Total: ${money(o.total)}.${o.paymentMethod === 'transfer' && o.status === 'pending' ? ' Cuando hagas la transferencia, envíanos el comprobante por aquí.' : ''}` },
    { label: 'Confirmar dirección', text: `Hola ${first}, te escribimos de Pimentones La Cajita para confirmar la dirección de tu pedido ${o.reference}: ${o.address}, ${o.city} (${o.department}). ¿Es correcta?` },
    { label: 'Pago confirmado', text: `Hola ${first}, confirmamos el pago de tu pedido ${o.reference}. Ya lo estamos preparando.` },
    { label: 'Pedido enviado', text: `Hola ${first}, tu pedido ${o.reference} va en camino${o.carrier ? ` con ${o.carrier}` : ''}${o.tracking ? `. Número de guía: ${o.tracking}` : ''}.${o.etaDays ? ` Tiempo estimado: ${o.etaDays}.` : ''}` },
  ];
  const cancel = async () => {
    if (!(await confirm({ title: `¿Cancelar el pedido ${o.reference}?`, body: o.status === 'pending' ? 'Los frascos reservados vuelven al inventario. Esta acción queda en la bitácora.' : 'El pedido quedará cancelado. Si ya se cobró, gestiona el reembolso por fuera.', confirm: 'Cancelar pedido', cancel: 'Volver', danger: true }))) return;
    patch({ status: 'cancelled' }, `${o.reference} cancelado`, 'cancel');
  };

  return (
    <Drawer open onClose={onClose} size="md"
      title={<span className="bo-row" style={{ gap: 10 }}>Pedido <span className="mono">{o.reference}</span></span>}
      subtitle={<><StatusBadge status={o.status} /><span>· {fmtDate(o.createdAt)}</span><span>· {plural(units, 'frasco', 'frascos')}</span></>}
      actions={<>
        <Button size="sm" icon="printer" onClick={() => printOrders([o])}>Remisión</Button>
        <Menu trigger={(t) => <Button size="sm" variant="ghost" iconOnly icon="more" onClick={t} aria-label="Más acciones" />} items={[
          { label: 'Imprimir tarjeta de regalo', icon: 'gift', onClick: () => gift && printGiftCard(o, gift), hidden: !gift },
          { label: 'Copiar referencia', icon: 'copy', onClick: async () => { await copyText(o.reference); toast('Referencia copiada'); } },
          { label: 'Escribir por WhatsApp', icon: 'whatsapp', href: waLink(o.customerPhone), external: true },
          { label: 'Ver ficha del cliente', icon: 'user', href: `/admin/clientes?email=${encodeURIComponent(o.customerEmail)}` },
          ...(editable && !closed && o.status !== 'delivered' ? ['sep' as const, { label: 'Cancelar pedido', icon: 'x', danger: true, onClick: cancel }] : []),
        ]} />
      </>}>

      {closed ? (
        <div className={cls('bo-callout', o.status === 'failed' ? 'bo-callout--red' : 'bo-callout--gray')} style={{ marginBottom: 20 }}>
          <Icon name={STATUS_META[o.status].icon} size={18} />
          <div><b>{STATUS_META[o.status].label}</b><div>{o.status === 'failed' ? 'La pasarela rechazó el pago. Puedes escribirle al cliente para intentarlo de nuevo.' : o.status === 'refunded' ? 'El pago fue reembolsado al cliente.' : 'Este pedido no sigue en el flujo de despacho.'}</div></div>
        </div>
      ) : (
        <div className="bo-steps" style={{ marginBottom: 20 }}>
          {['Recibido', 'Pago confirmado', 'En preparación', 'Enviado', 'Entregado'].map((label, i) => (
            <div key={label} className={cls('bo-step', (i <= r) && 'is-done', i === r + 1 && 'is-current')}>
              <span className="bo-step-dot">{i <= r && <Icon name="check" size={13} />}</span>{label}
            </div>
          ))}
        </div>
      )}

      {step && editable && !closed && (
        <div className="bo-next" style={{ marginBottom: 22 }}>
          {o.status === 'pending' && o.paymentMethod === 'transfer' ? (
            <>
              <div className="bo-next-head"><Icon name="bank" size={16} />Verificación de transferencia bancaria</div>
              <p>Revisa que el dinero haya ingresado (Bancolombia, Nequi o Daviplata). Puedes confirmar y avisarle al cliente por WhatsApp en un solo clic.</p>
              <div className="bo-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  icon="whatsapp"
                  style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', color: '#fff' }}
                  loading={saving === 'paid_wa'}
                  onClick={async () => {
                    await patch({ status: 'paid' }, `${o.reference}: Pago confirmado`, 'paid_wa');
                    if (o.customerPhone) {
                      const msg = `Hola ${first}, ¡confirmamos el pago de tu pedido ${o.reference} por ${money(o.total)}! Ya lo pasamos a cocina para preparación. Te avisaremos apenas vaya en camino. ¡Muchas gracias por tu compra en Pimentones La Cajita!`;
                      window.open(waLink(o.customerPhone, msg), '_blank');
                    }
                  }}
                >
                  Confirmar pago y notificar por WhatsApp
                </Button>
                <Button
                  variant="secondary"
                  icon="check"
                  loading={saving === 'next'}
                  onClick={() => patch({ status: 'paid' }, `${o.reference}: Pago confirmado`, 'next')}
                >
                  Solo confirmar pago
                </Button>
              </div>
            </>
          ) : o.status === 'pending' && o.paymentMethod === 'wompi' ? (
            <>
              <div className="bo-next-head"><Icon name="clock" size={16} />Esperando confirmación de Wompi</div>
              <p>El pago en línea se confirma solo cuando la pasarela lo aprueba. Úsalo manualmente solo si ya verificaste el pago en el panel de Wompi.</p>
              <Button size="sm" icon="check" loading={saving === 'next'} onClick={async () => { if (await confirm({ title: 'Marcar como pagado manualmente', body: 'Hazlo solo si verificaste la transacción en Wompi.', confirm: 'Marcar pagado' })) patch({ status: 'paid' }, 'Pago confirmado', 'next'); }}>Marcar como pagado</Button>
            </>
          ) : (
            <>
              <div className="bo-next-head"><Icon name={step.icon} size={16} />Siguiente paso: {o.status === 'pending' && o.paymentMethod === 'cod' ? 'aprobar pedido contraentrega' : step.label.toLowerCase()}</div>
              <p>{o.status === 'pending' && o.paymentMethod === 'cod' ? 'Confirma la dirección con el cliente (puedes usar la plantilla de WhatsApp). El dinero se recauda al entregar.' : step.help}</p>
              {step.to === 'shipped' && (
                <div className="bo-form-grid" style={{ marginBottom: 12 }}>
                  <Field label="Transportadora"><Select value={carrier} onChange={(e) => setCarrier(e.target.value)}><option value="">Selecciona…</option>{CARRIERS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
                  <Field label="Número de guía"><Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Ej. 2400123456" /></Field>
                </div>
              )}
              <div className="bo-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <Button variant="primary" icon={step.icon} loading={saving === 'next'}
                  disabled={step.to === 'shipped' && !tracking.trim()}
                  onClick={() => patch(step.to === 'shipped' ? { status: 'shipped', carrier, tracking: tracking.trim() } : { status: step.to }, `${o.reference}: ${STATUS_META[step.to].label}`, 'next')}>
                  {o.status === 'pending' && o.paymentMethod === 'cod' ? 'Aprobar pedido' : step.label}
                </Button>
                {step.to === 'shipped' && tracking.trim() && o.customerPhone && (
                  <Button
                    variant="secondary"
                    icon="whatsapp"
                    style={{ borderColor: '#16a34a', color: '#16a34a' }}
                    onClick={async () => {
                      await patch({ status: 'shipped', carrier, tracking: tracking.trim() }, `${o.reference}: Enviado`, 'next');
                      const msg = `Hola ${first}, tu pedido ${o.reference} ya va en camino${carrier ? ` con ${carrier}` : ''}${tracking.trim() ? `. Número de guía: ${tracking.trim()}` : ''}.${o.etaDays ? ` Tiempo estimado: ${o.etaDays}.` : ''} ¡Que disfrutes tus pimentones!`;
                      window.open(waLink(o.customerPhone, msg), '_blank');
                    }}
                  >
                    Despachar y notificar guía por WhatsApp
                  </Button>
                )}
                {step.to === 'shipped' && !tracking.trim() && <span className="small muted">Escribe la guía para habilitar el envío.</span>}
                {step.to === 'preparing' && gift && <Button icon="gift" onClick={() => printGiftCard(o, gift)}>Imprimir tarjeta</Button>}
              </div>
            </>
          )}
        </div>
      )}

      {gift && (
        <div className="bo-callout bo-callout--pink" style={{ marginBottom: 22 }}>
          <Icon name="gift" size={18} />
          <div style={{ flex: 1 }}>
            <div className="bo-between"><b>Pedido para regalo</b><Button size="sm" variant="secondary" icon="printer" onClick={() => printGiftCard(o, gift)}>Tarjeta</Button></div>
            <div style={{ marginTop: 4 }}>Para <b>{gift.recipient || 'alguien especial'}</b> · de <b>{gift.sender || 'anónimo'}</b></div>
            {gift.message && <p className="bo-quote">“{gift.message}”</p>}
          </div>
        </div>
      )}

      <Section title="Productos">
        <div className="bo-box">
          <div className="bo-lines">
            {o.items.map((i: any, k: number) => (
              <div key={k} className="bo-line"><span className="bo-line-qty">{i.quantity}</span><div className="bo-line-name"><b>{i.name}</b><span>{money(i.unitPrice)} c/u</span></div><span className="strong tnum">{money(i.unitPrice * i.quantity)}</span></div>
            ))}
          </div>
          <div className="bo-totals">
            <div><span>Subtotal</span><span className="tnum">{money(o.subtotal)}</span></div>
            <div><span>Envío{o.etaDays ? <span className="muted"> · {o.etaDays}</span> : ''}</span><span className="tnum">{o.shipping ? money(o.shipping) : 'Gratis'}</span></div>
            {o.discount > 0 && <div className="is-discount"><span>Descuento{o.couponCode ? ` · ${o.couponCode}` : ''}</span><span className="tnum">−{money(o.discount)}</span></div>}
            <div className="is-total"><span>Total</span><span className="tnum">{money(o.total)}</span></div>
          </div>
        </div>
      </Section>

      <Section title="Cliente" action={<Link className="bo-link" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12.5 }} href={`/admin/clientes?email=${encodeURIComponent(o.customerEmail)}`}>Ver ficha e historial</Link>}>
        <div className="bo-box">
          <div className="bo-row" style={{ gap: 12, marginBottom: 12 }}>
            <Avatar name={o.customerName} size={40} />
            <div style={{ minWidth: 0, flex: 1 }}><div className="strong">{o.customerName}</div><div className="small muted">{o.customerEmail}{o.customerDoc ? ` · Doc. ${o.customerDoc}` : ''}</div></div>
          </div>
          <div className="bo-row" style={{ flexWrap: 'wrap' }}>
            <LinkButton size="sm" icon="whatsapp" href={waLink(o.customerPhone)} external>{o.customerPhone}</LinkButton>
            <LinkButton size="sm" icon="mail" href={`mailto:${o.customerEmail}?subject=${encodeURIComponent(`Tu pedido ${o.reference} · Pimentones La Cajita`)}`}>Correo</LinkButton>
          </div>
        </div>
      </Section>

      <Section title="Entrega" action={<button className="bo-link" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12.5 }} onClick={async () => { await copyText(`${o.customerName}\n${o.address}\n${o.city}, ${o.department}\nCel. ${o.customerPhone}`); toast('Dirección copiada'); }}><Icon name="copy" size={13} />Copiar</button>}>
        <div className="bo-box">
          <div className="bo-row" style={{ alignItems: 'flex-start', gap: 10 }}><Icon name="pin" size={17} className="faint" /><div><div className="strong">{o.address}</div><div className="muted">{o.city}, {o.department}</div></div></div>
          {note && <div className="bo-callout bo-callout--amber" style={{ marginTop: 12 }}><Icon name="info" size={16} /><div><b>Nota del cliente:</b> {note}</div></div>}
        </div>
      </Section>

      {(o.status === 'shipped' || o.status === 'delivered' || o.tracking) && (
        <Section title="Seguimiento del envío">
          <div className="bo-form-grid">
            <Field label="Transportadora"><Select value={carrier} disabled={!editable} onChange={(e) => setCarrier(e.target.value)}><option value="">Sin definir</option>{CARRIERS.map((c) => <option key={c}>{c}</option>)}{carrier && !CARRIERS.includes(carrier) && <option>{carrier}</option>}</Select></Field>
            <Field label="Número de guía"><Input value={tracking} disabled={!editable} onChange={(e) => setTracking(e.target.value)} /></Field>
          </div>
          {editable && (carrier !== (o.carrier || '') || tracking !== (o.tracking || '')) && <div style={{ marginTop: 10 }}><Button size="sm" variant="primary" loading={saving === 'track'} onClick={() => patch({ carrier, tracking }, 'Seguimiento actualizado', 'track')}>Guardar seguimiento</Button></div>}
        </Section>
      )}

      <Section title="Pago">
        <dl className="bo-kv">
          <dt>Medio</dt><dd><span className="bo-row" style={{ gap: 6 }}><Icon name={METHOD_ICON[o.paymentMethod] ?? 'card'} size={15} />{METHOD_LABEL[o.paymentMethod as PaymentMethod]}</span></dd>
          {o.wompiTransactionId && <><dt>Transacción</dt><dd className="mono">{o.wompiTransactionId}</dd></>}
          {o.couponCode && <><dt>Cupón</dt><dd><Badge tone="green" icon="ticket">{o.couponCode}</Badge></dd></>}
          <dt>Actualizado</dt><dd>{relTime(o.updatedAt)}</dd>
        </dl>
      </Section>

      <Section title="Mensajes rápidos por WhatsApp">
        <div className="bo-chips">{templates.map((t) => <a key={t.label} className="bo-chip" href={waLink(o.customerPhone, t.text)} target="_blank" rel="noreferrer" title={t.text}><Icon name="whatsapp" size={14} />{t.label}</a>)}</div>
      </Section>

      <Section title="Notas internas">
        <Field hint="Solo las ve el equipo. Ej.: “entregar después de las 6 p. m.”" counter={notes.length} max={2000}>
          <Textarea rows={3} value={notes} disabled={!editable} maxLength={2000} onChange={(e) => setNotes(e.target.value)} placeholder="Escribe una nota para el equipo…" />
        </Field>
        {editable && notes !== (o.adminNotes || '') && <div style={{ marginTop: 10 }} className="bo-row"><Button size="sm" variant="primary" loading={saving === 'notes'} onClick={() => patch({ adminNotes: notes }, 'Nota guardada', 'notes')}>Guardar nota</Button><Button size="sm" variant="ghost" onClick={() => setNotes(o.adminNotes || '')}>Descartar</Button></div>}
      </Section>

      {editable && (
        <Section title="Cambio manual de estado">
          <div className="bo-row">
            <Select sm value={manual} onChange={(e) => setManual(e.target.value)} style={{ maxWidth: 260 }}>{Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
            <Button size="sm" disabled={manual === o.status} loading={saving === 'manual'} onClick={async () => { if (await confirm({ title: `¿Cambiar a “${STATUS_META[manual].label}”?`, body: 'Úsalo para corregir un estado. El cambio queda registrado en la bitácora.', confirm: 'Cambiar estado', danger: manual === 'cancelled' })) patch({ status: manual }, 'Estado actualizado', 'manual'); }}>Aplicar</Button>
          </div>
          <p className="small muted" style={{ marginTop: 6 }}>Para el flujo normal usa el botón de “Siguiente paso”.</p>
        </Section>
      )}
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Impresión
// ---------------------------------------------------------------------------
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export function printOrders(orders: any[]) {
  const w = window.open('', '_blank', 'width=820,height=960'); if (!w) return;
  const pages = orders.map((o) => {
    const { gift, note } = parseNotes(o.notes);
    const rows = o.items.map((i: any) => `<tr><td class="q">${i.quantity}</td><td>${esc(i.name)}</td><td class="r">${money(i.unitPrice)}</td><td class="r">${money(i.unitPrice * i.quantity)}</td></tr>`).join('');
    return `<section class="page">
      <header><div><img src="${location.origin}/img/logo.svg" alt="" /><p class="muted">Conservas artesanales · Bogotá D.C.</p></div><div class="ref"><small>REMISIÓN</small><b>${esc(o.reference)}</b><span>${fmtDate(o.createdAt)}</span></div></header>
      <div class="grid"><div class="box"><small>ENTREGAR A</small><b>${esc(o.customerName)}</b><br>${esc(o.address)}<br>${esc(o.city)}, ${esc(o.department)}<br>Cel. ${esc(o.customerPhone)}</div>
      <div class="box"><small>PAGO Y ENVÍO</small>${esc(METHOD_LABEL[o.paymentMethod as PaymentMethod])}${o.paymentMethod === 'cod' ? ` · <b>COBRAR ${money(o.total)} AL ENTREGAR</b>` : ''}<br>${o.carrier ? `Transportadora: ${esc(o.carrier)}<br>` : ''}${o.tracking ? `Guía: ${esc(o.tracking)}<br>` : ''}${o.etaDays ? `Entrega estimada: ${esc(o.etaDays)}` : ''}</div></div>
      ${note ? `<div class="note"><b>Nota del cliente:</b> ${esc(note)}</div>` : ''}
      ${gift ? `<div class="note gift"><b>Pedido para regalo</b> · Para: ${esc(gift.recipient)} · De: ${esc(gift.sender)}. Incluir tarjeta de dedicatoria.</div>` : ''}
      <table><thead><tr><th>Cant.</th><th>Producto</th><th class="r">Precio</th><th class="r">Total</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="tot"><div><span>Subtotal</span><span>${money(o.subtotal)}</span></div><div><span>Envío</span><span>${o.shipping ? money(o.shipping) : 'Gratis'}</span></div>${o.discount ? `<div><span>Descuento ${esc(o.couponCode || '')}</span><span>−${money(o.discount)}</span></div>` : ''}<div class="t"><span>Total</span><span>${money(o.total)}</span></div></div>
      <footer>Gracias por preferir lo hecho a mano. Una vez abierto, conservar en refrigeración: no lleva conservantes.</footer>
    </section>`;
  }).join('');
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Remisión ${orders.length === 1 ? esc(orders[0].reference) : `(${orders.length})`}</title><style>
    *{box-sizing:border-box}body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#101828;margin:0;background:#f2f4f7;font-size:13px}
    .page{background:#fff;max-width:720px;margin:24px auto;padding:36px 40px;border-radius:12px;page-break-after:always}
    header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #101828;padding-bottom:16px;margin-bottom:20px}header img{height:48px}
    .ref{text-align:right}.ref small{display:block;font-size:10px;letter-spacing:.12em;color:#667085}.ref b{font:700 20px ui-monospace,Consolas,monospace;display:block}.ref span{color:#667085}
    .muted{color:#667085;margin:4px 0 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.box{border:1px solid #e4e7ec;border-radius:10px;padding:12px 14px;line-height:1.6}
    .box small{display:block;font-size:10px;letter-spacing:.12em;color:#667085;margin-bottom:2px}.note{margin-top:12px;padding:10px 14px;border-radius:10px;background:#fffaeb;border:1px solid #fedf89}.gift{background:#fdf2fa;border-color:#fcceee}
    table{width:100%;border-collapse:collapse;margin:20px 0 8px}th{text-align:left;font-size:11px;color:#667085;border-bottom:1px solid #e4e7ec;padding:8px 6px}td{padding:10px 6px;border-bottom:1px solid #f2f4f7}.q{font-weight:700;width:50px}.r{text-align:right}
    .tot{margin-left:auto;width:260px}.tot div{display:flex;justify-content:space-between;padding:4px 0}.tot .t{font-weight:800;font-size:16px;border-top:2px solid #101828;margin-top:6px;padding-top:8px}
    footer{margin-top:28px;font-size:11px;color:#667085;border-top:1px dashed #d0d5dd;padding-top:12px}.bar{position:sticky;top:0;background:#101828;color:#fff;padding:10px;text-align:center}.bar button{font:600 13px system-ui;padding:8px 16px;border-radius:8px;border:0;cursor:pointer}
    @media print{body{background:#fff}.page{margin:0;border-radius:0;max-width:none;padding:24px}.bar{display:none}}
  </style></head><body><div class="bar"><button onclick="window.print()">Imprimir ${orders.length === 1 ? 'remisión' : `${orders.length} remisiones`}</button></div>${pages}</body></html>`);
  w.document.close();
}
export function printGiftCard(o: any, gift: { recipient: string; sender: string; message: string }) {
  const w = window.open('', '_blank', 'width=640,height=800'); if (!w) return;
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Tarjeta · ${esc(o.reference)}</title><style>
    body{font-family:Georgia,serif;background:#faf6f0;color:#2a1a08;margin:0;padding:40px 20px;display:flex;align-items:center;justify-content:center;min-height:100vh;box-sizing:border-box}
    .card{width:440px;border:1.5px solid #b91c1c;border-radius:14px;padding:40px 36px;background:#fffdf9;text-align:center;box-shadow:0 10px 30px -12px rgba(0,0,0,.15)}
    img{height:56px;margin-bottom:18px}.names{font:14px system-ui,sans-serif;color:#555;margin:12px 0}.names b{color:#111}
    .msg{font-size:19px;line-height:1.6;font-style:italic;margin:26px 0;color:#221204}.foot{font:11px system-ui,sans-serif;color:#999;border-top:1px dashed #ddd;padding-top:14px;margin-top:20px}
    button{margin-top:20px;font:600 13px system-ui;padding:8px 16px;border-radius:8px;border:1px solid #ccc;background:#fff;cursor:pointer}@media print{body{background:#fff}.card{box-shadow:none}button{display:none}}
  </style></head><body><div><div class="card"><img src="${location.origin}/img/logo-vertical.svg" alt=""><div class="names">Para <b>${esc(gift.recipient || 'alguien muy especial')}</b></div>
  <div class="msg">“${esc(gift.message || 'Que disfrutes estos sabores hechos a mano.')}”</div><div class="names">Con cariño, <b>${esc(gift.sender || '')}</b></div>
  <div class="foot">Pimentones La Cajita · Hecho a mano en Bogotá · Sin conservantes</div></div><div style="text-align:center"><button onclick="window.print()">Imprimir tarjeta</button></div></div></body></html>`);
  w.document.close();
}
