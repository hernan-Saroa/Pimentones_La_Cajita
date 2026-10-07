'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cop, CITIES, DEPARTAMENTOS, searchCities, departmentOf, type StoreInfo, type PaymentMethod, type Quote } from '@lacajita/shared';
import { api } from '@/lib/api';
import { trackOnce, sessionId } from '@/lib/track';
import { useCart, cartTotals, type CartLine } from '@/store/cart';
import { Back, Chevron, Lock } from './icons';
import {
  getCustomerProfile,
  saveCustomerAddress,
  clearCustomerData,
  saveOrderToHistory,
  type SavedAddress,
} from '@/lib/customerStorage';

const SAVED = 'lacajita.customer';
const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const METHODS: Record<PaymentMethod, { title: string; desc: string; badge?: string }> = {
  wompi: { title: 'Pagar ahora en línea', desc: 'Con tarjeta, PSE, Nequi o Bancolombia. Te llevamos a la página segura de Wompi y vuelves aquí.', badge: 'Más rápido' },
  transfer: { title: 'Transferencia bancaria', desc: 'Te enviamos los datos por WhatsApp. Despachamos cuando llegue el pago.' },
  cod: { title: 'Pagar al recibir', desc: 'Pagas en efectivo cuando te entreguen. Sujeto a cobertura de la transportadora.' },
};
const STEPS = ['Tus datos', 'Entrega', 'Pago'];
type Form = { name: string; email: string; phone: string; doc: string; address: string; address2: string; city: string; department: string; notes: string };
const EMPTY: Form = { name: '', email: '', phone: '', doc: '', address: '', address2: '', city: '', department: '', notes: '' };
type Errors = Partial<Record<keyof Form, string>>;

/** Validación por paso con mensajes en lenguaje sencillo. */
function validate(f: Form, step: number): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (f.name.trim().length < 3) e.name = 'Escribe tu nombre y apellido.';
    if (!/^\d{10}$/.test(f.phone.replace(/\D/g, ''))) e.phone = 'Escribe un celular de 10 dígitos, por ejemplo 300 123 4567.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Revisa el correo: debe tener una @ y un punto, como ana@gmail.com.';
  }
  if (step === 1) {
    if (f.city.trim().length < 2) e.city = 'Escribe la ciudad o el municipio.';
    if (!f.department) e.department = 'Elige el departamento.';
    if (f.address.trim().length < 5) e.address = 'Escribe la dirección completa, por ejemplo Calle 45 # 12-30.';
  }
  return e;
}
const load = (): { f: Form; prefilled: boolean } => { try { const s = localStorage.getItem(SAVED); return { f: { ...EMPTY, ...(s ? JSON.parse(s) : {}) }, prefilled: Boolean(s) }; } catch { return { f: EMPTY, prefilled: false }; } };

export function Checkout() {
  const { lines, clear, gift } = useCart();
  const { subtotal, count } = cartTotals(lines);
  const router = useRouter();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [prefilled, setPrefilled] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [errors, setErrors] = useState<Errors>({});
  const [remember, setRemember] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sumOpen, setSumOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState('');
  const [quoting, setQuoting] = useState(false);
  const top = useRef<HTMLElement>(null);

  useEffect(() => {
    const profile = getCustomerProfile();
    if (profile && (profile.name || profile.email)) {
      setPrefilled(true);
      const addrs = profile.addresses || [];
      setSavedAddresses(addrs);
      const defaultAddr = addrs.find((a) => a.id === profile.defaultAddressId) || addrs[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        setF({
          name: profile.name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          doc: profile.doc || '',
          address: defaultAddr.address || '',
          address2: defaultAddr.address2 || '',
          city: defaultAddr.city || '',
          department: defaultAddr.department || '',
          notes: defaultAddr.notes || '',
        });
      } else {
        setF({
          ...EMPTY,
          name: profile.name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          doc: profile.doc || '',
        });
      }
    } else {
      const l = load();
      setF(l.f);
      setPrefilled(l.prefilled);
    }

    setReady(true);
    api.store().then((s) => { setStore(s); setMethod(s.paymentMethods[0]); }).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { if (ready && lines.length) trackOnce('checkout', 'begin_checkout', { value: subtotal }); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (step > 0) top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [step]);

  // Envío, entrega estimada, contraentrega y cupón los decide el servidor con la misma lógica que cobra.
  useEffect(() => {
    if (!ready || lines.length === 0 || !f.department) { setQuote(null); return; }
    let alive = true; setQuoting(true);
    api.quote({ items: lines.map((l) => ({ productId: l.id, quantity: l.qty })), department: f.department, coupon: couponApplied })
      .then((q) => { if (alive) setQuote(q); }).catch(() => { if (alive) setQuote(null); }).finally(() => { if (alive) setQuoting(false); });
    return () => { alive = false; };
  }, [ready, lines, f.department, couponApplied]);
  useEffect(() => { if (quote && method === 'cod' && !quote.codAvailable) setMethod(store?.paymentMethods.find((m) => m !== 'cod') ?? 'transfer'); }, [quote, method, store]);
  const shipping = quote ? quote.shipping : null;
  const total = quote ? quote.total : subtotal;

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); if (errors[k]) setErrors({ ...errors, [k]: undefined }); };
  const setCity = (city: string) => { const dep = departmentOf(city); setF({ ...f, city, department: dep || f.department }); setErrors({ ...errors, city: undefined, department: dep ? undefined : errors.department }); };
  const next = () => {
    const e = validate(f, step); setErrors(e);
    if (Object.keys(e).length) { (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus(); return; }
    setStep(step + 1);
  };

  if (!ready) return <section className="section narrow"><p className="muted">Cargando…</p></section>;
  if (lines.length === 0) {
    return (
      <section className="section narrow">
        <h1 className="h-page">Tu carrito está vacío</h1>
        <p>Elige tus frascos y vuelve aquí para pagar.</p>
        <Link href="/#tienda" className="btn btn-red btn-lg">Ver los frascos</Link>
      </section>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step < 2) return next();
    setError(''); setSending(true);
    try {
      const address = f.address2.trim() ? `${f.address.trim()}, ${f.address2.trim()}` : f.address.trim();
      const giftPrefix = gift?.isGift
        ? `[🎁 PEDIDO DE REGALO]\nPara: ${gift.recipient || 'Alguien especial'}\nDe parte de: ${gift.sender || 'Anónimo'}\nDedicatoria: "${gift.message || 'Con mucho cariño.'}"`
        : '';
      const notes = [giftPrefix, f.notes.trim()].filter(Boolean).join('\n\n');
      const res = await api.createOrder({ items: lines.map((l) => ({ productId: l.id, quantity: l.qty })), paymentMethod: method, coupon: quote?.coupon?.code ?? '', sessionId: sessionId(),
        customer: { name: f.name, email: f.email, phone: f.phone, doc: f.doc, address, city: f.city, department: f.department, notes } });

      // Guardar pedido en el historial del dispositivo
      saveOrderToHistory({
        reference: res.reference,
        email: f.email,
        date: new Date().toISOString(),
        total: total,
        itemCount: count,
        itemsSummary: lines.map((l) => `${l.qty}x ${l.name}`).join(', '),
        status: method === 'wompi' ? 'pending' : 'pending',
        city: f.city,
        department: f.department,
      });

      try {
        sessionStorage.setItem(`lacajita.order.${res.reference}`, f.email);
        if (remember) {
          saveCustomerAddress(
            {
              label: 'Dirección habitual',
              address: f.address,
              address2: f.address2,
              city: f.city,
              department: f.department,
              notes: f.notes,
              isDefault: true,
            },
            {
              name: f.name,
              email: f.email,
              phone: f.phone,
              doc: f.doc,
            }
          );
        } else {
          clearCustomerData();
        }
      } catch { /* sin almacenamiento */ }
      // Con pago en línea el carrito se conserva hasta que Wompi apruebe (por si el cliente vuelve sin pagar).
      if (res.paymentUrl) window.location.assign(res.paymentUrl);
      else { clear(); router.push(`/pedido/${res.reference}?email=${encodeURIComponent(f.email)}`); }
    } catch (err) { setError((err as Error).message); setSending(false); }
  }

  const Err = ({ k }: { k: keyof Form }) => errors[k] ? <span className="ferr" id={`err-${k}`} role="alert">{errors[k]}</span> : null;
  const inv = (k: keyof Form) => ({ 'aria-invalid': errors[k] ? ('true' as const) : undefined, 'aria-describedby': errors[k] ? `err-${k}` : undefined });

  return (
    <section className="section checkout" ref={top}>
      <form className="checkout-form" onSubmit={submit} noValidate>
        <Link href="/" className="back" onClick={(e) => { if (step > 0) { e.preventDefault(); setStep(step - 1); } }}><Back width={18} height={18} /> {step === 0 ? 'Seguir comprando' : 'Atrás'}</Link>
        <ol className="steps-nav" aria-label="Pasos de la compra">
          {STEPS.map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''} aria-current={i === step ? 'step' : undefined}><span className="dot">{i < step ? '✓' : i + 1}</span><span>{s}</span></li>)}
        </ol>
        <button type="button" className="sum-toggle" onClick={() => setSumOpen(!sumOpen)} aria-expanded={sumOpen}>
          <span>{count} {count === 1 ? 'frasco' : 'frascos'} · <b>{cop(total)}</b>{shipping === null ? ' + envío' : ''}</span>
          <span className="sum-link">{sumOpen ? 'Ocultar' : 'Ver pedido'} <Chevron width={16} height={16} /></span>
        </button>
        {sumOpen && <Summary lines={lines} subtotal={subtotal} shipping={shipping} quote={quote} className="summary mobile" />}

        {step === 0 && (
          <fieldset className="step">
            <legend className="h-page">¿A quién le enviamos?</legend>
            {prefilled && f.name && (
              <div className="checkout-welcome-banner" role="status">
                <span className="checkout-welcome-text">
                  👋 ¡Hola de nuevo, <strong>{f.name.split(' ')[0]}</strong>! Hemos cargado tus datos de compra.
                </span>
                <button
                  type="button"
                  className="link-btn"
                  style={{ fontSize: '0.85rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#8b1e1e', fontWeight: 600 }}
                  onClick={() => {
                    setF(EMPTY);
                    setPrefilled(false);
                    setSavedAddresses([]);
                    setSelectedAddressId('new');
                    clearCustomerData();
                  }}
                >
                  Empezar de cero
                </button>
              </div>
            )}
            <label className="field">Nombre y apellido<input value={f.name} onChange={set('name')} autoComplete="name" autoFocus {...inv('name')} /><Err k="name" /></label>
            <label className="field">Celular<input value={f.phone} onChange={set('phone')} inputMode="numeric" autoComplete="tel-national" placeholder="300 123 4567" {...inv('phone')} /><span className="fhelp">Te escribimos por WhatsApp si hay alguna novedad con la entrega.</span><Err k="phone" /></label>
            <label className="field">Correo<input value={f.email} onChange={set('email')} type="email" inputMode="email" autoComplete="email" autoCapitalize="off" placeholder="ana@gmail.com" {...inv('email')} /><span className="fhelp">Ahí te llega la confirmación del pedido.</span><Err k="email" /></label>
          </fieldset>
        )}
        {step === 1 && (
          <fieldset className="step">
            <legend className="h-page">¿A dónde lo enviamos?</legend>

            {savedAddresses.length > 0 && (
              <div className="checkout-saved-address-section">
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#666', marginBottom: '0.6rem' }}>
                  Elige una dirección habitual o ingresa una nueva:
                </div>

                {savedAddresses.map((addr) => {
                  const isSel = selectedAddressId === addr.id;
                  return (
                    <div
                      key={addr.id}
                      className={`checkout-address-card ${isSel ? 'is-selected' : ''}`}
                      onClick={() => {
                        setSelectedAddressId(addr.id);
                        setF({
                          ...f,
                          address: addr.address,
                          address2: addr.address2 || '',
                          city: addr.city,
                          department: addr.department,
                          notes: addr.notes || f.notes,
                        });
                        setErrors({ ...errors, address: undefined, city: undefined, department: undefined });
                      }}
                    >
                      <input
                        type="radio"
                        name="saved_address"
                        checked={isSel}
                        onChange={() => {}}
                        className="checkout-address-radio"
                      />
                      <div className="checkout-address-details">
                        <div className="checkout-address-title">
                          <span>🏠 {addr.label || 'Dirección habitual'}</span>
                          {addr.isDefault && <span className="checkout-address-badge">Principal</span>}
                        </div>
                        <p className="checkout-address-text">
                          {addr.address} {addr.address2 ? `· ${addr.address2}` : ''}<br />
                          <strong>{addr.city}, {addr.department}</strong>
                        </p>
                      </div>
                    </div>
                  );
                })}

                <div
                  className={`checkout-address-card ${selectedAddressId === 'new' ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSelectedAddressId('new');
                    setF({ ...f, address: '', address2: '', city: '', department: '' });
                  }}
                >
                  <input
                    type="radio"
                    name="saved_address"
                    checked={selectedAddressId === 'new'}
                    onChange={() => {}}
                    className="checkout-address-radio"
                  />
                  <div className="checkout-address-details">
                    <div className="checkout-address-title">
                      <span>➕ Usar una dirección diferente</span>
                    </div>
                    <p className="checkout-address-text">
                      Escribe una nueva dirección para este pedido.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(selectedAddressId === 'new' || savedAddresses.length === 0) && (
              <>
                <CityField value={f.city} onChange={setCity} error={errors.city} />
                <label className="field">Departamento<select value={f.department} onChange={set('department')} {...inv('department')}><option value="">Elige…</option>{DEPARTAMENTOS.map((d) => <option key={d}>{d}</option>)}</select><Err k="department" /></label>
                <label className="field">Dirección<input value={f.address} onChange={set('address')} autoComplete="street-address" placeholder="Calle 45 # 12-30" {...inv('address')} /><Err k="address" /></label>
                <label className="field">Apartamento, torre, conjunto o barrio <span className="opt">(si aplica)</span><input value={f.address2} onChange={set('address2')} placeholder="Torre 2, apto 501, barrio Chapinero" /></label>
              </>
            )}

            {quote && <p className="ship-note" role="status">{quote.shipping === 0 ? <>Envío <b>gratis</b> a {f.city || f.department}.</> : <>Envío a {f.city || f.department}: <b>{cop(quote.shipping)}</b>.</>}{quote.eta && <> Llega en <b>{quote.eta}</b>.</>}</p>}
            {gift?.isGift && (
              <div className="checkout-gift-card">
                <div className="gift-card-icon">🎁</div>
                <div className="gift-card-content">
                  <div className="gift-card-title">Pedido con Tarjeta de Regalo Artesanal</div>
                  <p className="gift-card-details">
                    <b>Para:</b> {gift.recipient || 'Alguien especial'} · <b>De:</b> {gift.sender || 'Anónimo'}
                  </p>
                  {gift.message && <p className="gift-card-msg">&ldquo;{gift.message}&rdquo;</p>}
                </div>
              </div>
            )}
            <details className="more-opt"><summary>¿Alguna indicación para la entrega?<Chevron /></summary><textarea rows={2} value={f.notes} onChange={set('notes')} placeholder="Ej.: horario de portería, dejar en recepción" /></details>
          </fieldset>
        )}
        {step === 2 && (
          <fieldset className="step">
            <legend className="h-page">¿Cómo quieres pagar?</legend>
            <div className="methods">
              {store?.paymentMethods.map((m) => {
                const off = m === 'cod' && quote !== null && !quote.codAvailable;
                return (
                  <label key={m} className={`method ${method === m ? 'is-on' : ''} ${off ? 'is-off' : ''}`}>
                    <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} disabled={off} />
                    <span><strong>{METHODS[m].title}{METHODS[m].badge && <em className="badge-fast">{METHODS[m].badge}</em>}</strong><span className="muted small">{off ? `Sin cobertura de contraentrega en ${f.department}.` : METHODS[m].desc}</span></span>
                  </label>
                );
              })}
            </div>
            <div className="coupon">
              <label htmlFor="coupon">¿Tienes un código de descuento?</label>
              <div className="coupon-row">
                <input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Ej.: BIENVENIDA10" autoCapitalize="characters" autoComplete="off" disabled={Boolean(quote?.coupon)} />
                {quote?.coupon ? <button type="button" className="btn btn-outline" onClick={() => { setCoupon(''); setCouponApplied(''); }}>Quitar</button>
                  : <button type="button" className="btn btn-dark" disabled={!coupon.trim() || quoting} onClick={() => setCouponApplied(coupon.trim())}>Aplicar</button>}
              </div>
              {quote?.coupon && <p className="coupon-ok" role="status">Aplicado: {quote.coupon.code} · {quote.coupon.label}</p>}
              {couponApplied && quote?.couponError && <p className="ferr" role="alert">{quote.couponError}</p>}
            </div>
            <details className="more-opt"><summary>¿Necesitas factura a nombre de una empresa?<Chevron /></summary><label className="field">Cédula o NIT<input value={f.doc} onChange={set('doc')} inputMode="numeric" /></label></details>
            <label className="field check remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Recordar mis datos en este dispositivo para la próxima vez</label>
            <Summary lines={lines} subtotal={subtotal} shipping={shipping} quote={quote} className="summary final" />
          </fieldset>
        )}
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <div className="step-actions">
          {step < 2 ? <button key="next" type="button" className="btn btn-red btn-lg btn-block" onClick={next}>Continuar</button>
            : <button key="pay" type="submit" className="btn btn-red btn-lg btn-block" disabled={sending || !store}>{sending ? <><span className="spinner" aria-hidden="true" /> Un momento…</> : method === 'wompi' ? `Pagar ${cop(total)}` : `Confirmar pedido · ${cop(total)}`}</button>}
          <p className="secure"><Lock width={14} height={14} /> {step === 2 && method === 'wompi' ? 'Vas a pagar en la página segura de Wompi. No guardamos datos de tu tarjeta.' : 'Tus datos solo se usan para entregar tu pedido.'}</p>
        </div>
      </form>
      <Summary lines={lines} subtotal={subtotal} shipping={shipping} quote={quote} className="summary desk" title />
    </section>
  );
}

function Summary({ lines, subtotal, shipping, className, title, quote }: { lines: CartLine[]; subtotal: number; shipping: number | null; className: string; title?: boolean; quote?: Quote | null }) {
  return (
    <aside className={className}>
      {title && <h2>Tu pedido</h2>}
      <ul className="summary-lines">{lines.map((l) => <li key={l.id}><img src={l.image ?? ''} alt="" /><span>{l.qty} × {l.name}</span><span>{cop(l.qty * l.price)}</span></li>)}</ul>
      <div className="row-between"><span>Frascos</span><span>{cop(subtotal)}</span></div>
      <div className="row-between"><span>Envío{quote?.eta ? <span className="muted small"> · {quote.eta}</span> : ''}</span><span>{shipping === null ? 'Según el departamento' : shipping === 0 ? 'Gratis' : cop(shipping)}</span></div>
      {quote?.coupon && quote.coupon.type !== 'free_shipping' && <div className="row-between discount"><span>Descuento {quote.coupon.code}</span><span>−{cop(quote.discount)}</span></div>}
      <div className="row-between total"><span>Total</span><strong>{cop(quote ? quote.total : subtotal + (shipping || 0))}</strong></div>
    </aside>
  );
}

/** Ciudad con sugerencias: al elegir una, el departamento se completa solo. */
function CityField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  const opts = searchCities(value);
  const exact = CITIES.some(([c]) => norm(c) === norm(value));
  return (
    <div className="field cityfield">
      <label htmlFor="city">Ciudad o municipio</label>
      <input id="city" value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        autoComplete="off" placeholder="Bogotá, Medellín, Chía…" aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'err-city' : undefined} aria-autocomplete="list" role="combobox" aria-expanded={open && opts.length > 0} aria-controls="city-opts" />
      {open && opts.length > 0 && !exact && (
        <ul className="city-opts" role="listbox" id="city-opts">{opts.map(([c, d]) => <li key={c + d} role="option" aria-selected={false} onMouseDown={() => { onChange(c); setOpen(false); }}><b>{c}</b><span>{d}</span></li>)}</ul>
      )}
      {error && <span className="ferr" id="err-city" role="alert">{error}</span>}
    </div>
  );
}
