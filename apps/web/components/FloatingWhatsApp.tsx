'use client';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { WhatsApp, Close, Arrow, Sparkle } from './icons';

interface Topic {
  id: string;
  label: string;
  icon: string;
  message: string;
}

const TOPICS: Topic[] = [
  {
    id: 'sabores',
    label: 'Recomendación de sabores',
    icon: '🫙',
    message: 'Hola equipo de La Cajita, me gustaría que me asesoren para elegir los mejores frascos según mi gusto.',
  },
  {
    id: 'regalos',
    label: 'Cajas de regalo / Empresas',
    icon: '🎁',
    message: 'Hola equipo de La Cajita, deseo cotizar cajas artesanales de madera para regalo / evento corporativo.',
  },
  {
    id: 'envios',
    label: 'Tiempos de entrega y envíos',
    icon: '🚚',
    message: 'Hola equipo de La Cajita, quiero consultar cobertura y tiempos de despacho para mi ciudad.',
  },
  {
    id: 'general',
    label: 'Chatear con el equipo',
    icon: '💬',
    message: 'Hola equipo de La Cajita, tengo una consulta sobre sus conservas artesanales.',
  },
];

export function FloatingWhatsApp() {
  const pathname = usePathname();
  const [waNumber, setWaNumber] = useState('573103347621');
  const [phoneDisplay, setPhoneDisplay] = useState('+57 310 334 7621');
  const [isOpen, setIsOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic>(TOPICS[0]);
  const [customMsg, setCustomMsg] = useState(TOPICS[0].message);
  const [bubbleTitle, setBubbleTitle] = useState('¿Dudas con tus sabores o envíos?');
  const [bubbleText, setBubbleText] = useState('Chatea directo con nuestro taller en Bogotá.');
  const [enabled, setEnabled] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([api.store(), api.content()])
      .then(([s, c]) => {
        if (s.whatsapp) setWaNumber(s.whatsapp.replace(/\D/g, ''));
        if (s.contact?.phone) setPhoneDisplay(s.contact.phone);
        if (c) {
          if (c.floatingChatEnabled === false) setEnabled(false);
          if (c.floatingChatTitle) setBubbleTitle(c.floatingChatTitle);
          if (c.floatingChatText) setBubbleText(c.floatingChatText);
        }
      })
      .catch(() => {});
  }, []);

  // Muestra el globo de bienvenida suavemente tras 3 segundos si no está en checkout
  useEffect(() => {
    if (pathname === '/pagar') return;
    const t = setTimeout(() => setShowPrompt(true), 3200);
    return () => clearTimeout(t);
  }, [pathname]);

  // Cierra el popover con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const selectTopic = (t: Topic) => {
    setSelectedTopic(t);
    setCustomMsg(t.message);
  };

  const handleOpenChat = () => {
    const text = encodeURIComponent(customMsg.trim() || selectedTopic.message);
    const url = `https://wa.me/${waNumber}?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  // En páginas de administración o en el checkout para evitar distracciones no se muestra, o si fue deshabilitado desde admin
  if (pathname.startsWith('/admin') || !enabled) return null;

  return (
    <aside className="wa-float-root" aria-label="Atención al cliente por WhatsApp">
      {/* Globo de invitación inicial (tooltip inteligente) */}
      {showPrompt && !isOpen && (
        <div className="wa-prompt-bubble" role="status">
          <button
            type="button"
            className="wa-prompt-close"
            onClick={(e) => {
              e.stopPropagation();
              setShowPrompt(false);
            }}
            aria-label="Cerrar sugerencia"
          >
            ✕
          </button>
          <div
            className="wa-prompt-body"
            onClick={() => {
              setShowPrompt(false);
              setIsOpen(true);
            }}
          >
            <span className="wa-prompt-avatar">🌶️</span>
            <div className="wa-prompt-text">
              <strong>{bubbleTitle}</strong>
              <span>{bubbleText}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta de Chat Concierge Flotante */}
      {isOpen && (
        <div className="wa-card" ref={cardRef} role="dialog" aria-modal="true" aria-labelledby="wa-card-title">
          {/* Encabezado */}
          <div className="wa-card-head">
            <div className="wa-card-brand">
              <div className="wa-avatar-wrap">
                <span className="wa-avatar-icon">🌶️</span>
                <span className="wa-status-dot" title="En línea" />
              </div>
              <div className="wa-brand-info">
                <h3 id="wa-card-title">Pimentones La Cajita</h3>
                <span className="wa-status-text">
                  <span className="wa-dot-live" /> Taller Bogotá · En línea
                </span>
              </div>
            </div>
            <button
              type="button"
              className="wa-card-close"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar chat"
            >
              <Close width={18} height={18} />
            </button>
          </div>

          {/* Cuerpo */}
          <div className="wa-card-body">
            {/* Mensaje de bienvenida tipo chat */}
            <div className="wa-chat-bubble">
              <p>
                ¡Hola! 👋 Te damos la bienvenida a <b>Pimentones La Cajita</b>.
                ¿En qué podemos acompañarte hoy en tu mesa?
              </p>
              <span className="wa-bubble-time">
                {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Selector de temas rápidos */}
            <div className="wa-topics-wrap">
              <span className="wa-topics-label">
                <Sparkle width={12} height={12} /> Elige el motivo de tu consulta:
              </span>
              <div className="wa-topics-grid">
                {TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    className={`wa-topic-chip ${selectedTopic.id === topic.id ? 'is-selected' : ''}`}
                    onClick={() => selectTopic(topic)}
                  >
                    <span className="wa-chip-icon">{topic.icon}</span>
                    <span className="wa-chip-label">{topic.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vista previa / edición del mensaje */}
            <div className="wa-msg-field">
              <label htmlFor="wa-custom-input" className="wa-input-label">
                Mensaje a enviar:
              </label>
              <textarea
                id="wa-custom-input"
                rows={2}
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                placeholder="Escribe tu mensaje aquí…"
                maxLength={240}
              />
            </div>

            {/* Botón principal de WhatsApp */}
            <button
              type="button"
              className="wa-start-btn"
              onClick={handleOpenChat}
            >
              <WhatsApp width={20} height={20} />
              <span>Abrir WhatsApp directo</span>
              <Arrow width={16} height={16} />
            </button>

            {/* Pie con teléfono directo */}
            <div className="wa-card-foot">
              <span>Línea directa de atención:</span>
              <a href={`tel:${waNumber}`} className="wa-phone-link">
                {phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Botón Flotante Redondo con Aura y Pulso */}
      <button
        type="button"
        className={`wa-float-btn ${isOpen ? 'is-active' : ''}`}
        onClick={() => {
          setShowPrompt(false);
          setIsOpen(!isOpen);
        }}
        aria-label="Abrir chat de WhatsApp de Pimentones La Cajita"
        aria-expanded={isOpen}
      >
        <span className="wa-pulse-ring" aria-hidden="true" />
        <span className="wa-icon-wrap">
          {isOpen ? <Close width={24} height={24} /> : <WhatsApp width={30} height={30} />}
        </span>
        {!isOpen && <span className="wa-online-indicator" aria-hidden="true" />}
      </button>
    </aside>
  );
}
