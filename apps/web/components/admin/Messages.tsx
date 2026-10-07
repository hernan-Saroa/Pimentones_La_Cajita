'use client';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAdmin, useCan, useMe, useShell } from './AdminShell';
import {
  Avatar, Button, Drawer, Field, FilterMenu, Icon, Input, LinkButton, Menu, Modal, PageHeader, SearchInput, Select, Skeleton, StatusBadge, Tabs, Textarea,
  cls, copyText, firstName, fmtDate, fmtDay, money, moneyShort, norm, plural, useUI, waLink, type IconName, type MenuItem,
} from './kit';

/**
 * Bandeja de mensajes (estilo Gmail / Front / Intercom).
 * Tres paneles: lista con triage rápido · conversación con historial real (respuestas, notas internas, estados)
 * · ficha del cliente con sus compras. Todo persiste en la base de datos; nada vive solo en el navegador.
 */

export type ContactMessage = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: 'new' | 'read' | 'answered';
  createdAt: string;
  notes?: number;
  replies?: number;
  firstReplyAt?: string | null;
  lastActivityAt?: string;
};
type InboxEvent = { id: number; messageId: number; kind: 'reply' | 'note' | 'status'; channel: 'email' | 'whatsapp' | null; body: string | null; author: string; createdAt: string };
type Template = { id: string; title: string; body: string };
type InboxMeta = { templates: Template[]; emailEnabled: boolean; vars: { tienda: string; whatsapp: string; envioGratisDesde: string } };
type View = 'open' | 'answered' | 'all';
type Topic = 'wholesale' | 'shipping' | 'product' | 'billing' | 'general';
type TopicConfig = { id: Topic; label: string; icon: IconName; tone: 'violet' | 'blue' | 'amber' | 'green' | 'gray' };

const TOPICS: Record<Topic, TopicConfig> = {
  wholesale: { id: 'wholesale', label: 'Mayorista', icon: 'star', tone: 'violet' },
  shipping: { id: 'shipping', label: 'Envíos', icon: 'truck', tone: 'blue' },
  product: { id: 'product', label: 'Producto', icon: 'tag', tone: 'amber' },
  billing: { id: 'billing', label: 'Pagos', icon: 'cash', tone: 'green' },
  general: { id: 'general', label: 'General', icon: 'inbox', tone: 'gray' },
};

/** Clasificación por intención a partir del texto real del cliente. */
function detectTopic(msg: string): TopicConfig {
  const s = norm(msg);
  if (/caja|mayor|restaurante|distribui|institucional|chef|cotiz|negocio|docena/.test(s)) return TOPICS.wholesale;
  if (/envio|entrega|guia|despacho|llegar|direccion|apto|barrio|ciudad|servientrega|interrapidisimo|flete/.test(s)) return TOPICS.shipping;
  if (/pago|transferencia|nequi|daviplata|contraentrega|factura|recibo|bancolombia|efectivo/.test(s)) return TOPICS.billing;
  if (/vencimiento|duracion|nevera|aceite|ingrediente|picante|sabor|conservar|frasco|abierto/.test(s)) return TOPICS.product;
  return TOPICS.general;
}

/** Las consultas registradas a mano llevan el canal al inicio: "[Origen: WhatsApp] …". */
function splitOrigin(message: string) {
  const m = message.match(/^\[Origen: ([^\]]+)\]\s*/);
  return m ? { origin: m[1], body: message.slice(m[0].length) } : { origin: 'Formulario web', body: message };
}

const HOUR = 3_600_000;
const ageMs = (d: string) => Date.now() - new Date(d).getTime();
function duration(ms: number) {
  const min = ms / 60000;
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  const h = min / 60;
  if (h < 24) return `${h < 10 ? (Math.round(h * 10) / 10).toLocaleString('es-CO') : Math.round(h)} h`;
  const d = h / 24;
  return `${d < 10 ? (Math.round(d * 10) / 10).toLocaleString('es-CO') : Math.round(d)} d`;
}
function shortTime(d: string) {
  const t = new Date(d); const now = new Date();
  if (t.toDateString() === now.toDateString()) return t.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (t.toDateString() === y.toDateString()) return 'Ayer';
  if (now.getTime() - t.getTime() < 6 * 86400000) return t.toLocaleDateString('es-CO', { weekday: 'short' });
  return t.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', ...(t.getFullYear() !== now.getFullYear() ? { year: '2-digit' } : {}) });
}
function dayGroup(d: string) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((start.getTime() - day.getTime()) / 86400000);
  if (diff <= 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return 'Esta semana';
  if (diff < 31) return 'Este mes';
  return 'Anteriores';
}
const fillTemplate = (body: string, ctx: Record<string, string>) => body.replace(/\{(\w+)\}/g, (_, k: string) => ctx[k] ?? '').replace(/[ \t]{2,}/g, ' ');

/** Borradores por conversación: cambiar de mensaje no borra lo que estabas escribiendo. */
const drafts = new Map<string, string>();

function useMedia(q: string) {
  const [on, setOn] = useState(false);
  useEffect(() => { const m = window.matchMedia(q); const h = () => setOn(m.matches); h(); m.addEventListener('change', h); return () => m.removeEventListener('change', h); }, [q]);
  return on;
}
function usePref<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  useEffect(() => { try { const s = localStorage.getItem(key); if (s != null) setV(JSON.parse(s) as T); } catch { /* no-op */ } }, [key]);
  const set = useCallback((x: T) => { setV(x); try { localStorage.setItem(key, JSON.stringify(x)); } catch { /* no-op */ } }, [key]);
  return [v, set] as const;
}

export function Messages() {
  const api = useAdmin();
  const { toast, confirm } = useUI();
  const { refreshCounts } = useShell();
  const can = useCan();
  const canWrite = can('ops');
  const sp = useSearchParams();
  const wide = useMedia('(min-width: 1280px)');

  const [rows, setRows] = useState<ContactMessage[] | null>(() => { const c = api.getCache?.('admin:messages:all'); return Array.isArray(c) ? c : null; });
  const [meta, setMeta] = useState<InboxMeta | null>(() => api.getCache?.('admin:inbox:meta') ?? null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<View>('open');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [topic, setTopic] = useState<Topic | 'all'>('all');
  const [sort, setSort] = useState<'recent' | 'oldest'>('recent');
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<number | null>(null);
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [ctxPinned, setCtxPinned] = usePref('lacajita.inbox.ctx', false);
  const [listCollapsed, setListCollapsed] = usePref('lacajita.inbox.listCollapsed', false);
  const [ctxOverlay, setCtxOverlay] = useState(false);
  const [focusReq, setFocusReq] = useState<{ mode: 'reply' | 'note'; n: number } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const isListCollapsed = Boolean(listCollapsed && selId);

  // ---- La URL manda: accesos del menú lateral (?f=new|wholesale|answered|all), ?id= y "Crear" (?nuevo=1) ----
  const fParam = sp.get('f');
  const lastF = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (lastF.current === fParam) return;
    lastF.current = fParam;
    setView(fParam === 'answered' ? 'answered' : fParam === 'all' ? 'all' : 'open');
    setUnreadOnly(fParam === 'new');
    setTopic(fParam === 'wholesale' ? 'wholesale' : 'all');
    setChecked(new Set());
  }, [fParam]);
  const nuevo = sp.get('nuevo'); const idParam = sp.get('id');
  useEffect(() => { if (nuevo === '1' && canWrite) setCreateOpen(true); }, [nuevo, canWrite]);
  useEffect(() => { if (idParam && Number(idParam)) setSelId(Number(idParam)); }, [idParam]);
  const setParams = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(window.location.search);
    Object.entries(patch).forEach(([k, v]) => (v == null ? p.delete(k) : p.set(k, v)));
    const qs = p.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  };

  // ---- Datos ----
  const load = useCallback((force = false) => api.messages(undefined, force)
    .then((r: ContactMessage[]) => { setRows(Array.isArray(r) ? r : []); setError(''); })
    .catch((e: Error) => { setRows((p) => p ?? []); setError(e.message); }), [api]);
  useEffect(() => { load(true); api.inboxMeta().then(setMeta).catch(() => { /* la bandeja funciona sin plantillas */ }); }, [api, load]);
  // Los mensajes de la tienda llegan solos: refresco silencioso cada 45 s y al volver a la pestaña.
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') load(true); };
    const t = window.setInterval(tick, 45_000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [load]);
  const refresh = async () => { setRefreshing(true); await load(true); refreshCounts(true); setRefreshing(false); };

  const all = useMemo(() => rows ?? [], [rows]);
  const topicOf = useMemo(() => new Map(all.map((m) => [m.id, detectTopic(m.message)])), [all]);
  const byEmail = useMemo(() => {
    const g = new Map<string, ContactMessage[]>();
    all.forEach((m) => { const k = m.email.toLowerCase(); g.set(k, [...(g.get(k) ?? []), m]); });
    return g;
  }, [all]);
  const counts = useMemo(() => ({
    open: all.filter((m) => m.status !== 'answered').length,
    unread: all.filter((m) => m.status === 'new').length,
    answered: all.filter((m) => m.status === 'answered').length,
    all: all.length,
  }), [all]);
  /** Mediana del tiempo hasta la primera respuesta en los últimos 30 días (dato real del historial). */
  const medianReply = useMemo(() => {
    const since = Date.now() - 30 * 86400000;
    const xs = all.filter((m) => m.firstReplyAt && new Date(m.createdAt).getTime() >= since)
      .map((m) => new Date(m.firstReplyAt!).getTime() - new Date(m.createdAt).getTime()).filter((x) => x >= 0).sort((a, b) => a - b);
    return xs.length ? xs[Math.floor(xs.length / 2)] : null;
  }, [all]);
  const oldestOpen = useMemo(() => all.filter((m) => m.status !== 'answered' && !m.replies).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0] ?? null, [all]);

  const list = useMemo(() => {
    const s = norm(q.trim());
    const r = all.filter((m) => {
      if (view === 'open' && m.status === 'answered') return false;
      if (view === 'answered' && m.status !== 'answered') return false;
      if (unreadOnly && m.status !== 'new') return false;
      if (topic !== 'all' && topicOf.get(m.id)?.id !== topic) return false;
      return !s || norm(`${m.name} ${m.email} ${m.phone ?? ''} ${m.message}`).includes(s);
    });
    return sort === 'oldest' ? [...r].reverse() : r;
  }, [all, view, unreadOnly, topic, topicOf, q, sort]);

  const sel = useMemo(() => (selId ? all.find((m) => m.id === selId) ?? null : null), [all, selId]);
  const selIndex = sel ? list.findIndex((m) => m.id === sel.id) : -1;

  // ---- Acciones ----
  const patchRow = useCallback((id: number, patch: Partial<ContactMessage>) => setRows((r) => r?.map((x) => (x.id === id ? { ...x, ...patch } : x)) ?? r), []);

  const setStatus = useCallback(async (m: ContactMessage, status: ContactMessage['status'], msg?: string) => {
    if (!canWrite || m.status === status) return;
    patchRow(m.id, { status });
    try { await api.setMessageStatus(m.id, status); refreshCounts(true); if (msg) toast(msg); }
    catch (e) { patchRow(m.id, { status: m.status }); toast((e as Error).message, 'error'); }
  }, [api, canWrite, patchRow, refreshCounts, toast]);

  const open = useCallback((m: ContactMessage) => {
    setSelId(m.id); setCtxOverlay(false);
    setParams({ id: String(m.id) });
    if (m.status === 'new' && canWrite) setStatus(m, 'read');
  }, [canWrite, setStatus]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { setSelId(null); setParams({ id: null }); };

  /** Al resolver dentro de "Por atender" la conversación sale de la lista: pasamos a la siguiente, como Gmail. */
  const nextAfter = (m: ContactMessage) => { const i = list.findIndex((x) => x.id === m.id); return i < 0 ? null : list[i + 1] ?? list[i - 1] ?? null; };
  const toggleResolve = (m: ContactMessage) => {
    if (m.status === 'answered') { setStatus(m, 'read', 'Conversación reabierta'); return; }
    const next = view === 'open' && sel?.id === m.id ? nextAfter(m) : undefined;
    setStatus(m, 'answered', 'Conversación resuelta');
    if (next !== undefined) { if (next) open(next); else close(); }
  };
  const markUnread = (m: ContactMessage) => { setStatus(m, 'new', 'Marcada como no leída'); if (sel?.id === m.id) close(); };
  const remove = async (m: ContactMessage) => {
    if (!canWrite) return;
    const ok = await confirm({ title: '¿Eliminar esta conversación?', body: `Se borrará el mensaje de ${m.name} con sus notas y respuestas. No se puede deshacer.`, confirm: 'Eliminar', danger: true });
    if (!ok) return;
    const next = sel?.id === m.id ? nextAfter(m) : undefined;
    try {
      await api.deleteMessage(m.id);
      setRows((r) => r?.filter((x) => x.id !== m.id) ?? r);
      setChecked((c) => { const n = new Set(c); n.delete(m.id); return n; });
      refreshCounts(true); toast('Conversación eliminada');
      if (next !== undefined) { if (next) open(next); else close(); }
    } catch (e) { toast((e as Error).message, 'error'); }
  };
  const toggleCheck = (id: number) => setChecked((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allChecked = list.length > 0 && list.every((m) => checked.has(m.id));
  const bulk = async (action: 'read' | 'new' | 'answered' | 'delete') => {
    const ids = list.filter((m) => checked.has(m.id)).map((m) => m.id);
    if (!ids.length) return;
    if (action === 'delete') {
      const ok = await confirm({ title: `¿Eliminar ${plural(ids.length, 'conversación', 'conversaciones')}?`, body: 'Se borrarán con sus notas y respuestas. No se puede deshacer.', confirm: 'Eliminar', danger: true });
      if (!ok) return;
    }
    const before = rows;
    setRows((r) => (action === 'delete' ? r?.filter((x) => !ids.includes(x.id)) : r?.map((x) => (ids.includes(x.id) ? { ...x, status: action } : x))) ?? r);
    setChecked(new Set());
    if (action === 'delete' && sel && ids.includes(sel.id)) close();
    try {
      await api.bulkMessages(ids, action);
      refreshCounts(true);
      toast({ read: 'Marcadas como leídas', new: 'Marcadas como no leídas', answered: `${plural(ids.length, 'conversación resuelta', 'conversaciones resueltas')}`, delete: `${plural(ids.length, 'conversación eliminada', 'conversaciones eliminadas')}` }[action]);
    } catch (e) { setRows(before); toast((e as Error).message, 'error'); }
  };
  const changeView = (v: View) => {
    const f = v === 'open' ? null : v;
    lastF.current = f;
    setView(v); setUnreadOnly(false); setChecked(new Set());
    setParams({ f });
  };

  // ---- Atajos de teclado (Gmail): J/K navegar · E resolver · U no leído · R responder · N nota · X seleccionar · # eliminar · / buscar · Ctrl+B colapsar lista ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && selId) {
        e.preventDefault();
        setListCollapsed(!listCollapsed);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('.bo-modal, .bo-cmd, .bo-drawer, .bo-menu')) return;
      const go = (d: number) => { const n = list[selIndex < 0 ? 0 : Math.min(list.length - 1, Math.max(0, selIndex + d))]; if (n) { e.preventDefault(); open(n); } };
      switch (e.key) {
        case 'j': case 'ArrowDown': go(1); break;
        case 'k': case 'ArrowUp': go(-1); break;
        case 'e': if (sel && canWrite) { e.preventDefault(); toggleResolve(sel); } break;
        case 'u': if (sel && canWrite) { e.preventDefault(); markUnread(sel); } break;
        case 'r': if (sel && canWrite) { e.preventDefault(); setFocusReq({ mode: 'reply', n: Date.now() }); } break;
        case 'n': if (sel && canWrite) { e.preventDefault(); setFocusReq({ mode: 'note', n: Date.now() }); } break;
        case 'x': if (sel && canWrite) { e.preventDefault(); toggleCheck(sel.id); } break;
        case '#': case 'Delete': if (sel && canWrite) { e.preventDefault(); remove(sel); } break;
        case '/': e.preventDefault(); searchRef.current?.querySelector('input')?.focus(); break;
        case 'Escape': if (checked.size) setChecked(new Set()); else if (sel) close(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const ctxVisible = wide ? ctxPinned : ctxOverlay;
  const toggleCtx = () => (wide ? setCtxPinned(!ctxPinned) : setCtxOverlay((o) => !o));
  const loading = rows === null;
  const empty = !loading && !error && all.length === 0;

  return (
    <>
      <PageHeader
        title="Mensajes"
        description={loading || empty ? 'Consultas de tus clientes desde la tienda, WhatsApp y otros canales, en un solo lugar.' : (
          <span className="bo-ix-kpis">
            <span className={cls(counts.open > 0 && 'is-alert')}>{counts.open > 0 && <i />}<b>{counts.open}</b> por atender</span>
            <span><b>{counts.unread}</b> sin leer</span>
            {medianReply != null && <span title="Mediana del tiempo hasta la primera respuesta, últimos 30 días"><Icon name="clock" size={13} />Respuesta media <b>{duration(medianReply)}</b></span>}
            {oldestOpen && <span title={fmtDate(oldestOpen.createdAt)}>Más antigua sin responder: <b>{duration(ageMs(oldestOpen.createdAt))}</b></span>}
          </span>
        )}
        actions={<>
          <Button variant="ghost" iconOnly icon="refresh" loading={refreshing} onClick={refresh} aria-label="Actualizar bandeja" title="Actualizar" />
          {canWrite && <Button variant="secondary" icon="zap" onClick={() => setTplOpen(true)}>Respuestas guardadas</Button>}
          {canWrite && <Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>Registrar consulta</Button>}
        </>}
      />

      {empty ? (
        <div className="bo-card bo-ix-first">
          <div className="bo-ix-ov-icon"><Icon name="inbox" size={26} /></div>
          <h3>Tu bandeja está lista</h3>
          <p>Cuando un cliente escriba desde el formulario de contacto de la tienda, su mensaje llegará aquí y verás el aviso en el menú. También puedes registrar consultas que recibas por WhatsApp, Instagram o teléfono.</p>
          <div className="bo-row">
            {canWrite && <Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>Registrar consulta</Button>}
            {meta?.vars.tienda && <LinkButton href={`${meta.vars.tienda.replace(/\/$/, '')}/contacto`} external icon="external">Ver formulario en la tienda</LinkButton>}
          </div>
        </div>
      ) : (
        <div className={cls('bo-ix', sel && 'has-sel', isListCollapsed && 'is-list-collapsed', ctxVisible && 'is-ctx-open')}>
          {/* ---------- Lista / Riel ---------- */}
          <section className="bo-ix-list" aria-label="Conversaciones">
            {isListCollapsed ? (
              <div className="bo-ix-rail">
                <div className="bo-ix-rail-head">
                  <Button
                    variant="ghost"
                    iconOnly
                    icon="panelOpen"
                    size="sm"
                    onClick={() => setListCollapsed(false)}
                    title="Expandir lista completa (Ctrl+B)"
                    aria-label="Expandir lista completa"
                  />
                  {counts.open > 0 && (
                    <span className="bo-ix-rail-badge" title={`${counts.open} por atender`}>
                      {counts.open}
                    </span>
                  )}
                </div>
                <div className="bo-ix-rail-rows" role="listbox" aria-label="Remitentes">
                  {list.map((m) => {
                    const top = topicOf.get(m.id) ?? TOPICS.general;
                    const threadCount = byEmail.get(m.email.toLowerCase())?.length ?? 1;
                    const active = m.id === selId;
                    const unread = m.status === 'new';
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className={cls('bo-ix-rail-item', active && 'is-active', unread && 'is-unread')}
                        onClick={() => open(m)}
                        title={`${m.name} (${top.label}) · ${shortTime(m.createdAt)}\n${splitOrigin(m.message).body}`}
                        aria-label={`Conversación de ${m.name}`}
                        aria-selected={active}
                      >
                        <span className="bo-ix-rail-ava">
                          <Avatar name={m.name} size={36} />
                          {unread && <span className="bo-ix-rail-dot" aria-label="Sin leer" />}
                          {threadCount > 1 && <span className="bo-ix-rail-cnt" title={`${threadCount} conversaciones`}>{threadCount}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {checked.size > 0 ? (
                  <div className="bo-ix-bulk">
                    <button type="button" className={cls('bo-ix-allbox', allChecked && 'is-on')} onClick={() => setChecked(allChecked ? new Set() : new Set(list.map((m) => m.id)))} aria-label={allChecked ? 'Quitar selección' : 'Seleccionar todas'} title={allChecked ? 'Quitar selección' : `Seleccionar las ${list.length}`}>
                      <Icon name={allChecked ? 'check' : 'minus'} size={13} />
                    </button>
                    <b>{checked.size} {checked.size === 1 ? 'seleccionada' : 'seleccionadas'}</b>
                    <div className="bo-ix-bulk-actions">
                      <button type="button" className="bo-ix-qbtn" title="Resolver" onClick={() => bulk('answered')}><Icon name="checkCircle" size={16} /></button>
                      <button type="button" className="bo-ix-qbtn" title="Marcar como leídas" onClick={() => bulk('read')}><Icon name="eye" size={16} /></button>
                      <button type="button" className="bo-ix-qbtn" title="Marcar como no leídas" onClick={() => bulk('new')}><Icon name="mail" size={16} /></button>
                      <button type="button" className="bo-ix-qbtn is-danger" title="Eliminar" onClick={() => bulk('delete')}><Icon name="trash" size={16} /></button>
                    </div>
                    <button type="button" className="bo-ix-link" onClick={() => setChecked(new Set())}>Cancelar</button>
                  </div>
                ) : (
                  <div className="bo-ix-tools">
                    <div ref={searchRef} className="bo-ix-search"><SearchInput value={q} onChange={setQ} placeholder="Buscar nombre, correo o texto" /></div>
                    <FilterMenu
                      align="right"
                      groups={[
                        { key: 'read', label: 'Lectura', value: unreadOnly ? 'new' : 'all', defaultValue: 'all', onChange: (v) => setUnreadOnly(v === 'new'), options: [{ value: 'all', label: 'Todas' }, { value: 'new', label: 'Solo sin leer' }] },
                        { key: 'topic', label: 'Tema', value: topic, defaultValue: 'all', onChange: (v) => setTopic(v as Topic | 'all'), options: [{ value: 'all', label: 'Todos los temas' }, ...Object.values(TOPICS).map((t) => ({ value: t.id, label: t.label }))] },
                        { key: 'sort', label: 'Orden', value: sort, defaultValue: 'recent', onChange: (v) => setSort(v as 'recent' | 'oldest'), options: [{ value: 'recent', label: 'Más recientes primero' }, { value: 'oldest', label: 'Más antiguas primero' }] },
                      ]}
                    />
                    {sel && (
                      <Button
                        variant="ghost"
                        iconOnly
                        icon="panelClose"
                        size="sm"
                        onClick={() => setListCollapsed(true)}
                        title="Colapsar a solo usuarios (Ctrl+B)"
                        aria-label="Colapsar a solo usuarios"
                      />
                    )}
                  </div>
                )}
                <Tabs
                  value={view}
                  onChange={changeView}
                  items={[
                    { value: 'open', label: 'Por atender', count: loading ? undefined : counts.open, alert: counts.open > 0 },
                    { value: 'answered', label: 'Resueltas', count: loading ? undefined : counts.answered },
                    { value: 'all', label: 'Todas', count: loading ? undefined : counts.all },
                  ]}
                />
                <div className="bo-ix-rows" role="listbox" aria-label="Lista de conversaciones">
                  {error && !all.length ? (
                    <div className="bo-ix-empty"><Icon name="alert" size={22} /><b>No pudimos cargar los mensajes</b><span>{error}</span><Button size="sm" onClick={() => load(true)}>Reintentar</Button></div>
                  ) : loading ? (
                    [0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="bo-ix-skel"><Skeleton w={34} h={34} r={17} /><div className="grow"><Skeleton w="50%" /><Skeleton w="92%" h={10} style={{ marginTop: 8 }} /><Skeleton w="35%" h={10} style={{ marginTop: 8 }} /></div></div>
                    ))
                  ) : list.length === 0 ? (
                    q || topic !== 'all' || unreadOnly ? (
                      <div className="bo-ix-empty"><Icon name="search" size={22} /><b>Sin resultados</b><span>Prueba otra búsqueda o quita los filtros.</span><Button size="sm" variant="ghost" onClick={() => { setQ(''); setTopic('all'); setUnreadOnly(false); }}>Quitar filtros</Button></div>
                    ) : view === 'open' ? (
                      <div className="bo-ix-empty"><span className="bo-ix-ov-icon is-done"><Icon name="checkCircle" size={24} /></span><b>Todo al día</b><span>No hay conversaciones por atender.</span></div>
                    ) : (
                      <div className="bo-ix-empty"><Icon name="inbox" size={22} /><b>Nada por aquí</b><span>Las conversaciones resueltas aparecerán en esta vista.</span></div>
                    )
                  ) : (
                    list.map((m, i) => {
                      const g = sort === 'recent' ? dayGroup(m.createdAt) : null;
                      const showGroup = g && (i === 0 || dayGroup(list[i - 1].createdAt) !== g);
                      return (
                        <Fragment key={m.id}>
                          {showGroup && <div className="bo-ix-group">{g}</div>}
                          <Row
                            m={m}
                            topic={topicOf.get(m.id) ?? TOPICS.general}
                            thread={byEmail.get(m.email.toLowerCase())?.length ?? 1}
                            active={m.id === selId}
                            checked={checked.has(m.id)}
                            selecting={checked.size > 0}
                            canWrite={canWrite}
                            onOpen={() => (checked.size > 0 ? toggleCheck(m.id) : open(m))}
                            onCheck={() => toggleCheck(m.id)}
                            onResolve={() => toggleResolve(m)}
                            onToggleRead={() => (m.status === 'new' ? setStatus(m, 'read', 'Marcada como leída') : markUnread(m))}
                            onDelete={() => remove(m)}
                          />
                        </Fragment>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </section>

          {/* ---------- Conversación ---------- */}
          <section className="bo-ix-thread" aria-label="Conversación">
            {sel ? (
              <Conversation
                key={sel.id}
                m={sel}
                topic={topicOf.get(sel.id) ?? TOPICS.general}
                thread={byEmail.get(sel.email.toLowerCase()) ?? [sel]}
                meta={meta}
                canWrite={canWrite}
                index={selIndex}
                total={list.length}
                focusReq={focusReq}
                ctxVisible={ctxVisible}
                ctxOverlay={!wide}
                onToggleCtx={toggleCtx}
                listCollapsed={isListCollapsed}
                onToggleList={() => setListCollapsed(!listCollapsed)}
                onPrev={() => selIndex > 0 && open(list[selIndex - 1])}
                onNext={() => selIndex >= 0 && selIndex < list.length - 1 && open(list[selIndex + 1])}
                onBack={close}
                onResolve={() => toggleResolve(sel)}
                onUnread={() => markUnread(sel)}
                onDelete={() => remove(sel)}
                onOpenOther={open}
                onPatched={(p) => patchRow(sel.id, p)}
                onManageTemplates={() => setTplOpen(true)}
              />
            ) : (
              <Overview
                loading={loading}
                open={counts.open}
                oldest={oldestOpen}
                medianReply={medianReply}
                canWrite={canWrite}
                onStart={() => oldestOpen && open(oldestOpen)}
              />
            )}
          </section>
        </div>
      )}

      <CreateMessageDrawer
        open={createOpen}
        onClose={() => { setCreateOpen(false); if (nuevo) setParams({ nuevo: null }); }}
        onCreated={(msg) => {
          setCreateOpen(false); if (nuevo) setParams({ nuevo: null });
          load(true).then(() => { open(msg); refreshCounts(true); });
        }}
      />
      <TemplatesModal open={tplOpen} onClose={() => setTplOpen(false)} meta={meta} onSaved={(templates) => setMeta((m) => (m ? { ...m, templates } : m))} />
    </>
  );
}

// -----------------------------------------------------------------------------
// Fila de la lista
// -----------------------------------------------------------------------------
function Row({ m, topic, thread, active, checked, selecting, canWrite, onOpen, onCheck, onResolve, onToggleRead, onDelete }: {
  m: ContactMessage; topic: TopicConfig; thread: number; active: boolean; checked: boolean; selecting: boolean; canWrite: boolean;
  onOpen: () => void; onCheck: () => void; onResolve: () => void; onToggleRead: () => void; onDelete: () => void;
}) {
  const unread = m.status === 'new';
  const isOpen = m.status !== 'answered';
  const wait = isOpen && !m.replies ? ageMs(m.createdAt) : 0;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (active) ref.current?.scrollIntoView({ block: 'nearest' }); }, [active]);
  return (
    <div
      ref={ref}
      role="option"
      aria-selected={active}
      tabIndex={-1}
      className={cls('bo-ix-row', unread && 'is-unread', active && 'is-active', checked && 'is-checked', selecting && 'is-selecting')}
      onClick={onOpen}
    >
      <div className={cls('bo-ix-lead', canWrite && 'has-box')} onClick={canWrite ? (e) => { e.stopPropagation(); onCheck(); } : undefined}>
        <span className="bo-ix-avatar"><Avatar name={m.name} size={34} /></span>
        {canWrite && <span className="bo-ix-box" role="checkbox" aria-checked={checked} aria-label={`Seleccionar a ${m.name}`}><Icon name="check" size={13} /></span>}
      </div>
      <div className="bo-ix-row-main">
        <div className="bo-ix-row-top">
          {unread && <span className="bo-ix-dot" aria-label="Sin leer" />}
          <b className="bo-ix-name">{m.name}</b>
          {thread > 1 && <span className="bo-ix-count" title={`${thread} conversaciones con este cliente`}>{thread}</span>}
          <time dateTime={m.createdAt} title={fmtDate(m.createdAt)}>{shortTime(m.createdAt)}</time>
        </div>
        <p className="bo-ix-snip">{splitOrigin(m.message).body}</p>
        <div className="bo-ix-row-meta">
          <span className={cls('bo-ix-topic', `is-${topic.tone}`)}><Icon name={topic.icon} size={11} />{topic.label}</span>
          {wait >= 24 * HOUR && <span className={cls('bo-ix-wait', wait >= 72 * HOUR && 'is-late')} title="Tiempo esperando respuesta"><Icon name="clock" size={11} />{duration(wait)}</span>}
          {!!m.replies && <span className="bo-ix-flag" title="Ya respondiste"><Icon name="reply" size={12} /></span>}
          {!!m.notes && <span className="bo-ix-flag" title={plural(m.notes, 'nota interna', 'notas internas')}><Icon name="edit" size={12} />{m.notes}</span>}
          {m.phone && <span className="bo-ix-flag" title="Tiene WhatsApp"><Icon name="whatsapp" size={12} /></span>}
        </div>
      </div>
      {canWrite && (
        <div className="bo-ix-quick" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="bo-ix-qbtn" title={isOpen ? 'Resolver (E)' : 'Reabrir'} onClick={onResolve}><Icon name={isOpen ? 'checkCircle' : 'undo'} size={15} /></button>
          <button type="button" className="bo-ix-qbtn" title={unread ? 'Marcar como leída' : 'Marcar como no leída (U)'} onClick={onToggleRead}><Icon name={unread ? 'eye' : 'mail'} size={15} /></button>
          <button type="button" className="bo-ix-qbtn is-danger" title="Eliminar (#)" onClick={onDelete}><Icon name="trash" size={15} /></button>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Panel sin conversación abierta: resumen accionable + atajos
// -----------------------------------------------------------------------------
function Overview({ loading, open, oldest, medianReply, canWrite, onStart }: { loading: boolean; open: number; oldest: ContactMessage | null; medianReply: number | null; canWrite: boolean; onStart: () => void }) {
  if (loading) return <div className="bo-ix-overview"><Skeleton w={56} h={56} r={16} /><Skeleton w={220} h={18} style={{ marginTop: 8 }} /><Skeleton w={300} h={12} /></div>;
  return (
    <div className="bo-ix-overview">
      <div className={cls('bo-ix-ov-icon', open === 0 && 'is-done')}><Icon name={open ? 'inbox' : 'checkCircle'} size={26} /></div>
      <h3>{open ? `${plural(open, 'conversación', 'conversaciones')} por atender` : 'Todo al día'}</h3>
      <p>
        {open
          ? oldest ? `La más antigua sin respuesta lleva ${duration(ageMs(oldest.createdAt))} esperando.${medianReply != null ? ` Tu respuesta media es de ${duration(medianReply)}.` : ''}` : 'Abre una conversación de la lista para responder.'
          : 'No tienes conversaciones pendientes. Los mensajes nuevos de la tienda aparecerán aquí automáticamente.'}
      </p>
      {oldest && <Button variant="primary" iconRight="arrowRight" onClick={onStart}>Empezar por la más antigua</Button>}
      <div className="bo-ix-keys" aria-label="Atajos de teclado">
        <div><kbd>J</kbd><kbd>K</kbd>Siguiente / anterior</div>
        <div><kbd>/</kbd>Buscar</div>
        <div><kbd>Ctrl</kbd><kbd>B</kbd>Colapsar lista</div>
        {canWrite && <>
          <div><kbd>R</kbd>Responder</div>
          <div><kbd>N</kbd>Nota interna</div>
          <div><kbd>E</kbd>Resolver</div>
          <div><kbd>U</kbd>Marcar no leída</div>
          <div><kbd>X</kbd>Seleccionar</div>
          <div><kbd>Ctrl</kbd><kbd>Enter</kbd>Enviar</div>
        </>}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Conversación: historial + compositor + ficha del cliente
// -----------------------------------------------------------------------------
function Conversation({ m, topic, thread, meta, canWrite, index, total, focusReq, ctxVisible, ctxOverlay, onToggleCtx, listCollapsed, onToggleList, onPrev, onNext, onBack, onResolve, onUnread, onDelete, onOpenOther, onPatched, onManageTemplates }: {
  m: ContactMessage; topic: TopicConfig; thread: ContactMessage[]; meta: InboxMeta | null; canWrite: boolean; index: number; total: number;
  focusReq: { mode: 'reply' | 'note'; n: number } | null; ctxVisible: boolean; ctxOverlay: boolean; onToggleCtx: () => void;
  listCollapsed: boolean; onToggleList: () => void;
  onPrev: () => void; onNext: () => void; onBack: () => void; onResolve: () => void; onUnread: () => void; onDelete: () => void;
  onOpenOther: (m: ContactMessage) => void; onPatched: (p: Partial<ContactMessage>) => void; onManageTemplates: () => void;
}) {
  const api = useAdmin();
  const me = useMe();
  const { toast } = useUI();
  const { refreshCounts } = useShell();
  const [events, setEvents] = useState<InboxEvent[] | null>(() => api.getCache?.(`admin:inbox:events:${m.id}`) ?? null);
  const [orders, setOrders] = useState<any[] | null>(() => api.getCache?.(`admin:customerOrders:${m.email}`) ?? null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const feedRef = useRef<HTMLDivElement>(null);
  const { origin, body } = splitOrigin(m.message);
  const isOpen = m.status !== 'answered';

  useEffect(() => {
    let on = true;
    api.messageEvents(m.id).then((r: InboxEvent[]) => on && setEvents(r)).catch(() => on && setEvents((p) => p ?? []));
    return () => { on = false; };
  }, [api, m.id, m.status]);
  useEffect(() => {
    let on = true;
    api.customerOrders(m.email).then((r: unknown[]) => on && setOrders(r)).catch(() => on && setOrders([]));
    return () => { on = false; };
  }, [api, m.email]);
  useEffect(() => { const el = feedRef.current; if (el) el.scrollTop = el.scrollHeight; }, [events?.length]);

  const who = (author: string) => (me && (author === me.name || author === me.email) ? 'Tú' : author);
  const lastOrder = orders?.[0];
  const addEvent = (ev: InboxEvent) => setEvents((p) => [...(p ?? []), ev]);

  return (
    <div className="bo-ix-convwrap">
      <div className="bo-ix-conv">
        <header className="bo-ix-head">
          <Button variant="ghost" iconOnly icon="chevronLeft" className="bo-ix-back" onClick={onBack} aria-label="Volver a la lista" />
          <Button
            variant={listCollapsed ? 'secondary' : 'ghost'}
            iconOnly
            icon={listCollapsed ? 'panelOpen' : 'panelClose'}
            className="bo-ix-list-toggle"
            onClick={onToggleList}
            aria-label={listCollapsed ? 'Mostrar lista de mensajes' : 'Ocultar lista de mensajes'}
            title={listCollapsed ? 'Mostrar lista de mensajes (Ctrl+B)' : 'Ocultar lista para ampliar lectura (Ctrl+B)'}
          />
          <div className="bo-ix-head-main">
            <h2>{m.name}</h2>
            <div className="bo-ix-head-sub">
              <span className={cls('bo-ix-status', `is-${m.status}`)}><i />{m.status === 'answered' ? 'Resuelta' : m.status === 'new' ? 'Sin leer' : 'Por atender'}</span>
              <span className={cls('bo-ix-topic', `is-${topic.tone}`)}><Icon name={topic.icon} size={11} />{topic.label}</span>
              <span className="bo-ix-origin">vía {origin}</span>
            </div>
          </div>
          <div className="bo-ix-head-actions">
            {index >= 0 && <span className="bo-ix-pos">{index + 1} de {total}</span>}
            <Button variant="ghost" iconOnly icon="chevronUp" onClick={onPrev} disabled={index <= 0} aria-label="Anterior" title="Anterior (K)" />
            <Button variant="ghost" iconOnly icon="chevronDown" onClick={onNext} disabled={index < 0 || index >= total - 1} aria-label="Siguiente" title="Siguiente (J)" />
            {canWrite && (
              <Button size="sm" variant={isOpen ? 'primary' : 'secondary'} icon={isOpen ? 'check' : 'undo'} onClick={onResolve} title={isOpen ? 'Resolver (E)' : 'Reabrir (E)'}>
                {isOpen ? 'Resolver' : 'Reabrir'}
              </Button>
            )}
            <Menu
              trigger={(t) => <Button variant="ghost" iconOnly icon="more" onClick={t} aria-label="Más acciones" />}
              items={[
                { label: 'Marcar como no leída', icon: 'mail', onClick: onUnread, hidden: !canWrite || m.status === 'new' },
                { label: 'Copiar correo', icon: 'copy', onClick: async () => { if (await copyText(m.email)) toast('Correo copiado'); } },
                { label: 'Copiar mensaje', icon: 'copy', onClick: async () => { if (await copyText(body)) toast('Mensaje copiado'); } },
                { label: 'Ver ficha del cliente', icon: 'user', href: `/admin/clientes?email=${encodeURIComponent(m.email)}`, hidden: !orders?.length },
                'sep',
                { label: 'Eliminar conversación', icon: 'trash', onClick: onDelete, danger: true, hidden: !canWrite },
              ]}
            />
            <Button
              variant={ctxVisible ? 'secondary' : 'ghost'}
              size="sm"
              icon="user"
              className={cls('bo-ix-ctx-toggle', ctxVisible && 'is-on')}
              onClick={onToggleCtx}
              aria-label={ctxVisible ? 'Ocultar ficha del cliente' : 'Ver ficha del cliente'}
              title={ctxVisible ? 'Ocultar ficha del cliente' : 'Ver ficha del cliente (pedidos y datos)'}
            >
              <span className="bo-ix-ctx-btn-label">Ficha</span>
            </Button>
          </div>
        </header>

        <div className="bo-ix-feed" ref={feedRef}>
          <div className="bo-ix-feed-inner">
            <article className="bo-ix-msg">
              <header>
                <Avatar name={m.name} size={32} />
                <div><b>{m.name}</b><span>{m.email}{m.phone ? ` · ${m.phone}` : ''}</span></div>
                <time dateTime={m.createdAt} title={fmtDate(m.createdAt)}>{shortTime(m.createdAt)}</time>
              </header>
              <div className="bo-ix-body">{body}</div>
              <div className="bo-ix-msg-tools">
                <button type="button" className="bo-ix-chipbtn" onClick={async () => { if (await copyText(body)) toast('Mensaje copiado'); }}><Icon name="copy" size={12} />Copiar</button>
              </div>
            </article>

            {events === null ? (
              <div className="bo-ix-sys"><Skeleton w={180} h={10} /></div>
            ) : events.map((ev) => ev.kind === 'reply' ? (
              <article key={ev.id} className="bo-ix-msg is-team">
                <header>
                  <span className="bo-ix-team-ava"><img src="/img/isotipo.svg" alt="" width={18} height={18} /></span>
                  <div><b>{who(ev.author)}</b><span><Icon name={ev.channel === 'whatsapp' ? 'whatsapp' : 'mail'} size={11} /> Respondió por {ev.channel === 'whatsapp' ? 'WhatsApp' : 'correo'}</span></div>
                  <time dateTime={ev.createdAt} title={fmtDate(ev.createdAt)}>{shortTime(ev.createdAt)}</time>
                </header>
                <div className="bo-ix-body">{ev.body}</div>
              </article>
            ) : ev.kind === 'note' ? (
              <div key={ev.id} className="bo-ix-note">
                <header><Icon name="lock" size={12} /><span>Nota interna · <b>{who(ev.author)}</b></span><time dateTime={ev.createdAt} title={fmtDate(ev.createdAt)}>{shortTime(ev.createdAt)}</time></header>
                <div className="bo-ix-body">{ev.body}</div>
              </div>
            ) : (
              <div key={ev.id} className={cls('bo-ix-sys', ev.body === 'reopened' && 'is-reopen')}>
                <Icon name={ev.body === 'reopened' ? 'undo' : 'checkCircle'} size={13} />
                <span><b>{who(ev.author)}</b> {ev.body === 'reopened' ? 'reabrió la conversación' : 'marcó la conversación como resuelta'}</span>
                <time dateTime={ev.createdAt} title={fmtDate(ev.createdAt)}>{shortTime(ev.createdAt)}</time>
              </div>
            ))}
          </div>
        </div>

        {canWrite ? (
          <Composer
            m={m}
            meta={meta}
            lastOrderRef={lastOrder?.reference}
            focusReq={focusReq}
            onManageTemplates={onManageTemplates}
            onNote={async (text) => {
              const ev = await api.addMessageNote(m.id, text);
              addEvent(ev); onPatched({ notes: (m.notes ?? 0) + 1 });
              toast('Nota interna guardada');
            }}
            onReply={async (channel, text, resolve) => {
              const r = await api.replyMessage(m.id, { channel, body: text, resolve });
              addEvent(r.event);
              onPatched({ status: r.message?.status ?? m.status, replies: (m.replies ?? 0) + 1, firstReplyAt: m.firstReplyAt ?? r.event.createdAt });
              refreshCounts(true);
              toast(channel === 'email' ? (r.sent ? `Correo enviado a ${m.email}` : 'Respuesta registrada · termina el envío en tu correo') : 'Respuesta registrada · envíala en WhatsApp');
            }}
          />
        ) : (
          <div className="bo-ix-readonly"><Icon name="lock" size={14} />Tienes acceso de solo lectura: puedes ver la conversación pero no responder.</div>
        )}
      </div>

      {ctxVisible && <CustomerPanel m={m} orders={orders} thread={thread} overlay={ctxOverlay} onClose={onToggleCtx} onOpenOther={onOpenOther} />}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Compositor: responder (correo / WhatsApp) o nota interna, con respuestas guardadas
// -----------------------------------------------------------------------------
function Composer({ m, meta, lastOrderRef, focusReq, onManageTemplates, onNote, onReply }: {
  m: ContactMessage; meta: InboxMeta | null; lastOrderRef?: string; focusReq: { mode: 'reply' | 'note'; n: number } | null;
  onManageTemplates: () => void; onNote: (text: string) => Promise<void>; onReply: (channel: 'email' | 'whatsapp', text: string, resolve: boolean) => Promise<void>;
}) {
  const { toast } = useUI();
  const [mode, setMode] = useState<'reply' | 'note'>('reply');
  const [prefChannel, setPrefChannel] = usePref<'email' | 'whatsapp'>('lacajita.inbox.channel', 'email');
  const channel: 'email' | 'whatsapp' = m.phone ? prefChannel : 'email';
  const [resolveOnSend, setResolveOnSend] = usePref('lacajita.inbox.resolveOnSend', true);
  const [text, setText] = useState(() => drafts.get(`${m.id}:reply`) ?? '');
  const [sending, setSending] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const { body: original } = splitOrigin(m.message);

  const switchMode = (next: 'reply' | 'note') => {
    if (next === mode) return;
    drafts.set(`${m.id}:${mode}`, text);
    setMode(next); setText(drafts.get(`${m.id}:${next}`) ?? '');
    requestAnimationFrame(() => ta.current?.focus());
  };
  useEffect(() => { if (!focusReq) return; switchMode(focusReq.mode); requestAnimationFrame(() => ta.current?.focus()); }, [focusReq?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { drafts.set(`${m.id}:${mode}`, text); const el = ta.current; if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 260)}px`; } }, [text, mode, m.id]);

  const ctx: Record<string, string> = {
    nombre: firstName(m.name),
    pedido: lastOrderRef ? `#${lastOrderRef}` : '',
    tienda: meta?.vars.tienda ?? '',
    whatsapp: meta?.vars.whatsapp ?? '',
    envio_gratis_desde: meta?.vars.envioGratisDesde ? money(Number(meta.vars.envioGratisDesde)) : '',
  };
  const insert = (t: string) => {
    const filled = fillTemplate(t, ctx);
    setText((cur) => (cur.trim() ? `${cur.replace(/\s+$/, '')}\n\n${filled}` : filled));
    if (mode !== 'reply') { drafts.set(`${m.id}:note`, text); setMode('reply'); }
    requestAnimationFrame(() => ta.current?.focus());
  };
  const tplItems: MenuItem[] = [
    { group: 'Respuestas guardadas' },
    ...(meta?.templates ?? []).map((t) => ({ label: t.title, icon: 'zap' as IconName, onClick: () => insert(t.body) })),
    ...(meta && !meta.templates.length ? [{ label: 'Aún no tienes respuestas', icon: 'info' as IconName }] : []),
    'sep',
    { label: 'Administrar respuestas…', icon: 'edit', onClick: onManageTemplates },
  ];

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    if (mode === 'reply') {
      // Las ventanas externas se abren en el mismo clic (si no, el navegador las bloquea).
      if (channel === 'whatsapp' && m.phone) window.open(waLink(m.phone, t), '_blank', 'noopener');
      else if (channel === 'email' && !meta?.emailEnabled) {
        window.location.href = `mailto:${m.email}?subject=${encodeURIComponent('Respuesta a tu mensaje · Pimentones La Cajita')}&body=${encodeURIComponent(`${t}\n\n—\nTu mensaje:\n${original}`)}`;
      }
    }
    setSending(true);
    try {
      if (mode === 'note') await onNote(t); else await onReply(channel, t, resolveOnSend);
      setText(''); drafts.delete(`${m.id}:${mode}`);
    } catch (e) { toast((e as Error).message, 'error'); }
    finally { setSending(false); }
  };

  const sendLabel = mode === 'note' ? 'Guardar nota' : channel === 'whatsapp' ? 'Abrir WhatsApp' : meta?.emailEnabled ? 'Enviar correo' : 'Abrir correo';
  return (
    <div className={cls('bo-ix-composer', mode === 'note' && 'is-note')}>
      <div className="bo-ix-comp-top">
        <button type="button" className={cls('bo-ix-mode', mode === 'reply' && 'is-on')} onClick={() => switchMode('reply')}><Icon name="reply" size={14} />Responder</button>
        <button type="button" className={cls('bo-ix-mode', mode === 'note' && 'is-on')} onClick={() => switchMode('note')}><Icon name="lock" size={13} />Nota interna</button>
        {mode === 'reply' && (
          <div className="bo-ix-channel" role="radiogroup" aria-label="Canal de respuesta">
            <button type="button" role="radio" aria-checked={channel === 'email'} className={cls('bo-ix-ch', channel === 'email' && 'is-on')} onClick={() => setPrefChannel('email')}><Icon name="mail" size={13} />Correo</button>
            <button type="button" role="radio" aria-checked={channel === 'whatsapp'} className={cls('bo-ix-ch', channel === 'whatsapp' && 'is-on')} onClick={() => setPrefChannel('whatsapp')} disabled={!m.phone} title={m.phone ? undefined : 'Este cliente no dejó teléfono'}><Icon name="whatsapp" size={13} />WhatsApp</button>
          </div>
        )}
      </div>
      {mode === 'reply'
        ? <div className="bo-ix-to">Para: <b>{channel === 'whatsapp' ? m.phone : m.email}</b></div>
        : <div className="bo-ix-to">Solo la ve tu equipo. El cliente nunca recibe las notas internas.</div>}
      <textarea
        ref={ta}
        className="bo-ix-ta"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur(); }}
        placeholder={mode === 'note' ? 'Ej.: Confirmó por llamada que paga por transferencia mañana.' : `Escribe tu respuesta para ${firstName(m.name)}…`}
        aria-label={mode === 'note' ? 'Nota interna' : 'Respuesta al cliente'}
      />
      <div className="bo-ix-comp-foot">
        <div className="bo-ix-comp-foot-left">
          {mode === 'reply' && <Menu up trigger={(t, isOpen) => <Button size="sm" variant="ghost" icon="zap" onClick={t} className={cls(isOpen && 'is-active')}>Respuestas guardadas</Button>} items={tplItems} />}
          {mode === 'reply' && (
            <label className="bo-ix-resolve" title="Marca la conversación como resuelta al enviar">
              <input type="checkbox" checked={resolveOnSend} onChange={(e) => setResolveOnSend(e.target.checked)} />Resolver al enviar
            </label>
          )}
        </div>
        <div className="bo-ix-comp-foot-right">
          <span className="bo-ix-hint"><kbd>Ctrl</kbd> + <kbd>Enter</kbd></span>
          <Button
            variant="primary"
            size="sm"
            icon={mode === 'note' ? 'check' : channel === 'whatsapp' ? 'whatsapp' : 'send'}
            loading={sending}
            disabled={!text.trim()}
            onClick={send}
            className="bo-ix-send-btn"
          >
            {sendLabel}
          </Button>
        </div>
      </div>
      {mode === 'reply' && channel === 'email' && meta && !meta.emailEnabled && (
        <div className="bo-ix-comp-note"><Icon name="info" size={13} />Se abrirá tu aplicación de correo con el texto listo y la respuesta quedará registrada aquí.</div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Ficha del cliente: contacto, compras reales y otras conversaciones
// -----------------------------------------------------------------------------
function CustomerPanel({ m, orders, thread, overlay, onClose, onOpenOther }: {
  m: ContactMessage; orders: any[] | null; thread: ContactMessage[]; overlay: boolean; onClose: () => void; onOpenOther: (m: ContactMessage) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const { toast } = useUI();
  const paid = (orders ?? []).filter((o) => ['paid', 'preparing', 'shipped', 'delivered'].includes(o.status));
  const total = paid.reduce((s, o) => s + (o.total ?? 0), 0);
  const others = thread.filter((x) => x.id !== m.id);
  const first = thread.reduce((a, b) => (a.createdAt < b.createdAt ? a : b), m);
  const copy = async (v: string, label: string) => { if (await copyText(v)) toast(`${label} copiado`); };
  return (
    <aside className={cls('bo-ix-ctx', overlay && 'is-overlay')} aria-label="Ficha del cliente">
      <div className="bo-ix-ctx-topbar">
        <span className="bo-ix-ctx-topbar-title"><Icon name="user" size={13} /> Ficha del cliente</span>
        <Button variant="ghost" iconOnly icon="x" size="sm" onClick={onClose} aria-label="Cerrar ficha" title="Cerrar ficha" />
      </div>
      <div className="bo-ix-ctx-card">
        <Avatar name={m.name} size={52} />
        <h3>{m.name}</h3>
        {orders === null ? <Skeleton w={90} h={18} r={9} /> : (
          <span className={cls('bo-ix-tag', paid.length > 0 && 'is-good')}>{paid.length > 1 ? 'Cliente recurrente' : paid.length === 1 ? 'Cliente' : 'Aún no compra'}</span>
        )}
        <div className="bo-ix-ctx-quick">
          <a className="bo-ix-qa" href={`mailto:${m.email}`}><Icon name="mail" size={16} />Correo</a>
          {m.phone && <a className="bo-ix-qa" href={waLink(m.phone)} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={16} />WhatsApp</a>}
          {m.phone && <a className="bo-ix-qa" href={`tel:${m.phone.replace(/\s+/g, '')}`}><Icon name="phone" size={16} />Llamar</a>}
        </div>
      </div>

      <dl className="bo-ix-kv">
        <div><dt>Correo</dt><dd><span title={m.email}>{m.email}</span><button type="button" className="bo-ix-copy" onClick={() => copy(m.email, 'Correo')} aria-label="Copiar correo"><Icon name="copy" size={13} /></button></dd></div>
        {m.phone && <div><dt>Teléfono</dt><dd><span>{m.phone}</span><button type="button" className="bo-ix-copy" onClick={() => copy(m.phone!, 'Teléfono')} aria-label="Copiar teléfono"><Icon name="copy" size={13} /></button></dd></div>}
        <div><dt>Primer contacto</dt><dd>{fmtDay(first.createdAt)}</dd></div>
      </dl>

      <section className="bo-ix-sec">
        <h4>Compras</h4>
        {orders === null ? <><Skeleton h={48} r={10} /><Skeleton h={12} style={{ marginTop: 10 }} /></> : orders.length ? (
          <>
            <div className="bo-ix-stats">
              <div><b>{paid.length}</b><span>{paid.length === 1 ? 'pedido' : 'pedidos'}</span></div>
              <div><b>{moneyShort(total)}</b><span>total</span></div>
              <div><b>{paid.length ? moneyShort(Math.round(total / paid.length)) : '—'}</b><span>ticket</span></div>
            </div>
            <div className="bo-ix-orders">
              {orders.slice(0, 4).map((o) => (
                <Link key={o.id} href={`/admin/pedidos?id=${o.id}`} className="bo-ix-order">
                  <span className="mono">#{o.reference}</span>
                  <StatusBadge status={o.status} />
                  <span className="amt">{money(o.total)}</span>
                </Link>
              ))}
            </div>
            <Link className="bo-ix-more" href={`/admin/clientes?email=${encodeURIComponent(m.email)}`}>Ver ficha completa<Icon name="arrowRight" size={13} /></Link>
          </>
        ) : <p className="bo-ix-muted">Sin compras registradas con este correo.</p>}
      </section>

      {others.length > 0 && (
        <section className="bo-ix-sec">
          <h4>Otras conversaciones · {others.length}</h4>
          {others.slice(0, 6).map((o) => (
            <button key={o.id} type="button" className="bo-ix-other" onClick={() => onOpenOther(o)}>
              <div className="bo-ix-other-top"><span className={cls('bo-ix-status', `is-${o.status}`)}><i />{o.status === 'answered' ? 'Resuelta' : 'Abierta'}</span><time>{shortTime(o.createdAt)}</time></div>
              <p>{splitOrigin(o.message).body}</p>
            </button>
          ))}
        </section>
      )}
    </aside>
  );
}

// -----------------------------------------------------------------------------
// Respuestas guardadas (se guardan en la base de datos para todo el equipo)
// -----------------------------------------------------------------------------
const VARS: { key: string; label: string }[] = [
  { key: 'nombre', label: 'Primer nombre del cliente' },
  { key: 'pedido', label: 'Último pedido del cliente' },
  { key: 'tienda', label: 'Dirección de la tienda' },
  { key: 'whatsapp', label: 'WhatsApp de la tienda (Ajustes)' },
  { key: 'envio_gratis_desde', label: 'Monto de envío gratis (Ajustes)' },
];

function TemplatesModal({ open, onClose, meta, onSaved }: { open: boolean; onClose: () => void; meta: InboxMeta | null; onSaved: (t: Template[]) => void }) {
  const api = useAdmin();
  const { toast } = useUI();
  const [list, setList] = useState<Template[]>([]);
  const [cur, setCur] = useState(0);
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (open) { setList(meta?.templates ?? []); setCur(0); } }, [open, meta]);
  const t = list[cur];
  const patch = (p: Partial<Template>) => setList((l) => l.map((x, i) => (i === cur ? { ...x, ...p } : x)));
  const add = () => { setList((l) => [...l, { id: `r${Date.now().toString(36)}`, title: 'Nueva respuesta', body: 'Hola {nombre}, ' }]); setCur(list.length); };
  const removeCur = () => { setList((l) => l.filter((_, i) => i !== cur)); setCur((c) => Math.max(0, c - 1)); };
  const insertVar = (k: string) => {
    const el = bodyRef.current; if (!t) return;
    const pos = el?.selectionStart ?? t.body.length;
    patch({ body: `${t.body.slice(0, pos)}{${k}}${t.body.slice(el?.selectionEnd ?? pos)}` });
    requestAnimationFrame(() => { el?.focus(); const p = pos + k.length + 2; el?.setSelectionRange(p, p); });
  };
  const save = async () => {
    const clean = list.map((x) => ({ ...x, title: x.title.trim(), body: x.body.trim() }));
    const bad = clean.findIndex((x) => !x.title || !x.body);
    if (bad >= 0) { setCur(bad); toast('Cada respuesta necesita título y texto', 'error'); return; }
    setSaving(true);
    try { const r = await api.saveInboxTemplates(clean); onSaved(r); toast('Respuestas guardadas'); onClose(); }
    catch (e) { toast((e as Error).message, 'error'); }
    finally { setSaving(false); }
  };
  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="bo-ix-tpl">
        <h3>Respuestas guardadas</h3>
        <p>Textos que tu equipo reutiliza al responder. Las variables se completan solas con los datos del cliente y de Ajustes.</p>
        <div className="bo-ix-tpl-body">
          <nav className="bo-ix-tpl-list" aria-label="Respuestas">
            {list.map((x, i) => (
              <button key={x.id} type="button" className={cls('bo-ix-tpl-item', i === cur && 'is-active')} onClick={() => setCur(i)}>{x.title || 'Sin título'}</button>
            ))}
            <button type="button" className="bo-ix-tpl-add" onClick={add}><Icon name="plus" size={14} />Nueva respuesta</button>
          </nav>
          {t ? (
            <div className="bo-ix-tpl-edit">
              <Field label="Título"><Input value={t.title} maxLength={80} onChange={(e) => patch({ title: e.target.value })} /></Field>
              <Field label="Texto"><textarea ref={bodyRef} className="bo-textarea" rows={7} value={t.body} maxLength={4000} onChange={(e) => patch({ body: e.target.value })} /></Field>
              <div className="bo-ix-vars">
                <span>Insertar:</span>
                {VARS.map((v) => <button key={v.key} type="button" className="bo-ix-var" title={v.label} onClick={() => insertVar(v.key)}>{`{${v.key}}`}</button>)}
              </div>
              <div><Button size="sm" variant="ghost" icon="trash" onClick={removeCur}>Eliminar esta respuesta</Button></div>
            </div>
          ) : (
            <div className="bo-ix-empty"><Icon name="zap" size={22} /><b>Sin respuestas guardadas</b><span>Crea la primera para responder en segundos.</span></div>
          )}
        </div>
        <div className="bo-modal-actions">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" icon="check" loading={saving} onClick={save}>Guardar cambios</Button>
        </div>
      </div>
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// Registrar consulta recibida por otro canal (WhatsApp, Instagram, teléfono, feria)
// -----------------------------------------------------------------------------
function CreateMessageDrawer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (msg: ContactMessage) => void }) {
  const api = useAdmin();
  const { toast } = useUI();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState('WhatsApp');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'new' | 'answered'>('new');
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(''); setEmail(''); setPhone(''); setChannel('WhatsApp'); setMessage(''); setStatus('new'); };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) { toast('Completa nombre, correo y mensaje', 'error'); return; }
    setSaving(true);
    try {
      const fullMessage = channel !== 'Web' ? `[Origen: ${channel}] ${message.trim()}` : message.trim();
      const res = await api.createMessage({ name: name.trim(), email: email.trim(), phone: phone.trim() || null, message: fullMessage, status });
      toast('Consulta registrada');
      reset();
      onCreated(res);
    } catch (err) { toast((err as Error).message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Registrar consulta"
      subtitle="Para mensajes que llegaron por WhatsApp, Instagram, teléfono o en persona."
      size="md"
      footer={
        <div className="bo-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" icon="check" loading={saving} onClick={handleSave}>Guardar consulta</Button>
        </div>
      }
    >
      <form onSubmit={handleSave} className="bo-col" style={{ gap: 16 }}>
        <Field label="Nombre del contacto"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Mateo Morales" autoFocus /></Field>
        <Field label="Correo electrónico"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mateo@correo.com" /></Field>
        <Field label="Teléfono / WhatsApp" optional><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="3101234567" /></Field>
        <Field label="Canal de origen">
          <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Instagram">Instagram</option>
            <option value="Llamada">Llamada telefónica</option>
            <option value="En persona">En persona / feria</option>
            <option value="Web">Formulario web</option>
          </Select>
        </Field>
        <Field label="Consulta"><Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="¿Qué necesita el cliente?" /></Field>
        <Field label="Estado inicial">
          <Select value={status} onChange={(e) => setStatus(e.target.value as 'new' | 'answered')}>
            <option value="new">Por atender</option>
            <option value="answered">Ya resuelta</option>
          </Select>
        </Field>
      </form>
    </Drawer>
  );
}
