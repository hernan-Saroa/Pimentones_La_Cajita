'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { triggerNavProgress } from '@/components/TopProgressBar';
import { getOrderHistory, saveOrderToHistory, removeOrderFromHistory, clearOrderHistory, type SavedOrder } from '@/lib/customerStorage';
import { cop, STATUS_LABEL, type CustomerOrderHistoryItem } from '@lacajita/shared';
import { api } from '@/lib/api';
import { useCart } from '@/store/cart';

export function TrackOrder() {
  const [ref, setRef] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SavedOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'email_otp' | 'search'>('search');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [reorderSuccess, setReorderSuccess] = useState<string | null>(null);

  // Estados para el flujo de Código de Verificación OTP por correo
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'request' | 'verify' | 'results'>('request');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);
  const [universalOrders, setUniversalOrders] = useState<CustomerOrderHistoryItem[]>([]);
  const [verifiedEmail, setVerifiedEmail] = useState('');

  const router = useRouter();
  const { add, setOpen: setCartOpen } = useCart();

  // Carga historial de pedidos guardados en este dispositivo
  useEffect(() => {
    const list = getOrderHistory();
    setHistory(list);
    if (list.length > 0) {
      setActiveTab('history');
    } else {
      setActiveTab('email_otp');
    }
  }, []);

  const handleCopy = (orderRef: string) => {
    try {
      navigator.clipboard.writeText(orderRef);
      setCopiedRef(orderRef);
      setTimeout(() => setCopiedRef(null), 2000);
    } catch {
      // Silencioso
    }
  };

  const handleRemove = (orderRef: string) => {
    if (confirm(`¿Quitar el pedido ${orderRef} del historial de este dispositivo?`)) {
      removeOrderFromHistory(orderRef);
      const updated = getOrderHistory();
      setHistory(updated);
      if (updated.length === 0) {
        setActiveTab('email_otp');
      }
    }
  };

  const handleClearAll = () => {
    if (confirm('¿Deseas borrar todo el historial de pedidos de este dispositivo?')) {
      clearOrderHistory();
      setHistory([]);
      setActiveTab('email_otp');
    }
  };

  const handleSubmitSearch = (targetRef: string, targetEmail: string) => {
    const cleanRef = targetRef.trim().toUpperCase();
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanRef || !cleanEmail) return;

    setLoading(true);
    triggerNavProgress();

    router.push(`/pedido/${cleanRef}?email=${encodeURIComponent(cleanEmail)}`);
  };

  // 1. Solicitar código OTP por correo
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail.trim()) return;

    setOtpLoading(true);
    setOtpError('');
    setOtpDevCode(null);

    try {
      const res = await api.requestHistoryOtp(otpEmail.trim().toLowerCase());
      if (res.devCode) {
        setOtpDevCode(res.devCode);
      }
      setOtpStep('verify');
    } catch (err) {
      setOtpError((err as Error).message || 'No se pudo enviar el código. Intenta nuevamente.');
    } finally {
      setOtpLoading(false);
    }
  };

  // 2. Verificar código OTP y cargar historial universal
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) return;

    setOtpLoading(true);
    setOtpError('');

    try {
      const res = await api.verifyHistoryOtp(otpEmail.trim().toLowerCase(), otpCode.trim());
      setUniversalOrders(res.orders);
      setVerifiedEmail(res.email);
      setOtpStep('results');

      // Guardar todos los pedidos verificados en el almacenamiento del dispositivo
      res.orders.forEach((o) => {
        saveOrderToHistory({
          reference: o.reference,
          email: res.email,
          date: o.createdAt,
          total: o.total,
          itemCount: o.items.reduce((acc, it) => acc + it.quantity, 0),
          itemsSummary: o.items.map((it) => `${it.quantity}x ${it.name}`).join(', '),
          status: o.status,
          city: o.city,
          department: o.department || undefined,
        });
      });
      setHistory(getOrderHistory());
    } catch (err) {
      setOtpError((err as Error).message || 'El código es inválido o expiró.');
    } finally {
      setOtpLoading(false);
    }
  };

  // 3. Reordenar con 1 clic: agrega los frascos al carrito y abre la gaveta
  const handleReorder = async (order: { reference: string; items?: { name: string; quantity: number; productId?: number | null }[] }) => {
    try {
      const products = await api.products();
      let addedCount = 0;

      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          const match = products.find((p) => (item.productId && p.id === item.productId) || p.name.toLowerCase() === item.name.toLowerCase());
          if (match) {
            add(match, item.quantity, false);
            addedCount += item.quantity;
          }
        });
      }

      setCartOpen(true);
      setReorderSuccess(`¡Se agregaron ${addedCount || 1} frascos del pedido ${order.reference} a tu carrito!`);
      setTimeout(() => setReorderSuccess(null), 4000);
    } catch {
      alert('No se pudieron agregar todos los productos al carrito.');
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <section className="track-section">
      <div className="track-container">
        {/* Cabecera de la sección */}
        <div className="track-header">
          <span className="track-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
            Rastreo en Vivo · Taller Artesanal
          </span>
          <h1 className="track-title">¿Dónde va tu pedido?</h1>
          <p className="track-subtitle">
            Consulta el progreso de tus compras en este equipo, solicita un código a tu correo para ver todo tu historial, o rastrea una referencia puntual.
          </p>
        </div>

        {/* Notificación de Reordenar con 1 Clic */}
        {reorderSuccess && (
          <div className="universal-history-banner" role="status" style={{ animation: 'fadeIn 0.3s ease' }}>
            <span>🛒 <strong>{reorderSuccess}</strong></span>
            <button
              type="button"
              className="track-recent-btn"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => setCartOpen(true)}
            >
              Ver Carrito →
            </button>
          </div>
        )}

        {/* Pestañas de Navegación */}
        <div className="track-tabs" role="tablist" aria-label="Opciones de consulta">
          {history.length > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'history'}
              className={`track-tab-btn ${activeTab === 'history' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <span>En este equipo</span>
              <span className="track-tab-badge">{history.length}</span>
            </button>
          )}

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'email_otp'}
            className={`track-tab-btn ${activeTab === 'email_otp' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('email_otp')}
          >
            <span>✉️ Todo mi historial por correo</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'search'}
            className={`track-tab-btn ${activeTab === 'search' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <span>🔍 Por referencia</span>
          </button>
        </div>

        {/* VISTA 1: Historial de pedidos locales */}
        {activeTab === 'history' && history.length > 0 && (
          <div className="track-history-container">
            {history.map((item) => {
              const statusKey = (item.status || 'pending') as keyof typeof STATUS_LABEL;
              const statusName = STATUS_LABEL[statusKey] || 'En proceso';

              return (
                <div key={item.reference} className="order-history-card">
                  {/* Encabezado */}
                  <div className="order-history-card-header">
                    <div className="order-ref-group">
                      <span className="order-ref-badge">{item.reference}</span>
                      <button
                        type="button"
                        className="order-copy-btn"
                        onClick={() => handleCopy(item.reference)}
                        title="Copiar número de pedido"
                        aria-label="Copiar referencia"
                      >
                        {copiedRef === item.reference ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>¡Copiado!</span>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <span className={`order-status-pill status-${item.status || 'pending'}`}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                      {statusName}
                    </span>
                  </div>

                  {/* Resumen */}
                  <div className="order-history-grid">
                    <div className="order-grid-item">
                      <span className="order-grid-label">Fecha</span>
                      <span className="order-grid-val">{formatDate(item.date)}</span>
                    </div>

                    {item.total !== undefined && item.total > 0 && (
                      <div className="order-grid-item">
                        <span className="order-grid-label">Total</span>
                        <span className="order-grid-val" style={{ color: '#8b1e1e' }}>{cop(item.total)}</span>
                      </div>
                    )}

                    {item.city && (
                      <div className="order-grid-item">
                        <span className="order-grid-label">Destino</span>
                        <span className="order-grid-val">📍 {item.city}</span>
                      </div>
                    )}

                    <div className="order-grid-item">
                      <span className="order-grid-label">Correo</span>
                      <span className="order-grid-val" style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{item.email}</span>
                    </div>
                  </div>

                  {item.itemsSummary && (
                    <div className="order-history-summary">
                      <strong>Contenido:</strong> {item.itemsSummary}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="order-history-actions" style={{ flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="order-track-action-btn"
                        disabled={loading}
                        onClick={() => handleSubmitSearch(item.reference, item.email)}
                      >
                        <span>Ver seguimiento en vivo</span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        className="order-reorder-btn"
                        onClick={() => handleReorder(item)}
                        title="Agregar estos mismos frascos a tu carrito"
                      >
                        <span>🛒 Repetir este pedido</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      className="order-remove-btn"
                      onClick={() => handleRemove(item.reference)}
                      title="Quitar este pedido de la lista en este equipo"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Opciones al pie */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', padding: '0.5rem 0.2rem' }}>
              <button
                type="button"
                className="link-btn"
                style={{ fontSize: '0.85rem', color: '#8b1e1e', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setActiveTab('email_otp')}
              >
                ¿Quieres ver pedidos hechos desde tu celular u otro equipo? Consultar por correo →
              </button>

              <button
                type="button"
                style={{ fontSize: '0.8rem', color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={handleClearAll}
              >
                Borrar historial de este equipo
              </button>
            </div>
          </div>
        )}

        {/* VISTA 2: Historial Universal por Correo con OTP */}
        {activeTab === 'email_otp' && (
          <div className="otp-card">
            {otpStep === 'request' && (
              <form onSubmit={handleRequestOtp}>
                <div className="otp-header">
                  <h2>Accede a todo tu historial de compras</h2>
                  <p>
                    Ingresa el correo con el que has comprado en Pimentones La Cajita. Te enviaremos un código de seguridad para ver todas tus compras sin necesidad de contraseñas.
                  </p>
                </div>

                {otpError && <p className="notice notice-error" style={{ marginBottom: '1.25rem' }}>{otpError}</p>}

                <div className="track-field-group">
                  <label htmlFor="otp-email" className="track-label">
                    <span>Correo electrónico de tus compras</span>
                  </label>
                  <div className="track-input-wrap">
                    <span className="track-input-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </span>
                    <input
                      id="otp-email"
                      required
                      type="email"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value.trim().toLowerCase())}
                      placeholder="tu.correo@ejemplo.com"
                      autoComplete="email"
                      className="track-input"
                      disabled={otpLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || !otpEmail.trim()}
                  className={`track-submit-btn ${otpLoading ? 'is-loading' : ''}`}
                >
                  {otpLoading ? 'Enviando código...' : 'Enviar código de acceso seguro →'}
                </button>
              </form>
            )}

            {otpStep === 'verify' && (
              <form onSubmit={handleVerifyOtp}>
                <div className="otp-header">
                  <h2>Ingresa tu código de 6 dígitos</h2>
                  <p>
                    Enviamos un código de verificación a <strong>{otpEmail}</strong>. Revisa tu bandeja de entrada o spam.
                  </p>
                </div>

                {otpDevCode && (
                  <div style={{ textAlign: 'center' }}>
                    <span className="otp-dev-badge">
                      🧪 Modo pruebas: Tu código es <strong>{otpDevCode}</strong>
                    </span>
                  </div>
                )}

                {otpError && <p className="notice notice-error" style={{ marginBottom: '1.25rem' }}>{otpError}</p>}

                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="otp-code-input"
                  disabled={otpLoading}
                />

                <button
                  type="submit"
                  disabled={otpLoading || otpCode.length !== 6}
                  className={`track-submit-btn ${otpLoading ? 'is-loading' : ''}`}
                >
                  {otpLoading ? 'Validando con el fogón...' : 'Ver mis pedidos →'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="link-btn"
                    style={{ fontSize: '0.85rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => {
                      setOtpStep('request');
                      setOtpCode('');
                      setOtpError('');
                    }}
                  >
                    ← Cambiar correo o reenviar código
                  </button>
                </div>
              </form>
            )}

            {otpStep === 'results' && (
              <div>
                <div className="universal-history-banner">
                  <div>
                    <span>✨ Historial verificado para <strong>{verifiedEmail}</strong></span>
                    <div style={{ fontSize: '0.82rem', color: '#276749', marginTop: 2 }}>
                      Encontramos {universalOrders.length} {universalOrders.length === 1 ? 'pedido registrado' : 'pedidos registrados'}. Se han sincronizado en este equipo.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="track-recent-btn"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    onClick={() => {
                      setOtpStep('request');
                      setOtpCode('');
                      setUniversalOrders([]);
                    }}
                  >
                    Cerrar sesión
                  </button>
                </div>

                <div className="track-history-container">
                  {universalOrders.map((o) => {
                    const statusKey = o.status as keyof typeof STATUS_LABEL;
                    const statusName = STATUS_LABEL[statusKey] || 'En proceso';

                    return (
                      <div key={o.reference} className="order-history-card">
                        <div className="order-history-card-header">
                          <div className="order-ref-group">
                            <span className="order-ref-badge">{o.reference}</span>
                            <button
                              type="button"
                              className="order-copy-btn"
                              onClick={() => handleCopy(o.reference)}
                              title="Copiar referencia"
                            >
                              {copiedRef === o.reference ? (
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>¡Copiado!</span>
                              ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                </svg>
                              )}
                            </button>
                          </div>

                          <span className={`order-status-pill status-${o.status}`}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                            {statusName}
                          </span>
                        </div>

                        <div className="order-history-grid">
                          <div className="order-grid-item">
                            <span className="order-grid-label">Fecha</span>
                            <span className="order-grid-val">{formatDate(o.createdAt)}</span>
                          </div>
                          <div className="order-grid-item">
                            <span className="order-grid-label">Total</span>
                            <span className="order-grid-val" style={{ color: '#8b1e1e' }}>{cop(o.total)}</span>
                          </div>
                          <div className="order-grid-item">
                            <span className="order-grid-label">Destino</span>
                            <span className="order-grid-val">📍 {o.city}</span>
                          </div>
                          {o.tracking && (
                            <div className="order-grid-item">
                              <span className="order-grid-label">Guía transportadora</span>
                              <span className="order-grid-val" style={{ fontSize: '0.85rem' }}>🚚 {o.tracking}</span>
                            </div>
                          )}
                        </div>

                        {o.items && o.items.length > 0 && (
                          <div className="order-history-summary">
                            <strong>Frascos pedidos:</strong>{' '}
                            {o.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                          </div>
                        )}

                        <div className="order-history-actions" style={{ flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="order-track-action-btn"
                            onClick={() => handleSubmitSearch(o.reference, verifiedEmail)}
                          >
                            <span>Ver seguimiento en tiempo real</span>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <polyline points="12 5 19 12 12 19" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            className="order-reorder-btn"
                            onClick={() => handleReorder(o)}
                            title="Agregar estos mismos frascos a tu carrito"
                          >
                            <span>🛒 Repetir este pedido</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VISTA 3: Formulario de búsqueda directa por referencia */}
        {activeTab === 'search' && (
          <div className="track-card">
            <form
              className="track-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitSearch(ref, email);
              }}
            >
              <div className="track-field-group">
                <label htmlFor="track-ref" className="track-label">
                  <span>Número de pedido</span>
                  <span className="track-hint">Empieza por LC (ej: LC261005-C8327C)</span>
                </label>
                <div className="track-input-wrap">
                  <span className="track-input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="14" x="2" y="5" rx="2" />
                      <line x1="2" x2="22" y1="10" y2="10" />
                    </svg>
                  </span>
                  <input
                    id="track-ref"
                    required
                    disabled={loading}
                    value={ref}
                    onChange={(e) => setRef(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="LC261005-C8327C"
                    autoCapitalize="characters"
                    autoComplete="off"
                    className="track-input"
                  />
                </div>
              </div>

              <div className="track-field-group">
                <label htmlFor="track-email" className="track-label">
                  <span>Correo de la compra</span>
                  <span className="track-hint">El correo al que enviamos tu factura</span>
                </label>
                <div className="track-input-wrap">
                  <span className="track-input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    id="track-email"
                    required
                    type="email"
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                    placeholder="tu.correo@ejemplo.com"
                    autoComplete="email"
                    className="track-input"
                  />
                </div>
              </div>

              {/* Botón de Consulta con Feedback Inmediato */}
              <button
                type="submit"
                disabled={loading || !ref.trim() || !email.trim()}
                className={`track-submit-btn ${loading ? 'is-loading' : ''}`}
              >
                {loading ? (
                  <>
                    <span className="track-spinner" aria-hidden="true" />
                    <span>Consultando en el fogón...</span>
                  </>
                ) : (
                  <>
                    <span>Consultar estado en vivo</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Micro-garantías de seguridad */}
            <div className="track-footer-meta">
              <div className="track-meta-item">
                <span className="track-meta-icon">🔒</span>
                <span>Consulta privada y segura bajo Ley 1581 (Habeas Data).</span>
              </div>
              <div className="track-meta-item">
                <span className="track-meta-icon">🚚</span>
                <span>Seguimiento directo con transportadoras aliadas a toda Colombia.</span>
              </div>
            </div>
          </div>
        )}

        {/* Asistencia directa por WhatsApp */}
        <div className="track-help-card">
          <div className="track-help-text">
            <strong>¿No encuentras tu número de pedido?</strong>
            <p>Escríbenos directamente a nuestro WhatsApp oficial y con tu nombre o cédula te recordamos la referencia de inmediato.</p>
          </div>
          <a
            href="https://wa.me/573103347621?text=Hola%20taller%20La%20Cajita,%20necesito%20ayuda%20para%20conocer%20el%20n%C3%BAmero%20y%20estado%20de%20mi%20pedido."
            target="_blank"
            rel="noreferrer"
            className="track-wa-link"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.01-1.24-.74-.66-1.25-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.02 2.6c.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.18-.47-.3" />
            </svg>
            <span>Consultar por WhatsApp</span>
          </a>
        </div>
      </div>
    </section>
  );
}
