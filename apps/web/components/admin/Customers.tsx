'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from './AdminShell';
import {
  Avatar, Badge, Button, Card, Drawer, EmptyState, FilterMenu, Icon, LinkButton, Menu, PageHeader, Pager, Section, SearchInput, Segmented, SortTh,
  Stat, StatusBadge, TableSkeleton, Tabs, copyText, daysSince, fmtDate, fmtDay, firstName, money, norm, plural, relTime, useUI, waLink,
} from './kit';

/**
 * Clientes: se derivan de los pedidos (correo = identidad).
 * Segmentos accionables para vender más: recurrentes, VIP, inactivos y quienes no completaron su compra.
 */
type Seg = 'all' | 'buyers' | 'repeat' | 'vip' | 'nobuy' | 'inactive';
type SortKey = 'last' | 'spent' | 'orders' | 'name' | 'first';
const PER_PAGE = 25;
const INACTIVE_DAYS = 60;

type C = { email: string; name: string; phone: string; city: string; ordersCount: number; spent: number; firstOrder: string; lastOrder: string };

export function Customers() {
  const api = useAdmin(); const { toast } = useUI();
  const sp = useSearchParams(); const router = useRouter(); const pathname = usePathname();
  const [view, setView] = useState<'customers' | 'subs'>(sp.get('vista') === 'suscriptores' ? 'subs' : 'customers');
  const [rows, setRows] = useState<C[] | null>(() => { const c = api.getCache?.('admin:customers:'); return Array.isArray(c) ? c : null; }); const [subs, setSubs] = useState<any[] | null>(() => { const s = api.getCache?.('admin:subscribers'); return Array.isArray(s) ? s : null; }); const [error, setError] = useState('');
  const [seg, setSeg] = useState<Seg>((sp.get('seg') as Seg) || 'all');
  const [q, setQ] = useState(sp.get('q') ?? ''); const [city, setCity] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'last', dir: -1 });
  const [page, setPage] = useState(0);
  const openEmail = sp.get('email');

  const load = useCallback(() => {
    api.customers('').then((r) => { const arr = Array.isArray(r) ? r : []; setRows(arr as C[]); setError(Array.isArray(r) ? '' : (r as any)?.error || ''); }).catch((e: Error) => setError(e.message));
    api.subscribers().then((r) => setSubs(Array.isArray(r) ? r : [])).catch(() => setSubs([]));
  }, [api]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [seg, q, city, sort]);
  // La URL manda: los accesos del menú lateral cambian la vista aunque ya estés en Clientes.
  useEffect(() => {
    setView(sp.get('vista') === 'suscriptores' ? 'subs' : 'customers');
    setSeg((sp.get('seg') as Seg) || 'all');
  }, [sp]);

  const setParam = (k: string, v: string | null) => { const p = new URLSearchParams(sp.toString()); if (v == null) p.delete(k); else p.set(k, v); router.replace(`${pathname}${p.toString() ? `?${p}` : ''}`, { scroll: false }); };

  // Métricas y umbrales
  const m = useMemo(() => {
    const all = Array.isArray(rows) ? rows : []; const buyers = all.filter((c) => c.ordersCount > 0); const repeat = buyers.filter((c) => c.ordersCount >= 2);
    const spentSorted = buyers.map((c) => c.spent).sort((a, b) => b - a);
    const vipMin = spentSorted.length >= 5
      ? spentSorted[Math.max(0, Math.ceil(spentSorted.length * 0.2) - 1)]
      : spentSorted.length > 0 && spentSorted[0] > 0
        ? spentSorted[0]
        : Infinity;
    const revenue = buyers.reduce((s, c) => s + c.spent, 0);
    const cities = [...new Set(all.map((c) => c.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    return { total: all.length, buyers: buyers.length, repeat: repeat.length, vipMin, ltv: buyers.length ? revenue / buyers.length : 0, cities, newThisMonth: buyers.filter((c) => daysSince(c.firstOrder) <= 30).length };
  }, [rows]);

  const segOf = useCallback((c: C) => ({
    buyer: c.ordersCount > 0, repeat: c.ordersCount >= 2, vip: c.ordersCount > 0 && c.spent >= m.vipMin,
    nobuy: c.ordersCount === 0, inactive: c.ordersCount > 0 && daysSince(c.lastOrder) > INACTIVE_DAYS, isNew: c.ordersCount === 1 && daysSince(c.firstOrder) <= 30,
  }), [m.vipMin]);
  const SEG_TEST: Record<Seg, (c: C) => boolean> = {
    all: () => true, buyers: (c) => segOf(c).buyer, repeat: (c) => segOf(c).repeat, vip: (c) => segOf(c).vip, nobuy: (c) => segOf(c).nobuy, inactive: (c) => segOf(c).inactive,
  };

  const base = useMemo(() => {
    const s = norm(q.trim());
    const all = Array.isArray(rows) ? rows : [];
    return all.filter((c) => (!s || norm(`${c.name} ${c.email} ${c.phone} ${c.city}`).includes(s)) && (!city || c.city === city));
  }, [rows, q, city]);
  const counts = useMemo(() => Object.fromEntries((Object.keys(SEG_TEST) as Seg[]).map((k) => [k, base.filter(SEG_TEST[k]).length])), [base, segOf]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = useMemo(() => {
    const r = base.filter(SEG_TEST[seg]);
    const val = (c: C): number | string => sort.key === 'last' ? +new Date(c.lastOrder) : sort.key === 'first' ? +new Date(c.firstOrder) : sort.key === 'spent' ? c.spent : sort.key === 'orders' ? c.ordersCount : norm(c.name);
    return r.sort((a, b) => { const x = val(a); const y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
  }, [base, seg, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const pages = Math.ceil(list.length / PER_PAGE); const pageRows = list.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const filtersOn = !!(q || city);
  const selected = openEmail ? rows?.find((c) => c.email === openEmail) : null;

  const phonesInSeg = useMemo(() => {
    const set = new Set<string>();
    list.forEach((c) => {
      const raw = (c.phone || '').trim().replace(/[^\d+]/g, '');
      if (raw && raw.length >= 7) set.add(raw);
    });
    return Array.from(set);
  }, [list]);

  const copyPhones = async () => {
    if (!phonesInSeg.length) {
      toast('No hay teléfonos registrados en este segmento.', 'info');
      return;
    }
    await copyText(phonesInSeg.join('\n'));
    toast(`${plural(phonesInSeg.length, 'teléfono copiado', 'teléfonos copiados')} para WhatsApp o listas de difusión`, 'success');
  };

  const exportCsv = (path: string, file: string) => api.download(path, file).then(() => toast('Archivo descargado')).catch((e: Error) => toast(e.message, 'error'));
  const SEG_HELP: Record<Seg, string> = {
    all: '', buyers: 'Clientes con al menos un pedido pagado.', repeat: 'Compraron 2 veces o más: tus clientes fieles.',
    vip: m.vipMin === Infinity
      ? 'Aún no hay compras registradas.'
      : m.buyers < 5
        ? `Mayor comprador registrado (${money(m.vipMin)}). Al llegar a 5 compradores se calcula el top 20 %.`
        : `El 20 % que más ha comprado (desde ${money(m.vipMin)}).`,
    nobuy: 'Iniciaron un pedido pero nunca lo pagaron. Un mensaje a tiempo puede recuperar la venta.',
    inactive: `Compraron antes pero llevan más de ${INACTIVE_DAYS} días sin volver. Ideal para un cupón de regreso.`,
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        description={
          rows ? (
            <span className="bo-row" style={{ gap: 8, alignItems: 'center', fontSize: 13, flexWrap: 'wrap' }}>
              <span>{plural(rows.length, 'cliente registrado', 'clientes registrados')}</span>
              <span className="muted">·</span>
              <span>{plural(m.buyers, 'comprador activo', 'compradores activos')}</span>
              {m.repeat > 0 && <Badge tone="violet" icon="refresh">{plural(m.repeat, 'recurrente', 'recurrentes')}</Badge>}
            </span>
          ) : 'Cargando clientes de la tienda…'
        }
        actions={<>
          <Segmented value={view} onChange={(v) => { setView(v); setParam('vista', v === 'subs' ? 'suscriptores' : null); }} items={[{ value: 'customers', label: 'Clientes', icon: 'users' }, { value: 'subs', label: `Suscriptores${subs ? ` · ${subs.length}` : ''}`, icon: 'mail' }]} />
          <Menu trigger={(t) => <Button icon="download" iconRight="chevronDown" onClick={t}>Exportar</Button>} items={[
            { label: 'Clientes (CSV)', icon: 'users', onClick: () => exportCsv('customers/export.csv', 'clientes.csv') },
            { label: 'Suscriptores del boletín (CSV)', icon: 'mail', onClick: () => exportCsv('subscribers/export.csv', 'suscriptores.csv') },
          ]} />
        </>}
      />

      {view === 'subs' ? <Subscribers subs={subs} customers={rows ?? []} onExport={() => exportCsv('subscribers/export.csv', 'suscriptores.csv')} /> : <>
        <div className="bo-grid bo-grid-4" style={{ marginBottom: 16 }}>
          <Stat label="Clientes" icon="users" value={rows ? m.total.toLocaleString('es-CO') : '—'} hint={rows ? <>{plural(m.buyers, 'ha comprado', 'han comprado')}</> : null} />
          <Stat label="Nuevos este mes" icon="sparkle" tone="#175cd3" value={rows ? m.newThisMonth : '—'} hint="Primera compra en los últimos 30 días" />
          <Stat label="Tasa de recompra" icon="refresh" tone="#6941c6" value={rows ? `${m.buyers ? Math.round((m.repeat / m.buyers) * 100) : 0}%` : '—'} hint={rows ? `${plural(m.repeat, 'cliente volvió', 'clientes volvieron')} a comprar` : null} />
          <Stat label="Valor por cliente" icon="star" tone="#b54708" value={rows ? money(m.ltv) : '—'} hint="Promedio gastado por comprador" />
        </div>

        <Card flush>
          <Tabs
            value={seg}
            onChange={(v) => { setSeg(v); setParam('seg', v === 'all' ? null : v); }}
            items={[
              { value: 'all', label: 'Todos', icon: 'users', count: rows ? counts.all : undefined },
              { value: 'buyers', label: 'Compradores', icon: 'card', count: rows ? counts.buyers : undefined },
              { value: 'repeat', label: 'Recurrentes', icon: 'refresh', count: rows ? counts.repeat : undefined },
              { value: 'vip', label: 'VIP', icon: 'star', count: rows ? counts.vip : undefined },
              { value: 'inactive', label: 'Inactivos (+60d)', icon: 'clock', count: rows ? counts.inactive : undefined, alert: (counts.inactive ?? 0) > 0 },
              { value: 'nobuy', label: 'Sin compra', icon: 'alert', count: rows ? counts.nobuy : undefined, alert: (counts.nobuy ?? 0) > 0 },
            ]}
          />
          <div className="bo-toolbar">
            <SearchInput value={q} onChange={(v) => { setQ(v); }} placeholder="Buscar por nombre, correo, celular o ciudad..." />
            <FilterMenu
              groups={[
                { key: 'city', label: 'Ciudad', value: city, onChange: setCity, options: [{ value: '', label: 'Todas las ciudades' }, ...m.cities.map((c) => ({ value: c, label: c }))] },
              ]}
            />
            <div className="bo-toolbar-right">
              <Button
                size="sm"
                variant="secondary"
                icon="whatsapp"
                onClick={copyPhones}
                disabled={!phonesInSeg.length}
                title="Copiar teléfonos de este segmento para WhatsApp o difusión"
              >
                Copiar teléfonos ({phonesInSeg.length})
              </Button>
            </div>
          </div>
          {seg !== 'all' && SEG_HELP[seg] && <div className="bo-result-line"><Icon name="info" size={14} />{SEG_HELP[seg]}</div>}

          {error ? <EmptyState icon="alert" title="No pudimos cargar los clientes" action={<Button onClick={load}>Reintentar</Button>}>{error}</EmptyState>
            : !rows ? <TableSkeleton />
            : list.length === 0 ? (
              filtersOn ? <EmptyState icon="search" title="Ningún cliente coincide" action={<Button onClick={() => { setQ(''); setCity(''); }}>Limpiar filtros</Button>}>Prueba con otro nombre, correo o ciudad.</EmptyState>
                : <EmptyState icon="users" title={seg === 'all' ? 'Aún no tienes clientes' : 'Nadie en este segmento'}>{seg === 'all' ? 'Cada persona que haga un pedido en la tienda aparecerá aquí con su historial.' : 'Cuando haya clientes que cumplan esta condición los verás aquí.'}</EmptyState>
            ) : (
              <>
                <div className="bo-table-wrap">
                  <table className="bo-table">
                    <thead><tr>
                      <SortTh k="name" sort={sort} setSort={setSort}>Cliente</SortTh>
                      <th className="bo-hide-sm">Ciudad</th>
                      <SortTh k="orders" sort={sort} setSort={setSort} className="r">Pedidos</SortTh>
                      <SortTh k="spent" sort={sort} setSort={setSort} className="r">Total gastado</SortTh>
                      <SortTh k="last" sort={sort} setSort={setSort} className="bo-hide-sm">Última compra</SortTh>
                      <th className="w-act" />
                    </tr></thead>
                    <tbody>
                      {pageRows.map((c) => {
                        const s = segOf(c);
                        return (
                          <tr key={c.email} className="is-click" onClick={() => setParam('email', c.email)}>
                            <td>
                              <div className="bo-cell-main">
                                <Avatar name={c.name} size={32} />
                                <div>
                                  <div className="bo-row" style={{ gap: 6, alignItems: 'center' }}>
                                    <b>{c.name}</b>
                                    {s.vip && <Badge tone="amber" icon="star">VIP</Badge>}
                                    {s.repeat && <Badge tone="violet" icon="refresh">Recurrente</Badge>}
                                    {s.isNew && <Badge tone="blue">Nuevo</Badge>}
                                    {c.phone && (
                                      <a
                                        href={waLink(c.phone, `Hola ${firstName(c.name)}, te escribimos de Pimentones La Cajita.`)}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        title={`Abrir WhatsApp con ${firstName(c.name)} (${c.phone})`}
                                        style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', padding: '2px', borderRadius: 4 }}
                                      >
                                        <Icon name="whatsapp" size={14} />
                                      </a>
                                    )}
                                  </div>
                                  <span>{c.email}{c.phone ? ` · ${c.phone}` : ''}</span>
                                </div>
                              </div>
                            </td>
                            <td className="bo-hide-sm">{c.city || <span className="faint">—</span>}</td>
                            <td className="r tnum">{c.ordersCount > 0 ? c.ordersCount : <Badge tone="gray">Sin pagar</Badge>}</td>
                            <td className="r money">{c.spent > 0 ? money(c.spent) : <span className="faint">—</span>}</td>
                            <td className="bo-hide-sm"><span title={fmtDate(c.lastOrder)}>{relTime(c.lastOrder)}</span>{s.inactive && <div className="small" style={{ color: 'var(--amber)' }}>Inactivo · {daysSince(c.lastOrder)} días</div>}</td>
                            <td className="w-act" onClick={(e) => e.stopPropagation()}>
                              <div className="bo-row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                                {c.phone && <LinkButton size="sm" variant="ghost" icon="whatsapp" href={waLink(c.phone, `Hola ${firstName(c.name)}, te escribimos de Pimentones La Cajita.`)} external />}
                                <LinkButton size="sm" variant="ghost" icon="mail" href={`mailto:${c.email}`} />
                                <Button size="sm" variant="ghost" iconOnly icon="chevronRight" onClick={() => setParam('email', c.email)} aria-label="Ver cliente" />
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
      </>}

      {openEmail && <CustomerDrawer email={openEmail} customer={selected ?? null} seg={selected ? segOf(selected) : null} onClose={() => setParam('email', null)} />}
    </>
  );
}

// ---------------------------------------------------------------------------
function CustomerDrawer({ email, customer: c, seg, onClose }: { email: string; customer: C | null; seg: ReturnType<any> | null; onClose: () => void }) {
  const api = useAdmin(); const { toast } = useUI();
  const [orders, setOrders] = useState<any[] | null>(null);
  useEffect(() => { setOrders(null); api.customerOrders(email).then(setOrders).catch(() => setOrders([])); }, [api, email]);
  const name = c?.name ?? orders?.[0]?.customerName ?? email;
  const phone = c?.phone ?? orders?.[0]?.customerPhone ?? '';
  const last = orders?.[0];
  const paid = (Array.isArray(orders) ? orders : []).filter((o) => ['paid', 'preparing', 'shipped', 'delivered'].includes(o.status));
  const avg = paid.length ? paid.reduce((s, o) => s + o.total, 0) / paid.length : 0;
  const pendingUnpaid = (Array.isArray(orders) ? orders : []).filter((o) => o.status === 'pending');
  const fn = firstName(name);
  const templates = [
    { label: 'Saludo', text: `Hola ${fn}, te escribimos de Pimentones La Cajita. ¿Cómo te fue con tus pimentones?` },
    pendingUnpaid.length ? { label: 'Recuperar pedido', text: `Hola ${fn}, vimos que tu pedido ${pendingUnpaid[0].reference} quedó pendiente de pago. ¿Te ayudamos a completarlo?` } : null,
    seg?.inactive ? { label: 'Te extrañamos', text: `Hola ${fn}, ¡te extrañamos en La Cajita! Tenemos frascos recién hechos. ¿Te preparamos uno?` } : null,
    seg?.vip ? { label: 'Agradecer VIP', text: `Hola ${fn}, gracias por ser de nuestros clientes más fieles. Queremos consentirte con un detalle en tu próximo pedido.` } : null,
  ].filter(Boolean) as { label: string; text: string }[];

  return (
    <Drawer open onClose={onClose} title={<span className="bo-row" style={{ gap: 10 }}><Avatar name={name} size={36} /><span>{name}</span></span>}
      subtitle={<>{c?.ordersCount ? <>Cliente desde {fmtDay(c.firstOrder)}</> : 'Aún no completa una compra'}{seg?.vip && <Badge tone="amber" icon="star">VIP</Badge>}{seg?.repeat && <Badge tone="violet">Recurrente</Badge>}{seg?.inactive && <Badge tone="gray">Inactivo</Badge>}</>}
      actions={phone ? <LinkButton size="sm" variant="primary" icon="whatsapp" href={waLink(phone)} external>WhatsApp</LinkButton> : undefined}>
      <div className="bo-mini-stats bo-box" style={{ padding: 0, marginBottom: 20 }}>
        <div className="bo-mini-stat"><span>Pedidos pagados</span><b>{c?.ordersCount ?? paid.length}</b></div>
        <div className="bo-mini-stat"><span>Total gastado</span><b>{money(c?.spent ?? 0)}</b></div>
        <div className="bo-mini-stat"><span>Ticket promedio</span><b>{avg ? money(avg) : '—'}</b></div>
        <div className="bo-mini-stat"><span>Última compra</span><b style={{ fontSize: 14 }}>{c ? relTime(c.lastOrder) : '—'}</b></div>
      </div>

      {pendingUnpaid.length > 0 && <div className="bo-callout bo-callout--amber" style={{ marginBottom: 20 }}><Icon name="clock" size={16} /><div><b>{plural(pendingUnpaid.length, 'pedido sin pagar', 'pedidos sin pagar')}</b> · {money(pendingUnpaid.reduce((s, o) => s + o.total, 0))}. Escríbele para ayudarle a completar la compra.</div></div>}
      {seg?.inactive && <div className="bo-callout bo-callout--blue" style={{ marginBottom: 20 }}><Icon name="info" size={16} /><div>Lleva <b>{daysSince(c!.lastOrder)} días</b> sin comprar. Un mensaje personal o un cupón de regreso suele funcionar.</div></div>}

      <Section title="Contacto">
        <div className="bo-list bo-box" style={{ padding: 0 }}>
          <div className="bo-list-item"><Icon name="mail" size={16} className="faint" /><span className="grow">{email}</span><Button size="sm" variant="ghost" iconOnly icon="copy" aria-label="Copiar correo" onClick={async () => { if (await copyText(email)) toast('Correo copiado'); }} /><LinkButton size="sm" variant="ghost" icon="send" href={`mailto:${email}`} /></div>
          {phone && <div className="bo-list-item"><Icon name="phone" size={16} className="faint" /><span className="grow tnum">{phone}</span><Button size="sm" variant="ghost" iconOnly icon="copy" aria-label="Copiar celular" onClick={async () => { if (await copyText(phone)) toast('Celular copiado'); }} /><LinkButton size="sm" variant="ghost" icon="phone" href={`tel:${phone}`} /></div>}
          {last && <div className="bo-list-item"><Icon name="pin" size={16} className="faint" /><span className="grow">{[last.address, last.city, last.department].filter(Boolean).join(', ')}</span></div>}
        </div>
      </Section>

      {phone && templates.length > 0 && (
        <Section title="Escribir por WhatsApp">
          <div className="bo-chips">{templates.map((t) => <a key={t.label} className="bo-chip" href={waLink(phone, t.text)} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={14} />{t.label}</a>)}</div>
        </Section>
      )}

      <Section title={`Historial de pedidos${orders ? ` · ${orders.length}` : ''}`}>
        {!orders ? <TableSkeleton rows={3} cols={3} /> : orders.length === 0 ? <EmptyState small icon="orders" title="Sin pedidos" /> : (
          <div className="bo-list bo-box" style={{ padding: 0 }}>
            {orders.map((o) => (
              <Link key={o.id} className="bo-list-item is-click" href={`/admin/pedidos?id=${o.id}`}>
                <div className="grow"><b className="mono">{o.reference}</b><div className="sub">{fmtDate(o.createdAt)}</div></div>
                <StatusBadge status={o.status} />
                <span className="money tnum strong" style={{ minWidth: 90, textAlign: 'right' }}>{money(o.total)}</span>
                <Icon name="chevronRight" size={16} className="faint" />
              </Link>
            ))}
          </div>
        )}
      </Section>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
function Subscribers({ subs, customers, onExport }: { subs: any[] | null; customers: C[]; onExport: () => void }) {
  const { toast } = useUI();
  const [q, setQ] = useState(''); const [f, setF] = useState<'all' | 'buyers' | 'leads'>('all'); const [page, setPage] = useState(0);
  const buyers = useMemo(() => new Set((Array.isArray(customers) ? customers : []).filter((c) => c.ordersCount > 0).map((c) => c.email.toLowerCase())), [customers]);
  const all = Array.isArray(subs) ? subs : [];
  const last30 = all.filter((s) => daysSince(s.createdAt) <= 30).length;
  const isBuyer = (s: any) => buyers.has(String(s.email).toLowerCase());
  const list = all.filter((s) => (!q || norm(s.email).includes(norm(q))) && (f === 'all' || (f === 'buyers' ? isBuyer(s) : !isBuyer(s))));
  useEffect(() => setPage(0), [q, f]);
  const pageRows = list.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const leads = all.filter((s) => !isBuyer(s)).length;
  return (
    <>
      <div className="bo-grid bo-grid-3" style={{ marginBottom: 16 }}>
        <Stat label="Suscriptores" icon="mail" value={subs ? all.length : '—'} hint="Personas inscritas al boletín" />
        <Stat label="Nuevos (30 días)" icon="sparkle" tone="#175cd3" value={subs ? last30 : '—'} hint="Inscritos en el último mes" />
        <Stat label="Aún no compran" icon="megaphone" tone="#b54708" value={subs ? leads : '—'} hint="Oportunidad: envíales un cupón de bienvenida" />
      </div>
      <Card flush>
        <div className="bo-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar correo" />
          <Segmented value={f} onChange={setF} items={[{ value: 'all', label: 'Todos' }, { value: 'buyers', label: 'Ya compraron' }, { value: 'leads', label: 'Sin compra' }]} />
          <div className="bo-toolbar-right">
            <Button size="sm" icon="copy" disabled={!list.length} onClick={async () => { if (await copyText(list.map((s) => s.email).join(', '))) toast(`${plural(list.length, 'correo copiado', 'correos copiados')}`); }}>Copiar correos</Button>
            <Button size="sm" icon="download" onClick={onExport}>CSV</Button>
          </div>
        </div>
        {!subs ? <TableSkeleton cols={3} /> : list.length === 0 ? <EmptyState icon="mail" title={all.length ? 'Ningún correo coincide' : 'Aún no hay suscriptores'}>{all.length ? 'Prueba con otra búsqueda.' : 'Las personas que se inscriban desde el pie de página de la tienda aparecerán aquí.'}</EmptyState> : (
          <>
            <div className="bo-table-wrap">
              <table className="bo-table">
                <thead><tr><th>Correo</th><th>Habeas Data (Ley 1581)</th><th>Perfil</th><th className="r">Inscrito</th><th className="w-act" /></tr></thead>
                <tbody>
                  {pageRows.map((s) => (
                    <tr key={s.id ?? s.email}>
                      <td><div className="bo-cell-main"><Avatar name={s.email} size={28} /><div><b>{s.email}</b></div></div></td>
                      <td>
                        {s.consent !== false ? (
                          <Badge tone="green" dot>Autorizado</Badge>
                        ) : (
                          <Badge tone="amber">Pendiente</Badge>
                        )}
                        {s.consentAt && <span className="small muted" style={{ display: 'block', fontSize: 11 }}>{fmtDay(s.consentAt)}</span>}
                      </td>
                      <td>{isBuyer(s) ? <Badge tone="blue" dot>Cliente</Badge> : <Badge tone="gray" dot>Prospecto</Badge>}</td>
                      <td className="r muted" title={fmtDate(s.createdAt)}>{relTime(s.createdAt)}</td>
                      <td className="w-act"><div className="bo-row" style={{ gap: 4 }}><Button size="sm" variant="ghost" iconOnly icon="copy" aria-label="Copiar" onClick={async () => { if (await copyText(s.email)) toast('Correo copiado'); }} /><LinkButton size="sm" variant="ghost" icon="mail" href={`mailto:${s.email}`} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pages={Math.ceil(list.length / PER_PAGE)} total={list.length} perPage={PER_PAGE} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
