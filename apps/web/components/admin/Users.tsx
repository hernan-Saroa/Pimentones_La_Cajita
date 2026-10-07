'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ADMIN_ROLES,
  PLATFORM_PERMISSIONS,
  DEFAULT_SYSTEM_ROLES,
  type RoleDefinition,
  type PlatformPermission,
} from '@lacajita/shared';
import { ROLE_LABEL, useAdmin, useCan, useMe } from './AdminShell';
import {
  Avatar, Badge, Button, Card, Drawer, EmptyState, Field, FilterMenu, Icon, Input, Menu, Modal, PageHeader, SearchInput, TableSkeleton, Tabs, cls,
  copyText, fmtDate, fmtDay, plural, relTime, STATUS_META, norm, useUI, type IconName, type MenuItem,
} from './kit';

/**
 * Gestión de Equipo y Bitácora de Seguridad:
 * - Control de accesos y roles granulares (RBAC).
 * - Matriz exhaustiva de 32 facultades y permisos en 11 módulos.
 * - Registro cronológico inmutable de auditoría con filtros inteligentes.
 */

export const MODULE_INFO: Record<string, { name: string; icon: IconName; desc: string }> = {
  Tablero: { name: 'Tablero y Analítica', icon: 'dashboard', desc: 'Métricas clave, analítica de negocio y reportes ejecutivos.' },
  Pedidos: { name: 'Pedidos y Ventas', icon: 'orders', desc: 'Gestión de órdenes, cambio de estados, guías de despacho y remisiones.' },
  Clientes: { name: 'Clientes y Suscriptores', icon: 'users', desc: 'Historial de compradores, datos de contacto y base del boletín.' },
  Catálogo: { name: 'Catálogo y Productos', icon: 'tag', desc: 'Fichas técnicas, precios, recetas, fotos y visibilidad pública.' },
  Inventario: { name: 'Inventario y Lotes', icon: 'layers', desc: 'Existencias físicas, lotes de producción, vencimientos y mermas.' },
  Cupones: { name: 'Cupones y Promociones', icon: 'ticket', desc: 'Descuentos promocionales, códigos de campaña y vigencias.' },
  Envíos: { name: 'Envíos y Tarifas', icon: 'truck', desc: 'Cobertura por departamentos, fletes calculados y contraentrega.' },
  Mensajes: { name: 'Mensajes y PQRS', icon: 'inbox', desc: 'Consultas de clientes, bandeja de entrada y respuestas.' },
  Contenido: { name: 'Contenido y Tienda (CMS)', icon: 'file', desc: 'Textos de la portada, preguntas frecuentes, historia y maridajes.' },
  Ajustes: { name: 'Ajustes del Negocio', icon: 'sliders', desc: 'Configuración general, WhatsApp oficial y pasarela de pago.' },
  Seguridad: { name: 'Equipo y Seguridad', icon: 'shield', desc: 'Cuentas de colaboradores, roles personalizados y bitácora de auditoría.' },
};

export const ROLE_TONES: { value: 'violet' | 'blue' | 'green' | 'amber' | 'red' | 'gray'; label: string; color: string }[] = [
  { value: 'violet', label: 'Violeta', color: '#6941c6' },
  { value: 'blue', label: 'Azul', color: '#175cd3' },
  { value: 'green', label: 'Verde', color: '#15803d' },
  { value: 'amber', label: 'Ámbar', color: '#b54708' },
  { value: 'red', label: 'Rojo', color: '#d1342f' },
  { value: 'gray', label: 'Gris', color: '#475467' },
];

export const ROLE_ICONS: IconName[] = ['shield', 'key', 'box', 'eye', 'truck', 'users', 'sliders', 'star', 'tag', 'inbox'];

export const slugify = (s: string) =>
  s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

type Role = string;

const ROLE_META: Record<string, {
  icon: IconName;
  tone: 'violet' | 'blue' | 'green' | 'amber' | 'red' | 'gray';
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

export function getRoleMeta(id: string, rolesList?: RoleDefinition[]) {
  const custom = rolesList?.find((r) => r.id === id);
  if (custom) {
    return {
      name: custom.name,
      icon: (custom.icon as IconName) || 'shield',
      tone: (custom.tone as any) || 'blue',
      desc: custom.desc || '',
      badge: custom.badge || (custom.isSystem ? 'Sistema' : 'Personalizado'),
      recommendation: custom.recommendation || '',
      permissions: custom.permissions || [],
      isSystem: custom.isSystem ?? false,
    };
  }
  const meta = ROLE_META[id];
  if (meta) {
    return {
      name: ROLE_LABEL[id] ?? id,
      icon: meta.icon,
      tone: meta.tone,
      desc: meta.desc,
      badge: meta.badge,
      recommendation: meta.recommendation,
      permissions: DEFAULT_SYSTEM_ROLES.find((r) => r.id === id)?.permissions || [],
      isSystem: true,
    };
  }
  return {
    name: id,
    icon: 'shield' as IconName,
    tone: 'gray' as const,
    desc: 'Rol personalizado del sistema',
    badge: 'Personalizado',
    recommendation: '',
    permissions: [],
    isSystem: false,
  };
}

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
  const [roles, setRoles] = useState<RoleDefinition[]>(() => api.getCache?.('admin:roles') || DEFAULT_SYSTEM_ROLES);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState(false);
  const [roleModal, setRoleModal] = useState<{ open: boolean; role: RoleDefinition | null; isNew: boolean }>({
    open: false,
    role: null,
    isNew: false,
  });

  const load = useCallback(() => {
    api.users()
      .then((r) => {
        setUsers(r);
        setError('');
      })
      .catch((e: Error) => setError(e.message));
  }, [api]);

  const loadRoles = useCallback(() => {
    api.roles()
      .then((r) => {
        if (Array.isArray(r) && r.length) setRoles(r);
      })
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    load();
    loadRoles();
  }, [load, loadRoles]);

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
          can('owner') && (
            tab === 'team' ? (
              <Button variant="primary" icon="plus" onClick={() => setInvite(true)}>
                Invitar colaborador
              </Button>
            ) : tab === 'roles' ? (
              <Button variant="primary" icon="plus" onClick={() => setRoleModal({ open: true, role: null, isNew: true })}>
                Crear nuevo rol
              </Button>
            ) : undefined
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

      {tab === 'team' && <Team users={users} roles={roles} error={error} reload={load} onInvite={() => setInvite(true)} />}
      {tab === 'roles' && (
        <RolesMatrix
          users={users ?? []}
          roles={roles}
          reloadRoles={loadRoles}
          onCreate={() => setRoleModal({ open: true, role: null, isNew: true })}
          onEdit={(r) => setRoleModal({ open: true, role: r, isNew: false })}
          onDuplicate={(r) =>
            setRoleModal({
              open: true,
              role: {
                ...r,
                id: `${r.id}_copia`,
                name: `${r.name} (Copia)`,
                isSystem: false,
                badge: 'Personalizado',
              },
              isNew: true,
            })
          }
        />
      )}
      {tab === 'audit' && <Audit users={users ?? []} />}

      {invite && (
        <InviteDrawer
          existing={(users ?? []).map((u) => u.email)}
          roles={roles}
          onClose={closeInvite}
          onCreated={load}
        />
      )}

      {roleModal.open && (
        <RoleDrawer
          open={roleModal.open}
          role={roleModal.role}
          isNew={roleModal.isNew}
          roles={roles}
          onClose={() => setRoleModal({ open: false, role: null, isNew: false })}
          onSaved={loadRoles}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// PESTAÑA 1: MIEMBROS DEL EQUIPO
// ---------------------------------------------------------------------------
function Team({ users, roles, error, reload, onInvite }: { users: any[] | null; roles: RoleDefinition[]; error: string; reload: () => void; onInvite: () => void }) {
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

  const changeRole = async (u: any, roleId: string) => {
    if (roleId === u.role) return;
    const targetMeta = getRoleMeta(roleId, roles);
    const currentMeta = getRoleMeta(u.role, roles);
    if (
      !(await confirm({
        title: `¿Cambiar el rol de ${u.name}?`,
        body: `Pasará de ${currentMeta.name} a ${targetMeta.name}${targetMeta.desc ? `: ${targetMeta.desc}` : ''}`,
        confirm: 'Cambiar rol',
        icon: targetMeta.icon,
      }))
    ) return;
    update(u, { role: roleId }, `${u.name} ahora tiene rol de ${targetMeta.name}`);
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
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Control RBAC Granular</div>
            <div className="small muted">{roles.length} roles configurados</div>
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
              options: [{ value: '', label: 'Todos los roles' }, ...roles.map((r) => ({ value: r.id, label: r.name }))],
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
                  const rMeta = getRoleMeta(u.role, roles);
                  const items: MenuItem[] = [
                    { group: 'Cambiar rol' },
                    ...roles.map((r) => ({
                      label: `${r.name}${r.id === u.role ? ' (actual)' : ''}`,
                      icon: (r.icon as IconName) || 'shield',
                      onClick: () => changeRole(u, r.id),
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
                        <Badge tone={rMeta.tone} icon={rMeta.icon}>
                          {rMeta.name}
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
function RolesMatrix({
  users,
  roles,
  reloadRoles,
  onCreate,
  onEdit,
  onDuplicate,
}: {
  users: any[];
  roles: RoleDefinition[];
  reloadRoles: () => void;
  onCreate: () => void;
  onEdit: (r: RoleDefinition) => void;
  onDuplicate: (r: RoleDefinition) => void;
}) {
  const can = useCan();
  const api = useAdmin();
  const { toast, confirm } = useUI();
  const [search, setSearch] = useState('');
  const [inspectRole, setInspectRole] = useState<RoleDefinition | null>(null);

  const byRole = useMemo(() => {
    return Object.fromEntries(
      roles.map((r) => [r.id, users.filter((u) => u.role === r.id && u.active).length])
    );
  }, [roles, users]);

  const customCount = roles.filter((r) => !r.isSystem).length;
  const systemCount = roles.filter((r) => r.isSystem).length;
  const activeAssigned = users.filter((u) => u.active).length;

  const filteredRoles = useMemo(() => {
    if (!search.trim()) return roles;
    const q = norm(search);
    return roles.filter((r) => {
      const matchText = norm(`${r.name} ${r.id} ${r.desc} ${r.badge} ${r.recommendation}`).includes(q);
      const matchPerms = r.permissions.some((p) => norm(p).includes(q));
      return matchText || matchPerms;
    });
  }, [roles, search]);

  const handleDelete = async (role: RoleDefinition) => {
    if (role.isSystem || role.id === 'owner') {
      toast('Los roles base del sistema están protegidos y no pueden eliminarse.', 'error');
      return;
    }
    const count = byRole[role.id] ?? 0;
    if (count > 0) {
      await confirm({
        title: `No se puede eliminar el rol "${role.name}"`,
        body: `Hay ${count} ${count === 1 ? 'persona activa' : 'personas activas'} asignadas a este rol. Debes reasignar a los colaboradores a otro rol antes de poder eliminarlo.`,
        confirm: 'Entendido',
        icon: 'alert',
      });
      return;
    }

    if (
      !(await confirm({
        title: `¿Eliminar el rol "${role.name}"?`,
        body: 'Esta acción eliminará de forma permanente este perfil y sus permisos asignados. Esta acción no se puede deshacer.',
        confirm: 'Eliminar rol',
        danger: true,
        icon: 'trash',
      }))
    ) return;

    try {
      await api.deleteRole(role.id);
      toast(`Rol "${role.name}" eliminado correctamente`);
      reloadRoles();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <div className="bo-stack" style={{ gap: 20 }}>
      {/* Resumen estadístico superior */}
      <div className="bo-team-stats-grid">
        <div className="bo-team-stat">
          <span className="bo-stat-icon" style={{ background: 'var(--blue-50)', color: 'var(--blue)' }}>
            <Icon name="shield" size={20} />
          </span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{roles.length}</div>
            <div className="small muted">{systemCount} de sistema · {customCount} personalizados</div>
          </div>
        </div>

        <div className="bo-team-stat">
          <span className="bo-stat-icon" style={{ background: 'var(--violet-50)', color: 'var(--violet)' }}>
            <Icon name="sliders" size={20} />
          </span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{PLATFORM_PERMISSIONS.length}</div>
            <div className="small muted">Facultades en 11 módulos</div>
          </div>
        </div>

        <div className="bo-team-stat">
          <span className="bo-stat-icon" style={{ background: 'var(--emerald-50)', color: 'var(--emerald-600)' }}>
            <Icon name="users" size={20} />
          </span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{activeAssigned}</div>
            <div className="small muted">Colaboradores con rol activo</div>
          </div>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div className="bo-toolbar" style={{ background: 'var(--surface)', padding: 12, borderRadius: 12, border: '1px solid var(--line)' }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar rol por nombre, descripción, módulo o permiso…"
        />
        {can('owner') && (
          <div className="bo-toolbar-right">
            <Button variant="primary" icon="plus" onClick={onCreate}>
              Crear nuevo rol
            </Button>
          </div>
        )}
      </div>

      {filteredRoles.length === 0 ? (
        <Card>
          <EmptyState
            icon="shield"
            title="Ningún rol coincide con la búsqueda"
            action={<Button onClick={() => setSearch('')}>Limpiar búsqueda</Button>}
          >
            Prueba buscando por nombre del cargo (ej. &quot;Operaciones&quot;), módulo o facultad.
          </EmptyState>
        </Card>
      ) : (
        <div className="bo-roles">
          {filteredRoles.map((r) => {
            const count = byRole[r.id] ?? 0;
            const isOwner = r.id === 'owner';
            const isAll = isOwner || r.permissions.includes('*');
            const permCount = isAll ? PLATFORM_PERMISSIONS.length : r.permissions.length;
            const pct = Math.round((permCount / PLATFORM_PERMISSIONS.length) * 100);

            // Módulos con permisos concedidos
            const enabledModules = isAll
              ? Object.keys(MODULE_INFO)
              : [...new Set(
                  PLATFORM_PERMISSIONS.filter((p) => r.permissions.includes(p.id)).map((p) => p.module)
                )];

            return (
              <div key={r.id} className="bo-role-card">
                <div className="bo-role-header">
                  <div className="bo-role-title-wrap">
                    <span
                      className="bo-stat-icon"
                      style={{
                        background: `var(--${r.tone === 'gray' ? 'hover' : r.tone + '-50'})`,
                        color: r.tone === 'gray' ? 'var(--muted)' : `var(--${r.tone})`,
                      }}
                    >
                      <Icon name={(r.icon as IconName) || 'shield'} size={18} />
                    </span>
                    <div>
                      <div className="bo-role-card-badge-row">
                        <b style={{ fontSize: 15 }}>{r.name}</b>
                        <Badge tone={r.isSystem ? 'gray' : 'violet'}>
                          {r.isSystem ? 'Sistema' : 'Personalizado'}
                        </Badge>
                      </div>
                      <span className="small muted">{r.badge || (r.isSystem ? 'Base' : 'A medida')}</span>
                    </div>
                  </div>

                  <span className="bo-role-count-pill" title={`${count} colaboradores activos con este rol`}>
                    {count} {count === 1 ? 'persona' : 'personas'}
                  </span>
                </div>

                <p className="small muted" style={{ margin: 0, lineHeight: 1.45 }}>
                  {r.desc || 'Sin descripción asignada.'}
                </p>

                {/* Barra de progreso de permisos */}
                <div className="bo-role-perm-bar">
                  <div className="bo-row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>
                      {isAll ? 'Acceso total sin restricciones' : `${permCount} de ${PLATFORM_PERMISSIONS.length} facultades`}
                    </span>
                    <span className="mono" style={{ color: 'var(--muted)', fontSize: 11.5 }}>
                      {pct}%
                    </span>
                  </div>
                  <div className="bo-role-perm-progress">
                    <div
                      className="bo-role-perm-progress-fill"
                      style={{
                        width: `${pct}%`,
                        background: isOwner ? 'var(--violet)' : `var(--${r.tone === 'gray' ? 'ink' : r.tone})`,
                      }}
                    />
                  </div>
                </div>

                {/* Etiquetas de módulos habilitados */}
                <div className="bo-stack" style={{ gap: 4 }}>
                  <span className="small muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', fontSize: 10.5 }}>
                    Módulos con acceso ({enabledModules.length}/11):
                  </span>
                  <div className="bo-role-modules-wrap">
                    {enabledModules.slice(0, 6).map((m) => (
                      <span key={m} className="bo-role-module-tag">
                        <Icon name={MODULE_INFO[m]?.icon || 'check'} size={11} style={{ color: 'var(--brand)' }} />
                        {m}
                      </span>
                    ))}
                    {enabledModules.length > 6 && (
                      <span className="bo-role-module-tag muted">
                        +{enabledModules.length - 6} más
                      </span>
                    )}
                  </div>
                </div>

                {r.recommendation && (
                  <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                    <span className="small faint" style={{ fontStyle: 'italic', display: 'block' }}>
                      {r.recommendation}
                    </span>
                  </div>
                )}

                {/* Acciones del pie de tarjeta */}
                <div className="bo-role-actions-row">
                  {isOwner ? (
                    <span className="small faint bo-row" style={{ gap: 4, alignItems: 'center' }}>
                      <Icon name="key" size={13} />
                      Protegido · Superusuario legal
                    </span>
                  ) : r.isSystem ? (
                    <>
                      <Button size="sm" variant="ghost" icon="eye" onClick={() => setInspectRole(r)}>
                        Ver facultades
                      </Button>
                      {can('owner') && (
                        <Button size="sm" variant="secondary" icon="copy" onClick={() => onDuplicate(r)}>
                          Duplicar rol
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" icon="eye" onClick={() => setInspectRole(r)}>
                        Ver facultades
                      </Button>
                      {can('owner') && (
                        <>
                          <Button size="sm" variant="secondary" icon="edit" onClick={() => onEdit(r)}>
                            Editar rol
                          </Button>
                          <Button size="sm" variant="danger" icon="trash" onClick={() => handleDelete(r)} title="Eliminar rol personalizado" />
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {inspectRole && (
        <InspectRoleModal
          role={inspectRole}
          onClose={() => setInspectRole(null)}
          onEdit={!inspectRole.isSystem && can('owner') ? () => { const r = inspectRole; setInspectRole(null); onEdit(r); } : undefined}
        />
      )}
    </div>
  );
}

function InspectRoleModal({
  role,
  onClose,
  onEdit,
}: {
  role: RoleDefinition;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const isAll = role.id === 'owner' || role.permissions.includes('*');

  return (
    <Modal open onClose={onClose} wide>
      <div className="bo-stack" style={{ gap: 16 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Matriz de facultades: {role.name}</h3>
          <p className="small muted" style={{ margin: 0 }}>{role.badge} · {role.desc}</p>
        </div>
        <div className="bo-callout bo-callout--blue">
          <Icon name="info" size={18} />
          <div>
            {isAll
              ? 'Este rol cuenta con acceso irrestricto (*) a todas las funciones y módulos actuales y futuros de la plataforma.'
              : `Este rol tiene autorizadas ${role.permissions.length} de las ${PLATFORM_PERMISSIONS.length} facultades posibles.`}
          </div>
        </div>

        <div className="bo-stack" style={{ gap: 14, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
          {Object.entries(MODULE_INFO).map(([modKey, mod]) => {
            const permsInMod = PLATFORM_PERMISSIONS.filter((p) => p.module === modKey);
            const grantedInMod = permsInMod.filter((p) => isAll || role.permissions.includes(p.id));

            return (
              <div key={modKey} className="bo-perm-module-card">
                <div className="bo-perm-module-header">
                  <div className="bo-perm-module-title">
                    <Icon name={mod.icon} size={16} />
                    <b>{mod.name}</b>
                  </div>
                  <Badge tone={grantedInMod.length ? 'green' : 'gray'}>
                    {grantedInMod.length} / {permsInMod.length} facultades
                  </Badge>
                </div>
                <div className="bo-perm-module-grid">
                  {permsInMod.map((p) => {
                    const active = isAll || role.permissions.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        className={cls('bo-perm-toggle-item', active && 'is-selected')}
                        style={{ cursor: 'default' }}
                      >
                        <Icon
                          name={active ? 'check' : 'x'}
                          size={15}
                          style={{
                            color: active ? 'var(--brand)' : 'var(--faint)',
                            marginTop: 2,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="bo-row" style={{ justifyContent: 'space-between', gap: 6 }}>
                            <b style={{ fontSize: 13, color: active ? 'var(--ink)' : 'var(--muted)' }}>
                              {p.label}
                            </b>
                            <span className="mono small faint">{p.id}</span>
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginTop: 2 }}>
                            {p.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bo-modal-actions">
          {onEdit && (
            <Button variant="secondary" icon="edit" onClick={onEdit}>
              Editar permisos
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function RoleDrawer({
  open,
  role,
  isNew,
  roles,
  onClose,
  onSaved,
}: {
  open: boolean;
  role: RoleDefinition | null;
  isNew: boolean;
  roles: RoleDefinition[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const api = useAdmin();
  const { toast } = useUI();
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const [name, setName] = useState(role?.name ?? '');
  const [id, setId] = useState(role?.id ?? '');
  const [idManual, setIdManual] = useState(!isNew);
  const [desc, setDesc] = useState(role?.desc ?? '');
  const [badge, setBadge] = useState(role?.badge ?? (isNew ? 'Personalizado' : ''));
  const [tone, setTone] = useState<'violet' | 'blue' | 'green' | 'amber' | 'red' | 'gray'>(
    (role?.tone as any) ?? 'blue'
  );
  const [icon, setIcon] = useState<IconName>((role?.icon as any) ?? 'shield');
  const [recommendation, setRecommendation] = useState(role?.recommendation ?? '');
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? ['dashboard.view']);

  // Auto-slugify when typing name if not manual
  const handleNameChange = (val: string) => {
    setName(val);
    if (!idManual && isNew) {
      setId(slugify(val));
    }
  };

  const togglePerm = (permId: string) => {
    setPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const toggleModule = (moduleName: string) => {
    const modPerms = PLATFORM_PERMISSIONS.filter((p) => p.module === moduleName).map((p) => p.id);
    const allSelected = modPerms.every((p) => permissions.includes(p));
    if (allSelected) {
      setPermissions((prev) => prev.filter((p) => !modPerms.includes(p)));
    } else {
      setPermissions((prev) => [...new Set([...prev, ...modPerms])]);
    }
  };

  const selectAll = () => setPermissions(PLATFORM_PERMISSIONS.map((p) => p.id));
  const selectViewOnly = () => setPermissions(PLATFORM_PERMISSIONS.filter((p) => p.id.endsWith('.view')).map((p) => p.id));
  const clearAll = () => setPermissions([]);

  const errors: Record<string, string> = {};
  if (name.trim().length < 2) errors.name = 'Escribe el nombre del rol (mínimo 2 caracteres).';
  if (!id.trim() || id.trim().length < 2) errors.id = 'El identificador debe tener al menos 2 caracteres.';
  else if (!/^[a-z0-9_-]+$/.test(id.trim())) errors.id = 'Solo letras minúsculas, números, guiones y guiones bajos.';
  else if (isNew && roles.some((r) => r.id === id.trim())) errors.id = 'Ya existe un rol con este identificador.';
  if (permissions.length === 0) errors.permissions = 'Debes seleccionar al menos una facultad o permiso.';

  const valid = !Object.keys(errors).length;
  const err = (k: string) => (touched ? errors[k] : undefined);

  const save = async () => {
    setTouched(true);
    if (!valid) return;
    setBusy(true);
    try {
      if (isNew) {
        await api.createRole({
          id: id.trim(),
          name: name.trim(),
          desc: desc.trim(),
          badge: badge.trim() || 'Personalizado',
          tone,
          icon,
          permissions,
          recommendation: recommendation.trim(),
        });
        toast(`Rol "${name}" creado exitosamente`);
      } else if (role) {
        await api.updateRole(role.id, {
          name: name.trim(),
          desc: desc.trim(),
          badge: badge.trim(),
          tone,
          icon,
          permissions,
          recommendation: recommendation.trim(),
        });
        toast(`Rol "${name}" actualizado con éxito`);
      }
      onSaved();
      onClose();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setBusy(false);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={isNew ? 'Crear nuevo rol personalizado' : `Editar rol: ${role?.name}`}
      subtitle="Configura la identidad del cargo y selecciona minuciosamente las facultades módulo por módulo."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="check" loading={busy} onClick={save}>
            {isNew ? 'Crear rol' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <div className="bo-stack" style={{ gap: 24 }}>
        {/* Identidad del rol */}
        <div className="bo-stack" style={{ gap: 14 }}>
          <h4 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--ink-2)' }}>
            1. Identidad y Apariencia del Cargo
          </h4>

          <div className="bo-form-grid">
            <Field label="Nombre del rol" error={err('name')} hint="Ej: Jefe de Empaque y Despachos">
              <Input
                autoFocus
                value={name}
                aria-invalid={!!err('name')}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej: Gestor de Catálogo"
              />
            </Field>

            <Field
              label="Identificador único (slug)"
              error={err('id')}
              hint={isNew ? 'Se genera automáticamente en minúsculas' : 'Identificador inmutable'}
            >
              <Input
                className="mono"
                value={id}
                disabled={!isNew}
                aria-invalid={!!err('id')}
                onChange={(e) => {
                  setIdManual(true);
                  setId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                }}
                placeholder="ej: gestor_catalogo"
              />
            </Field>
          </div>

          <div className="bo-form-grid">
            <Field label="Insignia / Etiqueta de resumen" hint="Texto corto que aparece en la tarjeta">
              <Input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Ej: Logística, Comercial, Operativo"
              />
            </Field>

            <Field label="Color distintivo">
              <div className="bo-swatches">
                {ROLE_TONES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    title={t.label}
                    className={cls('bo-swatch', tone === t.value && 'is-active')}
                    style={{ background: t.color }}
                    onClick={() => setTone(t.value)}
                  />
                ))}
              </div>
            </Field>
          </div>

          <Field label="Ícono representativo">
            <div className="bo-icon-picker">
              {ROLE_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  title={ic}
                  className={cls('bo-icon-choice', icon === ic && 'is-active')}
                  onClick={() => setIcon(ic)}
                >
                  <Icon name={ic} size={20} />
                </button>
              ))}
            </div>
          </Field>

          <Field label="Descripción de responsabilidades" hint="Explica brevemente qué funciones desempeña esta persona">
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ej: Responsable del empaque, generación de guías y atención de novedades de envío."
            />
          </Field>

          <Field label="Perfil sugerido / Recomendación (Opcional)">
            <Input
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              placeholder="Ej: Para coordinadores de bodega, auxiliares logísticos o personal de taller."
            />
          </Field>
        </div>

        <div style={{ height: 1, background: 'var(--line)' }} />

        {/* Matriz de Permisos Detallada */}
        <div className="bo-stack" style={{ gap: 16 }}>
          <div className="bo-row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h4 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--ink-2)' }}>
                2. Matriz Granular de Facultades (11 Módulos)
              </h4>
              <span className="small muted">
                Marca únicamente las acciones que este rol tendrá permitido ejecutar.
              </span>
            </div>

            <div className="bo-row" style={{ gap: 8, alignItems: 'center' }}>
              <Badge tone={permissions.length ? 'green' : 'amber'}>
                {permissions.length} de {PLATFORM_PERMISSIONS.length} seleccionadas
              </Badge>
              <Button size="sm" variant="ghost" onClick={selectAll}>
                Marcar todas
              </Button>
              <Button size="sm" variant="ghost" onClick={selectViewOnly}>
                Solo lectura
              </Button>
              <Button size="sm" variant="ghost" onClick={clearAll}>
                Limpiar
              </Button>
            </div>
          </div>

          {err('permissions') && (
            <div className="bo-field-error">
              <Icon name="alert" size={14} />
              {err('permissions')}
            </div>
          )}

          {/* Lista de módulos */}
          <div className="bo-stack" style={{ gap: 12 }}>
            {Object.entries(MODULE_INFO).map(([modKey, mod]) => {
              const permsInMod = PLATFORM_PERMISSIONS.filter((p) => p.module === modKey);
              const selectedInMod = permsInMod.filter((p) => permissions.includes(p.id));
              const allModSelected = selectedInMod.length === permsInMod.length;

              return (
                <div key={modKey} className="bo-perm-module-card">
                  <div className="bo-perm-module-header">
                    <div className="bo-perm-module-title">
                      <Icon name={mod.icon} size={16} />
                      <div>
                        <b>{mod.name}</b>
                        <span className="small muted" style={{ display: 'block', fontSize: 11.5 }}>
                          {mod.desc}
                        </span>
                      </div>
                    </div>

                    <div className="bo-row" style={{ gap: 8, alignItems: 'center' }}>
                      <Badge tone={selectedInMod.length ? 'blue' : 'gray'}>
                        {selectedInMod.length} / {permsInMod.length}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleModule(modKey)}
                      >
                        {allModSelected ? 'Desmarcar módulo' : 'Marcar módulo'}
                      </Button>
                    </div>
                  </div>

                  <div className="bo-perm-module-grid">
                    {permsInMod.map((p) => {
                      const isChecked = permissions.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={cls('bo-perm-toggle-item', isChecked && 'is-selected')}
                          onClick={(e) => {
                            e.preventDefault();
                            togglePerm(p.id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePerm(p.id)}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="bo-row" style={{ justifyContent: 'space-between', gap: 6 }}>
                              <b style={{ fontSize: 13, color: isChecked ? 'var(--ink)' : 'var(--ink-2)' }}>
                                {p.label}
                              </b>
                              <span className="mono small faint">{p.id}</span>
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginTop: 2 }}>
                              {p.desc}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Drawer>
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
function InviteDrawer({ existing, roles, onClose, onCreated }: { existing: string[]; roles: RoleDefinition[]; onClose: () => void; onCreated: () => void }) {
  const api = useAdmin();
  const { toast } = useUI();

  const defaultRole = roles.find((r) => r.id !== 'owner')?.id || 'ops';
  const [u, setU] = useState({ name: '', email: '', role: defaultRole, password: genPassword() });
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

  const roleMeta = getRoleMeta(u.role, roles);
  const welcomeMessage = `Hola ${u.name.split(' ')[0]}, bienvenido(a) al equipo de Pimentones La Cajita.\nTe he creado acceso al administrador como ${roleMeta.name}.\n\nPuedes ingresar en:\n${ADMIN_URL}\n\nTus credenciales temporales:\nCorreo: ${u.email.trim().toLowerCase()}\nContraseña: ${u.password}\n\nPor favor inicia sesión y cambia tu contraseña. ¡Muchos éxitos!`;

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
              <b>{u.name}</b> ya está autorizado como <b>{roleMeta.name}</b>.
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
              {roles.filter((r) => r.id !== 'owner').map((r) => {
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={cls('bo-choice', u.role === r.id && 'is-active')}
                    onClick={() => setU({ ...u, role: r.id })}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 14px' }}
                  >
                    <span
                      className="bo-stat-icon"
                      style={{
                        background: `var(--${r.tone === 'gray' ? 'hover' : r.tone + '-50'})`,
                        color: r.tone === 'gray' ? 'var(--muted)' : `var(--${r.tone})`,
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={(r.icon as IconName) || 'shield'} size={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="bo-row" style={{ gap: 8, alignItems: 'center' }}>
                        <b style={{ fontSize: 13.5 }}>{r.name}</b>
                        <Badge tone={r.tone}>{r.badge || (r.isSystem ? 'Sistema' : 'Personalizado')}</Badge>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginTop: 2 }}>
                        {r.desc}
                      </span>
                    </div>
                    {u.role === r.id && <Icon name="checkCircle" size={18} style={{ color: 'var(--brand)', flexShrink: 0 }} />}
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
