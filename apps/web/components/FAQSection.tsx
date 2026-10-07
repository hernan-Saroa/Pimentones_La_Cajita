'use client';
import { useState, useId } from 'react';

interface FaqItem {
  q: string;
  a: string;
}

interface FAQSectionProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  items: FaqItem[];
  whatsappUrl?: string;
  whatsappPhone?: string;
}

// Icono temático según la pregunta
function getFaqIcon(q: string) {
  const lower = q.toLowerCase();
  if (lower.includes('envi') || lower.includes('dónde') || lower.includes('donde') || lower.includes('llega') || lower.includes('tiempo')) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-5l-3-4h-5v10" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </svg>
    );
  }
  if (lower.includes('duran') || lower.includes('conserv') || lower.includes('frasco') || lower.includes('vida') || lower.includes('nevera')) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2v4" />
        <path d="m4.93 10.93 1.41 1.41" />
        <path d="M20 12h2" />
        <path d="M2 12h2" />
        <path d="m17.66 10.93 1.41-1.41" />
        <path d="M8 7h8a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2Z" />
        <line x1="8" y1="13" x2="16" y2="13" />
      </svg>
    );
  }
  if (lower.includes('paga') || lower.includes('precio') || lower.includes('wompi') || lower.includes('tarjeta') || lower.includes('bancolombia')) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    );
  }
  if (lower.includes('empresa') || lower.includes('regalo') || lower.includes('caja') || lower.includes('evento')) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="8" width="18" height="14" rx="2" />
        <path d="M12 8v14" />
        <path d="M19.5 8a2.5 2.5 0 0 0-4.5-1.5L12 8l-3-1.5a2.5 2.5 0 0 0-4.5 1.5" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function FAQSection({
  kicker = 'Dudas Resueltas',
  title = 'Preguntas frecuentes',
  subtitle = 'Todo sobre nuestros envíos, tiempos de entrega y conservación en casa.',
  items = [],
  whatsappUrl = 'https://wa.me/573103347621?text=Hola%20taller%20La%20Cajita,%20tengo%20una%20pregunta%20sobre%20sus%20productos.',
  whatsappPhone = '+57 310 334 7621',
}: FAQSectionProps) {
  // Abre por defecto la primera pregunta para invitar a la interacción
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  if (!items || items.length === 0) return null;

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="faq-worldclass-section" aria-labelledby={`${baseId}-h`}>
      <div className="faq-worldclass-grid">
        {/* Columna Izquierda: Identidad y Contacto Directo */}
        <div className="faq-side-pane">
          <span className="faq-kicker-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {kicker}
          </span>
          <h2 id={`${baseId}-h`} className="faq-main-title">{title}</h2>
          <p className="faq-main-desc">{subtitle}</p>

          {/* Tarjeta de soporte de autor */}
          <div className="faq-concierge-card">
            <div className="faq-concierge-header">
              <div className="faq-concierge-avatar">
                <img src="/img/isotipo.svg" alt="Pimentones La Cajita" />
              </div>
              <div>
                <strong className="faq-concierge-name">Taller La Cajita</strong>
                <span className="faq-concierge-status">
                  <span className="faq-live-dot" /> Atención directa en Bogotá
                </span>
              </div>
            </div>
            <p className="faq-concierge-prompt">
              ¿Tienes una consulta específica sobre ingredientes, alérgenos o pedidos para eventos?
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="faq-concierge-cta"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.01-1.24-.74-.66-1.25-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.02 2.6c.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.18-.47-.3" />
              </svg>
              <span>Preguntar por WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Columna Derecha: Acordeón World-Class */}
        <div className="faq-cards-stack">
          {items.map((item, idx) => {
            const isOpen = openIndex === idx;
            const itemId = `${baseId}-item-${idx}`;
            const icon = getFaqIcon(item.q);

            return (
              <div
                key={idx}
                className={`faq-card-item ${isOpen ? 'is-open' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="faq-card-header"
                  aria-expanded={isOpen}
                  aria-controls={itemId}
                >
                  <span className="faq-card-icon-box" aria-hidden="true">
                    {icon}
                  </span>
                  <span className="faq-card-q-text">{item.q}</span>
                  <span className="faq-card-chevron-circle" aria-hidden="true">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`faq-chevron-svg ${isOpen ? 'rotated' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </button>

                <div
                  id={itemId}
                  className="faq-card-collapse"
                  style={{
                    maxHeight: isOpen ? '400px' : '0px',
                    opacity: isOpen ? 1 : 0,
                  }}
                  role="region"
                >
                  <div className="faq-card-body">
                    <p>{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
