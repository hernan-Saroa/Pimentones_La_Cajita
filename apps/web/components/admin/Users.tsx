'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ADMIN_ROLES } from '@lacajita/shared';
import { ROLE_LABEL, useAdmin, useCan, useMe } from './AdminShell';
import {
  Avatar, Badge, Button, Card, Drawer, EmptyState, Field, FilterMenu, Icon, Input, Menu, Modal, PageHeader, SearchInput, TableSkeleton, Tabs, cls,
  copyText, fmtDate, fmtDay, plural, relTime, STATUS_META, norm, useUI, type IconName, type MenuItem,
} from './kit';

/**
 * Gestión de Equipo y Bitácora de Auditoría:
 * - Control de accesos y roles (RBAC).
 * - Matriz de facultades y permisos por perfil.
 * - Registro cronológico inmutable de auditoría con filtros inteligentes.
 */

type Role = (typeof ADMIN_ROLES)[number];

const ROLE_META: Record<Role, {
  icon: IconName;
  tone: 'violet' | 'blue' | 'green' | 'gray';
  desc: string;
  badge: string;
  can: string[];
  cannot: string[];
  recommendation: string;
}> = {
  owner: {
    icon: 'key',
    tone: 'violet',
    desc: 'Control total de la marca, el negocio y el equipo.',
    badge: 'Máximo nivel',
    can: ['Todo lo de Administrador', 'Invitar, editar y dar de baja personas', 'Cambiar roles y permisos de acceso'],
    cannot: [],
    recommendation: 'Reservado para los fundadores y propietarios legales.',
  },
  admin: {
    icon: 'shield',
    tone: 'blue',
    desc: 'Gestión integral del catálogo, precios y configuración.',
    badge: 'Gestión general',
    can: ['Crear y editar productos y variantes', 'Gestionar inventario, lotes y precios', 'Configurar cupones, envíos y contenido', 'Consultar la bitácora completa de cambios'],
    cannot: ['Gestionar cuentas del equipo ni cambiar roles'],
    recommendation: 'Para administradores generales y directores comerciales.',
  },
  ops: {
    icon: 'box',
    tone: 'green',
    desc: 'Operación diaria de empaque, despacho y atención.',
    badge: 'Logística diaria',
    can: ['Gestionar pedidos y generar guías de despacho', 'Monitorear inventario y registrar nuevos lotes', 'Responder mensajes de clientes y atender solicitudes'],
    cannot: ['Modificar precios, cupones ni ajustes de tienda'],
    recommendation: 'Para personal de taller, bodega y servicio al cliente.',
  },
  viewer: {
    icon: 'eye',
    tone: 'gray',
    desc: 'Acceso de solo lectura para reportes y supervisión.',
    badge: 'Consulta',
    can: ['Ver métricas del tablero y ventas', 'Consultar historial de pedidos y clientes'],
    cannot: ['Realizar cambios, editar productos ni alterar estados'],
    recommendation: 'Para contadores, asesores externos o auditores.',
  },
};

const genPassword = () => {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const s = '!#$%*?';
  let p = '';
  const r = new Uint32Array(14);
  crypto.getRandomValues(r);
  r.forEach((n, i) => { p += i === 6 ? s[n % s.length] : a[n % a.length]; });
  return p;
};

const ADMIN_URL = typeof window !== 'undefined' ? `${window.location.origin}/admin` : '/admin';

export function Users() {
  const api = useAdmin();
  const can = useCan();
  const [tab, setTab] = useState<'team' | 'roles' | 'audit'>('team');
  const [users, setUsers] = useState<any[] | null>(() => api.getCache?.('admin:users') || null);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState(false);

  const load = useCallback(() => {
    api.users()
      .then((r) => {
        setUsers(r);
        setError('');
      })
      .catch((e: Error) => setError(e.message));
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  // La URL manda: ?vista=roles|bitacora (menú lateral) e ?invitar=1 (botón Crear).
  const sp = useSearchParams(); const router = useRouter(); const pathname = usePathname();
  const VIEW: Record<string, 'roles' | 'audit'> = { roles: 'roles', bitacora: 'audit' };
  useEffect(() => {
    setTab(VIEW[sp.get('vista') ?? ''] ?? 'team');
    if (sp.get('invitar') === '1' && can('owner')) setInvite(true);
  }, [sp]); // eslint-disable-line react-hooks/exhaustive-deps
  const replaceParams = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v == null ? p.delete(k) : p.set(k, v)));
    router.replace(`${pathname}${p.toString() ? `?${p}` : ''}`, { scroll: false });
  };
  const changeTab = (t: 'team' | 'roles' | 'audit') => { setTab(t); replaceParams({ vista: t === 'roles' ? 'roles' : t === 'audit' ? 'bitacora' : null }); };
  const closeInvite = () => { setInvite(false); if (sp.get('invitar')) replaceParams({ invitar: null }); };

  const activeCount = users?.filter((u) => u.active).length ?? 0;

  return (
    <>
      <PageHeader
        title="Equipo y Bitácora de Seguridad"
        description="Control de accesos y permisos por rol, gestión de usuarios autorizados y registro de auditoría de todas las acciones en la tienda."
        actions={
          tab === 'team' && can('owner') && (
            <Button variant="primary" icon="plus" onClick={() => setInvite(true)}>
              Invitar colaborador
            </Button>
          )
        }
      />

      <div style={{ marginBottom: 20 }}>
        <Tabs
          value={tab}
          onChange={(v) => changeTab(v as 'team' | 'roles' | 'audit')}
          items={[
            { value: 'team', label: 'Equipo', count: activeCount },
            { value: 'roles', label: 'Roles y permisos' },
            { value: 'audit', label: 'Bitácora' },
          ]}
        />
      </div>

      {tab === 'team' && <Team users={users} error={error} reload={load} onInvite={() => setInvite(true)} />}
      {tab === 'roles' && <RolesMatrix users={users ?? []} />}
      {tab === 'audit' && <Audit users={users ?? []} />}

      {invite && (
        <InviteDrawer
          existing={(users ?? []).map((u) => u.email)}
          onClose={closeInvite}
          onCreated={load}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// PESTAÑA 1: MIEMBROS DEL EQUIPO
// ---------------------------------------------------------------------------
function Team({ users, error, reload, onInvite }: { users: any[] | null; error: string; reload: () => void; onInvite: () => void }) {
  const api = useAdmin();
  const can = useCan();
  const me = useMe();
  const { toast, confirm } = useUI();

  const [reset, setReset] = useState<any>(null);
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const owner = can('owner');

  const update = async (u: any, body: object, ok: string) => {
    try {
      await api.updateUser(u.id, body);
      toast(ok);
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const changeRole = async (u: any, role: Role) => {
    if (role === u.role) return;
    if (
      !(await confirm({
        title: `¿Cambiar el rol de ${u.name}?`,
        body: `Pasará de ${ROLE_LABEL[u.role]} a ${ROLE_LABEL[role]}: ${ROLE_META[role].desc}`,
        confirm: 'Cambiar rol',
        icon: ROLE_META[role].icon,
      }))
    ) return;
    update(u, { role }, `${u.name} ahora tiene rol de ${ROLE_LABEL[role]}`);
  };

  const toggleActive = async (u: any) => {
    if (
      u.active &&
      !(await confirm({
        title: `¿Revocar acceso a ${u.name}?`,
        body: 'Esta persona no podrá volver a iniciar sesión en el administrador. Su historial en la bitácora se preserva intacto y puedes reactivarlo en cualquier momento.',
        confirm: 'Revocar acceso',
        danger: true,
      }))
    ) return;
    update(u, { active: !u.active }, u.active ? `Se revocó el acceso de ${u.name}` : `Acceso restablecido para ${u.name}`);
  };

  const doReset = async () => {
    setBusy(true);
    try {
      await api.updateUser(reset.id, { password: pwd });
      toast(`Contraseña de ${reset.name} actualizada con éxito`);
      await copyText(pwd);
      setReset(null);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setBusy(false);
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      const matchSearch = !search || norm(`${u.name} ${u.email}`).includes(norm(search));
      const matchRole = !roleFilter || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const activeCount = users?.filter((u) => u.active).length ?? 0;

  return (
    <div className="bo-stack" style={{ gap: 20 }}>
      {/* Resumen estadístico superior */}
      <div className="bo-team-stats-grid">
        <div className="bo-team-stat">
          <span className="bo-stat-icon" style={{ background: 'var(--brand-50)', color: 'var(--brand)' }}>
            <Icon name="users" size={20} />
          </span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{activeCount}</div>
            <div className="small muted">Colaboradores activos</div>
          </div>
        </div>

        <div className="bo-team-stat">
          <span className="bo-stat-icon" style={{ background: 'var(--violet-50)', color: 'var(--violet)' }}>
            <Icon name="shield" size={20} />
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Control RBAC</div>
            <div className="small muted">4 niveles de permisos definidos</div>
          </div>
        </div>

        <div className="bo-team-stat">
          <span className="bo-stat-icon" style={{ background: 'var(--blue-50)', color: 'var(--blue)' }}>
            <Icon name="key" size={20} />
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Seguridad de cuenta</div>
            <div className="small muted">Contraseñas con hash seguro</div>
          </div>
        </div>
      </div>

      <Card
        flush
        title="Personas con acceso al administrador"
        description={owner ? 'Como propietario puedes invitar miembros, modificar sus roles y revocar accesos.' : 'Solo el propietario de la tienda puede gestionar el equipo de colaboradores.'}
      >
        <div className="bo-toolbar" style={{ borderBottom: '1px solid var(--line)' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar persona por nombre o correo..." />
          <FilterMenu
            groups={[{
              key: 'role', label: 'Rol', value: roleFilter, defaultValue: '',
              onChange: setRoleFilter,
              options: [{ value: '', label: 'Todos los roles' }, ...ADMIN_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))],
            }]}
          />
          {owner && (
            <div className="bo-toolbar-right">
              <Button variant="primary" size="sm" icon="plus" onClick={onInvite}>
                Invitar persona
              </Button>
            </div>
          )}
        </div>

        {error ? (
          <div style={{ padding: 24 }}>
            <EmptyState icon="alert" title="No pudimos cargar el equipo" action={<Button onClick={reload}>Reintentar</Button>}>
              {error}
            </EmptyState>
          </div>
        ) : !users ? (
          <div style={{ padding: 24 }}><TableSkeleton rows={3} cols={5} /></div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: 32 }}>
            <EmptyState
              icon="users"
              title={users.length ? 'Ningún colaborador coincide con los filtros' : 'Aún no hay colaboradores'}
              action={owner && !users.length ? <Button variant="primary" icon="plus" onClick={onInvite}>Invitar primer colaborador</Button> : undefined}
            >
              {users.length ? 'Prueba cambiando o limpiando los términos de búsqueda.' : 'Invita a tu equipo para delegar operaciones de pedidos, catálogo y envíos.'}
            </EmptyState>
          </div>
        ) : (
          <div className="bo-table-wrap">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Rol asignado</th>
                  <th>Estado</th>
                  <th className="bo-hide-sm">Último acceso</th>
                  {owner && <th className="w-act" style={{ textAlign: 'right', paddingRight: 20 }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const self = u.id === me?.id;
                  const items: MenuItem[] = [
                    { group: 'Cambiar rol' },
                    ...ADMIN_ROLES.map((r) => ({
                      label: `${ROLE_LABEL[r]}${r === u.role ? ' (actual)' : ''}`,
                      icon: ROLE_META[r].icon,
                      onClick: () => changeRole(u, r),
                      hidden: self,
                    })),
                    'sep',
                    { label: 'Restablecer contraseña', icon: 'key', onClick: () => { setPwd(genPassword()); setReset(u); } },
                    { label: u.active ? 'Revocar acceso' : 'Reactivar acceso', icon: u.active ? 'lock' : 'check', danger: u.active, onClick: () => toggleActive(u), hidden: self },
                  ];

                  return (
                    <tr key={u.id} style={!u.active ? { opacity: 0.6 } : undefined}>
                      <td>
                        <div className="bo-cell-main">
                          <Avatar name={u.name} size={36} />
                          <div>
                            <b className="bo-row" style={{ gap: 6, fontSize: 13.5 }}>
                              {u.name}
                              {self && <Badge tone="outline">Tú</Badge>}
                            </b>
                            <span className="small muted">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <Badge tone={ROLE_META[u.role as Role]?.tone ?? 'gray'} icon={ROLE_META[u.role as Role]?.icon}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </Badge>
                      </td>

                      <td>
                        {u.active ? (
                          <Badge tone="green" dot>Activo</Badge>
                        ) : (
                          <Badge tone="gray" dot>Acceso revocado</Badge>
                        )}
                      </td>

                      <td className="bo-hide-sm muted" title={u.lastLoginAt ? fmtDate(u.lastLoginAt) : undefined}>
                        {u.lastLoginAt ? relTime(u.lastLoginAt) : 'Nunca ha ingresado'}
                      </td>

                      {owner && (
                        <td className="w-act" style={{ textAlign: 'right', paddingRight: 20 }}>
                          <Menu
                            trigger={(t) => (
                              <Button size="sm" variant="ghost" iconOnly icon="more" onClick={t} aria-label={`Acciones para ${u.name}`} />
                            )}
                            items={items}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal para restablecer contraseña */}
      <Modal open={!!reset} onClose={() => setReset(null)}>
        {reset && (
          <>
            <span className="bo-modal-icon" style={{ background: 'var(--brand-50)', color: 'var(--brand)' }}>
              <Icon name="key" size={20} />
            </span>
            <h3>Nueva contraseña para {reset.name}</h3>
            <p>Compártela por un canal seguro (WhatsApp o mensaje privado). Al hacer clic en guardar, la copiaremos automáticamente a tu portapapeles.</p>
            <div className="bo-row" style={{ marginTop: 14 }}>
              <Input className="mono" value={pwd} onChange={(e) => setPwd(e.target.value)} aria-invalid={pwd.length < 8} />
              <Button iconOnly icon="refresh" onClick={() => setPwd(genPassword())} aria-label="Generar otra" />
            </div>
            {pwd.length < 8 && (
              <div className="bo-field-error" style={{ marginTop: 6 }}>
                <Icon name="alert" size={13} />
                Mínimo 8 caracteres.
              </div>
            )}
            <div className="bo-modal-actions">
              <Button onClick={() => setReset(null)}>Cancelar</Button>
              <Button variant="primary" loading={busy} disabled={pwd.length < 8} onClick={doReset}>
                Guardar y copiar
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PESTAÑA 2: MATRIZ DE ROLES Y PERMISOS
// ---------------------------------------------------------------------------
function RolesMatrix({ users }: { users: any[] }) {
  const byRole = useMemo(() => {
    return Object.fromEntries(
      ADMIN_ROLES.map((r) => [r, users.filter((u) => u.role === r && u.active).length])
    );
  }, [users]);

  return (
    <div className="bo-stack" style={{ gap: 20 }}>
      <div className="bo-roles">
        {ADMIN_ROLES.map((r) => {
          const meta = ROLE_META[r];
          const count = byRole[r] ?? 0;
          return (
            <div key={r} className="bo-role-card">
              <div className="bo-role-header">
                <div className="bo-role-title-wrap">
                  <span
                    className="bo-stat-icon"
                    style={{
                      background: `var(--${meta.tone === 'gray' ? 'hover' : meta.tone + '-50'})`,
                      color: meta.tone === 'gray' ? 'var(--muted)' : `var(--${meta.tone})`,
                    }}
                  >
                    <Icon name={meta.icon} size={18} />
                  </span>
                  <div>
                    <b style={{ fontSize: 15, display: 'block' }}>{ROLE_LABEL[r]}</b>
                    <span className="small muted">{meta.badge}</span>
                  </div>
                </div>

                <span className="bo-role-count-pill">
                  {count} {count === 1 ? 'persona' : 'personas'}
                </span>
              </div>

              <p className="small muted" style={{ margin: 0, lineHeight: 1.45 }}>
                {meta.desc}
              </p>

              <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />

              <div className="bo-perm-list">
                <span className="small muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>
                  Permisos autorizados
                </span>
                {meta.can.map((c) => (
                  <span key={c} className="bo-perm">
                    <Icon name="check" size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                    <span>{c}</span>
                  </span>
                ))}
                {meta.cannot.map((c) => (
                  <span key={c} className="bo-perm no">
                    <Icon name="x" size={14} style={{ flexShrink: 0 }} />
                    <span>{c}</span>
                  </span>
                ))}
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <span className="small faint" style={{ fontStyle: 'italic', display: 'block' }}>
                  {meta.recommendation}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PESTAÑA 3: BITÁCORA DE AUDITORÍA
// ---------------------------------------------------------------------------
const ENTITY: Record<string, { label: string; icon: IconName; color: string }> = {
  pedido: { label: 'Pedidos', icon: 'orders', color: 'var(--blue)' },
  producto: { label: 'Productos', icon: 'tag', color: 'var(--violet)' },
  inventario: { label: 'Inventario', icon: 'layers', color: 'var(--brand)' },
  cupon: { label: 'Cupones', icon: 'ticket', color: 'var(--pink)' },
  zona: { label: 'Envíos', icon: 'truck', color: 'var(--cyan)' },
  contenido: { label: 'Contenido', icon: 'file', color: 'var(--amber)' },
  ajustes: { label: 'Ajustes', icon: 'sliders', color: 'var(--ink-2)' },
  usuario: { label: 'Equipo', icon: 'shield', color: 'var(--violet)' },
  mensaje: { label: 'Mensajes', icon: 'inbox', color: 'var(--blue)' },
};

const FIELD: Record<string, string> = {
  name: 'nombre',
  price: 'precio',
  stock: 'inventario',
  description: 'descripción',
  image: 'foto',
  active: 'visibilidad',
  tagline: 'frase corta',
  kicker: 'frase superior',
  pairing: 'maridaje',
  slug: 'dirección web',
  sizeG: 'contenido',
  sort: 'posición',
};

const parse = (d: unknown): any => {
  if (!d) return {};
  if (typeof d === 'string') {
    try { return JSON.parse(d); } catch { return {}; }
  }
  return d;
};

function sentence(a: any, productName: (id: string) => string): { text: React.ReactNode; detail?: string } {
  const d = parse(a.detail);
  const id = String(a.entityId ?? '');
  switch (a.entity) {
    case 'pedido': {
      if (d.status) return { text: <>movió el pedido <b className="mono">#{id}</b> a <b>{STATUS_META[d.status]?.label ?? d.status}</b></>, detail: d.tracking ? `Guía ${d.tracking}${d.carrier ? ` · ${d.carrier}` : ''}` : undefined };
      if (d.tracking) return { text: <>registró la guía de transporte del pedido <b className="mono">#{id}</b></>, detail: `${d.carrier ?? ''} ${d.tracking}`.trim() };
      if (d.adminNotes !== undefined) return { text: <>actualizó las notas operativas del pedido <b className="mono">#{id}</b></> };
      return { text: <>actualizó el pedido <b className="mono">#{id}</b></> };
    }
    case 'producto': {
      const name = d.name || productName(id);
      if (a.action === 'crear') return { text: <>creó el producto <b>{name}</b></> };
      if (a.action === 'desactivar') return { text: <>desactivó el producto <b>{name}</b> en catálogo</> };
      const keys = Object.keys(d);
      if (keys.length === 1 && keys[0] === 'active') return { text: <>{d.active ? 'publicó' : 'ocultó'} el producto <b>{name}</b> en la tienda pública</> };
      return { text: <>editó la información de <b>{name}</b></>, detail: keys.length ? `Campos modificados: ${keys.map((k) => FIELD[k] ?? k).join(', ')}` : undefined };
    }
    case 'inventario':
      if (a.action === 'lote') return { text: <>registró el lote <b className="mono">{d.code}</b> para <b>{productName(id)}</b> (+{d.quantity} unidades)</> };
      return { text: <>realizó ajuste manual de inventario en <b>{productName(id)}</b> ({d.delta > 0 ? '+' : ''}{d.delta} unidades)</>, detail: d.note };
    case 'cupon':
      return { text: <>{a.action === 'crear' ? 'creó' : 'editó'} el cupón promocional <b className="mono">{id}</b>{d.active === false ? ' (pausado)' : ''}</> };
    case 'zona':
      return { text: <>actualizó la tarifa y tiempos de envío hacia <b>{id}</b></>, detail: d.rate != null ? `$${Number(d.rate).toLocaleString('es-CO')} · ${d.daysMin}–${d.daysMax} días${d.codAvailable ? ' · Contraentrega activo' : ''}${d.active === false ? ' · Inactivo' : ''}` : undefined };
    case 'contenido':
      return { text: <>publicó cambios en el contenido y textos de la tienda</> };
    case 'ajustes':
      return { text: <>actualizó los canales oficiales y ajustes de pago de la tienda</> };
    case 'usuario':
      if (a.action === 'crear') return { text: <>otorgó acceso a <b className="mono">{id}</b>{d.role ? ` con rol de ${ROLE_LABEL[d.role]}` : ''}</> };
      if (d.active === false) return { text: <>revocó el acceso de <b className="mono">{id}</b></> };
      if (d.active === true) return { text: <>reactivó el acceso de <b className="mono">{id}</b></> };
      if (d.role) return { text: <>cambió el rol de <b className="mono">{id}</b> a {ROLE_LABEL[d.role]}</> };
      return { text: <>actualizó la cuenta de <b className="mono">{id}</b></> };
    case 'mensaje':
      return { text: <>marcó el mensaje de cliente como <b>{({ new: 'no leído', read: 'leído', answered: 'respondido' } as Record<string, string>)[d.status] ?? d.status}</b></> };
    default:
      return { text: <>{a.action} en {a.entity} <b className="mono">{id}</b></> };
  }
}

function Audit({ users }: { users: any[] }) {
  const api = useAdmin();
  const can = useCan();
  const [rows, setRows] = useState<any[] | null>(null);
  const [products, setProducts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [actor, setActor] = useState('');
  const [entity, setEntity] = useState('');

  const load = useCallback(() => {
    api.audit()
      .then((r) => { setRows(r); setError(''); })
      .catch((e: Error) => setError(e.message));
    api.products()
      .then((p) => setProducts(Object.fromEntries(p.map((x: any) => [String(x.id), x.name]))))
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    if (can('admin')) load();
  }, [load]);

  const nameOf = (email: string) => users.find((u) => u.email === email)?.name ?? email;
  const productName = (id: string) => products[id] ?? `#${id}`;
  const actors = useMemo(() => [...new Set((rows ?? []).map((r) => r.actor))], [rows]);

  const list = useMemo(() => {
    return (rows ?? []).filter((a) => {
      const matchActor = !actor || a.actor === actor;
      const matchEntity = !entity || a.entity === entity;
      const matchQuery = !q || norm(`${a.actor} ${a.entity} ${a.entityId} ${a.action} ${typeof a.detail === 'string' ? a.detail : JSON.stringify(a.detail ?? '')} ${a.entity === 'producto' || a.entity === 'inventario' ? productName(String(a.entityId)) : ''}`).includes(norm(q));
      return matchActor && matchEntity && matchQuery;
    });
  }, [rows, actor, entity, q, products]);

  const days = useMemo(() => {
    return list.reduce<[string, any[]][]>((acc, a) => {
      const k = fmtDay(a.createdAt);
      const last = acc[acc.length - 1];
      if (last && last[0] === k) last[1].push(a);
      else acc.push([k, [a]]);
      return acc;
    }, []);
  }, [list]);

  const today = fmtDay(new Date());
  const yesterday = fmtDay(new Date(Date.now() - 86400000));

  if (!can('admin')) {
    return (
      <Card>
        <EmptyState icon="lock" title="Acceso restringido para administradores">
          La bitácora de auditoría solo está disponible para usuarios con rol de Administrador o Propietario.
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card flush>
      <div className="bo-toolbar" style={{ borderBottom: '1px solid var(--line)' }}>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar en auditoría: pedido, producto, cupón, cliente…" />
        <FilterMenu
          groups={[
            {
              key: 'actor', label: 'Persona', value: actor, defaultValue: '',
              onChange: setActor,
              options: [{ value: '', label: 'Todas las personas' }, ...actors.map((a) => ({ value: a, label: nameOf(a) }))],
            },
            {
              key: 'entity', label: 'Área', value: entity, defaultValue: '',
              onChange: setEntity,
              options: [
                { value: '', label: `Todas las áreas (${rows?.length ?? 0})` },
                ...Object.entries(ENTITY)
                  .map(([k, v]) => ({ k, v, count: (rows ?? []).filter((r) => r.entity === k).length }))
                  .filter((x) => x.count > 0 || x.k === entity)
                  .map((x) => ({ value: x.k, label: `${x.v.label} (${x.count})` })),
              ],
            },
          ]}
        />
        <div className="bo-toolbar-right">
          <Button size="sm" variant="ghost" icon="refresh" onClick={() => { setRows(null); load(); }}>
            Actualizar
          </Button>
        </div>
      </div>

      <div style={{ padding: '16px 20px 24px' }}>
        {error ? (
          <EmptyState icon="alert" title="No pudimos cargar la bitácora" action={<Button onClick={load}>Reintentar</Button>}>
            {error}
          </EmptyState>
        ) : !rows ? (
          <TableSkeleton rows={5} cols={2} />
        ) : list.length === 0 ? (
          <EmptyState icon="history" title={rows.length ? 'Ningún evento coincide con los filtros' : 'Aún no hay actividad registrada'}>
            {rows.length ? 'Prueba eliminando los filtros o buscando otros términos.' : 'Cada cambio que realice el equipo quedará documentado cronológicamente aquí.'}
          </EmptyState>
        ) : (
          days.map(([day, items]) => (
            <div key={day} style={{ marginBottom: 20 }}>
              <div className="bo-tl-day">
                {day === today ? 'Hoy' : day === yesterday ? 'Ayer' : day} · {plural(items.length, 'evento', 'eventos')}
              </div>
              <div className="bo-timeline">
                {items.map((a) => {
                  const e = ENTITY[a.entity] ?? { icon: 'info' as IconName, color: 'var(--muted)', label: a.entity };
                  const s = sentence(a, productName);
                  return (
                    <div key={a.id} className="bo-tl-item">
                      <span className="bo-tl-icon" style={{ color: e.color }}>
                        <Icon name={e.icon} size={14} />
                      </span>
                      <div className="bo-tl-body">
                        <div>
                          <b style={{ color: 'var(--ink)' }}>{nameOf(a.actor)}</b> {s.text}
                        </div>
                        {s.detail && (
                          <div className="small" style={{ color: 'var(--ink-2)', marginTop: 4, background: 'var(--subtle)', padding: '4px 8px', borderRadius: 6, display: 'inline-block' }}>
                            {s.detail}
                          </div>
                        )}
                        <div className="bo-tl-meta" title={fmtDate(a.createdAt)} style={{ marginTop: 4 }}>
                          {new Date(a.createdAt).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
                          {' · '}
                          <span style={{ fontWeight: 600, color: e.color }}>{e.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {rows && rows.length >= 200 && (
          <p className="small muted" style={{ marginTop: 12, textAlign: 'center' }}>
            Se muestran las últimas 200 acciones registradas por motivos de rendimiento.
          </p>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// CAJÓN: INVITAR COLABORADOR
// ---------------------------------------------------------------------------
function InviteDrawer({ existing, onClose, onCreated }: { existing: string[]; onClose: () => void; onCreated: () => void }) {
  const api = useAdmin();
  const { toast } = useUI();

  const [u, setU] = useState({ name: '', email: '', role: 'ops' as Role, password: genPassword() });
  const [show, setShow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);

  const errors: Record<string, string> = {};
  if (u.name.trim().length < 2) errors.name = 'Escribe el nombre del colaborador.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email)) errors.email = 'Escribe un correo electrónico válido.';
  else if (existing.includes(u.email.trim().toLowerCase())) errors.email = 'Este correo ya tiene una cuenta creada en el equipo.';
  if (u.password.length < 8) errors.password = 'La contraseña debe tener mínimo 8 caracteres.';

  const valid = !Object.keys(errors).length;
  const err = (k: string) => (touched ? errors[k] : undefined);

  const welcomeMessage = `Hola ${u.name.split(' ')[0]}, bienvenido(a) al equipo de Pimentones La Cajita.\nTe he creado acceso al administrador como ${ROLE_LABEL[u.role]}.\n\nPuedes ingresar en:\n${ADMIN_URL}\n\nTus credenciales temporales:\nCorreo: ${u.email.trim().toLowerCase()}\nContraseña: ${u.password}\n\nPor favor inicia sesión y cambia tu contraseña. ¡Muchos éxitos!`;

  const create = async () => {
    setTouched(true);
    if (!valid) return;
    setBusy(true);
    try {
      await api.createUser({ ...u, email: u.email.trim().toLowerCase(), name: u.name.trim() });
      setDone(true);
      onCreated();
      toast(`Acceso creado exitosamente para ${u.name}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setBusy(false);
  };

  return (
    <Drawer
      open
      onClose={onClose}
      size="md"
      title={done ? 'Colaborador invitado con éxito' : 'Invitar nuevo colaborador'}
      subtitle={done ? 'Comparte el mensaje de bienvenida para que pueda iniciar sesión.' : 'Asigna los datos personales y el nivel de acceso en la tienda.'}
      footer={
        done ? (
          <Button variant="primary" onClick={onClose}>
            Entendido, cerrar
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" icon="check" loading={busy} onClick={create}>
              Crear acceso
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="bo-stack" style={{ gap: 16 }}>
          <div className="bo-callout bo-callout--green">
            <Icon name="checkCircle" size={20} />
            <div>
              <b>{u.name}</b> ya está autorizado como <b>{ROLE_LABEL[u.role]}</b>.
            </div>
          </div>

          <div>
            <span className="small muted" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Plantilla de bienvenida para WhatsApp o Correo:
            </span>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #cbd5e1' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', font: '13px/1.6 var(--sans)', color: '#1e293b' }}>
                {welcomeMessage}
              </pre>
            </div>
          </div>

          <Button
            variant="secondary"
            icon="copy"
            onClick={async () => {
              if (await copyText(welcomeMessage)) toast('Mensaje de bienvenida copiado');
            }}
          >
            Copiar mensaje de bienvenida
          </Button>

          <div className="bo-callout bo-callout--amber">
            <Icon name="alert" size={16} />
            Por seguridad, esta contraseña temporal no volverá a mostrarse en pantalla.
          </div>
        </div>
      ) : (
        <div className="bo-stack" style={{ gap: 20 }}>
          <div className="bo-form-grid">
            <Field label="Nombre completo" error={err('name')}>
              <Input
                autoFocus
                value={u.name}
                aria-invalid={!!err('name')}
                onChange={(e) => setU({ ...u, name: e.target.value })}
                placeholder="Ej: Carolina Morales"
              />
            </Field>

            <Field label="Correo corporativo / personal" error={err('email')}>
              <Input
                type="email"
                value={u.email}
                aria-invalid={!!err('email')}
                onChange={(e) => setU({ ...u, email: e.target.value })}
                placeholder="carolina@correo.com"
              />
            </Field>
          </div>

          <div>
            <span className="small muted" style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Nivel de acceso (Rol en el sistema):
            </span>
            <div className="bo-stack" style={{ gap: 8 }}>
              {ADMIN_ROLES.filter((r) => r !== 'owner').map((r) => {
                const meta = ROLE_META[r];
                return (
                  <button
                    key={r}
                    type="button"
                    className={cls('bo-choice', u.role === r && 'is-active')}
                    onClick={() => setU({ ...u, role: r })}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 14px' }}
                  >
                    <Icon name={meta.icon} size={18} />
                    <div style={{ flex: 1 }}>
                      <b style={{ fontSize: 13.5 }}>{ROLE_LABEL[r]}</b>
                      <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginTop: 2 }}>
                        {meta.desc}
                      </span>
                    </div>
                    {u.role === r && <Icon name="checkCircle" size={18} style={{ color: 'var(--brand)' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          <Field
            label="Contraseña temporal asignada"
            error={err('password')}
            hint="Se genera aleatoriamente con caracteres seguros. Podrás copiarla al terminar."
          >
            <div className="bo-row">
              <Input
                className="mono"
                type={show ? 'text' : 'password'}
                value={u.password}
                autoComplete="new-password"
                onChange={(e) => setU({ ...u, password: e.target.value })}
              />
              <Button iconOnly icon={show ? 'eyeOff' : 'eye'} onClick={() => setShow(!show)} aria-label={show ? 'Ocultar' : 'Mostrar'} />
              <Button iconOnly icon="refresh" onClick={() => setU({ ...u, password: genPassword() })} aria-label="Generar otra" />
            </div>
          </Field>
        </div>
      )}
    </Drawer>
  );
}
