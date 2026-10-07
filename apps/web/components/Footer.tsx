import Link from 'next/link';
import { api } from '@/lib/api';
import { cop } from '@lacajita/shared';
import { BackToTop } from './BackToTop';

/**
 * Pie de página World-Class para Pimentones La Cajita
 * Conectado con los datos reales del negocio desde NestJS (Admin → Ajustes).
 */
export async function Footer() {
  const [store, content] = await Promise.all([
    api.store().catch(() => null),
    api.content().catch(() => null),
  ]);
  const c = store?.contact;
  const whatsappNum = store?.whatsapp || '573103347621';
  const cleanWa = whatsappNum.replace(/\D/g, '');
  const waUrl = `https://wa.me/${cleanWa}?text=Hola%20equipo%20de%20La%20Cajita,%20tengo%20una%20pregunta`;
  const freeShipping = store?.shipping?.freeFrom ? cop(store.shipping.freeFrom) : '$90.000';

  const showRibbon = content?.footerRibbonEnabled ?? true;
  const pillars = (content?.footerPillars || [
    { id: 'fp-1', icon: '🌶️', title: 'Cosecha Seleccionada', desc: 'Pimentones maduros asados y confitados a fuego lento en Bogotá.', active: true },
    { id: 'fp-2', icon: '🌿', title: '100% Libre de Químicos', desc: 'Sin conservantes artificiales, espesantes ni colorantes añadidos.', active: true },
    { id: 'fp-3', icon: '📦', title: 'Envíos a Toda Colombia', desc: `Embalaje antigolpes con sello térmico. Gratis desde ${freeShipping}.`, active: true },
    { id: 'fp-4', icon: '🔒', title: 'Compra Segura & PSE', desc: 'Transacciones cifradas con Wompi, Bancolombia, Nequi y tarjetas.', active: true },
  ]).filter((p: any) => p.active !== false);

  const manifesto = content?.footerManifesto || 'Conservas de pimentón de autor elaboradas a mano en tandas cortas. Honramos el tiempo de la cocina tradicional para transformar momentos sencillos en banquetes memorables.';
  const originBadge = content?.footerOriginBadge || 'Hecho con orgullo y fogón en Bogotá, Colombia';
  const showWorkshop = content?.footerWorkshopActive ?? true;
  const workshopStatus = content?.footerWorkshopStatus || 'Taller activo · Despachando hoy';

  return (
    <footer className="footer-worldclass">
      {/* 1. Ribbon Superior: Pilares de Confianza y Garantía Artesanal */}
      {showRibbon && pillars.length > 0 && (
        <div className="footer-ribbon">
          <div className="footer-ribbon-grid">
            {pillars.map((pill: any) => (
              <div className="f-pill-card" key={pill.id || pill.title}>
                <span className="f-pill-icon" aria-hidden="true">{pill.icon}</span>
                <div className="f-pill-text">
                  <h4>{pill.title}</h4>
                  <p>{pill.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Cuerpo Principal del Pie de Página */}
      <div className="footer-body">
        <div className="footer-body-grid">
          {/* Columna 1: Marca & Manifiesto */}
          <div className="f-col f-col-brand">
            <div className="f-logo-badge">
              <img src="/img/logo.svg" alt="Pimentones La Cajita" className="f-logo-img" />
            </div>

            <p className="f-brand-manifesto">
              {manifesto}
            </p>

            {originBadge && (
              <div className="f-colombia-badge">
                <span className="f-flag" aria-hidden="true">🇨🇴</span>
                <span>{originBadge}</span>
              </div>
            )}

            {/* Redes y comunidad */}
            <div className="f-social-list" aria-label="Canales oficiales">
              {c?.instagram && (
                <a
                  href={`https://instagram.com/${c.instagram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="f-social-link"
                  aria-label={`Instagram oficial @${c.instagram}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                  </svg>
                  <span>@{c.instagram.replace(/^@/, '')}</span>
                </a>
              )}

              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="f-social-link f-social-wa"
                aria-label="WhatsApp directo con el taller"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>WhatsApp Concierge</span>
              </a>
            </div>
          </div>

          {/* Columna 2: Tienda & Despensa */}
          <nav className="f-col" aria-label="Nuestra Tienda">
            <h3 className="f-col-title">Despensa Gourmet</h3>
            <ul className="f-link-list">
              <li><Link href="/producto/mayonesa">Mayonesa de Pimentón</Link></li>
              <li><Link href="/producto/salsa-rustica">Salsa Rústica Ahumada</Link></li>
              <li><Link href="/producto/mermelada">Mermelada Agridulce</Link></li>
              <li><Link href="/producto/confitados">Pimentones Confitados</Link></li>
              <li>
                <Link href="/#caja" className="f-highlight-link">
                  <span>Caja de Madera Artesanal</span>
                  <span className="f-badge-regalo">Regalo</span>
                </Link>
              </li>
              <li><Link href="/pagar">Ver Mi Carrito</Link></li>
            </ul>
          </nav>

          {/* Columna 3: El Fogón & Experiencia */}
          <nav className="f-col" aria-label="El Fogón">
            <h3 className="f-col-title">Cultura del Fogón</h3>
            <ul className="f-link-list">
              <li><Link href="/#maridajes">Guía de Maridajes</Link></li>
              <li><Link href="/#historia">Historia & Filosofía</Link></li>
              <li><Link href="/#faq-h">Preguntas Frecuentes</Link></li>
            </ul>
          </nav>

          {/* Columna 4: Pedidos & Asistencia */}
          <nav className="f-col" aria-label="Servicio al Cliente">
            <h3 className="f-col-title">Servicio & Envíos</h3>
            <ul className="f-link-list">
              <li><Link href="/mi-pedido">Rastrear mi Pedido</Link></li>
              <li><Link href="/contacto">Línea de Atención</Link></li>
              <li><Link href="/#faq-h">Tiempos y Zonas de Entrega</Link></li>
              <li><Link href="/contacto">Pedidos Corporativos & Regalos</Link></li>
              <li><Link href="/contacto">Términos & Políticas de Calidad</Link></li>
            </ul>
          </nav>

          {/* Columna 5: Taller Directo */}
          <div className="f-col f-col-taller">
            <h3 className="f-col-title">Taller en Bogotá</h3>

            {showWorkshop && (
              <div className="f-status-pill">
                <span className="f-status-dot" aria-hidden="true" />
                <span>{workshopStatus}</span>
              </div>
            )}

            <div className="f-contact-items">
              <a href={waUrl} target="_blank" rel="noreferrer" className="f-contact-line">
                <span className="f-contact-icon">📱</span>
                <div>
                  <span className="f-contact-label">WhatsApp Directo</span>
                  <strong>{c?.phone || `+${cleanWa}`}</strong>
                </div>
              </a>

              {c?.email && (
                <a href={`mailto:${c.email}`} className="f-contact-line">
                  <span className="f-contact-icon">✉️</span>
                  <div>
                    <span className="f-contact-label">Correo Oficial</span>
                    <span>{c.email}</span>
                  </div>
                </a>
              )}

              <div className="f-contact-line f-contact-static">
                <span className="f-contact-icon">📍</span>
                <div>
                  <span className="f-contact-label">Taller y Despachos</span>
                  <span>{c?.city || 'Bogotá D.C., Colombia'}</span>
                </div>
              </div>
            </div>

            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline-light btn-block btn-sm f-taller-cta"
            >
              <span>Escribir al Taller</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* 3. Barra de Medios de Pago y Certificación de Seguridad */}
      <div className="footer-payments-bar">
        <div className="footer-payments-inner">
          <div className="f-payment-badges">
            <span className="f-pay-label">Medios de pago 100% seguros:</span>
            <div className="f-pay-pills" aria-label="Tarjetas y medios aceptados">
              <span className="f-pay-chip">PSE</span>
              <span className="f-pay-chip">Wompi</span>
              <span className="f-pay-chip">Bancolombia</span>
              <span className="f-pay-chip">Nequi</span>
              <span className="f-pay-chip">Daviplata</span>
              <span className="f-pay-chip">Visa</span>
              <span className="f-pay-chip">Mastercard</span>
            </div>
          </div>

          <div className="f-security-cert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Conexión cifrada SSL 256-bit · Compra protegida</span>
          </div>
        </div>
      </div>

      {/* 4. Barra Legal Inferior, Tip Gastronómico y Volver Arriba */}
      <div className="footer-bottom-bar">
        <div className="footer-bottom-inner">
          <div className="f-legal-left">
            <p className="f-legal-copy">
              © {new Date().getFullYear()} Pimentones La Cajita. Marca Registrada en Colombia. Todos los derechos reservados.
            </p>
            <p className="f-chef-tip">
              🌿 <b>Tip del Chef:</b> Después de abrir, conserva en refrigeración. Para maridar, permite que el frasco tome temperatura ambiente unos minutos antes de servir para liberar todos los aromas del pimentón asado.
            </p>
          </div>

          <div className="f-legal-right">
            <BackToTop />
          </div>
        </div>
      </div>
    </footer>
  );
}
