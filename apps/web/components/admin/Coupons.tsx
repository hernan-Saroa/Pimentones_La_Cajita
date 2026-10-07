'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin, useCan } from './AdminShell';
import {
  Affix, Badge, Bar, Button, Card, Drawer, EmptyState, Field, Icon, Input, MoneyInput, PageHeader, SearchInput, Skeleton, Stat, Tabs, Toggle,
  cls, copyText, fmtDay, money, norm, plural, relTime, useUI, useUnsavedGuard,
} from './kit';

/**
 * Cupones como tickets: código copiable, estado calculado (activo, programado, vencido, agotado) y barra de usos.
 * El editor explica en lenguaje natural lo que recibirá el cliente antes de guardar.
 */
type Type = 'percent' | 'fixed' | 'free_shipping';
type C = { id?: number; code: string; type: Type; value: number; minSubtotal: number; maxUses: number | null; usedCount?: number; startsAt: string | null; endsAt: string | null; active: boolean; createdAt?: string };
type Status = 'active' | 'scheduled' | 'expired' | 'exhausted' | 'off';
const EMPTY: C = { code: '', type: 'percent', value: 10, minSubtotal: 0, maxUses: null, startsAt: null, endsAt: null, active: true };
const STATUS: Record<Status, { label: string; tone: 'green' | 'blue' | 'gray' | 'amber' | 'outline' }> = {
  active: { label: 'Activo', tone: 'green' }, scheduled: { label: 'Programado', tone: 'blue' }, expired: { label: 'Vencido', tone: 'gray' },
  exhausted: { label: 'Agotado', tone: 'amber' }, off: { label: 'Inactivo', tone: 'outline' },
};
export function couponStatus(c: C, now = Date.now()): Status {
  if (!c.active) return 'off';
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return 'scheduled';
  if (c.endsAt && new Date(c.endsAt).getTime() < now) return 'expired';
  if (c.maxUses && (c.usedCount ?? 0) >= c.maxUses) return 'exhausted';
  return 'active';
}
const valueLabel = (c: Pick<C, 'type' | 'value'>) => (c.type === 'percent' ? `${c.value || 0} % de descuento` : c.type === 'fixed' ? `${money(c.value)} de descuento` : 'Envío gratis');
const dateIn = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-CA') : '');
const startOut = (v: string) => (v ? new Date(v + 'T00:00:00').toISOString() : null);
const endOut = (v: string) => (v ? new Date(v + 'T23:59:59').toISOString() : null);
const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const endOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('en-CA'); };
function vigencia(c: Pick<C, 'startsAt' | 'endsAt'>) {
  if (c.startsAt && c.endsAt) return `Del ${fmtDay(c.startsAt)} al ${fmtDay(c.endsAt)}`;
  if (c.startsAt) return `Desde el ${fmtDay(c.startsAt)}, sin fecha de fin`;
  if (c.endsAt) return `Hasta el ${fmtDay(c.endsAt)}`;
  return 'Sin fecha de vencimiento';
}
const body = (c: C) => ({ code: c.code, type: c.type, value: c.type === 'free_shipping' ? 0 : c.value, minSubtotal: c.minSubtotal, maxUses: c.maxUses, startsAt: c.startsAt, endsAt: c.endsAt, active: c.active });

export function Coupons() {
  const api = useAdmin(); const { toast } = useUI(); const can = useCan(); const canEdit = can('admin');
  const sp = useSearchParams(); const router = useRouter(); const pathname = usePathname();
  const [rows, setRows] = useState<C[] | null>(() => { const c = api.getCache?.('admin:coupons'); return Array.isArray(c) ? c : null; }); const [error, setError] = useState('');
  const [q, setQ] = useState(''); const [f, setF] = useState<'all' | Status>('all');
  const [edit, setEdit] = useState<C | null>(null);
  const load = useCallback(() => api.coupons().then((r) => { const arr = Array.isArray(r) ? r : []; setRows(arr); setError(Array.isArray(r) ? '' : (r as any)?.error || ''); }).catch((e: Error) => setError(e.message)), [api]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (sp.get('nuevo') === '1' && canEdit) setEdit({ ...EMPTY }); }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps
  const closeEdit = () => { setEdit(null); if (sp.get('nuevo')) router.replace(pathname, { scroll: false }); };

  const all = Array.isArray(rows) ? rows : [];
  const counts = useMemo(() => { const c: Record<string, number> = { all: all.length, active: 0, scheduled: 0, expired: 0, exhausted: 0, off: 0 }; all.forEach((x) => { c[couponStatus(x)]++; }); return c; }, [all]);
  const uses = all.reduce((s, c) => s + (c.usedCount ?? 0), 0);
  const top = [...all].sort((a, b) => (b.usedCount ?? 0) - (a.usedCount ?? 0))[0];
  const list = useMemo(() => {
    const s = norm(q.trim()); const order: Status[] = ['active', 'scheduled', 'exhausted', 'expired', 'off'];
    return all.filter((c) => (!s || norm(c.code).includes(s)) && (f === 'all' || couponStatus(c) === f))
      .sort((a, b) => order.indexOf(couponStatus(a)) - order.indexOf(couponStatus(b)) || +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0));
  }, [all, q, f]);

  const toggle = async (c: C) => {
    if (!canEdit || !c.id) return;
    const next = { ...c, active: !c.active };
    setRows((r) => r!.map((x) => (x.id === c.id ? next : x)));
    try { await api.saveCoupon(body(next), c.id); toast(next.active ? `Cupón ${c.code} activado` : `Cupón ${c.code} desactivado`); }
    catch (e) { setRows((r) => r!.map((x) => (x.id === c.id ? c : x))); toast((e as Error).message, 'error'); }
  };

  return (
    <>
      <PageHeader title="Cupones" description="El cliente escribe el código al pagar y el descuento se valida solo. Úsalos para dar la bienvenida, recuperar clientes o mover un producto."
        actions={canEdit && <Button variant="primary" icon="plus" onClick={() => setEdit({ ...EMPTY })}>Nuevo cupón</Button>} />

      <div className="bo-grid bo-grid-4" style={{ marginBottom: 16 }}>
        <Stat label="Activos ahora" icon="ticket" value={rows ? counts.active : '—'} hint="Los clientes los pueden usar hoy" />
        <Stat label="Usos totales" icon="checkCircle" tone="#1b7a47" value={rows ? uses.toLocaleString('es-CO') : '—'} hint={top && top.usedCount ? <>El más usado: <b className="mono">{top.code}</b></> : 'Pedidos pagados con cupón'} />
        <Stat label="Programados" icon="calendar" tone="#175cd3" value={rows ? counts.scheduled : '—'} hint="Empiezan en una fecha futura" />
        <Stat label="Vencidos o agotados" icon="clock" tone="#667085" value={rows ? counts.expired + counts.exhausted : '—'} hint="Ya no se pueden usar" />
      </div>

      <Card flush>
        <Tabs
          value={f}
          onChange={(v) => setF(v as any)}
          items={[
            { value: 'all', label: 'Todos', icon: 'ticket', count: counts.all },
            { value: 'active', label: 'Activos hoy', icon: 'checkCircle', count: counts.active },
            { value: 'scheduled', label: 'Programados', icon: 'calendar', count: counts.scheduled },
            { value: 'exhausted', label: 'Agotados', icon: 'alert', count: counts.exhausted, alert: counts.exhausted > 0 },
            { value: 'expired', label: 'Vencidos', icon: 'clock', count: counts.expired },
            { value: 'off', label: 'Inactivos', icon: 'x', count: counts.off },
          ]}
        />
        <div className="bo-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar por código de cupón..." />
        </div>
        {!canEdit && <div className="bo-result-line"><Icon name="lock" size={14} />Tu rol permite consultar los cupones. Para crearlos o editarlos pide acceso de Administrador.</div>}
        <div style={{ padding: '4px 16px 16px' }}>
          {error ? <EmptyState icon="alert" title="No pudimos cargar los cupones" action={<Button onClick={load}>Reintentar</Button>}>{error}</EmptyState>
            : !rows ? <div className="bo-cgrid">{[0, 1, 2].map((i) => <div key={i} className="bo-card" style={{ padding: 18 }}><Skeleton w="50%" h={18} /><Skeleton w="70%" h={24} style={{ marginTop: 14 }} /><Skeleton w="60%" style={{ marginTop: 14 }} /><Skeleton w="100%" h={6} style={{ marginTop: 22 }} /></div>)}</div>
            : list.length === 0 && (q || f !== 'all') ? <EmptyState icon="search" title="Ningún cupón coincide" action={<Button onClick={() => { setQ(''); setF('all'); }}>Ver todos</Button>} />
            : list.length === 0 ? <EmptyState icon="ticket" title="Aún no tienes cupones" action={canEdit ? <Button variant="primary" icon="plus" onClick={() => setEdit({ ...EMPTY })}>Crear el primero</Button> : undefined}>Un cupón de bienvenida del 10 % es un buen comienzo.</EmptyState>
            : (
              <div className="bo-cgrid">
                {list.map((c) => {
                  const st = couponStatus(c); const used = c.usedCount ?? 0;
                  return (
                    <article key={c.id} className={cls('bo-card bo-coupon', st !== 'active' && st !== 'scheduled' && 'is-off')}>
                      <div className="bo-coupon-top">
                        <div className="bo-between">
                          <span className="bo-coupon-code">{c.code}<button onClick={async () => { if (await copyText(c.code)) toast(`Código ${c.code} copiado`); }} aria-label="Copiar código" title="Copiar código"><Icon name="copy" size={15} /></button></span>
                          <Badge tone={STATUS[st].tone} dot>{STATUS[st].label}</Badge>
                        </div>
                        <div className="bo-coupon-value">{valueLabel(c)}</div>
                        <div className="bo-coupon-cond">
                          <span><Icon name="cash" size={14} />{c.minSubtotal ? `En compras desde ${money(c.minSubtotal)}` : 'Sin compra mínima'}</span>
                          <span><Icon name="calendar" size={14} />{vigencia(c)}{st === 'active' && c.endsAt ? ` · termina ${relTime(c.endsAt)}` : ''}</span>
                        </div>
                        <span className="bo-coupon-notch l" /><span className="bo-coupon-notch r" />
                      </div>
                      <div className="bo-coupon-bottom">
                        <div className="bo-between small"><span className="muted">Usos</span><b className="tnum">{used.toLocaleString('es-CO')}{c.maxUses ? ` de ${c.maxUses}` : ' · sin límite'}</b></div>
                        {c.maxUses ? <Bar value={used} max={c.maxUses} color={st === 'exhausted' ? '#f79009' : undefined} /> : null}
                        <div className="bo-between">
                          <Toggle small checked={c.active} disabled={!canEdit} onChange={() => toggle(c)} label={<span style={{ fontSize: 12.5 }}>{c.active ? 'Activado' : 'Desactivado'}</span>} />
                          <Button size="sm" variant="ghost" icon={canEdit ? 'edit' : 'eye'} onClick={() => setEdit(c)}>{canEdit ? 'Editar' : 'Ver'}</Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {canEdit && !q && f === 'all' && <button className="bo-new-tile bo-new-tile--sm" onClick={() => setEdit({ ...EMPTY })}><span className="ico"><Icon name="plus" size={20} /></span>Nuevo cupón<small>Porcentaje, monto fijo o envío gratis.</small></button>}
              </div>
            )}
        </div>
      </Card>

      {edit && <CouponEditor key={edit.id ?? 'new'} initial={edit} all={all} readOnly={!canEdit} onClose={closeEdit} onSaved={() => { closeEdit(); load(); }} />}
    </>
  );
}

// ---------------------------------------------------------------------------
function CouponEditor({ initial, all, readOnly, onClose, onSaved }: { initial: C; all: C[]; readOnly: boolean; onClose: () => void; onSaved: () => void }) {
  const api = useAdmin(); const { toast, confirm } = useUI();
  const [c, setC] = useState<C>(initial); const [busy, setBusy] = useState(false); const [showErr, setShowErr] = useState(false);
  const [limit, setLimit] = useState(initial.maxUses != null);
  const isNew = !initial.id;
  const dirty = JSON.stringify(c) !== JSON.stringify(initial) || limit !== (initial.maxUses != null);
  useUnsavedGuard(dirty && !readOnly);
  const set = <K extends keyof C>(k: K, v: C[K]) => setC((x) => ({ ...x, [k]: v }));

  const errors: Record<string, string> = {};
  if (!/^[A-Z0-9-]{3,40}$/.test(c.code)) errors.code = 'Usa de 3 a 40 letras, números o guiones, sin espacios.';
  else if (all.some((x) => x.code === c.code && x.id !== c.id)) errors.code = 'Ya existe un cupón con este código.';
  if (c.type === 'percent' && (c.value < 1 || c.value > 100)) errors.value = 'Entre 1 y 100 %.';
  if (c.type === 'fixed' && c.value < 1) errors.value = 'Escribe el monto del descuento.';
  if (limit && (!c.maxUses || c.maxUses < 1)) errors.maxUses = 'Escribe cuántas veces se puede usar.';
  if (c.startsAt && c.endsAt && new Date(c.endsAt) < new Date(c.startsAt)) errors.endsAt = 'La fecha de fin es anterior al inicio.';
  const e = (k: string) => (showErr ? errors[k] : undefined);

  const generate = () => {
    const base = c.type === 'free_shipping' ? 'ENVIOGRATIS' : c.type === 'percent' ? `CAJITA${c.value || ''}` : `REGALO${Math.round((c.value || 0) / 1000) || ''}`;
    const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
    set('code', `${base}-${rnd}`);
  };
  const close = async () => { if (dirty && !readOnly && !(await confirm({ title: '¿Salir sin guardar?', body: 'Los cambios de este cupón se perderán.', confirm: 'Salir sin guardar', cancel: 'Seguir editando', danger: true }))) return; onClose(); };
  const save = async () => {
    setShowErr(true);
    if (Object.keys(errors).length) return toast('Revisa los campos marcados.', 'error');
    setBusy(true);
    try { await api.saveCoupon(body({ ...c, maxUses: limit ? c.maxUses : null }), c.id); toast(isNew ? `Cupón ${c.code} creado` : `Cupón ${c.code} guardado`); onSaved(); }
    catch (err) { toast((err as Error).message, 'error'); }
    setBusy(false);
  };

  const preview: C = { ...c, maxUses: limit ? c.maxUses : null };
  const st = couponStatus(preview);
  const sentence = <>
    Quien escriba <b className="mono">{c.code || 'EL-CÓDIGO'}</b> al pagar recibe <b>{c.type === 'free_shipping' ? 'el envío gratis' : c.type === 'percent' ? `${c.value || 0} % de descuento en los frascos` : `${money(c.value)} de descuento`}</b>
    {c.minSubtotal ? <>, en compras desde <b>{money(c.minSubtotal)}</b></> : ''}. {vigencia(c)}. {preview.maxUses ? <>Se puede usar <b>{plural(preview.maxUses, 'vez', 'veces')}</b> en total.</> : 'Sin límite de usos.'}
  </>;

  return (
    <Drawer open onClose={close} size="md" title={isNew ? 'Nuevo cupón' : <span className="mono">{initial.code}</span>}
      subtitle={!isNew ? <><Badge tone={STATUS[couponStatus(initial)].tone} dot>{STATUS[couponStatus(initial)].label}</Badge><span>{plural(initial.usedCount ?? 0, 'uso', 'usos')}</span></> : 'Define el descuento, las condiciones y la vigencia.'}
      footer={readOnly ? <Button onClick={onClose}>Cerrar</Button> : <><Button onClick={close}>Cancelar</Button><Button variant="primary" icon="check" loading={busy} disabled={!dirty && !isNew} onClick={save}>{isNew ? 'Crear cupón' : 'Guardar cambios'}</Button></>}>
      <fieldset className="bo-plain" disabled={readOnly}>
        <div className={cls('bo-callout', st === 'active' ? 'bo-callout--blue' : 'bo-callout--gray')} style={{ marginBottom: 20 }}>
          <Icon name="info" size={16} />
          <div>{sentence}{st !== 'active' && <div style={{ marginTop: 6 }}><Badge tone={STATUS[st].tone} dot>{STATUS[st].label}</Badge> {st === 'off' ? 'Nadie lo puede usar mientras esté desactivado.' : st === 'scheduled' ? 'Empezará a funcionar en la fecha de inicio.' : st === 'expired' ? 'Ya pasó la fecha de fin.' : 'Ya se alcanzó el límite de usos.'}</div>}</div>
        </div>

        <section className="bo-fieldset">
          <div className="bo-fieldset-head"><h3>Código</h3><p>Corto y fácil de dictar por WhatsApp.</p></div>
          <Field group error={e('code')}>
            <div className="bo-inline">
              <Input className="grow mono" value={c.code} aria-invalid={!!e('code')} maxLength={40} placeholder="BIENVENIDA10" style={{ fontSize: 15, letterSpacing: '.04em' }}
                onChange={(ev) => set('code', ev.target.value.toUpperCase().replace(/\s+/g, ''))} />
              <Button icon="sparkle" onClick={generate}>Generar</Button>
            </div>
          </Field>
        </section>

        <section className="bo-fieldset">
          <div className="bo-fieldset-head"><h3>Descuento</h3></div>
          <div className="bo-choices" style={{ marginBottom: 14 }}>
            {([['percent', 'percent', 'Porcentaje', 'Ej.: 10 % de los frascos'], ['fixed', 'cash', 'Monto fijo', 'Ej.: $5.000 menos'], ['free_shipping', 'truck', 'Envío gratis', 'No cobra el envío']] as const).map(([v, ic, t, d]) => (
              <button type="button" key={v} className={cls('bo-choice', c.type === v && 'is-active')} onClick={() => setC((x) => ({ ...x, type: v, value: v === 'percent' ? (x.type === 'percent' ? x.value : 10) : v === 'fixed' ? (x.type === 'fixed' ? x.value : 5000) : 0 }))}>
                <Icon name={ic} size={17} /><div><b>{t}</b><span>{d}</span></div>
              </button>
            ))}
          </div>
          {c.type === 'percent' && <Field label="Porcentaje" error={e('value')} hint="Se aplica al valor de los frascos, no al envío."><div className="bo-row" style={{ gap: 10, flexWrap: 'wrap' }}><Affix suf="%"><Input type="number" min={1} max={100} value={c.value || ''} onChange={(ev) => set('value', Math.min(100, Number(ev.target.value) || 0))} style={{ width: 120 }} /></Affix><span className="bo-chips">{[5, 10, 15, 20].map((n) => <button type="button" key={n} className={cls('bo-chip', c.value === n && 'is-active')} onClick={(ev) => { ev.preventDefault(); set('value', n); }}>{n} %</button>)}</span></div></Field>}
          {c.type === 'fixed' && <Field label="Monto del descuento" error={e('value')}><MoneyInput value={c.value} onChange={(n) => set('value', n)} style={{ maxWidth: 220 }} /></Field>}
        </section>

        <section className="bo-fieldset">
          <div className="bo-fieldset-head"><h3>Condiciones</h3></div>
          <div className="bo-stack" style={{ gap: 16 }}>
            <Field label="Compra mínima en frascos" optional hint="Déjalo en 0 para que aplique a cualquier compra.">
              <MoneyInput value={c.minSubtotal} onChange={(n) => set('minSubtotal', n)} style={{ maxWidth: 220 }} />
            </Field>
            <div className="bo-stack" style={{ gap: 10 }}>
              <Toggle checked={limit} onChange={(v) => { setLimit(v); if (v && !c.maxUses) set('maxUses', 50); }} label="Limitar el número de usos" description="Útil para promociones con cupos. Cuenta usos en pedidos de todos los clientes." />
              {limit && <Field error={e('maxUses')}><Affix suf="usos"><Input type="number" min={1} value={c.maxUses ?? ''} onChange={(ev) => set('maxUses', ev.target.value ? Math.max(1, Number(ev.target.value)) : null)} style={{ maxWidth: 200 }} /></Affix></Field>}
            </div>
          </div>
        </section>

        <section className="bo-fieldset">
          <div className="bo-fieldset-head"><h3>Vigencia</h3><p>Sin fechas, el cupón funciona siempre que esté activado.</p></div>
          <div className="bo-form-grid">
            <Field label="Empieza" optional><Input type="date" value={dateIn(c.startsAt)} onChange={(ev) => set('startsAt', startOut(ev.target.value))} /></Field>
            <Field label="Termina" optional error={e('endsAt')}><Input type="date" value={dateIn(c.endsAt)} min={dateIn(c.startsAt) || undefined} onChange={(ev) => set('endsAt', endOut(ev.target.value))} /></Field>
          </div>
          <div className="bo-chips" style={{ marginTop: 10 }}>
            <button type="button" className="bo-chip" onClick={() => set('endsAt', endOut(plusDays(7)))}>Por 7 días</button>
            <button type="button" className="bo-chip" onClick={() => set('endsAt', endOut(plusDays(30)))}>Por 30 días</button>
            <button type="button" className="bo-chip" onClick={() => set('endsAt', endOut(endOfMonth()))}>Hasta fin de mes</button>
            <button type="button" className="bo-chip" onClick={() => setC((x) => ({ ...x, startsAt: null, endsAt: null }))}><Icon name="x" size={13} />Sin fechas</button>
          </div>
        </section>

        <section className="bo-fieldset">
          <Toggle checked={c.active} onChange={(v) => set('active', v)} label="Cupón activado" description={c.active ? 'Los clientes lo pueden usar dentro de la vigencia.' : 'Nadie lo puede usar hasta que lo actives.'} />
        </section>
      </fieldset>
    </Drawer>
  );
}
