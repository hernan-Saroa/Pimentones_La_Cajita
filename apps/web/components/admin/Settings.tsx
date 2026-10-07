'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api as publicApi } from '@/lib/api';
import { useAdmin, useCan } from './AdminShell';
import {
  Affix, Badge, Button, Card, EmptyState, Field, Icon, Input, LinkButton, PageHeader, PageSkeleton, SaveBar, Tabs, Textarea, cls, useUI, useUnsavedGuard, waLink, copyText, type IconName,
} from './kit';

/**
 * Centro de Configuración y Canales Oficiales:
 * - Canales de atención directa (WhatsApp, Correo, Teléfono, Instagram) con vista previa en vivo.
 * - Medios de pago en checkout (Wompi, Transferencia con plantillas de 1 clic, Contraentrega).
 * - Acceso a logística de envíos y auditoría de seguridad del servidor.
 */

const PRESET_TRANSFER_TEMPLATES = [
  {
    name: 'Bancolombia + Nequi',
    text: `BANCOLOMBIA (Cuenta de Ahorros)
Número: 123-456789-00
Titular: Pimentones La Cajita S.A.S.
NIT: 901.234.567-8

NEQUI / DAVIPLATA: 310 334 7621

Por favor envía el comprobante de pago por WhatsApp indicando el número de tu pedido para despachar de inmediato.`,
  },
  {
    name: 'Solo Nequi y Daviplata',
    text: `BILLETERAS DIGITALES (Acreditación inmediata)
Nequi: 310 334 7621
Daviplata: 310 334 7621
Titular: Pimentones La Cajita

Una vez transferido, adjunta el pantallazo al WhatsApp oficial de la tienda con tu nombre o referencia de pedido.`,
  },
  {
    name: 'Davivienda',
    text: `BANCO DAVIVIENDA (Cuenta de Ahorros)
Número: 0098-7654-3210
Titular: Pimentones La Cajita
C.C. / NIT: 901.234.567

Envíanos la foto o PDF del comprobante por WhatsApp para confirmar tu orden y preparar el despacho.`,
  },
  {
    name: 'Banco de Bogotá (Grupo Aval)',
    text: `BANCO DE BOGOTÁ (Cuenta Corriente)
Número: 456-789012-3
Titular: Pimentones La Cajita S.A.S.
NIT: 901.234.567-8

Recuerda enviar el comprobante de transferencia por nuestro WhatsApp para asignarle número de guía a tu envío.`,
  },
];

const cleanIg = (s: string) => s.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '');
const digits = (s: string) => (s || '').replace(/\D/g, '');

export function Settings() {
  const api = useAdmin();
  const can = useCan();
  const { toast, confirm } = useUI();

  const [orig, setOrig] = useState<Record<string, string> | null>(() => api.getCache?.('admin:settings') || null);
  const [s, setS] = useState<Record<string, string> | null>(() => api.getCache?.('admin:settings') || null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'contacto' | 'pagos' | 'envios' | 'integraciones'>('contacto');

  const editable = can('admin');

  const load = useCallback(() => {
    api.settings()
      .then((r) => {
        setOrig(r);
        setS(r);
        setError('');
      })
      .catch((e: Error) => setError(e.message));
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  // Medios de pago reales que ofrece el checkout público
  const [methods, setMethods] = useState<string[] | null>(null);
  useEffect(() => {
    publicApi.store().then((x) => setMethods(x.paymentMethods)).catch(() => setMethods(null));
  }, []);

  const dirty = !!s && !!orig && JSON.stringify(s) !== JSON.stringify(orig);
  useUnsavedGuard(dirty);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!s) return e;
    const wa = digits(s.whatsapp);
    if (s.whatsapp && !(wa.length === 12 && wa.startsWith('57')) && !(wa.length === 10 && wa.startsWith('3'))) {
      e.whatsapp = 'Escribe un celular colombiano de 10 dígitos (ej: 3103347621) o con indicativo (573103347621).';
    }
    if (s.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.contact_email)) {
      e.contact_email = 'Escribe un correo electrónico válido.';
    }
    if (s.transfer_instructions && s.transfer_instructions.length > 1000) {
      e.transfer_instructions = 'Máximo 1.000 caracteres para las instrucciones.';
    }
    return e;
  }, [s]);

  if (error) {
    return (
      <>
        <PageHeader title="Configuración de la tienda" />
        <Card>
          <EmptyState icon="alert" title="No pudimos cargar los ajustes" action={<Button onClick={load}>Reintentar</Button>}>
            {error}
          </EmptyState>
        </Card>
      </>
    );
  }

  if (!s) return <PageSkeleton />;

  const set = (k: string, v: string) => setS((x) => x && ({ ...x, [k]: v }));

  const save = async () => {
    if (Object.keys(errors).length) {
      toast('Revisa los campos señalados antes de guardar.', 'error');
      return;
    }
    const wa = digits(s.whatsapp);
    const body = {
      ...s,
      whatsapp: wa.length === 10 ? `57${wa}` : wa,
      instagram: cleanIg(s.instagram || ''),
    };
    setSaving(true);
    try {
      const r = await api.saveSettings(body);
      setOrig(r);
      setS(r);
      toast('Ajustes y canales oficiales guardados correctamente');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
    setSaving(false);
  };

  const wa = digits(s.whatsapp);
  const waFull = wa.length === 10 ? `57${wa}` : wa;
  const ig = cleanIg(s.instagram || '');

  return (
    <>
      <PageHeader
        title="Configuración y Canales Oficiales"
        description="Gestiona las líneas de atención a clientes, medios de pago en el checkout y políticas operativas de la tienda."
        actions={
          editable && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={cls('bo-badge', dirty ? 'bo-badge--amber' : 'bo-badge--green')}>
                <i className={cls('bo-dot', dirty ? 'is-warn' : 'is-ok')} />
                {dirty ? 'Cambios pendientes por guardar' : 'Configuración al día'}
              </span>

              {dirty && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    if (await confirm({ title: '¿Descartar los cambios no guardados?', body: 'Se restablecerán los ajustes al último estado guardado.', confirm: 'Descartar cambios', danger: true })) {
                      setS(orig);
                    }
                  }}
                  disabled={saving}
                >
                  Descartar
                </Button>
              )}

              <Button
                variant="primary"
                icon="check"
                onClick={save}
                disabled={!dirty || saving || Object.keys(errors).length > 0}
                loading={saving}
              >
                {saving ? 'Guardando ajustes...' : dirty ? 'Guardar cambios' : 'Ajustes guardados'}
              </Button>
            </div>
          )
        }
      />

      {!editable && (
        <div className="bo-callout bo-callout--gray" style={{ marginBottom: 18 }}>
          <Icon name="lock" size={16} />
          Estás en modo solo lectura. Únicamente los administradores o el propietario pueden modificar la configuración de la tienda.
        </div>
      )}

      {/* Selector de pestañas premium */}
      <div style={{ marginBottom: 20 }}>
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as any)}
          items={[
            { value: 'contacto', label: 'Contacto' },
            { value: 'pagos', label: 'Pagos' },
            { value: 'envios', label: 'Envíos' },
            { value: 'integraciones', label: 'Seguridad' },
          ]}
        />
      </div>

      {/* PESTAÑA 1: CANALES DE ATENCIÓN Y CONTACTO */}
      {tab === 'contacto' && (
        <div className="bo-settings-split">
          <div className="bo-stack" style={{ gap: 20 }}>
            <Card
              title="Canales directos de atención"
              description="Estos datos alimentan el botón flotante de WhatsApp, el pie de página de la tienda y las plantillas de correo para clientes."
            >
              <div className="bo-form-grid">
                <Field
                  className="span-2"
                  label="WhatsApp oficial de la tienda"
                  error={errors.whatsapp}
                  hint={
                    !errors.whatsapp && waFull ? (
                      <>
                        Número configurado: <b>+{waFull.slice(0, 2)} {waFull.slice(2, 5)} {waFull.slice(5, 8)} {waFull.slice(8)}</b>
                        {' · '}
                        <a
                          className="bo-link"
                          href={waLink(waFull, 'Hola La Cajita, estoy probando la línea desde el administrador.')}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Probar chat ahora <Icon name="external" size={12} />
                        </a>
                      </>
                    ) : (
                      'Los clientes que tocan el botón flotante en la tienda abren un chat directo a este número.'
                    )
                  }
                >
                  <Affix icon="whatsapp">
                    <Input
                      inputMode="tel"
                      value={s.whatsapp || ''}
                      disabled={!editable}
                      aria-invalid={!!errors.whatsapp}
                      placeholder="3103347621 o 573103347621"
                      onChange={(e) => set('whatsapp', e.target.value)}
                    />
                  </Affix>
                </Field>

                <Field
                  label="Correo oficial de contacto"
                  error={errors.contact_email}
                  hint="Donde recibes las dudas enviadas desde el formulario de contacto."
                >
                  <Affix icon="mail">
                    <Input
                      type="email"
                      value={s.contact_email || ''}
                      disabled={!editable}
                      aria-invalid={!!errors.contact_email}
                      placeholder="contacto@pimentoneslacajita.com"
                      onChange={(e) => set('contact_email', e.target.value)}
                    />
                  </Affix>
                </Field>

                <Field
                  label="Teléfono fijo / PBX visible"
                  optional
                  hint="Como quieres que se lea en la tienda y facturas."
                >
                  <Affix icon="phone">
                    <Input
                      value={s.contact_phone || ''}
                      disabled={!editable}
                      placeholder="+57 310 334 7621"
                      onChange={(e) => set('contact_phone', e.target.value)}
                    />
                  </Affix>
                </Field>

                <Field
                  label="Ciudad / Sede del taller"
                  optional
                  hint="Aparece en el pie de página para brindar cercanía local."
                >
                  <Affix icon="pin">
                    <Input
                      value={s.contact_city || ''}
                      disabled={!editable}
                      placeholder="Bogotá, Colombia"
                      onChange={(e) => set('contact_city', e.target.value)}
                    />
                  </Affix>
                </Field>

                <Field
                  className="span-2"
                  label="Perfil oficial de Instagram"
                  optional
                  hint={
                    ig ? (
                      <>
                        Enlace verificado:{' '}
                        <a className="bo-link" href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer">
                          instagram.com/{ig} <Icon name="external" size={12} />
                        </a>
                      </>
                    ) : (
                      'Puedes escribir solo el usuario (@pimentones_la_cajita) o la dirección web completa.'
                    )
                  }
                >
                  <Affix pre="@">
                    <Input
                      value={s.instagram || ''}
                      disabled={!editable}
                      placeholder="pimentones_la_cajita"
                      onChange={(e) => set('instagram', e.target.value)}
                      onBlur={() => set('instagram', cleanIg(s.instagram || ''))}
                    />
                  </Affix>
                </Field>
              </div>
            </Card>
          </div>

          {/* Panel de Vista Previa Interactiva */}
          <div className="bo-stack" style={{ gap: 20 }}>
            <div className="bo-preview-panel">
              <div className="bo-preview-panel-title">
                <b>Vista previa: Botón de WhatsApp en Tienda</b>
                <Badge tone="green" dot>En Vivo</Badge>
              </div>

              {/* Mockup de la experiencia WhatsApp del cliente */}
              <div className="bo-wa-card">
                <div className="bo-wa-header">
                  <div className="bo-wa-avatar">LC</div>
                  <div>
                    <div className="bo-wa-title">Pimentones La Cajita</div>
                    <div className="bo-wa-sub">
                      <i className="bo-live" /> En línea habitualmente
                    </div>
                  </div>
                </div>

                <div className="bo-wa-body">
                  <div className="bo-wa-bubble">
                    ¡Hola! 👋 Vi sus conservas artesanales de pimentón ahumado en lacajita.co y quisiera hacer una consulta sobre mi pedido...
                    <div className="bo-wa-bubble-time">12:30 p.m. ✓✓</div>
                  </div>
                </div>

                <div className="bo-wa-footer">
                  <span className="small muted">Destino: <b>+{waFull || '573103347621'}</b></span>
                  {waFull ? (
                    <a
                      className="bo-btn bo-btn--sm bo-btn--primary"
                      style={{ background: '#25d366', borderColor: '#25d366', color: '#fff' }}
                      href={waLink(waFull, 'Hola, esto es una prueba del botón oficial de WhatsApp.')}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="whatsapp" size={14} /> Probar en vivo
                    </a>
                  ) : (
                    <Badge tone="amber">Ingresa tu WhatsApp</Badge>
                  )}
                </div>
              </div>

              {/* Mockup del Pie de Página de Confianza */}
              <div style={{ marginTop: 24 }}>
                <span className="small muted" style={{ display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Presencia en pie de página (Trust Bar)
                </span>
                <div style={{ background: '#2a2421', borderRadius: 12, padding: '16px 18px', color: '#fff' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.03em', color: '#e8c49a', marginBottom: 6 }}>
                    PIMENTONES LA CAJITA
                  </div>
                  <div style={{ fontSize: 12, color: '#d6cec7', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span>📍 {s.contact_city || 'Bogotá, Colombia'}</span>
                    <span>✉️ {s.contact_email || 'contacto@pimentoneslacajita.com'}</span>
                    <span>📞 {s.contact_phone || '+57 310 334 7621'}</span>
                    {ig && <span>📸 @{ig}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: MEDIOS DE PAGO Y CHECKOUT */}
      {tab === 'pagos' && (
        <div className="bo-stack" style={{ gap: 24 }}>
          {/* Tarjetas de estado de medios de pago */}
          <div className="bo-gateways-grid">
            <div className="bo-gateway-card">
              <div className="bo-gateway-header">
                <div className="bo-gateway-icon" style={{ background: 'var(--blue-50)', color: 'var(--blue)' }}>
                  <Icon name="card" size={20} />
                </div>
                {methods && methods.includes('wompi') ? (
                  <Badge tone="green" dot>Activo en checkout</Badge>
                ) : (
                  <Badge tone="amber" dot>Requiere llaves</Badge>
                )}
              </div>
              <div>
                <b style={{ fontSize: 14 }}>Pago en línea (Wompi)</b>
                <p className="small muted" style={{ margin: '4px 0 10px' }}>
                  PSE, Tarjeta de crédito, Débito, Nequi y Botón Bancolombia. La orden se aprueba automáticamente sin comprobante.
                </p>
                <div className="small faint">
                  {methods && methods.includes('wompi') ? 'Acreditación inmediata' : 'Se habilita definiendo WOMPI_PUBLIC_KEY en el servidor.'}
                </div>
              </div>
            </div>

            <div className="bo-gateway-card">
              <div className="bo-gateway-header">
                <div className="bo-gateway-icon" style={{ background: 'var(--violet-50)', color: 'var(--violet)' }}>
                  <Icon name="bank" size={20} />
                </div>
                <Badge tone="green" dot>Activo</Badge>
              </div>
              <div>
                <b style={{ fontSize: 14 }}>Transferencia manual</b>
                <p className="small muted" style={{ margin: '4px 0 10px' }}>
                  El cliente transfiere a tu cuenta bancaria o billetera digital y tú verificas el comprobante en Pedidos.
                </p>
                <div className="small faint">
                  Personaliza las instrucciones abajo con nuestras plantillas de 1 clic.
                </div>
              </div>
            </div>

            <div className="bo-gateway-card">
              <div className="bo-gateway-header">
                <div className="bo-gateway-icon" style={{ background: 'var(--amber-50)', color: 'var(--amber)' }}>
                  <Icon name="cash" size={20} />
                </div>
                <Badge tone="blue">Por departamento</Badge>
              </div>
              <div>
                <b style={{ fontSize: 14 }}>Pago contraentrega</b>
                <p className="small muted" style={{ margin: '4px 0 10px' }}>
                  El cliente paga en efectivo cuando la transportadora entrega en su domicilio.
                </p>
                <LinkButton href="/admin/envios" iconRight="arrowRight" size="sm">
                  Configurar en Envíos
                </LinkButton>
              </div>
            </div>
          </div>

          {/* Editor de Instrucciones de Transferencia Bancaria */}
          <div className="bo-settings-split">
            <Card
              title="Instrucciones para transferencia"
              description="Este mensaje exacto se muestra al cliente cuando selecciona 'Transferencia bancaria' en el carrito de compras."
            >
              <div className="bo-stack" style={{ gap: 14 }}>
                <Field
                  label="Texto de instrucciones bancarias"
                  counter={(s.transfer_instructions || '').length}
                  max={1000}
                  error={errors.transfer_instructions}
                  hint="Incluye banco, número y tipo de cuenta, titular, documento de identidad y canal para remitir el comprobante."
                >
                  <Textarea
                    rows={8}
                    value={s.transfer_instructions || ''}
                    maxLength={1000}
                    disabled={!editable}
                    placeholder="Escribe los datos bancarios de tu negocio..."
                    onChange={(e) => set('transfer_instructions', e.target.value)}
                  />
                </Field>

                <div>
                  <span className="small muted" style={{ fontWeight: 600 }}>
                    Plantillas rápidas recomendadas (haz clic para rellenar):
                  </span>
                  <div className="bo-preset-chips">
                    {PRESET_TRANSFER_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.name}
                        type="button"
                        className="bo-preset-chip"
                        onClick={() => {
                          set('transfer_instructions', tmpl.text);
                          toast(`Plantilla "${tmpl.name}" aplicada`);
                        }}
                      >
                        <Icon name="plus" size={12} /> {tmpl.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Vista previa en vivo del checkout */}
            <div className="bo-preview-panel">
              <div className="bo-preview-panel-title">
                <b>Así lo ve el cliente en el Checkout</b>
                <Badge tone="gray">Paso 3: Pago</Badge>
              </div>

              <div className="bo-checkout-voucher">
                <div className="bo-voucher-badge">
                  <Icon name="bank" size={15} /> Pago por Transferencia Bancaria
                </div>

                <div className="bo-voucher-content">
                  {s.transfer_instructions || (
                    <span className="faint">Aún no has redactado instrucciones de transferencia. Elige una plantilla a la izquierda.</span>
                  )}
                </div>

                {waFull && (
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534', fontSize: 12.5, fontWeight: 600 }}>
                      <Icon name="whatsapp" size={15} /> Recepción de comprobantes por WhatsApp
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        copyText(s.transfer_instructions || '');
                        toast('Instrucciones copiadas al portapapeles');
                      }}
                    >
                      <Icon name="copy" size={13} /> Copiar datos
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: POLÍTICAS DE DESPACHO Y LOGÍSTICA */}
      {tab === 'envios' && (
        <Card
          title="Políticas de despacho y fletes"
          description="Toda la matriz de tarifas, flete gratis por monto y cobertura de contraentrega se gestiona en el Hub Central de Envíos."
        >
          <div className="bo-stack" style={{ gap: 18, maxWidth: 640 }}>
            <div className="bo-callout bo-callout--green">
              <Icon name="truck" size={18} />
              <div>
                <b>Centro de Envíos Unificado</b>
                <p className="small" style={{ margin: '4px 0 0' }}>
                  El módulo de Envíos incluye simulador en tiempo real por departamento y municipio, permitiéndote calcular fletes exactos y tiempos de entrega antes de publicar.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <LinkButton href="/admin/envios" iconRight="arrowRight" variant="primary">
                Ir a Envíos y Cobertura Nacional
              </LinkButton>
            </div>
          </div>
        </Card>
      )}

      {/* PESTAÑA 4: SEGURIDAD Y SERVIDOR */}
      {tab === 'integraciones' && (
        <div className="bo-stack" style={{ gap: 20 }}>
          <Card
            title="Seguridad y Credenciales del Servidor"
            description="Por estándares internacionales de seguridad financiera (PCI-DSS), las llaves privadas de pago y correo se protegen en variables de entorno del servidor y nunca se exponen al navegador."
          >
            <div className="bo-list bo-box" style={{ padding: 0 }}>
              <div className="bo-list-item">
                <span className="bo-stat-icon" style={{ background: 'var(--blue-50)', color: 'var(--blue)' }}>
                  <Icon name="card" size={16} />
                </span>
                <div className="grow">
                  <b>Pasarela de Pago Wompi (Bancolombia)</b>
                  <div className="sub">Variables: WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY, WOMPI_EVENTS_SECRET</div>
                </div>
                {methods && methods.includes('wompi') ? (
                  <Badge tone="green" dot>Llaves conectadas</Badge>
                ) : (
                  <Badge tone="amber" dot>Pendiente en servidor</Badge>
                )}
              </div>

              <div className="bo-list-item">
                <span className="bo-stat-icon" style={{ background: 'var(--violet-50)', color: 'var(--violet)' }}>
                  <Icon name="mail" size={16} />
                </span>
                <div className="grow">
                  <b>Servicio de Correo Transaccional</b>
                  <div className="sub">Envía confirmaciones automáticas de compra, guías de despacho y avisos de contacto.</div>
                </div>
                <Badge tone="outline" icon="shield">Protegido</Badge>
              </div>

              <div className="bo-list-item">
                <span className="bo-stat-icon" style={{ background: 'var(--green-50)', color: 'var(--green)' }}>
                  <Icon name="database" size={16} />
                </span>
                <div className="grow">
                  <b>Base de datos PostgreSQL con Prisma</b>
                  <div className="sub">Almacenamiento transaccional de productos, inventario, pedidos y auditoría.</div>
                </div>
                <Badge tone="green" dot>Conectado</Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Barra flotante de guardado cuando hay cambios */}
      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={save}
        onDiscard={async () => {
          if (await confirm({ title: '¿Descartar los cambios realizados?', confirm: 'Descartar', danger: true })) {
            setS(orig);
          }
        }}
      />
    </>
  );
}
