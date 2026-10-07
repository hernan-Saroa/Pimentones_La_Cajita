'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin, useCan } from './AdminShell';
import {
  Affix, Badge, Button, Card, Drawer, EmptyState, Field, Icon, Input, LinkButton, Menu, MoneyInput, PageHeader, SearchInput, Segmented,
  Skeleton, Stat, Tabs, Textarea, Thumb, Toggle, cls, copyText, money, moneyShort, norm, plural, useUI, useUnsavedGuard,
} from './kit';

/**
 * Productos: catálogo visual (cuadrícula o lista), visibilidad con un clic y editor por secciones
 * con vista previa en vivo de la tarjeta tal como la ve el cliente.
 * El inventario de un producto existente solo cambia desde Inventario (lotes y ajustes) para no romper la trazabilidad.
 */
const LOW = 5;
type P = { id?: number; slug: string; name: string; kicker: string; tagline: string; description: string; pairing: string; conservation?: string; price: number; sizeG: number; stock: number; image: string; active: boolean; sort: number };
const EMPTY: P = { slug: '', name: '', kicker: '', tagline: '', description: '', pairing: '', conservation: '', price: 0, sizeG: 200, stock: 0, image: '', active: true, sort: 0 };
type Filter = 'all' | 'visible' | 'hidden' | 'low';
const VIEW_KEY = 'lacajita.admin.products.view';

const slugify = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const clean = (p: any): P => ({ ...EMPTY, ...p, kicker: p.kicker ?? '', tagline: p.tagline ?? '', pairing: p.pairing ?? '', conservation: p.conservation ?? '', image: p.image ?? '' });
/** Solo los campos editables: así las fechas que pone el servidor no cuentan como “cambios sin guardar”. */
const editable = (p: P) => JSON.stringify((Object.keys(EMPTY) as (keyof P)[]).map((k) => p[k]));
export function stockInfo(stock: number, active = true): { label: string; tone: 'red' | 'amber' | 'green' | 'gray' } {
  if (stock <= 0) return { label: 'Agotado', tone: active ? 'red' : 'gray' };
  if (stock <= LOW) return { label: `Quedan ${stock}`, tone: active ? 'amber' : 'gray' };
  return { label: `${stock} en bodega`, tone: active ? 'green' : 'gray' };
}

export function Products() {
  const api = useAdmin(); const { toast } = useUI(); const can = useCan(); const canEdit = can('admin');
  const sp = useSearchParams(); const router = useRouter(); const pathname = usePathname();
  const [rows, setRows] = useState<P[] | null>(() => { const c = api.getCache?.('admin:products'); return Array.isArray(c) ? c.map(clean) : null; }); const [error, setError] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [q, setQ] = useState(''); const [filter, setFilter] = useState<Filter>('all');
  const [edit, setEdit] = useState<P | null>(null);

  useEffect(() => { try { const v = localStorage.getItem(VIEW_KEY); if (v === 'list' || v === 'grid') setView(v); } catch { /* no-op */ } }, []);
  const load = useCallback(() => api.products().then((r) => { const arr = Array.isArray(r) ? r : []; setRows(arr.map(clean)); setError(Array.isArray(r) ? '' : (r as any)?.error || ''); }).catch((e: Error) => setError(e.message)), [api]);
  useEffect(() => { load(); }, [load]);

  const setParam = (k: string, v: string | null) => { const p = new URLSearchParams(sp.toString()); if (v == null) p.delete(k); else p.set(k, v); router.replace(`${pathname}${p.toString() ? `?${p}` : ''}`, { scroll: false }); };
  // Abrir desde la URL (?id=3 o ?nuevo=1, usado por la paleta de comandos y el tablero)
  useEffect(() => {
    if (!rows) return;
    const id = Number(sp.get('id'));
    if (id) { const p = rows.find((x) => x.id === id); if (p) setEdit(p); }
    else if (sp.get('nuevo') === '1' && canEdit) setEdit({ ...EMPTY, sort: nextSort(rows) });
  }, [rows, sp]); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => [...(rows ?? [])].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'es')), [rows]);
  const counts = useMemo(() => ({
    all: sorted.length, visible: sorted.filter((p) => p.active).length, hidden: sorted.filter((p) => !p.active).length,
    low: sorted.filter((p) => p.active && p.stock <= LOW).length,
  }), [sorted]);
  const list = useMemo(() => {
    const s = norm(q.trim());
    return sorted.filter((p) => (!s || norm(`${p.name} ${p.kicker} ${p.slug}`).includes(s))
      && (filter === 'all' || (filter === 'visible' ? p.active : filter === 'hidden' ? !p.active : p.active && p.stock <= LOW)));
  }, [sorted, q, filter]);
  const stockValue = sorted.reduce((s, p) => s + p.price * Math.max(0, p.stock), 0);
  const units = sorted.reduce((s, p) => s + Math.max(0, p.stock), 0);

  const openEdit = (p: P) => { setEdit(p); if (p.id) setParam('id', String(p.id)); };
  const openNew = () => { setEdit({ ...EMPTY, sort: nextSort(sorted) }); };
  const closeEdit = () => { setEdit(null); const p = new URLSearchParams(sp.toString()); p.delete('id'); p.delete('nuevo'); router.replace(`${pathname}${p.toString() ? `?${p}` : ''}`, { scroll: false }); };
  const duplicate = (p: P) => { const { id: _id, ...rest } = p; setEdit({ ...rest, name: `${p.name} (copia)`, slug: slugify(`${p.slug}-copia`), active: false, stock: 0, sort: nextSort(sorted) }); };

  const toggle = async (p: P) => {
    if (!canEdit) return;
    const next = !p.active;
    setRows((r) => r!.map((x) => (x.id === p.id ? { ...x, active: next } : x)));
    try { await api.saveProduct({ id: p.id, active: next }); toast(next ? `“${p.name}” ya se ve en la tienda` : `“${p.name}” quedó oculto de la tienda`); }
    catch (e) { setRows((r) => r!.map((x) => (x.id === p.id ? { ...x, active: p.active } : x))); toast((e as Error).message, 'error'); }
  };
  const menuFor = (p: P) => [
    { label: 'Editar', icon: 'edit', onClick: () => openEdit(p) },
    { label: 'Ver en la tienda', icon: 'external', href: `/producto/${p.slug}`, external: true },
    { label: 'Copiar enlace', icon: 'link', onClick: async () => { if (await copyText(`${location.origin}/producto/${p.slug}`)) toast('Enlace copiado'); } },
    { label: 'Gestionar inventario', icon: 'layers', href: `/admin/inventario?id=${p.id}` },
    'sep' as const,
    { label: 'Duplicar', icon: 'copy', onClick: () => duplicate(p), hidden: !canEdit },
    { label: p.active ? 'Ocultar de la tienda' : 'Publicar en la tienda', icon: p.active ? 'eyeOff' : 'eye', onClick: () => toggle(p), hidden: !canEdit },
  ];
  const filtersOn = !!q || filter !== 'all';

  return (
    <>
      <PageHeader
        title="Productos"
        description={
          rows ? (
            <span className="bo-row" style={{ gap: 8, alignItems: 'center', fontSize: 13, flexWrap: 'wrap' }}>
              <span>{plural(counts.all, 'producto', 'productos')}</span>
              <span className="muted">·</span>
              <span>{counts.visible} en la tienda</span>
              {counts.hidden > 0 && <span className="muted">· {counts.hidden} ocultos</span>}
              {counts.low > 0 && (
                <Badge tone="amber" icon="alert">
                  {plural(counts.low, 'con stock bajo', 'con stock bajo')}
                </Badge>
              )}
            </span>
          ) : 'Cargando catálogo…'
        }
        actions={
          <div className="bo-row" style={{ gap: 10, alignItems: 'center', flexWrap: 'nowrap' }}>
            <Segmented
              value={view}
              onChange={(v) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* no-op */ } }}
              items={[
                { value: 'grid', label: '', icon: 'grid', title: 'Vista cuadrícula' },
                { value: 'list', label: '', icon: 'list', title: 'Vista lista' },
              ]}
            />
            {canEdit && (
              <Button variant="primary" icon="plus" onClick={openNew}>
                Nuevo producto
              </Button>
            )}
          </div>
        }
      />

      <div className="bo-grid bo-grid-4" style={{ marginBottom: 16 }}>
        <Stat label="En la tienda" icon="store" value={rows ? counts.visible : '—'} hint={rows ? `de ${plural(counts.all, 'producto', 'productos')}` : null} />
        <Stat label="Ocultos" icon="eyeOff" tone="#667085" value={rows ? counts.hidden : '—'} hint="No aparecen en la tienda" />
        <Stat label="Agotados o por agotarse" icon="alert" tone="#b54708" value={rows ? counts.low : '—'} hint={rows && counts.low ? <a className="bo-link" href="/admin/inventario?f=attention">Registrar un lote <Icon name="arrowRight" size={13} /></a> : `Con ${LOW} frascos o menos`} />
        <Stat label="Valor en bodega" icon="cash" tone="#c0262d" value={rows ? moneyShort(stockValue) : '—'} hint={rows ? `${plural(units, 'frasco', 'frascos')} a precio de venta` : null} />
      </div>

      <Card flush>
        <Tabs
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          items={[
            { value: 'all', label: 'Todos', icon: 'tag', count: counts.all },
            { value: 'visible', label: 'En la tienda', icon: 'store', count: counts.visible },
            { value: 'hidden', label: 'Ocultos', icon: 'eyeOff', count: counts.hidden },
            { value: 'low', label: 'Stock bajo', icon: 'alert', count: counts.low, alert: counts.low > 0 },
          ]}
        />
        <div className="bo-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar por nombre, frase o slug..." />
          {filtersOn && (
            <Button size="sm" variant="ghost" icon="x" onClick={() => { setQ(''); setFilter('all'); }}>
              Limpiar filtros
            </Button>
          )}
        </div>
        {!canEdit && <div className="bo-result-line"><Icon name="lock" size={14} />Tu rol permite consultar el catálogo. Para editarlo pide acceso de Administrador.</div>}

        {error ? <EmptyState icon="alert" title="No pudimos cargar los productos" action={<Button onClick={load}>Reintentar</Button>}>{error}</EmptyState>
          : !rows ? <div style={{ padding: 16 }}><div className="bo-pgrid">{[0, 1, 2, 3].map((i) => <div key={i} className="bo-card"><Skeleton h={180} r={0} /><div style={{ padding: 16 }}><Skeleton w="40%" h={10} /><Skeleton w="70%" h={16} style={{ marginTop: 10 }} /><Skeleton w="30%" h={18} style={{ marginTop: 12 }} /></div></div>)}</div></div>
          : list.length === 0 ? (filtersOn
            ? <EmptyState icon="search" title="Ningún producto coincide" action={<Button onClick={() => { setQ(''); setFilter('all'); }}>Ver todos</Button>}>Prueba con otro nombre o quita el filtro.</EmptyState>
            : <EmptyState icon="tag" title="Aún no hay productos" action={canEdit ? <Button variant="primary" icon="plus" onClick={openNew}>Crear el primero</Button> : undefined}>Crea tu primer frasco con foto, precio y descripción.</EmptyState>)
          : view === 'grid' ? (
            <div style={{ padding: '4px 16px 16px' }}>
              <div className="bo-pgrid">
                {list.map((p) => {
                  const st = stockInfo(p.stock, p.active);
                  return (
                    <article key={p.id} className={cls('bo-card bo-pcard', !p.active && 'is-hidden')}>
                      <div className="bo-pcard-media" onClick={() => openEdit(p)} role="button" tabIndex={0} aria-label={`Editar ${p.name}`} onKeyDown={(e) => { if (e.key === 'Enter') openEdit(p); }}>
                        {p.image ? (
                          <img
                            src={p.image}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/img/recortes/confitados.webp';
                            }}
                          />
                        ) : <Icon name="image" size={36} className="faint" />}
                        <Badge tone={st.tone} dot>{st.label}</Badge>
                        <span className="bo-pcard-flag">
                          {p.active ? <Badge tone="green" dot>En tienda</Badge> : <Badge tone="gray" icon="eyeOff">Oculto</Badge>}
                        </span>
                      </div>
                      <div className="bo-pcard-body">
                        {p.kicker && <small>{p.kicker}</small>}
                        <h3 onClick={() => openEdit(p)}>{p.name}</h3>
                        <div className="bo-pcard-meta"><span className="bo-pcard-price" style={{ color: 'var(--ink)' }}>{money(p.price)}</span><span>{p.sizeG} g</span></div>
                      </div>
                      <div className="bo-pcard-foot">
                        <Toggle small checked={p.active} disabled={!canEdit} onChange={() => toggle(p)} label={<span style={{ fontSize: 12.5, fontWeight: 600 }}>{p.active ? 'En tienda' : 'Oculto'}</span>} />
                        <span style={{ marginLeft: 'auto' }} />
                        <a href={`/producto/${p.slug}`} target="_blank" rel="noreferrer" className="bo-btn bo-btn--ghost bo-btn--sm" title="Ver en la tienda"><Icon name="external" size={14} /></a>
                        {canEdit && <Button size="sm" variant="secondary" icon="edit" onClick={() => openEdit(p)}>Editar</Button>}
                        <Menu trigger={(t) => <Button size="sm" variant="ghost" iconOnly icon="more" onClick={t} aria-label="Más acciones" />} items={menuFor(p)} />
                      </div>
                    </article>
                  );
                })}
                {canEdit && !filtersOn && <button className="bo-new-tile" onClick={openNew}><span className="ico"><Icon name="plus" size={20} /></span>Nuevo producto<small>Con foto, precio y descripción. Puedes dejarlo oculto mientras lo preparas.</small></button>}
              </div>
            </div>
          ) : (
            <div className="bo-table-wrap">
              <table className="bo-table">
                <thead><tr><th>Producto</th><th className="r">Precio</th><th>Inventario</th><th className="bo-hide-sm">Visible</th><th className="r bo-hide-sm">Orden</th><th className="w-act" /></tr></thead>
                <tbody>
                  {list.map((p) => {
                    const st = stockInfo(p.stock, p.active);
                    return (
                      <tr key={p.id} className="is-click" onClick={() => openEdit(p)}>
                        <td><div className="bo-cell-main"><Thumb src={p.image} size={44} /><div><b className="bo-row" style={{ gap: 6 }}>{p.name}{!p.active && <Badge tone="outline">Oculto</Badge>}</b><span>{p.kicker || `/producto/${p.slug}`} · {p.sizeG} g</span></div></div></td>
                        <td className="r money">{money(p.price)}</td>
                        <td><Badge tone={st.tone} dot>{st.label}</Badge></td>
                        <td className="bo-hide-sm" onClick={(e) => e.stopPropagation()}><Toggle small checked={p.active} disabled={!canEdit} onChange={() => toggle(p)} /></td>
                        <td className="r tnum muted bo-hide-sm">{p.sort}</td>
                        <td className="w-act" onClick={(e) => e.stopPropagation()}><Menu trigger={(t) => <Button size="sm" variant="ghost" iconOnly icon="more" onClick={t} aria-label="Más acciones" />} items={menuFor(p)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {edit && <ProductEditor key={`${edit.id ?? 'new'}-${(edit as any).updatedAt ?? ''}`} initial={edit} all={sorted} readOnly={!canEdit} onClose={closeEdit}
        onSaved={(saved, created) => { load(); if (created) { setEdit(null); closeEdit(); } else setEdit(clean(saved)); }} />}
    </>
  );
}
const nextSort = (rows: P[]) => (rows.length ? Math.max(...rows.map((r) => r.sort)) + 1 : 1);

// ---------------------------------------------------------------------------
function ProductEditor({ initial, all, readOnly, onClose, onSaved }: { initial: P; all: P[]; readOnly: boolean; onClose: () => void; onSaved: (p: any, created: boolean) => void }) {
  const api = useAdmin(); const { toast, confirm } = useUI();
  const [p, setP] = useState<P>(initial); const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false); const [over, setOver] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!initial.id || !!initial.slug);
  const [showErrors, setShowErrors] = useState(false);
  const isNew = !initial.id;
  const dirty = editable(p) !== editable(initial);
  useUnsavedGuard(dirty && !readOnly);
  const set = <K extends keyof P>(k: K, v: P[K]) => setP((x) => ({ ...x, [k]: v }));

  const errors: Partial<Record<keyof P, string>> = {};
  if (p.name.trim().length < 2) errors.name = 'Escribe el nombre del producto (mínimo 2 letras).';
  if (p.description.trim().length < 5) errors.description = 'Cuéntale al cliente qué es y cómo se come (mínimo 5 caracteres).';
  if (!/^[a-z0-9-]{3,80}$/.test(p.slug)) errors.slug = 'Solo minúsculas, números y guiones (mínimo 3 letras).';
  else if (all.some((x) => x.slug === p.slug && x.id !== p.id)) errors.slug = 'Ya hay otro producto con esta dirección.';
  if (!p.price || p.price <= 0) errors.price = 'Ponle un precio de venta (ej: $ 24.000).';
  const err = (k: keyof P) => (showErrors ? errors[k] : undefined);

  const close = async () => {
    if (dirty && !readOnly && !(await confirm({ title: '¿Salir sin guardar?', body: 'Los cambios que hiciste en este producto se perderán.', confirm: 'Salir sin guardar', cancel: 'Seguir editando', danger: true }))) return;
    onClose();
  };
  const upload = async (file?: File | null) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast('Usa una foto JPG, PNG o WEBP.', 'error');
    if (file.size > 4 * 1024 * 1024) return toast('La foto pesa más de 4 MB. Redúcela e inténtalo otra vez.', 'error');
    setUploading(true);
    try { const { url } = await api.upload(file); set('image', url); toast('Foto cargada'); } catch (e) { toast((e as Error).message, 'error'); }
    setUploading(false);
  };
  const save = async () => {
    setShowErrors(true);
    if (Object.keys(errors).length) { toast('Revisa los campos requeridos marcados en rojo.', 'error'); return; }
    setBusy(true);
    try {
      // En productos existentes el inventario no se envía: se maneja por lotes y ajustes.
      const { stock, ...rest } = p;
      const r = await api.saveProduct(isNew ? { ...p } : rest);
      toast(isNew ? `¡Producto “${p.name}” creado exitosamente!` : 'Cambios guardados');
      onSaved(r, isNew);
    } catch (e) { toast((e as Error).message, 'error'); }
    setBusy(false);
  };
  const st = stockInfo(p.stock, p.active);

  return (
    <Drawer open onClose={close} size="lg" title={isNew ? (initial.name ? 'Duplicar producto' : 'Nuevo producto') : p.name || 'Producto'}
      subtitle={isNew ? 'Completa la información y guárdalo. Puedes dejarlo oculto mientras lo preparas.' : <>{p.active ? <Badge tone="green" dot>Visible en la tienda</Badge> : <Badge tone="gray" dot>Oculto</Badge>}<Badge tone={st.tone}>{st.label}</Badge></>}
      actions={!isNew ? <LinkButton size="sm" icon="external" href={`/producto/${initial.slug}`} external>Ver en la tienda</LinkButton> : undefined}
      footer={readOnly ? <Button onClick={onClose}>Cerrar</Button> : <>
        {dirty && <span className="bo-left small muted bo-row" style={{ gap: 6 }}><Icon name="info" size={14} />Cambios sin guardar</span>}
        <Button onClick={close}>Cancelar</Button>
        <Button variant="primary" icon="check" loading={busy} disabled={!dirty && !isNew} onClick={save}>{isNew ? 'Crear producto' : 'Guardar cambios'}</Button>
      </>}>
      <div className="bo-editor">
        <fieldset className="bo-plain" disabled={readOnly}>
          {readOnly && <div className="bo-callout bo-callout--gray" style={{ marginBottom: 16 }}><Icon name="lock" size={16} /><div>Estás en modo consulta. Solo un Administrador puede editar productos.</div></div>}

          <section className="bo-fieldset">
            <div className="bo-fieldset-head"><h3>Información</h3><p>Lo que lee el cliente en la tarjeta y en la ficha del producto.</p></div>
            <div className="bo-form-grid">
              <Field label="Nombre" className="span-2" error={err('name')} counter={p.name.length} max={120}>
                <Input value={p.name} maxLength={120} aria-invalid={!!err('name')} placeholder="Pimentones confitados" autoFocus={isNew}
                  onChange={(e) => { const v = e.target.value; setP((x) => ({ ...x, name: v, slug: slugTouched ? x.slug : slugify(v) })); }} />
              </Field>
              <Field label="Frase sobre el nombre" optional counter={p.kicker.length} max={60} hint="Aparece en pequeño, encima del nombre.">
                <Input value={p.kicker} maxLength={60} onChange={(e) => set('kicker', e.target.value)} placeholder="La consentida" />
              </Field>
              <Field label="Frase corta" optional counter={p.tagline.length} max={200} hint="Una línea que antoje.">
                <Input value={p.tagline} maxLength={200} onChange={(e) => set('tagline', e.target.value)} placeholder="Dulce, ahumado y con un toque de ajo" />
              </Field>
              <Field label="Descripción" className="span-2" error={err('description')} counter={p.description.length} max={2000}>
                <Textarea rows={5} value={p.description} maxLength={2000} onChange={(e) => set('description', e.target.value)} placeholder="Qué es, cómo se prepara y por qué es especial." />
              </Field>
              <Field label="Va con" className="span-2" optional counter={p.pairing.length} max={300} hint="Ideas para acompañar: ayuda al cliente a imaginarlo en su mesa.">
                <Input value={p.pairing} maxLength={300} onChange={(e) => set('pairing', e.target.value)} placeholder="Quesos maduros, carnes frías, tostadas con aguacate" />
              </Field>
              <Field label="Pautas de conservación y vida útil" className="span-2" optional counter={(p.conservation || '').length} max={400} hint="Recomendaciones de cuidado específicas para este frasco (ej: mantener refrigerado, vida útil cerrado y abierto).">
                <Textarea rows={3} value={p.conservation || ''} maxLength={400} onChange={(e) => set('conservation', e.target.value)} placeholder="Cerrado, en un lugar fresco y sin sol. Una vez abierto, en la nevera: no lleva conservantes." />
              </Field>
            </div>
          </section>

          <section className="bo-fieldset">
            <div className="bo-fieldset-head"><h3>Precio y presentación</h3></div>
            <div className="bo-form-grid">
              <Field label="Precio de venta" error={err('price')} hint="Incluye impuestos. El envío se calcula aparte.">
                <MoneyInput value={p.price} onChange={(n) => set('price', n)} aria-invalid={!!err('price')} placeholder="24.000" />
              </Field>
              <Field label="Contenido">
                <Affix suf="gramos"><Input type="number" min={0} max={10000} value={p.sizeG || ''} onChange={(e) => set('sizeG', Number(e.target.value) || 0)} /></Affix>
              </Field>
            </div>
          </section>

          <section className="bo-fieldset">
            <div className="bo-fieldset-head"><h3>Foto</h3><p>Fondo claro o recortada, de frente. JPG, PNG o WEBP hasta 4 MB.</p></div>
            <div className={cls('bo-drop', over && 'is-over')} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files?.[0]); }}>
              <span className="bo-drop-media">{uploading ? <span className="bo-spin" style={{ color: 'var(--brand)' }} /> : p.image ? <img src={p.image} alt="" /> : <Icon name="image" size={26} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', fontWeight: 600 }}>{uploading ? 'Subiendo foto…' : p.image ? 'Cambiar foto' : 'Arrastra la foto aquí'}</b>
                <span className="small muted">{p.image ? 'Arrastra otra foto o haz clic para reemplazarla.' : 'o haz clic para elegirla desde tu computador.'}</span>
              </div>
              {!readOnly && <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Elegir foto" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />}
              {p.image && !readOnly && <Button size="sm" variant="ghost" icon="trash" style={{ position: 'relative', zIndex: 1 }} onClick={() => set('image', '')}>Quitar</Button>}
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="O escribe la ruta o URL de la foto" optional hint="Si la foto ya existe en la tienda (ej: /pimentones-confitados.png o enlace web https://)">
                <Input value={p.image} onChange={(e) => set('image', e.target.value.trim())} placeholder="https://... o /pimentones-confitados.png" />
              </Field>
            </div>
          </section>

          <section className="bo-fieldset">
            <div className="bo-fieldset-head"><h3>Inventario</h3></div>
            {isNew ? (
              <Field label="Frascos disponibles al publicar" hint="Después, el inventario se maneja desde Inventario con lotes de producción y ajustes, para que quede registrado cada movimiento.">
                <Affix suf="frascos"><Input type="number" min={0} value={p.stock || ''} placeholder="0" onChange={(e) => set('stock', Math.max(0, Number(e.target.value) || 0))} style={{ maxWidth: 220 }} /></Affix>
              </Field>
            ) : (
              <div className="bo-box bo-between">
                <div><b style={{ fontSize: 20, fontWeight: 650 }} className="tnum">{p.stock}</b> <span className="muted">frascos en bodega</span><div className="small muted">Para sumar o restar, registra un lote o un ajuste: así queda la trazabilidad.</div></div>
                <LinkButton size="sm" icon="layers" href={`/admin/inventario?id=${p.id}`}>Ir a Inventario</LinkButton>
              </div>
            )}
          </section>

          <section className="bo-fieldset">
            <div className="bo-fieldset-head"><h3>Visibilidad y orden</h3></div>
            <div className="bo-stack" style={{ gap: 14 }}>
              <Toggle checked={p.active} onChange={(v) => set('active', v)} label="Visible en la tienda" description={p.active ? 'Los clientes lo ven y lo pueden comprar.' : 'Queda guardado pero nadie lo ve en la tienda.'} />
              <Field label="Posición en la tienda" hint="Los números más bajos aparecen primero.">
                <Input type="number" value={p.sort} onChange={(e) => set('sort', Number(e.target.value) || 0)} style={{ maxWidth: 140 }} />
              </Field>
            </div>
          </section>

          <section className="bo-fieldset">
            <div className="bo-fieldset-head"><h3>Dirección web</h3><p>Se crea sola a partir del nombre. Cámbiala solo si sabes lo que haces: los enlaces viejos dejarían de funcionar.</p></div>
            <Field error={err('slug')}>
              <div className="bo-prefix-input"><span className="bo-hide-sm">pimentoneslacajita.com</span><span>/producto/</span><Input value={p.slug} aria-invalid={!!err('slug')} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} /></div>
            </Field>
          </section>
        </fieldset>

        <aside className="bo-editor-side">
          <div className="bo-dsec-title" style={{ marginBottom: 0 }}><span>Así lo ve el cliente</span></div>
          <div className="bo-preview-frame">
            <div className="bo-preview-card">
              <div className="media">{p.image ? <img src={p.image} alt="" /> : <Icon name="image" size={40} className="faint" />}</div>
              <div className="info">
                {p.kicker && <small>{p.kicker}</small>}
                <h4>{p.name || 'Nombre del producto'}</h4>
                <p>{p.tagline || p.description.slice(0, 90) || 'La frase corta aparece aquí.'}</p>
                <div className="price">{p.price ? money(p.price) : '$ —'}<span>{p.stock > 0 ? 'Agregar' : 'Agotado'}</span></div>
              </div>
            </div>
          </div>
          {!p.active && <div className="bo-callout bo-callout--gray"><Icon name="eyeOff" size={15} /><div>Oculto: no aparecerá en la tienda hasta que lo publiques.</div></div>}
          {p.active && p.stock <= 0 && <div className="bo-callout bo-callout--amber"><Icon name="alert" size={15} /><div>Sin inventario: se mostrará como <b>agotado</b>.</div></div>}
        </aside>
      </div>
    </Drawer>
  );
}
