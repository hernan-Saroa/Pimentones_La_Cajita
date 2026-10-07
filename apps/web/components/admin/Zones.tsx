'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdmin, useCan } from './AdminShell';
import {
  Badge, Button, Card, Drawer, EmptyState, Field, Icon, Input, MoneyInput, PageHeader, SaveBar, SearchInput, Select, Stat, TableSkeleton, Tabs, Toggle,
  cls, money, norm, plural, useOutside, useUI, useUnsavedGuard,
} from './kit';

/**
 * Envíos y Cobertura Nacional:
 * - Políticas globales (Envío gratis, tarifa local Bogotá, tarifa estándar nacional).
 * - Cobertura por departamento con tarifas, días hábiles y pago contraentrega.
 * - Simulador interactivo de checkout en vivo para validar lo que ve el comprador.
 */
type Z = { id: number; department: string; rate: number; daysMin: number; daysMax: number; codAvailable: boolean; active: boolean };
type Rules = { shipping_free_from: string; shipping_flat: string };
const RULE_KEYS: (keyof Rules)[] = ['shipping_free_from', 'shipping_flat'];

const mode = (a: number[]) => {
  const m = new Map<number, number>();
  a.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
  return [...m.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] ?? 0;
};
const same = (a: Z, b: Z) =>
  a.rate === b.rate && a.daysMin === b.daysMin && a.daysMax === b.daysMax && a.codAvailable === b.codAvailable && a.active === b.active;

export function Zones() {
  const api = useAdmin();
  const { toast } = useUI();
  const can = useCan();
  const canEdit = can('admin');

  const [base, setBase] = useState<Z[] | null>(() => api.getCache?.('admin:zones') || null);
  const [rows, setRows] = useState<Z[]>(() => api.getCache?.('admin:zones') || []);
  const [error, setError] = useState('');
  const [rules0, setRules0] = useState<Rules | null>(() => {
    const s = api.getCache?.('admin:settings');
    return s ? Object.fromEntries(RULE_KEYS.map((k) => [k, s[k] ?? ''])) as Rules : null;
  });
  const [rules, setRules] = useState<Rules | null>(() => {
    const s = api.getCache?.('admin:settings');
    return s ? Object.fromEntries(RULE_KEYS.map((k) => [k, s[k] ?? ''])) as Rules : null;
  });

  const [q, setQ] = useState('');
  const [f, setF] = useState<'all' | 'bogota' | 'active' | 'cod' | 'special' | 'inactive'>('all');
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [editZone, setEditZone] = useState<Z | null>(null);
  const [bulkRateOpen, setBulkRateOpen] = useState(false);
  const [bulkRateVal, setBulkRateVal] = useState(12000);

  const load = useCallback(() => {
    api.zones()
      .then((z: Z[]) => {
        setBase(z);
        setRows(z);
        setError('');
      })
      .catch((e: Error) => setError(e.message));

    api.settings()
      .then((s) => {
        const r = Object.fromEntries(RULE_KEYS.map((k) => [k, s[k] ?? ''])) as Rules;
        setRules0(r);
        setRules(r);
      })
      .catch(() => {});
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const baseById = useMemo(() => new Map((base ?? []).map((z) => [z.id, z])), [base]);
  const dirtyIds = useMemo(() => rows.filter((z) => {
    const b = baseById.get(z.id);
    return b && !same(b, z);
  }).map((z) => z.id), [rows, baseById]);

  const rulesDirty = !!rules && !!rules0 && RULE_KEYS.some((k) => rules[k] !== rules0[k]);
  const totalDirty = dirtyIds.length + (rulesDirty ? 1 : 0);
  useUnsavedGuard(totalDirty > 0);

  const free = Number(rules?.shipping_free_from || 0);
  const flat = Number(rules?.shipping_flat || 0);

  const bogota = useMemo(() => rows.find((z) => norm(z.department).includes('bogota')), [rows]);

  const set = (id: number, patch: Partial<Z>) =>
    setRows((r) => r.map((z) => (z.id === id ? { ...z, ...patch } : z)));

  const setMany = (patch: Partial<Z>) => {
    setRows((r) => r.map((z) => (sel.has(z.id) ? { ...z, ...patch } : z)));
    toast(`${plural(sel.size, 'departamento actualizado', 'departamentos actualizados')}. Guarda los cambios.`);
  };

  const applyFlatToAllNonBogota = () => {
    if (!flat) return toast('Primero define la tarifa nacional estándar.', 'error');
    setRows((curr) => curr.map((z) => (norm(z.department).includes('bogota') ? z : { ...z, rate: flat })));
    toast(`Tarifa de ${money(flat)} aplicada a los 32 departamentos fuera de Bogotá.`);
  };

  const active = rows.filter((z) => z.active);
  const stats = useMemo(() => ({
    active: active.length,
    common: mode(active.map((z) => z.rate)),
    cod: active.filter((z) => z.codAvailable).length,
    eta: active.length ? `${mode(active.map((z) => z.daysMin))} a ${mode(active.map((z) => z.daysMax))} días` : '—',
    specialCount: active.filter((z) => !norm(z.department).includes('bogota') && z.rate !== flat).length,
  }), [active, flat]);

  const list = useMemo(() => {
    const s = norm(q.trim());
    return rows.filter((z) => {
      if (s && !norm(z.department).includes(s)) return false;
      if (f === 'bogota') return norm(z.department).includes('bogota');
      if (f === 'active') return z.active;
      if (f === 'cod') return z.codAvailable && z.active;
      if (f === 'special') return z.active && (norm(z.department).includes('bogota') || z.rate !== flat);
      if (f === 'inactive') return !z.active;
      return true;
    });
  }, [rows, q, f, flat]);

  const allSel = list.length > 0 && list.every((z) => sel.has(z.id));
  const invalid = rows.filter((z) => z.daysMin > z.daysMax).map((z) => z.department);

  const saveAll = async () => {
    if (invalid.length) {
      return toast(`Revisa los días de entrega en ${invalid.join(', ')}: el mínimo es mayor que el máximo.`, 'error');
    }
    setSaving(true);
    try {
      const promises: Promise<any>[] = [];
      if (rulesDirty && rules) {
        promises.push(api.saveSettings(rules).then(() => setRules0(rules)));
      }
      if (dirtyIds.length > 0) {
        const changed = rows.filter((z) => dirtyIds.includes(z.id));
        promises.push(...changed.map(({ id, ...b }) => api.saveZone(b, id)));
      }
      await Promise.all(promises);
      toast('Políticas y tarifas de envío guardadas exitosamente.');
      setSel(new Set());
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const discardAll = () => {
    setRows(base ?? []);
    setRules(rules0);
    setSel(new Set());
    toast('Cambios descartados.', 'info');
  };

  return (
    <>
      <PageHeader
        title="Envíos y Cobertura Nacional"
        description={
          <span className="bo-row" style={{ gap: 8, alignItems: 'center', fontSize: 13, flexWrap: 'wrap' }}>
            {free > 0 ? (
              <Badge tone="green" icon="gift">
                Envío gratis desde {money(free)}
              </Badge>
            ) : (
              <Badge tone="gray">Sin envío gratis</Badge>
            )}
            <span className="muted">·</span>
            <span>{stats.active} de {rows.length} departamentos activos</span>
            <span className="muted">·</span>
            <span>Contraentrega en Bogotá D.C.</span>
          </span>
        }
        actions={
          <div className="bo-row" style={{ gap: 10, alignItems: 'center' }}>
            <Button variant="secondary" icon="truck" onClick={() => setSimOpen(true)}>
              Simulador de checkout
            </Button>
            {canEdit && totalDirty > 0 && (
              <Button variant="primary" icon="check" loading={saving} onClick={saveAll}>
                Guardar cambios ({totalDirty})
              </Button>
            )}
          </div>
        }
      />

      {/* Pilares estratégicos de logística */}
      <Card
        title="Estrategia y Políticas Globales de Envío"
        description="Configura el incentivo de envío gratis, la tarifa local para Bogotá y la tarifa estándar nacional."
        className="mb-4"
        footer={
          canEdit && totalDirty > 0 ? (
            <>
              <span className="small muted bo-row" style={{ gap: 6 }}>
                <Icon name="info" size={14} />
                Tienes cambios sin guardar en las tarifas de envío.
              </span>
              <div className="bo-row" style={{ gap: 8 }}>
                <Button size="sm" variant="ghost" onClick={discardAll} disabled={saving}>
                  Descartar
                </Button>
                <Button size="sm" variant="primary" icon="check" loading={saving} onClick={saveAll}>
                  Guardar políticas y tarifas
                </Button>
              </div>
            </>
          ) : undefined
        }
      >
        <fieldset className="bo-plain" disabled={!canEdit}>
          <div className="bo-grid bo-grid-3">
            {/* Pilar 1: Envío Gratis */}
            <div className="bo-pillar">
              <div className="bo-pillar-head">
                <div className="bo-pillar-title">
                  <span className="bo-pillar-icon" style={{ background: '#ecfdf3', color: '#16a34a' }}>
                    <Icon name="gift" size={18} />
                  </span>
                  <span>Envío Gratis</span>
                </div>
                {free > 0 ? (
                  <Badge tone="green" dot>Activo</Badge>
                ) : (
                  <Badge tone="gray">Desactivado</Badge>
                )}
              </div>
              <Field label="Monto mínimo de compra">
                <MoneyInput
                  value={free}
                  onChange={(n) => rules && setRules({ ...rules, shipping_free_from: String(n) })}
                />
              </Field>
              <div className="bo-chips">
                {[75000, 90000, 120000].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={cls('bo-chip', free === n && 'is-active')}
                    onClick={() => rules && setRules({ ...rules, shipping_free_from: String(n) })}
                  >
                    {money(n)}
                  </button>
                ))}
                <button
                  type="button"
                  className={cls('bo-chip', free === 0 && 'is-active')}
                  onClick={() => rules && setRules({ ...rules, shipping_free_from: '0' })}
                >
                  Desactivar
                </button>
              </div>
              <p className="small muted" style={{ margin: 0, lineHeight: 1.45 }}>
                {free > 0
                  ? `Pedidos de ${money(free)} o más en frascos no pagan envío en el checkout.`
                  : 'El cliente siempre paga la tarifa de envío correspondiente.'}
              </p>
            </div>

            {/* Pilar 2: Bogotá D.C. (Local) */}
            <div className="bo-pillar">
              <div className="bo-pillar-head">
                <div className="bo-pillar-title">
                  <span className="bo-pillar-icon" style={{ background: '#eff8ff', color: '#175cd3' }}>
                    <Icon name="pin" size={18} />
                  </span>
                  <span>Bogotá D.C. (Local)</span>
                </div>
                <Badge tone="blue">Mercado Principal</Badge>
              </div>
              <Field label="Tarifa de envío local">
                <MoneyInput
                  value={bogota?.rate ?? 8000}
                  onChange={(n) => bogota && set(bogota.id, { rate: n })}
                />
              </Field>
              <div className="bo-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="small strong">Entrega estimada</span>
                <span className="small muted">1 a 2 días hábiles</span>
              </div>
              <div className="bo-row" style={{ justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                <span className="small strong">Pago contraentrega</span>
                <Toggle
                  small
                  checked={bogota?.codAvailable ?? true}
                  onChange={(v) => bogota && set(bogota.id, { codAvailable: v })}
                />
              </div>
              <p className="small muted" style={{ margin: 0, lineHeight: 1.45 }}>
                Tarifa preferencial para entregas urbanas en Bogotá donde está ubicada la bodega.
              </p>
            </div>

            {/* Pilar 3: Tarifa Nacional */}
            <div className="bo-pillar">
              <div className="bo-pillar-head">
                <div className="bo-pillar-title">
                  <span className="bo-pillar-icon" style={{ background: '#f4f0ff', color: '#6941c6' }}>
                    <Icon name="truck" size={18} />
                  </span>
                  <span>Tarifa Nacional Estándar</span>
                </div>
                <Badge tone="violet">32 departamentos</Badge>
              </div>
              <Field label="Tarifa estándar nacional">
                <MoneyInput
                  value={flat}
                  onChange={(n) => rules && setRules({ ...rules, shipping_flat: String(n) })}
                />
              </Field>
              <Button
                size="sm"
                variant="secondary"
                icon="refresh"
                onClick={applyFlatToAllNonBogota}
                title="Aplica este valor a los 32 departamentos fuera de Bogotá"
              >
                Aplicar {money(flat)} a todo el país
              </Button>
              <p className="small muted" style={{ margin: 0, lineHeight: 1.45 }}>
                Aplica por defecto a departamentos sin tarifa especial o inactivos.
              </p>
            </div>
          </div>
        </fieldset>
      </Card>

      {/* Indicadores de Logística */}
      <div className="bo-grid bo-grid-4" style={{ marginBottom: 20 }}>
        <Stat
          label="Cobertura nacional"
          icon="pin"
          value={base ? `${stats.active} de ${rows.length}` : '—'}
          hint="100% de departamentos activos en tienda"
        />
        <Stat
          label="Tarifa Bogotá"
          icon="truck"
          tone="#175cd3"
          value={base && bogota ? money(bogota.rate) : '—'}
          hint="Entrega express de 1 a 2 días"
        />
        <Stat
          label="Tarifa nacional común"
          icon="truck"
          tone="#6941c6"
          value={base ? money(stats.common) : '—'}
          hint="Resto de departamentos del país"
        />
        <Stat
          label="Zonas con contraentrega"
          icon="cash"
          tone="#1b7a47"
          value={base ? `${stats.cod} zonas` : '—'}
          hint="Pago en efectivo al recibir frascos"
        />
      </div>

      {/* Tabla de Cobertura y Departamentos */}
      <Card flush>
        <Tabs
          value={f}
          onChange={(v) => setF(v as any)}
          items={[
            { value: 'all', label: 'Todos', icon: 'pin', count: rows.length },
            { value: 'bogota', label: 'Bogotá', icon: 'pin', count: 1 },
            { value: 'cod', label: 'Contraentrega', icon: 'cash', count: stats.cod },
            { value: 'special', label: 'Tarifa especial', icon: 'sliders', count: stats.specialCount + (bogota ? 1 : 0) },
            { value: 'inactive', label: 'Inactivos', icon: 'eyeOff', count: rows.length - stats.active },
          ]}
        />

        <div className="bo-toolbar">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Buscar departamento (ej. Antioquia, Valle)…"
          />

          {sel.size > 0 && (
            <div className="bo-toolbar-right bo-row" style={{ gap: 8 }}>
              <Button size="sm" variant="secondary" icon="sliders" onClick={() => setBulkRateOpen(true)}>
                Tarifa masiva ({sel.size})
              </Button>
              <Button size="sm" variant="secondary" icon="cash" onClick={() => setMany({ codAvailable: true })}>
                + Contraentrega
              </Button>
              <Button size="sm" variant="secondary" icon="x" onClick={() => setMany({ codAvailable: false })}>
                - Contraentrega
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>
                Deseleccionar
              </Button>
            </div>
          )}
        </div>

        {error ? (
          <EmptyState icon="alert" title="No pudimos cargar las zonas de envío" action={<Button onClick={load}>Reintentar</Button>}>
            {error}
          </EmptyState>
        ) : !base ? (
          <TableSkeleton rows={8} cols={5} />
        ) : list.length === 0 ? (
          <EmptyState icon="search" title="Ningún departamento coincide">
            Prueba buscando con otro término o quita los filtros.
          </EmptyState>
        ) : (
          <div className="bo-table-wrap">
            <table className="bo-table">
              <thead>
                <tr>
                  {canEdit && (
                    <th className="w-check">
                      <input
                        type="checkbox"
                        className="bo-check"
                        checked={allSel}
                        onChange={() => setSel(allSel ? new Set() : new Set(list.map((z) => z.id)))}
                        aria-label="Seleccionar todos"
                      />
                    </th>
                  )}
                  <th>Departamento</th>
                  <th>Tarifa de envío</th>
                  <th>Tiempo estimado de entrega</th>
                  <th className="c">Pago contraentrega</th>
                  <th className="c">Estado en tienda</th>
                  <th className="w-act" style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.map((z) => {
                  const dirty = dirtyIds.includes(z.id);
                  const isBogota = norm(z.department).includes('bogota');
                  const bad = z.daysMin > z.daysMax;

                  return (
                    <tr
                      key={z.id}
                      className={cls(dirty && 'is-dirty', sel.has(z.id) && 'is-selected')}
                      style={!z.active ? { opacity: 0.65 } : undefined}
                    >
                      {canEdit && (
                        <td className="w-check">
                          <input
                            type="checkbox"
                            className="bo-check"
                            checked={sel.has(z.id)}
                            onChange={() =>
                              setSel((s) => {
                                const n = new Set(s);
                                if (n.has(z.id)) n.delete(z.id);
                                else n.add(z.id);
                                return n;
                              })
                            }
                            aria-label={`Seleccionar ${z.department}`}
                          />
                        </td>
                      )}
                      <td>
                        <div className="bo-cell-main">
                          <div>
                            <b className="bo-row" style={{ gap: 8, alignItems: 'center' }}>
                              <span>{z.department}</span>
                              {isBogota ? (
                                <Badge tone="blue">Local · Bodega</Badge>
                              ) : z.rate !== flat ? (
                                <Badge tone="amber">Tarifa especial</Badge>
                              ) : null}
                              {dirty && <Badge tone="amber">Sin guardar</Badge>}
                            </b>
                            <span>{z.active ? 'Habilitado para compras' : 'Desactivado temporalmente'}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ width: 180 }}>
                        {canEdit ? (
                          <MoneyInput
                            value={z.rate}
                            onChange={(n) => set(z.id, { rate: n })}
                            aria-label={`Tarifa ${z.department}`}
                          />
                        ) : (
                          <span className="money">{money(z.rate)}</span>
                        )}
                      </td>
                      <td>
                        {canEdit ? (
                          <div className="bo-row" style={{ gap: 8, alignItems: 'center' }}>
                            <Select
                              sm
                              value={`${z.daysMin}-${z.daysMax}`}
                              onChange={(e) => {
                                const [min, max] = e.target.value.split('-').map(Number);
                                set(z.id, { daysMin: min, daysMax: max });
                              }}
                              style={{ maxWidth: 210 }}
                            >
                              <option value="1-2">1 a 2 días hábiles (Express)</option>
                              <option value="2-3">2 a 3 días hábiles</option>
                              <option value="2-4">2 a 4 días hábiles (Estándar)</option>
                              <option value="3-5">3 a 5 días hábiles</option>
                              <option value="4-7">4 a 7 días hábiles (Especial)</option>
                              {![ '1-2', '2-3', '2-4', '3-5', '4-7' ].includes(`${z.daysMin}-${z.daysMax}`) && (
                                <option value={`${z.daysMin}-${z.daysMax}`}>
                                  {z.daysMin} a {z.daysMax} días hábiles (Personalizado)
                                </option>
                              )}
                            </Select>
                          </div>
                        ) : (
                          `${z.daysMin} a ${z.daysMax} días hábiles`
                        )}
                      </td>
                      <td className="c">
                        <Toggle
                          small
                          checked={z.codAvailable}
                          disabled={!canEdit}
                          onChange={(v) => set(z.id, { codAvailable: v })}
                        />
                      </td>
                      <td className="c">
                        <Toggle
                          small
                          checked={z.active}
                          disabled={!canEdit}
                          onChange={(v) => set(z.id, { active: v })}
                        />
                      </td>
                      <td className="w-act" onClick={(e) => e.stopPropagation()}>
                        <div className="bo-row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon="edit"
                            onClick={() => setEditZone(z)}
                            title={`Editar detalles de ${z.department}`}
                          >
                            Editar
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
        <div className="bo-card-foot small muted" style={{ justifyContent: 'flex-start', gap: 6 }}>
          <Icon name="info" size={14} />
          <span>
            Cada pedido en la tienda liquida la tarifa de su departamento. Si una compra alcanza los {money(free)}, el envío se liquida en $0 automáticamente.
          </span>
        </div>
      </Card>

      {/* Save Bar Global */}
      <SaveBar
        dirty={totalDirty > 0}
        saving={saving}
        label={`${plural(totalDirty, 'cambio sin guardar', 'cambios sin guardar')} en tarifas y departamentos`}
        onSave={saveAll}
        onDiscard={discardAll}
      />

      {/* Drawer de Simulación en Vivo */}
      {simOpen && (
        <Drawer
          open
          onClose={() => setSimOpen(false)}
          size="md"
          title="Simulador de Checkout"
          subtitle="Verifica exactamente cómo se liquida el envío y qué opciones ve el comprador al pagar."
        >
          <SimulatorDrawerContent
            zones={rows}
            free={free}
            flat={flat}
            onClose={() => setSimOpen(false)}
          />
        </Drawer>
      )}

      {/* Drawer para editar departamento individual */}
      {editZone && (
        <Drawer
          open
          onClose={() => setEditZone(null)}
          size="md"
          title={`Configuración de ${editZone.department}`}
          subtitle="Ajusta la tarifa, días de entrega y disponibilidad de contraentrega para este destino."
        >
          <ZoneEditDrawerContent
            zone={editZone}
            flatRate={flat}
            onSave={(patch) => {
              set(editZone.id, patch);
              setEditZone(null);
              toast(`Cambios de ${editZone.department} listos para guardar.`);
            }}
            onClose={() => setEditZone(null)}
          />
        </Drawer>
      )}

      {/* Modal de Tarifa Masiva */}
      {bulkRateOpen && (
        <Drawer
          open
          onClose={() => setBulkRateOpen(false)}
          title="Aplicar Tarifa Masiva"
          subtitle={`Se cambiará la tarifa de envío para los ${sel.size} departamentos seleccionados.`}
        >
          <div className="bo-stack" style={{ gap: 18 }}>
            <Field label="Nueva tarifa de envío">
              <MoneyInput value={bulkRateVal} onChange={setBulkRateVal} autoFocus />
            </Field>
            <div className="bo-chips">
              {[8000, 10000, 12000, 14000, 16000].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={cls('bo-chip', bulkRateVal === n && 'is-active')}
                  onClick={() => setBulkRateVal(n)}
                >
                  {money(n)}
                </button>
              ))}
            </div>
            <div className="bo-box bo-box--subtle">
              <span className="small muted">
                Se actualizarán {sel.size} departamentos en pantalla. Recuerda hacer clic en Guardar cambios al terminar.
              </span>
            </div>
            <div className="bo-row" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" onClick={() => setBulkRateOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                icon="check"
                onClick={() => {
                  setMany({ rate: bulkRateVal });
                  setBulkRateOpen(false);
                }}
              >
                Aplicar a {sel.size} departamentos
              </Button>
            </div>
          </div>
        </Drawer>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Drawer interactivo del Simulador de Compra
// ---------------------------------------------------------------------------
function SimulatorDrawerContent({ zones, free, flat, onClose }: { zones: Z[]; free: number; flat: number; onClose: () => void }) {
  const sorted = useMemo(
    () => [...zones].sort((a, b) => {
      if (norm(a.department).includes('bogota')) return -1;
      if (norm(b.department).includes('bogota')) return 1;
      return a.department.localeCompare(b.department, 'es');
    }),
    [zones]
  );

  const [dep, setDep] = useState(sorted[0]?.department ?? '');
  const [sub, setSub] = useState(60000);

  const z = zones.find((x) => x.department === dep);
  const own = !!z?.active;
  const rate = own ? z!.rate : flat;
  const isFree = free > 0 && sub >= free;
  const ship = isFree ? 0 : rate;
  const total = sub + ship;

  const progress = free > 0 ? Math.min(100, Math.round((sub / free) * 100)) : 100;
  const missing = free > sub ? free - sub : 0;

  return (
    <div className="bo-stack" style={{ gap: 20 }}>
      <div className="bo-box bo-box--subtle bo-stack" style={{ gap: 14 }}>
        <Field label="Departamento de entrega">
          <Select value={dep} onChange={(e) => setDep(e.target.value)}>
            {sorted.map((x) => (
              <option key={x.id} value={x.department}>
                {x.department} {norm(x.department).includes('bogota') ? '(Local)' : ''} · {money(x.rate)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Valor de la compra en frascos">
          <MoneyInput value={sub} onChange={setSub} />
        </Field>

        <div className="bo-chips">
          {[
            { label: '1 frasco ($24.000)', val: 24000 },
            { label: '2 frascos ($48.000)', val: 48000 },
            { label: '3 frascos ($72.000)', val: 72000 },
            { label: 'Combo 4 frascos ($96.000)', val: 96000 },
          ].map((item) => (
            <button
              key={item.val}
              type="button"
              className={cls('bo-chip', sub === item.val && 'is-active')}
              onClick={() => setSub(item.val)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Barra de Progreso de Envío Gratis */}
      {free > 0 && (
        <div className="bo-stack" style={{ gap: 8 }}>
          <div className="bo-between small">
            <span>Incentivo de envío gratis ({money(free)})</span>
            <b className={isFree ? 'bo-t-green' : undefined}>{progress}%</b>
          </div>
          <div className="bo-progress-track">
            <div
              className="bo-progress-bar"
              style={{
                width: `${progress}%`,
                background: isFree ? '#16a34a' : 'var(--brand)',
              }}
            />
          </div>
          <span className="small muted">
            {isFree ? (
              <span className="bo-t-green strong">
                ✓ ¡Tu pedido supera los {money(free)}! Recibes envío gratis automático.
              </span>
            ) : (
              <span>
                Al cliente le faltan <b>{money(missing)}</b> en frascos para no pagar envío.
              </span>
            )}
          </span>
        </div>
      )}

      {/* Recibo Simulado del Checkout */}
      <div className="bo-card" style={{ border: '1.5px solid #cbd5e1', boxShadow: 'var(--sh-2)' }}>
        <div className="bo-card-head" style={{ paddingBottom: 12 }}>
          <div>
            <h3>Simulación de Cobro en Tienda</h3>
            <p>Destino: <b>{dep}</b></p>
          </div>
          {isFree ? (
            <Badge tone="green" icon="checkCircle">Envío Gratis</Badge>
          ) : (
            <Badge tone="gray">Tarifa Estándar</Badge>
          )}
        </div>
        <div className="bo-card-body bo-stack" style={{ gap: 12, paddingTop: 12 }}>
          <div className="bo-between">
            <span className="muted">Subtotal frascos</span>
            <b className="tnum">{money(sub)}</b>
          </div>

          <div className="bo-between">
            <span className="muted">Costo de envío ({dep})</span>
            {isFree ? (
              <b className="bo-t-green" style={{ fontSize: 15 }}>¡GRATIS!</b>
            ) : (
              <b className="tnum">{money(ship)}</b>
            )}
          </div>

          <div className="bo-between small">
            <span className="muted">Tiempo de entrega prometido</span>
            <span>{own ? `${z!.daysMin} a ${z!.daysMax} días hábiles` : '2 a 4 días hábiles'}</span>
          </div>

          <div className="bo-between small">
            <span className="muted">Pago contraentrega en destino</span>
            {own && z!.codAvailable ? (
              <Badge tone="green" dot>Disponible al recibir</Badge>
            ) : (
              <Badge tone="gray">Solo pago digital previo</Badge>
            )}
          </div>

          <div className="bo-between" style={{ borderTop: '1.5px solid var(--line)', paddingTop: 12, marginTop: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Total a pagar</span>
            <b className="tnum" style={{ fontSize: 20, color: 'var(--brand-600)' }}>
              {money(total)}
            </b>
          </div>
        </div>
      </div>

      <div className="bo-row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
        <Button variant="secondary" onClick={onClose}>
          Cerrar simulador
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drawer para editar departamento individual
// ---------------------------------------------------------------------------
function ZoneEditDrawerContent({ zone, flatRate, onSave, onClose }: { zone: Z; flatRate: number; onSave: (p: Partial<Z>) => void; onClose: () => void }) {
  const [rate, setRate] = useState(zone.rate);
  const [daysMin, setDaysMin] = useState(zone.daysMin);
  const [daysMax, setDaysMax] = useState(zone.daysMax);
  const [cod, setCod] = useState(zone.codAvailable);
  const [active, setActive] = useState(zone.active);

  const isBogota = norm(zone.department).includes('bogota');

  return (
    <div className="bo-stack" style={{ gap: 20 }}>
      <div className="bo-box bo-box--subtle">
        <b style={{ fontSize: 15 }}>{zone.department}</b>
        <div style={{ marginTop: 4 }}>
          {isBogota ? (
            <Badge tone="blue">Mercado Local Bogotá</Badge>
          ) : (
            <Badge tone="gray">Destino Nacional</Badge>
          )}
        </div>
      </div>

      <Field label="Tarifa de envío para este departamento">
        <MoneyInput value={rate} onChange={setRate} />
      </Field>

      <div className="bo-chips">
        {[8000, 10000, 12000, flatRate].map((n) => (
          <button
            key={n}
            type="button"
            className={cls('bo-chip', rate === n && 'is-active')}
            onClick={() => setRate(n)}
          >
            {money(n)} {n === flatRate ? '(Estándar nacional)' : ''}
          </button>
        ))}
      </div>

      <Field label="Tiempo estimado de entrega (días hábiles)">
        <div className="bo-form-grid">
          <Field label="Días mínimos">
            <Input
              type="number"
              min={1}
              max={30}
              value={daysMin}
              onChange={(e) => setDaysMin(Number(e.target.value) || 1)}
            />
          </Field>
          <Field label="Días máximos">
            <Input
              type="number"
              min={daysMin}
              max={30}
              value={daysMax}
              onChange={(e) => setDaysMax(Number(e.target.value) || daysMin)}
            />
          </Field>
        </div>
      </Field>

      <div className="bo-box bo-stack" style={{ gap: 12 }}>
        <div className="bo-between">
          <div>
            <b style={{ display: 'block' }}>Habilitar pago contraentrega</b>
            <span className="small muted">El cliente puede pagar en efectivo o transferencia al recibir</span>
          </div>
          <Toggle checked={cod} onChange={setCod} />
        </div>

        <div className="bo-between" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <div>
            <b style={{ display: 'block' }}>Departamento activo en tienda</b>
            <span className="small muted">Si se desactiva, los clientes de esta zona pagan la tarifa por defecto</span>
          </div>
          <Toggle checked={active} onChange={setActive} />
        </div>
      </div>

      <div className="bo-row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          icon="check"
          onClick={() => onSave({ rate, daysMin, daysMax, codAvailable: cod, active })}
        >
          Aplicar cambios
        </Button>
      </div>
    </div>
  );
}
