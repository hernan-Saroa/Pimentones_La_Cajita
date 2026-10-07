'use client';
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import type { Testimonial, TrustPillar, ProcessStep, Product, PairingItem, FooterPillar } from '@lacajita/shared';
import { cop } from '@lacajita/shared';
import { heroTheme, sensory } from '@/lib/tints';
import { useAdmin, useCan } from './AdminShell';
import {
  Badge, Button, Card, Drawer, EmptyState, Field, Icon, Input, LinkButton,
  PageHeader, PageSkeleton, SaveBar, Textarea, cls, useUI, useUnsavedGuard,
} from './kit';

/**
 * Editor de Contenido y Marca (World-Class Visual Theme & Copywriting Studio):
 * Permite editar el 100% de los textos, secciones, pilares y avisos de la tienda
 * con navegación intuitiva sección por sección, maquetas visuales idénticas al eCommerce real,
 * sugerencias gastronómicas de un click, y simulador responsive (Desktop / Mobile).
 */

type FAQ = { q: string; a: string };

type ContentData = {
  // 1. Barra de anuncio superior
  announcementEnabled?: boolean;
  announcementText?: string;
  announcementBadge?: string;

  // 2. Portada (Hero)
  heroBadge?: string;
  heroBrand: string;
  tagline: string;
  heroRatingText?: string;
  heroCta?: string;
  heroProductSlugs?: string[];

  // 3. Pilares de confianza
  trustPillars?: TrustPillar[];

  // 4. Manifiesto, Historia, Video y Valores (El Alma de Nuestro Fogón)
  manifestoKicker?: string;
  aboutTitle: string;
  aboutText: string;
  videoUrl: string;
  mission: string;
  values: string[];

  // 5. Catálogo de frascos
  catalogKicker?: string;
  catalogTitle?: string;
  catalogSubtitle?: string;

  // 6. Caja de regalo
  giftKicker?: string;
  giftTitle: string;
  giftText: string;
  giftCapacity?: number;
  giftDiscountPct?: number;
  giftPricingMode?: 'sum' | 'fixed';
  giftFixedPrice?: number;
  giftProductSlugs?: string[];

  // 7. Guía de maridajes
  pairingKicker?: string;
  pairingTitle?: string;
  pairingSubtitle?: string;
  pairingItems?: PairingItem[];

  // 8. Proceso artesanal
  processKicker?: string;
  processTitle?: string;
  processSubtitle?: string;
  processSteps?: ProcessStep[];

  // 9. Cocina sin afán (Slow Food)
  slowKicker?: string;
  slowTitle: string;
  slowText: string;

  // 10. Conservación general (fallback)
  conservation: string;

  // 11. Testimonios
  testimonials?: Testimonial[];

  // 12. FAQ
  faqKicker?: string;
  faqTitle?: string;
  faqSubtitle?: string;
  faq: FAQ[];

  // 13. Boletín
  newsletterKicker?: string;
  newsletterTitle?: string;
  newsletterSubtitle?: string;
  newsletterNote?: string;
  newsletterConsentText?: string;

  // 14. Garantías del Pie de Página (Ribbon)
  footerRibbonEnabled?: boolean;
  footerPillars?: FooterPillar[];

  // 15. Pie de Página (Footer & Taller)
  footerManifesto?: string;
  footerOriginBadge?: string;
  footerWorkshopStatus?: string;
  footerWorkshopActive?: boolean;

  // 16. Carrito de Compras (Gaveta Lateral)
  cartTitle?: string;
  cartFreeShippingBarEnabled?: boolean;
  cartFreeShippingText?: string;
  cartUpsellEnabled?: boolean;
  cartUpsellTitle?: string;
  cartUpsellProductSlug?: string;
  cartGiftEnabled?: boolean;
  cartGiftTitle?: string;
  cartGiftBadge?: string;
  cartGiftNote?: string;
  cartShippingNote?: string;
  cartCheckoutBtnText?: string;
  cartWhatsAppEnabled?: boolean;
  cartWhatsAppBtnText?: string;
  cartGuaranteeText?: string;

  // 17. WhatsApp flotante
  floatingChatEnabled?: boolean;
  floatingChatTitle?: string;
  floatingChatText?: string;
  floatingChatAvatar?: string;
};

type SectionId =
  | 'anuncio'
  | 'portada'
  | 'confianza'
  | 'fogon'
  | 'catalogo'
  | 'regalo'
  | 'maridajes'
  | 'testimonios'
  | 'faq'
  | 'boletin'
  | 'footer_ribbon'
  | 'footer_body'
  | 'carrito'
  | 'whatsapp';

interface SectionMeta {
  id: SectionId;
  label: string;
  sub: string;
  icon: string;
  location: string;
}

const SECTIONS: SectionMeta[] = [
  { id: 'anuncio', label: '1. Barra de Anuncio', sub: 'Aviso superior, ofertas y envíos', icon: 'tag', location: 'Cintillo superior de lacajita.co' },
  { id: 'portada', label: '2. Portada (Hero)', sub: 'Frase, lema, badge de origen y llamada', icon: 'store', location: 'Primera impresión de la tienda' },
  { id: 'confianza', label: '3. Pilares de Confianza', sub: '3 tarjetas de garantía de compra', icon: 'shield', location: 'Debajo del Hero principal' },
  { id: 'fogon', label: '4. El Alma de Nuestro Fogón', sub: 'Historia, manifiesto, video y valores', icon: 'flame', location: 'Sección central del fogón y manifiesto' },
  { id: 'catalogo', label: '5. Catálogo de Frascos', sub: 'Encabezado y productos en tienda', icon: 'layers', location: 'Colección de frascos individuales' },
  { id: 'regalo', label: '6. Caja de Regalo', sub: 'Cajita de madera y combos', icon: 'gift', location: 'Configurador de 4 frascos' },
  { id: 'maridajes', label: '7. Guía de Maridajes', sub: 'Inspiración culinaria en la mesa', icon: 'sliders', location: 'Guía interactiva de platos' },
  { id: 'testimonios', label: '8. Testimonios', sub: 'Opiniones y reseñas de clientes', icon: 'star', location: 'Sección de opiniones en portada' },
  { id: 'faq', label: '9. Preguntas Frecuentes', sub: 'Acordeón de dudas (FAQ)', icon: 'info', location: 'Pie de la página principal' },
  { id: 'boletin', label: '10. Club y Boletín', sub: 'Suscripción al fogón y Ley 1581', icon: 'mail', location: 'Formulario de suscripción' },
  { id: 'footer_ribbon', label: '11. Garantías del Pie', sub: 'Cintillo de 4 garantías y beneficios', icon: 'shield', location: 'Encima del pie de página' },
  { id: 'footer_body', label: '12. Pie de Página & Taller', sub: 'Manifiesto, origen y estado de taller', icon: 'pin', location: 'Base de toda la tienda' },
  { id: 'carrito', label: '13. Carrito de Compras', sub: 'Barra de envío, upsell, dedicatoria y botones', icon: 'cart', location: 'Gaveta lateral de compra' },
  { id: 'whatsapp', label: '14. WhatsApp Flotante', sub: 'Globo de atención al cliente', icon: 'whatsapp', location: 'Esquina inferior derecha' },
];

/** Convierte cualquier URL de YouTube a embed seguro */
export function toEmbed(url: string) {
  const u = (url || '').trim();
  if (!u) return '';
  const m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : u;
}



export const DEFAULT_PAIRING_ITEMS: PairingItem[] = [
  {
    id: 'maridaje-mayonesa',
    title: 'La consentida · Mayonesa de Pimentón',
    badge: 'La consentida',
    icon: '🍔',
    dish: 'Papa criolla, sándwiches, hamburguesas, mazorca asada',
    tip: 'Cremosa con todo el sabor del pimentón tostado al fuego, perfecta para untar sin moderación.',
    productSlug: 'mayonesa-de-pimenton',
    image: '',
    active: true,
  },
  {
    id: 'maridaje-confitados',
    title: 'Para la tabla · Pimentones Confitados',
    badge: 'Para la tabla',
    icon: '🧀',
    dish: 'Queso madurado, jamón serrano, pan de masa madre tostado',
    tip: 'Confitados despacio en aceite de oliva y especias. La joya indiscutible de cualquier picada.',
    productSlug: 'pimentones-confitados',
    image: '',
    active: true,
  },
  {
    id: 'maridaje-salsa-rustica',
    title: 'Humo y nuez · Salsa Rústica de Pimentón',
    badge: 'Humo y nuez',
    icon: '🥩',
    dish: 'Cortes a la brasa, carnes asadas, pollo al horno, papas rústicas',
    tip: 'Textura rústica y profundidad ahumada que abraza carnes rojas y parrilladas con carácter.',
    productSlug: 'salsa-rustica-de-pimenton',
    image: '',
    active: true,
  },
  {
    id: 'maridaje-mermelada',
    title: 'La agridulce · Mermelada de Pimentón',
    badge: 'La agridulce',
    icon: '🫓',
    dish: 'Queso brie tibio, queso crema, galletas de soda, tostadas francesas',
    tip: 'El contraste agridulce perfecto que eleva desde un desayuno con quesos hasta un postre atrevido.',
    productSlug: 'mermelada-de-pimenton',
    image: '',
    active: true,
  },
  {
    id: 'maridaje-dip-ahumado',
    title: 'Edición Especial · Dip de Pimentón Ahumado',
    badge: 'Edición Especial',
    icon: '🧀',
    dish: 'Nachos de maíz, chips de plátano, bastones de zanahoria y apio',
    tip: 'Suave, sedoso y ahumado en leña. Ideal para servir al centro de la mesa en reuniones.',
    productSlug: 'dip-de-pimenton-ahumado',
    image: '',
    active: true,
  },
];

export function Content() {
  const api = useAdmin();
  const can = useCan();
  const { toast, confirm } = useUI();

  const [orig, setOrig] = useState<ContentData | null>(() => api.getCache?.('admin:content') || null);
  const [c, setC] = useState<ContentData | null>(() => api.getCache?.('admin:content') || null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SectionId>('anuncio');
  const [viewMode, setViewMode] = useState<'focused' | 'all'>('focused');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [openTestimonial, setOpenTestimonial] = useState<number | null>(0);
  const [openPairingIndex, setOpenPairingIndex] = useState<number | null>(0);
  const [openPillar, setOpenPillar] = useState<number | null>(null);
  const [previewPairingId, setPreviewPairingId] = useState<string>('');
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simDevice, setSimDevice] = useState<'desktop' | 'mobile'>('desktop');

  const [products, setProducts] = useState<Product[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);

  const editable = can('admin');

  const load = useCallback(() => {
    return Promise.all([
      api.content(),
      api.products().catch(() => [] as Product[]),
    ])
      .then(([r, prods]: [ContentData, Product[]]) => {
        setOrig(r);
        setC(r);
        setProducts(Array.isArray(prods) ? prods : []);
        setError('');
      })
      .catch((e: Error) => setError(e.message));
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = !!c && !!orig && JSON.stringify(c) !== JSON.stringify(orig);
  useUnsavedGuard(dirty);

  // Productos activos en catálogo
  const activeCatalogProducts = useMemo(() => {
    return products.filter((p) => (p as any).active !== false);
  }, [products]);

  // Lista ordenada de productos que participan en el Hero Sensorial
  const heroProducts = useMemo(() => {
    if (!products.length) return [];
    const base = activeCatalogProducts.length > 0 ? activeCatalogProducts : products;
    const slugs = c?.heroProductSlugs;
    if (Array.isArray(slugs) && slugs.length > 0) {
      const bySlug = new Map(products.map((p) => [p.slug, p]));
      const ordered = slugs.map((s) => bySlug.get(s)).filter((p): p is Product => Boolean(p));
      if (ordered.length > 0) return ordered;
    }
    return base;
  }, [products, activeCatalogProducts, c?.heroProductSlugs]);

  // Producto activo en la maqueta
  const safeHeroIndex = heroIndex >= 0 && heroIndex < heroProducts.length ? heroIndex : 0;
  const activeHeroProduct = heroProducts[safeHeroIndex] || products[0] || null;
  const [activeHeroBg, activeHeroFg] = activeHeroProduct
    ? heroTheme(activeHeroProduct.slug)
    : ['#5a1b24', '#fff5f2'];
  const activeSensory = activeHeroProduct ? sensory(activeHeroProduct.slug) : null;

  // Detección de qué secciones tienen cambios sin guardar
  const changedIn = useMemo(() => {
    if (!c || !orig) return new Set<SectionId>();
    const map: Record<SectionId, (keyof ContentData)[]> = {
      anuncio: ['announcementEnabled', 'announcementText', 'announcementBadge'],
      portada: ['heroBadge', 'heroBrand', 'tagline', 'heroRatingText', 'heroCta', 'heroProductSlugs'],
      confianza: ['trustPillars'],
      fogon: ['manifestoKicker', 'aboutTitle', 'aboutText', 'videoUrl', 'mission', 'values'],
      catalogo: ['catalogKicker', 'catalogTitle', 'catalogSubtitle'],
      regalo: ['giftKicker', 'giftTitle', 'giftText', 'giftCapacity', 'giftDiscountPct', 'giftPricingMode', 'giftFixedPrice', 'giftProductSlugs'],
      maridajes: ['pairingKicker', 'pairingTitle', 'pairingSubtitle', 'pairingItems'],
      testimonios: ['testimonials'],
      faq: ['faqKicker', 'faqTitle', 'faqSubtitle', 'faq'],
      boletin: ['newsletterKicker', 'newsletterTitle', 'newsletterSubtitle', 'newsletterNote', 'newsletterConsentText'],
      footer_ribbon: ['footerRibbonEnabled', 'footerPillars'],
      footer_body: ['footerManifesto', 'footerOriginBadge', 'footerWorkshopStatus', 'footerWorkshopActive'],
      carrito: [
        'cartTitle', 'cartFreeShippingBarEnabled', 'cartFreeShippingText',
        'cartUpsellEnabled', 'cartUpsellTitle', 'cartUpsellProductSlug',
        'cartGiftEnabled', 'cartGiftTitle', 'cartGiftBadge', 'cartGiftNote',
        'cartShippingNote', 'cartCheckoutBtnText', 'cartWhatsAppEnabled',
        'cartWhatsAppBtnText', 'cartGuaranteeText',
      ],
      whatsapp: ['floatingChatEnabled', 'floatingChatTitle', 'floatingChatText', 'floatingChatAvatar'],
    };
    return new Set(
      (Object.entries(map) as [SectionId, (keyof ContentData)[]][])
        .filter(([, ks]) => ks.some((k) => JSON.stringify(c[k]) !== JSON.stringify(orig[k])))
        .map(([s]) => s)
    );
  }, [c, orig]);

  if (error) {
    return (
      <>
        <PageHeader title="Contenido de la tienda" />
        <Card>
          <EmptyState
            icon="alert"
            title="No pudimos cargar el contenido"
            action={<Button onClick={load}>Reintentar</Button>}
          >
            {error}
          </EmptyState>
        </Card>
      </>
    );
  }

  if (!c) return <PageSkeleton />;

  const set = <K extends keyof ContentData>(k: K, v: ContentData[K]) => {
    setC((x) => x && { ...x, [k]: v });
  };

  const save = async () => {
    const cleanFaq = (c.faq || []).filter((f) => f.q.trim() && f.a.trim());
    const cleanTestimonials = (c.testimonials || []).filter((t) => t.name.trim() && t.quote.trim());
    const dropped = (c.faq?.length || 0) - cleanFaq.length;
    setSaving(true);
    try {
      const cleanVideo = toEmbed(c.videoUrl);
      const r = await api.saveContent({
        ...c,
        faq: cleanFaq,
        testimonials: cleanTestimonials,
        videoUrl: cleanVideo,
      });
      setOrig(r);
      setC(r);
      toast(
        dropped
          ? `Contenido guardado (se omitieron ${dropped} preguntas incompletas). La tienda se actualiza en segundos.`
          : 'Contenido guardado exitosamente. La tienda se actualiza en menos de un minuto.'
      );
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const moveTestimonial = (i: number, d: -1 | 1) => {
    const list = [...(c.testimonials || [])];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set('testimonials', list);
    setOpenTestimonial(openTestimonial === i ? j : openTestimonial === j ? i : openTestimonial);
  };

  const removeTestimonial = async (i: number) => {
    const list = c.testimonials || [];
    const item = list[i];
    if (item?.name || item?.quote) {
      const ok = await confirm({
        title: '¿Quitar este testimonio?',
        body: item.name ? `Reseña de ${item.name}` : 'Testimonio sin nombre',
        confirm: 'Quitar',
        danger: true,
      });
      if (!ok) return;
    }
    set('testimonials', list.filter((_, n) => n !== i));
    setOpenTestimonial(null);
  };

  const moveFaq = (i: number, d: -1 | 1) => {
    const list = [...(c.faq || [])];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set('faq', list);
    setOpenFaq(openFaq === i ? j : openFaq === j ? i : openFaq);
  };

  const removeFaq = async (i: number) => {
    const list = c.faq || [];
    const item = list[i];
    if (item?.q || item?.a) {
      const ok = await confirm({
        title: '¿Eliminar esta pregunta frecuente?',
        body: item.q || 'Pregunta sin título',
        confirm: 'Eliminar',
        danger: true,
      });
      if (!ok) return;
    }
    set('faq', list.filter((_, n) => n !== i));
    setOpenFaq(null);
  };

  const movePillar = (i: number, d: -1 | 1) => {
    const list = [...(c.footerPillars || [])];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set('footerPillars', list);
    setOpenPillar(openPillar === i ? j : openPillar === j ? i : openPillar);
  };

  const removePillar = async (i: number) => {
    const list = c.footerPillars || [];
    const item = list[i];
    if (item?.title) {
      const ok = await confirm({
        title: '¿Quitar esta tarjeta de garantía?',
        body: item.title,
        confirm: 'Quitar',
        danger: true,
      });
      if (!ok) return;
    }
    set('footerPillars', list.filter((_, n) => n !== i));
    setOpenPillar(null);
  };

  const embed = toEmbed(c.videoUrl);

  return (
    <>
      <PageHeader
        title="Editor de Contenido y Marca"
        description={
          <span className="bo-row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Personaliza absolutamente todos los textos, cintillos, fotos y garantías del eCommerce.</span>
            <span className="bo-row" style={{ gap: 5, alignItems: 'center' }}>
              <span className="bo-dot-green" />
              <span className="small muted">Sincronizado en vivo</span>
            </span>
          </span>
        }
        actions={
          <div className="bo-row" style={{ gap: 8 }}>
            <Button
              variant="secondary"
              icon="eye"
              onClick={() => setSimulatorOpen(true)}
            >
              Simulador de tienda
            </Button>
            <LinkButton href="/" external icon="external" variant="ghost">
              Ver tienda
            </LinkButton>
            {dirty && editable && (
              <Button
                variant="primary"
                icon="check"
                loading={saving}
                onClick={save}
              >
                Guardar cambios ({changedIn.size})
              </Button>
            )}
          </div>
        }
      />

      {!editable && (
        <div className="bo-callout bo-callout--gray" style={{ marginBottom: 16 }}>
          <Icon name="shield" size={16} />
          Solo los administradores pueden editar el contenido del sitio web. Te encuentras en modo de solo lectura.
        </div>
      )}

      {/* Controles de vista: Enfocada vs Todo */}
      <div className="bo-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div className="bo-row" style={{ gap: 8, alignItems: 'center' }}>
          <span className="small muted">Modo de edición:</span>
          <div className="bo-chips">
            <button
              type="button"
              className={cls('bo-chip', viewMode === 'focused' && 'is-active')}
              onClick={() => setViewMode('focused')}
            >
              <Icon name="sliders" size={12} />
              Sección por sección
            </button>
            <button
              type="button"
              className={cls('bo-chip', viewMode === 'all' && 'is-active')}
              onClick={() => setViewMode('all')}
            >
              <Icon name="layers" size={12} />
              Ver todo el contenido
            </button>
          </div>
        </div>

        {dirty && (
          <span className="small bo-t-amber bo-row" style={{ gap: 6, alignItems: 'center' }}>
            <span className="bo-dot-amber" />
            {changedIn.size} {changedIn.size === 1 ? 'sección modificada' : 'secciones modificadas'} sin guardar
          </span>
        )}
      </div>

      <div className="bo-content-shell">
        {/* Columna Izquierda: Menú de Secciones */}
        <div className="bo-content-menu">
          {SECTIONS.map((s) => {
            const isDirty = changedIn.has(s.id);
            const isActive = activeTab === s.id;

            return (
              <button
                key={s.id}
                type="button"
                className={cls('bo-content-nav-item', isActive && 'is-active')}
                onClick={() => {
                  setActiveTab(s.id);
                  if (viewMode === 'all') {
                    document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                <div className="icon-box">
                  <Icon name={s.icon} size={16} />
                </div>
                <div className="meta">
                  <span className="title">{s.label}</span>
                  <span className="desc">{s.sub}</span>
                </div>
                {isDirty && (
                  <span
                    className="bo-dot-amber"
                    title="Sección con cambios sin guardar"
                    style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Columna Derecha: Área de Edición y Maquetas en Vivo */}
        <div className="bo-stack" style={{ gap: 24 }}>
          {/* SECCIÓN 1: BARRA DE ANUNCIO SUPERIOR */}
          {(viewMode === 'all' || activeTab === 'anuncio') && (
            <div id="anuncio">
              <Card
                title="1. Barra de Anuncio Superior"
                description="Franja fija en la parte más alta de la tienda. Ideal para promociones, despachos gratis o lemas de frescura."
              >
                {/* Maqueta en vivo de la barra */}
                <div className="bo-mockup-wrap">
                  <div className="bo-mockup-header">
                    <span>Vista previa del cintillo superior</span>
                    <Badge tone={c.announcementEnabled !== false ? 'green' : 'gray'}>
                      {c.announcementEnabled !== false ? 'Activo en Tienda' : 'Oculto'}
                    </Badge>
                  </div>
                  {c.announcementEnabled !== false ? (
                    <div className="bo-mockup-bar">
                      <span>✨</span>
                      <span><b>{c.announcementText || 'Cosecha artesanal en Bogotá · Envíos a toda Colombia'}</b> · <b>Envío gratis</b> desde $90.000</span>
                      {c.announcementBadge && <span className="bar-pill">{c.announcementBadge}</span>}
                    </div>
                  ) : (
                    <div style={{ padding: 18, textAlign: 'center', background: '#f8fafc', color: '#64748b', fontSize: 13 }}>
                      La barra de anuncio superior se encuentra desactivada actualmente.
                    </div>
                  )}
                </div>

                <div className="bo-stack" style={{ gap: 16 }}>
                  <div className="bo-row" style={{ alignItems: 'center', gap: 12 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                      <input
                        type="checkbox"
                        checked={c.announcementEnabled !== false}
                        disabled={!editable}
                        onChange={(e) => set('announcementEnabled', e.target.checked)}
                      />
                      Mostrar barra de anuncio en la tienda
                    </label>
                  </div>

                  <Field
                    label="Texto principal del aviso"
                    counter={(c.announcementText || '').length}
                    max={200}
                    hint="Aparece destacado antes del cálculo automático de envío gratis."
                  >
                    <Input
                      value={c.announcementText ?? 'Cosecha artesanal en Bogotá · Envíos a toda Colombia'}
                      maxLength={200}
                      disabled={!editable}
                      placeholder="Cosecha artesanal en Bogotá · Envíos a toda Colombia"
                      onChange={(e) => set('announcementText', e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Píldora / Insignia destacada"
                    counter={(c.announcementBadge || '').length}
                    max={60}
                    hint="Etiqueta pequeña al final de la barra (ej: 100% NATURAL, LOTE FRESCO)."
                  >
                    <Input
                      value={c.announcementBadge ?? '100% NATURAL'}
                      maxLength={60}
                      disabled={!editable}
                      placeholder="100% NATURAL"
                      onChange={(e) => set('announcementBadge', e.target.value)}
                    />
                  </Field>
                </div>
              </Card>
            </div>
          )}

          {/* SECCIÓN 2: PORTADA (HERO SENSORIAL) */}
          {(viewMode === 'all' || activeTab === 'portada') && (
            <div id="portada">
              <Card
                title="2. Portada (Hero Sensorial)"
                description="Lo primero que descubre el cliente al ingresar a lacajita.co: frase de autor, badge de origen, calificación y llamada a la acción."
              >
                {/* Maqueta Fiel en Vivo idéntica al storefront real */}
                <div className="bo-mockup-wrap">
                  <div className="bo-mockup-header">
                    <span>
                      Vista previa del Hero Sensorial en Vivo
                      {activeHeroProduct && (
                        <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                          · Mostrando: <b>{activeHeroProduct.name}</b> ({safeHeroIndex + 1} de {heroProducts.length})
                        </span>
                      )}
                    </span>
                    <Badge tone="green">Fiel al Sitio Web</Badge>
                  </div>
                  <div
                    className="bo-mockup-real-hero"
                    style={{
                      background: activeHeroBg,
                      color: activeHeroFg,
                      transition: 'background 0.3s ease, color 0.3s ease',
                    }}
                  >
                    <div className="bo-mockup-hero-left">
                      <div className="bo-mockup-meta-pill">
                        <span className="dot" />
                        <span>{c.heroBadge || 'Bogotá D.C. · Lotes Cortos Hechos a Mano'}</span>
                      </div>
                      <div className="bo-mockup-hero-brand-kicker">
                        {c.heroBrand || 'Pimentón de verdad. Sin atajos.'}
                      </div>
                      <div className="bo-row" style={{ gap: 8, alignItems: 'center' }}>
                        {activeHeroProduct?.kicker && (
                          <span className="bo-mockup-hero-product-kicker">
                            {activeHeroProduct.kicker}
                          </span>
                        )}
                        <div className="bo-mockup-hero-rating">
                          <span>★★★★★</span>
                          <span>{c.heroRatingText || '4.9 (1.200+ mesas)'}</span>
                        </div>
                      </div>
                      <h1 className="bo-mockup-hero-headline">
                        {activeHeroProduct?.name || 'Pimentones Confitados'}
                      </h1>
                      <p className="bo-mockup-hero-desc">
                        {activeHeroProduct?.tagline || c.tagline || 'Tiras de pimentón rojo y amarillo, tiernas y brillantes.'}
                      </p>
                      {activeSensory && (
                        <div className="bo-row" style={{ gap: 6, flexWrap: 'wrap' }}>
                          <span className="bo-mockup-sensory-pill">
                            🔥 {activeSensory.intensity}
                          </span>
                          <span className="bo-mockup-sensory-pill">
                            ✨ {activeSensory.texture}
                          </span>
                        </div>
                      )}
                      <div className="bo-mockup-hero-ctas" style={{ marginTop: 4 }}>
                        <div className="bo-mockup-hero-price-wrap">
                          <span className="bo-mockup-hero-price-label">Precio frasco 200g</span>
                          <span className="bo-mockup-hero-price-val">
                            {cop(activeHeroProduct?.price || 24000)}
                          </span>
                        </div>
                        <span className="bo-mockup-btn-primary">+ Agregar</span>
                        <span className="bo-mockup-btn-link">
                          {c.heroCta || 'Ver notas de cata'} <Icon name="arrowRight" size={13} />
                        </span>
                      </div>
                    </div>
                    <div className="bo-mockup-hero-stage">
                      <img
                        src={activeHeroProduct?.image || `/img/recortes/${activeHeroProduct?.slug || 'confitados'}.webp`}
                        alt={activeHeroProduct?.name || 'Frasco artesanal'}
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          if (!img.src.includes('confitados')) {
                            img.src = '/img/recortes/confitados.webp';
                          }
                        }}
                      />
                      {activeSensory?.notes?.[0] && (
                        <span className="bo-mockup-hotspot" style={{ top: 15, right: 10 }}>
                          {activeSensory.notes[0]}
                        </span>
                      )}
                      {activeSensory?.notes?.[1] && (
                        <span className="bo-mockup-hotspot" style={{ bottom: 35, right: 5 }}>
                          {activeSensory.notes[1]}
                        </span>
                      )}
                      {activeSensory?.pairingPill && (
                        <span className="bo-mockup-hotspot-pairing" style={{ bottom: 8, left: 10 }}>
                          🍽️ {activeSensory.pairingPill}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pestañas inferiores del carrusel de frascos */}
                  {heroProducts.length > 0 && (
                    <div className="bo-mockup-hero-picker" role="tablist" aria-label="Productos en el Hero">
                      {heroProducts.map((p, idx) => {
                        const s = sensory(p.slug);
                        const isSel = idx === safeHeroIndex;
                        const tabImg = p.image || `/img/recortes/${p.slug}.webp`;
                        return (
                          <button
                            key={p.id || p.slug}
                            type="button"
                            className={cls('bo-mockup-hero-tab', isSel && 'is-active')}
                            onClick={() => setHeroIndex(idx)}
                            title={`Click para previsualizar ${p.name}`}
                          >
                            <img
                              src={tabImg}
                              alt={p.name}
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div>
                              <b>{p.name}</b>
                              <small>{s?.intensity || p.kicker || 'Sabor de autor'}</small>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Panel de Vinculación y Selección de Productos en la Portada */}
                <div className="bo-stack" style={{ gap: 14 }}>
                  <div className="bo-hero-relation-banner">
                    <span style={{ fontSize: 20 }}>💡</span>
                    <div>
                      <strong>¿Cómo se relacionan los productos con la Portada?</strong>
                      <p style={{ margin: '4px 0 0', color: '#14532d' }}>
                        La portada del eCommerce es un <b>carrusel sensorial interactivo</b>. Cada pestaña inferior corresponde a un frasco de tu catálogo. El fondo, nombre, foto, notas de cata y precio cambian dinámicamente según el producto activo. Aquí puedes seleccionar cuáles productos participan en la portada y en qué orden aparecen.
                      </p>
                    </div>
                  </div>

                  <div className="bo-row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                        Productos en el Carrusel de la Portada ({heroProducts.length} de {products.length} visibles)
                      </h4>
                      <span className="small muted">
                        El primer producto de la lista es la bienvenida principal al entrar a la tienda.
                      </span>
                    </div>
                    <div className="bo-row" style={{ gap: 8 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const allSlugs = products.filter((p) => (p as any).active !== false).map((p) => p.slug);
                          set('heroProductSlugs', allSlugs);
                        }}
                      >
                        Incluir todos ({products.length})
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          set('heroProductSlugs', []);
                        }}
                      >
                        Restablecer orden
                      </Button>
                      <LinkButton href="/admin/productos" variant="secondary" size="sm" icon="sliders">
                        Catálogo de Frascos
                      </LinkButton>
                    </div>
                  </div>

                  <div className="bo-hero-products-list">
                    {products.map((p) => {
                      const isIncluded = heroProducts.some((hp) => hp.slug === p.slug);
                      const currentOrderIdx = heroProducts.findIndex((hp) => hp.slug === p.slug);
                      const isPreviewActive = activeHeroProduct?.slug === p.slug;
                      const thumbImg = p.image || `/img/recortes/${p.slug}.webp`;

                      const toggleInclusion = () => {
                        const currentSlugs = (c.heroProductSlugs && c.heroProductSlugs.length > 0)
                          ? [...c.heroProductSlugs]
                          : heroProducts.map((hp) => hp.slug);

                        let nextSlugs: string[];
                        if (isIncluded) {
                          if (currentSlugs.length <= 1) {
                            toast('El carrusel debe tener al menos un producto visible.');
                            return;
                          }
                          nextSlugs = currentSlugs.filter((s) => s !== p.slug);
                        } else {
                          nextSlugs = [...currentSlugs, p.slug];
                        }
                        set('heroProductSlugs', nextSlugs);
                      };

                      const move = (dir: 'up' | 'down') => {
                        const currentSlugs = (c.heroProductSlugs && c.heroProductSlugs.length > 0)
                          ? [...c.heroProductSlugs]
                          : heroProducts.map((hp) => hp.slug);

                        const idx = currentSlugs.indexOf(p.slug);
                        if (idx < 0) return;
                        const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
                        if (targetIdx < 0 || targetIdx >= currentSlugs.length) return;

                        const swapped = [...currentSlugs];
                        const temp = swapped[idx];
                        swapped[idx] = swapped[targetIdx];
                        swapped[targetIdx] = temp;
                        set('heroProductSlugs', swapped);
                        setHeroIndex(targetIdx);
                      };

                      return (
                        <div
                          key={p.id || p.slug}
                          className={cls(
                            'bo-hero-product-row',
                            isIncluded && 'is-selected',
                            isPreviewActive && 'is-active-preview'
                          )}
                        >
                          <div className="bo-hero-product-meta">
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              disabled={!editable}
                              onChange={toggleInclusion}
                              title={isIncluded ? 'Desmarcar para ocultar del carrusel' : 'Marcar para incluir en el carrusel'}
                              style={{ width: 18, height: 18, cursor: 'pointer' }}
                            />
                            <img
                              src={thumbImg}
                              alt={p.name}
                              className="bo-hero-product-thumb"
                              onError={(e) => {
                                const img = e.currentTarget as HTMLImageElement;
                                if (!img.src.includes('confitados')) img.src = '/img/recortes/confitados.webp';
                              }}
                            />
                            <div className="bo-hero-product-text">
                              <div className="bo-hero-product-name">
                                <span>{p.name}</span>
                                {p.kicker && <Badge tone="gray">{p.kicker}</Badge>}
                                <span style={{ fontWeight: 600, color: 'var(--brand-dark)' }}>{cop(p.price)}</span>
                                {isIncluded && (
                                  <Badge tone="blue">Posición #{currentOrderIdx + 1}</Badge>
                                )}
                                {isPreviewActive && (
                                  <Badge tone="amber">Activo en Maqueta</Badge>
                                )}
                              </div>
                              <div className="bo-hero-product-sub">
                                {p.tagline || 'Sin descripción corta'} · <code>{p.slug}</code>
                              </div>
                            </div>
                          </div>

                          <div className="bo-hero-product-actions">
                            {isIncluded && (
                              <div className="bo-row" style={{ gap: 2 }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={currentOrderIdx <= 0 || !editable}
                                  title="Subir posición en el carrusel"
                                  onClick={() => move('up')}
                                >
                                  ▲
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={currentOrderIdx >= heroProducts.length - 1 || !editable}
                                  title="Bajar posición en el carrusel"
                                  onClick={() => move('down')}
                                >
                                  ▼
                                </Button>
                              </div>
                            )}

                            {isIncluded && (
                              <Button
                                variant={isPreviewActive ? 'primary' : 'secondary'}
                                size="sm"
                                icon="eye"
                                onClick={() => {
                                  const idx = heroProducts.findIndex((hp) => hp.slug === p.slug);
                                  if (idx >= 0) setHeroIndex(idx);
                                }}
                              >
                                {isPreviewActive ? 'Viendo' : 'Probar'}
                              </Button>
                            )}

                            <LinkButton
                              href="/admin/productos"
                              variant="ghost"
                              size="sm"
                              icon="external"
                            >
                              Editar en Catálogo
                            </LinkButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bo-divider" style={{ margin: '8px 0' }} />

                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                  Textos generales e insignias de la Portada
                </h4>

                {/* Formulario Hero */}
                <div className="bo-stack" style={{ gap: 16 }}>
                  <Field
                    label="Insignia / Origen de elaboración (Badge superior)"
                    counter={(c.heroBadge || '').length}
                    max={100}
                    hint="Aparece arriba del título con un punto verde de frescura."
                  >
                    <Input
                      value={c.heroBadge ?? 'Bogotá D.C. · Lotes Cortos Hechos a Mano'}
                      maxLength={100}
                      disabled={!editable}
                      placeholder="Bogotá D.C. · Lotes Cortos Hechos a Mano"
                      onChange={(e) => set('heroBadge', e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Frase principal de marca (Headline de Portada)"
                    counter={c.heroBrand.length}
                    max={80}
                    hint="Título grande e impactante sobre la foto principal de la tienda."
                  >
                    <Input
                      value={c.heroBrand}
                      maxLength={80}
                      disabled={!editable}
                      placeholder="Pimentón de verdad. Sin atajos."
                      onChange={(e) => set('heroBrand', e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Lema o promesa de frescura"
                    counter={c.tagline.length}
                    max={80}
                    hint="Aparece debajo del título y en el manifiesto de la marca."
                  >
                    <Input
                      value={c.tagline}
                      maxLength={80}
                      disabled={!editable}
                      placeholder="Productos siempre frescos"
                      onChange={(e) => set('tagline', e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Texto de calificación y estrellas"
                    counter={(c.heroRatingText || '').length}
                    max={80}
                    hint="Refuerza la prueba social de clientes satisfechos."
                  >
                    <Input
                      value={c.heroRatingText ?? '4.9 (1.200+ mesas)'}
                      maxLength={80}
                      disabled={!editable}
                      placeholder="4.9 (1.200+ mesas)"
                      onChange={(e) => set('heroRatingText', e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Texto del botón secundario de notas"
                    counter={(c.heroCta || '').length}
                    max={60}
                    hint="Enlace que lleva a la ficha sensorial del producto."
                  >
                    <Input
                      value={c.heroCta ?? 'Ver notas de cata'}
                      maxLength={60}
                      disabled={!editable}
                      placeholder="Ver notas de cata"
                      onChange={(e) => set('heroCta', e.target.value)}
                    />
                  </Field>
                </div>
              </Card>
            </div>
          )}

          {/* SECCIÓN 3: PILARES DE CONFIANZA */}
          {(viewMode === 'all' || activeTab === 'confianza') && (
            <div id="confianza">
              <Card
                title="3. Pilares de Confianza y Garantías"
                description="Las 3 tarjetas que aparecen justo debajo de la portada para generar confianza inmediata en el comprador."
              >
                {/* Maqueta en vivo de los pilares */}
                <div className="bo-mockup-wrap">
                  <div className="bo-mockup-header">
                    <span>Vista previa de las 3 garantías</span>
                    <Badge tone="blue">3 Pilares</Badge>
                  </div>
                  <div className="bo-mockup-trust-row">
                    {(c.trustPillars || [
                      { title: '100% Sin Conservantes', desc: 'Solo ingredientes reales que se entienden y cuidan tu salud.', icon: 'leaf' },
                      { title: 'Despacho a Toda Colombia', desc: 'Envíos rápidos con guía de rastreo a tu ciudad.', icon: 'truck' },
                      { title: 'Pago Fácil & Protegido', desc: 'Tarjeta, PSE, Nequi, Bancolombia o contraentrega.', icon: 'lock' },
                    ]).map((tp, idx) => (
                      <div key={idx} className="bo-mockup-trust-card">
                        <span style={{ color: '#16a34a', flexShrink: 0 }}>
                          <Icon name={tp.icon === 'truck' ? 'truck' : tp.icon === 'lock' ? 'lock' : 'checkCircle'} size={18} />
                        </span>
                        <div>
                          <b>{tp.title}</b>
                          <span>{tp.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Editores de las 3 tarjetas */}
                <div className="bo-stack" style={{ gap: 20 }}>
                  {[0, 1, 2].map((idx) => {
                    const list = c.trustPillars || [
                      { title: '100% Sin Conservantes', desc: 'Solo ingredientes reales que se entienden y cuidan tu salud.', icon: 'leaf' },
                      { title: 'Despacho a Toda Colombia', desc: 'Envíos rápidos con guía de rastreo a tu ciudad.', icon: 'truck' },
                      { title: 'Pago Fácil & Protegido', desc: 'Tarjeta, PSE, Nequi, Bancolombia o contraentrega.', icon: 'lock' },
                    ];
                    const item = list[idx] || { title: '', desc: '', icon: 'leaf' as const };

                    const updatePillar = (field: keyof TrustPillar, val: any) => {
                      const updated = [...list];
                      updated[idx] = { ...item, [field]: val };
                      set('trustPillars', updated);
                    };

                    return (
                      <div key={idx} className="bo-box" style={{ padding: 16 }}>
                        <div className="bo-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontWeight: 700, fontSize: 13.5 }}>Tarjeta {idx + 1}</span>
                          <div className="bo-row" style={{ gap: 6, alignItems: 'center' }}>
                            <span className="small muted">Ícono:</span>
                            <select
                              value={item.icon}
                              disabled={!editable}
                              className="bo-select"
                              style={{ padding: '4px 8px', fontSize: 12 }}
                              onChange={(e) => updatePillar('icon', e.target.value)}
                            >
                              <option value="leaf">Hoja / Ingrediente Natural</option>
                              <option value="truck">Camión / Despacho a Colombia</option>
                              <option value="lock">Candado / Pago Seguro</option>
                            </select>
                          </div>
                        </div>

                        <div className="bo-stack" style={{ gap: 12 }}>
                          <Field label="Título de la garantía" counter={item.title.length} max={80}>
                            <Input
                              value={item.title}
                              maxLength={80}
                              disabled={!editable}
                              placeholder="Ej: 100% Sin Conservantes"
                              onChange={(e) => updatePillar('title', e.target.value)}
                            />
                          </Field>
                          <Field label="Descripción de la garantía" counter={item.desc.length} max={200}>
                            <Input
                              value={item.desc}
                              maxLength={200}
                              disabled={!editable}
                              placeholder="Ej: Solo ingredientes reales que se entienden y cuidan tu salud."
                              onChange={(e) => updatePillar('desc', e.target.value)}
                            />
                          </Field>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* SECCIÓN 4: EL ALMA DE NUESTRO FOGÓN (HISTORIA, MANIFIESTO, VIDEO Y VALORES) */}
          {(viewMode === 'all' || activeTab === 'fogon') && (
            <div id="fogon">
              <Card
                title="4. El Alma de Nuestro Fogón (Historia, Manifiesto, Video y Valores)"
                description="El corazón editorial de tu marca: cuenta la historia del fogón, la misión artesanal, el video de la cocina en vivo y los valores de producto en la cinta animada continua."
              >
                {/* Maqueta en vivo sincronizada con el Storefront */}
                <div className="bo-mockup-wrap">
                  <div className="bo-mockup-header">
                    <span>Vista previa en vivo: El Alma de Nuestro Fogón</span>
                    <div className="bo-row" style={{ gap: 6 }}>
                      <Badge tone="amber">Editorial</Badge>
                      <Badge tone="green">Video en Vivo</Badge>
                      <Badge tone="blue">Cinta Ticker</Badge>
                    </div>
                  </div>

                  <div className="bo-mockup-fogon">
                    {/* Columna Izquierda: Manifiesto Artesanal */}
                    <div className="bo-mockup-fogon-copy">
                      <span className="bo-mockup-fogon-kicker">
                        <Icon name="sparkle" size={12} />
                        {c.manifestoKicker || 'El Alma de Nuestro Fogón'}
                      </span>

                      <h3 className="bo-mockup-fogon-title">
                        {c.aboutTitle ? (
                          c.aboutTitle.includes('.') ? (
                            <>
                              {c.aboutTitle.split('.')[0]}. <br />
                              <span>{c.aboutTitle.split('.').slice(1).join('.').trim()}</span>
                            </>
                          ) : (
                            c.aboutTitle
                          )
                        ) : (
                          <>
                            Pimentón de verdad. <br />
                            <span>Sin atajos ni conservantes.</span>
                          </>
                        )}
                      </h3>

                      <div className="bo-mockup-fogon-quote">
                        <p className="bo-mockup-fogon-quote-text">
                          “{c.mission || 'En La Cajita cocinamos el pimentón como se hace en casa: a fuego lento, en tandas cortas y sin nada que no entiendas.'}”
                        </p>
                      </div>

                      <p className="bo-mockup-fogon-text">
                        {c.aboutText || 'Nuestras cosechas de pimentón se escogen con calidad y amor. En Bogotá cocinamos cada tanda a mano, con ingredientes que se entienden y sin conservantes.'}
                      </p>

                      <div className="bo-mockup-fogon-pillars">
                        <div className="bo-mockup-fogon-pillar">
                          <span className="bo-mockup-fogon-pillar-icon">🔥</span>
                          <div className="bo-mockup-fogon-pillar-text">
                            <strong>Fuego Directo</strong>
                            <span>Asamos a llama viva para caramelizar el dulzor natural.</span>
                          </div>
                        </div>
                        <div className="bo-mockup-fogon-pillar">
                          <span className="bo-mockup-fogon-pillar-icon">🥣</span>
                          <div className="bo-mockup-fogon-pillar-text">
                            <strong>Tandas en Olla</strong>
                            <span>Mortero y paciencia en Bogotá: tandas cortas que cuidan el sabor.</span>
                          </div>
                        </div>
                        <div className="bo-mockup-fogon-pillar">
                          <span className="bo-mockup-fogon-pillar-icon">🌿</span>
                          <div className="bo-mockup-fogon-pillar-text">
                            <strong>Etiqueta Limpia</strong>
                            <span>Sin conservantes químicos, sin gomas ni colorantes sintéticos.</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Columna Derecha: Tarjeta de Video del Taller */}
                    <div className="bo-mockup-fogon-video-card">
                      <div className="bo-mockup-fogon-video-top">
                        <span className="bo-mockup-fogon-live-dot" />
                        <span>Cocinando en Bogotá D.C.</span>
                      </div>

                      <div className="bo-mockup-fogon-video-wrap">
                        {embed.includes('youtube.com/embed/') ? (
                          <iframe
                            src={embed}
                            title="Vista previa del video"
                            allow="accelerometer; encrypted-media; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#9ca3af', padding: 20, textAlign: 'center', fontSize: 12 }}>
                            <span style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
                              <Icon name="play" size={28} />
                              Pega un enlace de YouTube abajo para previsualizar aquí
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="bo-mockup-fogon-video-footer">
                        <span>📍 Taller artesanal: Bogotá D.C.</span>
                        <span className="bo-mockup-fogon-badge">Solo 120 frascos por tanda</span>
                      </div>
                    </div>
                  </div>

                  {/* Cinta Ticker inferior animada */}
                  <div className="bo-mockup-ticker">
                    {c.values.map((v, i) => (
                      <span key={i}>✦ {v}</span>
                    ))}
                    {c.values.length === 0 && <span className="muted">Sin atributos configurados aún</span>}
                  </div>
                </div>

                {/* Sub-bloque 1: Historia, Título y Manifiesto Editorial */}
                <div className="bo-stack" style={{ gap: 20 }}>
                  <div className="bo-box" style={{ padding: 18, background: '#fafafa' }}>
                    <div className="bo-row" style={{ alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 18 }}>📜</span>
                      <div>
                        <strong style={{ fontSize: 14, color: '#18181b' }}>1. Manifiesto y Tradición Editorial</strong>
                        <span className="small muted" style={{ display: 'block' }}>
                          Frases y relatos que transmiten la autenticidad y el cariño de tu cocina.
                        </span>
                      </div>
                    </div>

                    <div className="bo-stack" style={{ gap: 14 }}>
                      <Field
                        label="Antetítulo / Kicker del Fogón"
                        counter={(c.manifestoKicker || '').length}
                        max={80}
                        hint="Aparece con una insignia de brillo arriba del título principal."
                      >
                        <Input
                          value={c.manifestoKicker ?? 'El Alma de Nuestro Fogón'}
                          maxLength={80}
                          disabled={!editable}
                          placeholder="El Alma de Nuestro Fogón"
                          onChange={(e) => set('manifestoKicker', e.target.value)}
                        />
                      </Field>

                      <Field
                        label="Título principal del Manifiesto (Headline grande)"
                        counter={c.aboutTitle.length}
                        max={120}
                        hint="Si incluye un punto, la segunda frase se resaltará en tono terracota de acento."
                      >
                        <Input
                          value={c.aboutTitle}
                          maxLength={120}
                          disabled={!editable}
                          placeholder="Pimentón de verdad. Sin atajos ni conservantes."
                          onChange={(e) => set('aboutTitle', e.target.value)}
                        />
                      </Field>

                      <Field
                        label="Misión de la marca (Cita en tarjeta destacada)"
                        counter={c.mission.length}
                        max={500}
                        hint="Esta frase aparece entre comillas en la tarjeta dorada como el lema culinario central."
                      >
                        <Textarea
                          rows={2}
                          value={c.mission}
                          maxLength={500}
                          disabled={!editable}
                          onChange={(e) => set('mission', e.target.value)}
                        />
                      </Field>

                      <Field
                        label="Texto de la historia y oficio del taller"
                        counter={c.aboutText.length}
                        max={1000}
                        hint="Cuenta con calidez cómo nació el proyecto, el cuidado en la huerta y la receta artesanal."
                      >
                        <Textarea
                          rows={3}
                          value={c.aboutText}
                          maxLength={1000}
                          disabled={!editable}
                          onChange={(e) => set('aboutText', e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Sub-bloque 2: Video Cinematográfico del Taller */}
                  <div className="bo-box" style={{ padding: 18, background: '#fafafa' }}>
                    <div className="bo-row" style={{ alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 18 }}>🎬</span>
                      <div>
                        <strong style={{ fontSize: 14, color: '#18181b' }}>2. Video Cinematográfico del Taller</strong>
                        <span className="small muted" style={{ display: 'block' }}>
                          Muestra el fuego, el humo de leña y el envasado artesanal de los pimentones en la cocina real.
                        </span>
                      </div>
                    </div>

                    <div className="bo-stack" style={{ gap: 14 }}>
                      <Field
                        label="Enlace del video de YouTube"
                        counter={c.videoUrl.length}
                        max={200}
                        hint="Pega cualquier enlace de YouTube: enlaces estándar (watch?v=), cortos (youtu.be/), embeds o YouTube Shorts."
                        error={c.videoUrl && !embed.includes('youtube.com/embed/') ? 'No reconocemos este enlace como un video válido de YouTube.' : undefined}
                      >
                        <Input
                          value={c.videoUrl}
                          maxLength={200}
                          disabled={!editable}
                          placeholder="https://www.youtube.com/watch?v=..."
                          onChange={(e) => set('videoUrl', e.target.value)}
                          onBlur={() => set('videoUrl', toEmbed(c.videoUrl))}
                        />
                      </Field>

                      <div className="bo-row" style={{ gap: 8, alignItems: 'center' }}>
                        <span className="small muted">Estado del reproductor:</span>
                        {embed.includes('youtube.com/embed/') ? (
                          <Badge tone="green">✓ Video listo y vinculado</Badge>
                        ) : (
                          <Badge tone="gray">Sin video vinculado</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sub-bloque 3: Cinta de Valores y Atributos (Ticker) */}
                  <div className="bo-box" style={{ padding: 18, background: '#fafafa' }}>
                    <div className="bo-row" style={{ alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 18 }}>✦</span>
                      <div>
                        <strong style={{ fontSize: 14, color: '#18181b' }}>3. Cinta de Valores y Atributos (Ticker Continuo)</strong>
                        <span className="small muted" style={{ display: 'block' }}>
                          Atributos de producto y filosofía que se desplazan de forma continua y animada en la tienda.
                        </span>
                      </div>
                    </div>

                    <div className="bo-stack" style={{ gap: 14 }}>
                      <div className="bo-row bo-box" style={{ background: '#f8fafc', padding: '10px 14px', gap: 10, fontSize: 12.5, borderRadius: 8, border: '1px solid var(--line)' }}>
                        <span style={{ fontSize: 16 }}>💡</span>
                        <span style={{ color: '#475569', lineHeight: 1.5 }}>
                          <b>¿Dónde se ve en la tienda?</b> Esta cinta animada verde aparece en movimiento continuo antes de los testimonios de clientes. Funciona como marquesina de sellos de calidad y atributos de marca.
                        </span>
                      </div>

                      <Field
                        label="Atributos de producto en la cinta"
                        counter={c.values.length}
                        max={16}
                        hint="Presiona Enter o coma para añadir un atributo. Máximo 16 valores de hasta 40 caracteres."
                      >
                        <TagInput values={c.values} onChange={(v) => set('values', v)} disabled={!editable} />
                      </Field>


                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* SECCIÓN 5: CATÁLOGO DE FRASCOS (ENCABEZADO Y PRODUCTOS) */}
          {(viewMode === 'all' || activeTab === 'catalogo') && (
            <div id="catalogo">
              <Card
                title={`5. Catálogo de Frascos (${products.length} productos)`}
                description="Personaliza el encabezado y administra los frascos individuales que se exhiben en la tienda."
                actions={
                  <div className="bo-row" style={{ gap: 8 }}>
                    <LinkButton href="/admin/productos?nuevo=1" size="sm" variant="primary" icon="plus">
                      Agregar nuevo frasco
                    </LinkButton>
                    <LinkButton href="/admin/productos" size="sm" variant="secondary" icon="tag">
                      Catálogo completo
                    </LinkButton>
                  </div>
                }
              >
                {/* 1. Vista previa del encabezado */}
                <div className="bo-mockup-wrap">
                  <div className="bo-mockup-header">
                    <span>Vista previa del Catálogo en Vivo</span>
                    <Badge tone="green">Sincronizado con Tienda</Badge>
                  </div>
                  <div style={{ padding: '24px 28px', background: '#faf8f5', borderBottom: '1px solid var(--line)' }}>
                    <span className="bo-mockup-hero-tag" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}>
                      {c.catalogKicker || 'Frascos Individuales'}
                    </span>
                    <h3 style={{ fontSize: 22, fontWeight: 800, margin: '8px 0 6px', color: '#18181b' }}>
                      {c.catalogTitle || 'Nuestra Colección de Frascos'}
                    </h3>
                    <p style={{ margin: 0, fontSize: 13.5, color: '#71717a' }}>
                      {c.catalogSubtitle || 'Tandas cortas en frascos de vidrio de 200 g. Sin químicos ni espesantes.'}
                    </p>
                  </div>
                </div>

                <div className="bo-stack" style={{ gap: 20 }}>
                  {/* Bloque 1: Textos del Encabezado */}
                  <div className="bo-box" style={{ padding: 18, background: '#fafafa' }}>
                    <strong style={{ fontSize: 14, color: '#18181b', display: 'block', marginBottom: 12 }}>
                      1. Textos y Presentación del Catálogo
                    </strong>
                    <div className="bo-stack" style={{ gap: 14 }}>
                      <Field label="Antetítulo / Píldora (Kicker)" counter={(c.catalogKicker || '').length} max={60}>
                        <Input
                          value={c.catalogKicker ?? 'Frascos Individuales'}
                          maxLength={60}
                          disabled={!editable}
                          placeholder="Frascos Individuales"
                          onChange={(e) => set('catalogKicker', e.target.value)}
                        />
                      </Field>

                      <Field label="Título principal de la sección" counter={(c.catalogTitle || '').length} max={100}>
                        <Input
                          value={c.catalogTitle ?? 'Nuestra Colección de Frascos'}
                          maxLength={100}
                          disabled={!editable}
                          placeholder="Nuestra Colección de Frascos"
                          onChange={(e) => set('catalogTitle', e.target.value)}
                        />
                      </Field>

                      <Field label="Subtítulo descriptivo" counter={(c.catalogSubtitle || '').length} max={300}>
                        <Textarea
                          rows={2}
                          value={c.catalogSubtitle ?? 'Tandas cortas en frascos de vidrio de 200 g. Sin químicos ni espesantes.'}
                          maxLength={300}
                          disabled={!editable}
                          placeholder="Tandas cortas en frascos de vidrio de 200 g. Sin químicos ni espesantes."
                          onChange={(e) => set('catalogSubtitle', e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Bloque 2: Frascos en la tienda */}
                  <div className="bo-box" style={{ padding: 18, background: '#ffffff', border: '1px solid var(--line)' }}>
                    <div className="bo-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <strong style={{ fontSize: 14, color: '#18181b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>🫙</span> 2. Frascos en Exhibición ({products.length})
                        </strong>
                        <span className="small muted" style={{ display: 'block', marginTop: 2 }}>
                          Estos son los frascos que se muestran actualmente bajo este encabezado en la tienda.
                        </span>
                      </div>
                      <LinkButton href="/admin/productos?nuevo=1" size="sm" variant="primary" icon="plus">
                        + Agregar nuevo frasco
                      </LinkButton>
                    </div>

                    <div className="bo-row bo-box" style={{ background: '#f8fafc', padding: '10px 14px', gap: 10, fontSize: 12.5, borderRadius: 8, border: '1px solid var(--line)', marginBottom: 16 }}>
                      <span style={{ fontSize: 16 }}>💡</span>
                      <span style={{ color: '#475569', lineHeight: 1.5 }}>
                        <b>¿Cómo editar los frascos?</b> Haz clic en <b>“Editar frasco”</b> para abrir su ficha completa (precio, gramaje, notas de cata, maridaje y fotos), o usa el botón <b>“Ocultar / Mostrar”</b> para pausar su venta sin borrarlo. Para crear una nueva receta o conserva, usa <b>“+ Agregar nuevo frasco”</b>.
                      </span>
                    </div>

                    {products.length === 0 ? (
                      <EmptyState
                        icon="tag"
                        title="Aún no hay frascos registrados"
                        action={
                          <LinkButton href="/admin/productos?nuevo=1" variant="primary" icon="plus">
                            Crear primer frasco
                          </LinkButton>
                        }
                      >
                        Agrega tu primer producto para que aparezca en el catálogo del eCommerce.
                      </EmptyState>
                    ) : (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                          gap: 14,
                        }}
                      >
                        {products.map((p) => {
                          const isActive = (p as any).active !== false;
                          const img = p.image || '/img/fotos/mayonesa-vertical.webp';

                          return (
                            <div
                              key={p.id || p.slug}
                              className="bo-box"
                              style={{
                                padding: 14,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                background: isActive ? '#ffffff' : '#fcfcfc',
                                opacity: isActive ? 1 : 0.75,
                                border: isActive ? '1px solid var(--line)' : '1px dashed #d4d4d8',
                                borderRadius: 10,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div>
                                <div className="bo-row" style={{ gap: 12, alignItems: 'flex-start' }}>
                                  <div
                                    style={{
                                      width: 64,
                                      height: 64,
                                      borderRadius: 8,
                                      overflow: 'hidden',
                                      flexShrink: 0,
                                      background: '#f4f4f5',
                                      border: '1px solid var(--line)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <img
                                      src={img}
                                      alt={p.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="bo-row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                      {p.kicker ? (
                                        <span className="small bo-t-amber" style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>
                                          {p.kicker}
                                        </span>
                                      ) : <span />}
                                      <Badge tone={isActive ? 'green' : 'gray'}>
                                        {isActive ? 'Activo en tienda' : 'Oculto'}
                                      </Badge>
                                    </div>
                                    <strong style={{ fontSize: 14, color: '#18181b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {p.name}
                                    </strong>
                                    <span className="small muted" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                                      {p.tagline || `${p.sizeG || 200}g · Frasco de vidrio`}
                                    </span>
                                  </div>
                                </div>

                                <div className="bo-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid #f4f4f5', fontSize: 12.5 }}>
                                  <span style={{ fontWeight: 700, color: '#b91c1c', fontSize: 14 }}>
                                    {cop(p.price)}
                                  </span>
                                  <span className="small muted">
                                    {p.stock > 0 ? `${p.stock} en bodega` : 'Sin inventario'}
                                  </span>
                                </div>
                              </div>

                              <div className="bo-row" style={{ gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid #f4f4f5', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 120 }}>
                                  <LinkButton
                                    href={`/admin/productos?id=${p.id}`}
                                    size="sm"
                                    variant="primary"
                                    icon="edit"
                                    className="bo-btn--block"
                                  >
                                    Editar frasco
                                  </LinkButton>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon={isActive ? 'eyeOff' : 'eye'}
                                  onClick={async () => {
                                    if (!editable) return;
                                    const next = !isActive;
                                    setProducts((prev) => prev.map((it) => (it.id === p.id ? { ...it, active: next } as any : it)));
                                    try {
                                      await api.saveProduct({ id: p.id, active: next });
                                      toast(next ? `“${p.name}” ya se ve en la tienda` : `“${p.name}” quedó oculto de la tienda`);
                                    } catch (err) {
                                      setProducts((prev) => prev.map((it) => (it.id === p.id ? { ...it, active: isActive } as any : it)));
                                      toast((err as Error).message, 'error');
                                    }
                                  }}
                                  title={isActive ? 'Ocultar temporalmente de la tienda' : 'Hacer visible en la tienda'}
                                >
                                  {isActive ? 'Ocultar' : 'Publicar'}
                                </Button>
                                <LinkButton
                                  href={`/producto/${p.slug}`}
                                  external
                                  size="sm"
                                  variant="ghost"
                                  icon="external"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* SECCIÓN 6: CAJA DE REGALO Y COMBOS */}
          {(viewMode === 'all' || activeTab === 'regalo') && (
            <div id="regalo">
              <Card
                title="6. Caja de Madera para Regalo y Combos"
                description="Configura la capacidad de la caja (número de frascos), el porcentaje de descuento o precio del combo, y qué frascos del catálogo están disponibles."
                actions={
                  <LinkButton
                    href="/#caja"
                    external
                    size="sm"
                    variant="ghost"
                    icon="external"
                  >
                    Probar en tienda
                  </LinkButton>
                }
              >
                {/* Vista previa realista del Configurador y Combo */}
                {(() => {
                  const cap = c.giftCapacity ?? 4;
                  const disc = c.giftDiscountPct ?? 0;
                  const mode = c.giftPricingMode ?? 'sum';
                  const fixed = c.giftFixedPrice ?? 0;
                  const eligibleSlugs = c.giftProductSlugs || [];
                  const eligibleProducts = eligibleSlugs.length > 0
                    ? activeCatalogProducts.filter((p) => eligibleSlugs.includes(p.slug))
                    : activeCatalogProducts;
                  const sampleProducts = (eligibleProducts.length > 0 ? eligibleProducts : activeCatalogProducts).slice(0, cap);
                  const normalSum = sampleProducts.reduce((s, p) => s + p.price, 0) || (22000 * cap);
                  let calculatedPrice = normalSum;
                  if (mode === 'fixed' && fixed > 0) {
                    calculatedPrice = fixed;
                  } else if (disc > 0) {
                    calculatedPrice = Math.round(normalSum * (1 - disc / 100));
                  }

                  return (
                    <div className="bo-mockup-wrap">
                      <div className="bo-mockup-header">
                        <span>Vista previa en vivo del Combo de Caja de Madera</span>
                        <Badge tone="amber">
                          {mode === 'fixed'
                            ? `Precio fijo ${cop(calculatedPrice)}`
                            : disc > 0
                            ? `Combo con ${disc}% OFF`
                            : 'Combo estándar'}
                        </Badge>
                      </div>
                      <div
                        style={{
                          background: '#fdfaf6',
                          border: '1px solid #fed7aa',
                          borderRadius: 16,
                          padding: '1.4rem',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                          gap: '1.4rem',
                          alignItems: 'center',
                        }}
                      >
                        {/* Visual de la caja con capacidad dinámica */}
                        <div>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: '#fff',
                              padding: '4px 10px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#78350f',
                              marginBottom: 8,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            }}
                          >
                            <span style={{ color: '#d97706' }}>✨</span>
                            <span>Empaque de Madera para {cap} Frascos Incluido</span>
                          </div>
                          <div
                            style={{
                              position: 'relative',
                              borderRadius: 12,
                              overflow: 'hidden',
                              boxShadow: '0 12px 24px -10px rgba(0,0,0,0.2)',
                              maxHeight: 190,
                            }}
                          >
                            <img
                              src="/img/fotos/caja-calida.webp"
                              alt="Caja artesanal de madera con lazo"
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 8,
                                left: 8,
                                background: 'rgba(26,23,20,0.85)',
                                backdropFilter: 'blur(6px)',
                                color: '#fff',
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: 999,
                              }}
                            >
                              Lazo rojo · Tarjeta dedicatoria
                            </div>
                          </div>

                          {/* Ranuras miniatura según la capacidad configurada */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: `repeat(${Math.min(cap, 6)}, 1fr)`,
                              gap: 6,
                              marginTop: 10,
                            }}
                          >
                            {[...Array(cap).keys()].map((slotIdx) => {
                              const p = sampleProducts[slotIdx % sampleProducts.length];
                              return (
                                <div
                                  key={slotIdx}
                                  style={{
                                    background: '#fff',
                                    border: '1.5px solid #e4e4e7',
                                    borderRadius: 10,
                                    padding: '6px 4px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                                  }}
                                >
                                  {p ? (
                                    <>
                                      <img
                                        src={p.image || '/img/fotos/mayonesa-vertical.webp'}
                                        alt={p.name}
                                        style={{ width: 26, height: 32, objectFit: 'contain', marginBottom: 2 }}
                                      />
                                      <span style={{ fontSize: 9, fontWeight: 700, color: '#27272a' }}>
                                        {p.name.split(' ')[0]}
                                      </span>
                                    </>
                                  ) : (
                                    <span style={{ fontSize: 9, color: '#a1a1aa' }}>Espacio {slotIdx + 1}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Lado derecho: Textos, valor comercial y descuento */}
                        <div>
                          <span
                            className="small bo-t-amber"
                            style={{
                              textTransform: 'uppercase',
                              letterSpacing: 0.8,
                              fontWeight: 700,
                              fontSize: 11,
                              display: 'inline-block',
                              marginBottom: 4,
                            }}
                          >
                            {c.giftKicker || 'Edición Especial'}
                          </span>
                          <h3 style={{ fontSize: 20, fontWeight: 800, margin: '2px 0 8px', color: '#78350f', lineHeight: 1.2 }}>
                            {c.giftTitle || 'La caja de 4 sabores'}
                          </h3>
                          <p style={{ margin: '0 0 12px', fontSize: 13.5, color: '#92400e', lineHeight: 1.5 }}>
                            {c.giftText || 'Un frasco de cada uno, en caja de madera con lazo. Para quien cocina, arma tablas o lo tiene todo.'}
                          </p>

                          <div
                            style={{
                              background: '#fff',
                              border: '1px solid #fed7aa',
                              borderRadius: 10,
                              padding: '12px 14px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <span style={{ fontSize: 11, color: '#71717a', display: 'block', fontWeight: 600 }}>
                                Total ({cap} frascos + caja de pino)
                              </span>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                {normalSum > calculatedPrice && (
                                  <s style={{ color: '#a1a1aa', fontSize: 13, fontWeight: 500 }}>
                                    {cop(normalSum)}
                                  </s>
                                )}
                                <strong style={{ fontSize: 18, color: '#18181b', fontWeight: 800 }}>
                                  {cop(calculatedPrice)}
                                </strong>
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: disc > 0 || normalSum > calculatedPrice ? '#c2410c' : '#15803d',
                                background: disc > 0 || normalSum > calculatedPrice ? '#ffedd5' : '#dcfce7',
                                padding: '4px 9px',
                                borderRadius: 999,
                              }}
                            >
                              {disc > 0
                                ? `¡${disc}% OFF en Combo!`
                                : mode === 'fixed' && normalSum > calculatedPrice
                                ? '¡Precio especial de combo!'
                                : '¡Caja de madera sin costo!'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="bo-stack" style={{ gap: 20 }}>
                  {/* Sub-bloque 1: Parámetros Comerciales del Combo (Capacidad, Descuento y Precio) */}
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid var(--line)',
                      borderRadius: 12,
                      padding: '16px',
                    }}
                  >
                    <div style={{ marginBottom: 14 }}>
                      <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#18181b' }}>
                        1. Reglas Comerciales del Combo (Capacidad, Descuento y Valor)
                      </h4>
                      <span className="small muted">
                        Controla cuántos frascos componen la caja, cómo se calcula su valor y el descuento para el cliente.
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: 14,
                      }}
                    >
                      {/* Capacidad / Número de frascos */}
                      <Field
                        label="Número de frascos de la cajita (Capacidad)"
                        hint="Define cuántos frascos debe seleccionar el cliente en la tienda para completar la caja (ej. 3, 4 o 6)."
                      >
                        <Input
                          type="number"
                          min={2}
                          max={12}
                          disabled={!editable}
                          value={c.giftCapacity ?? 4}
                          onChange={(e) => set('giftCapacity', Math.max(2, Math.min(12, Number(e.target.value) || 4)))}
                        />
                      </Field>

                      {/* Modo de precio */}
                      <Field
                        label="¿Cómo se determina el valor de la cajita?"
                        hint="Elige si el valor se calcula sumando los frascos o si tiene una tarifa plana cerrada."
                      >
                        <select
                          disabled={!editable}
                          value={c.giftPricingMode ?? 'sum'}
                          onChange={(e) => set('giftPricingMode', e.target.value as 'sum' | 'fixed')}
                          style={{
                            width: '100%',
                            height: 38,
                            padding: '0 10px',
                            borderRadius: 8,
                            border: '1px solid var(--line)',
                            background: '#fff',
                            fontSize: 13.5,
                            fontFamily: 'inherit',
                          }}
                        >
                          <option value="sum">Suma automática de los frascos elegidos (con o sin % descuento)</option>
                          <option value="fixed">Precio fijo único para la caja completa (tarifa cerrada)</option>
                        </select>
                      </Field>

                      {/* Porcentaje de descuento (si modo es suma) */}
                      {(c.giftPricingMode ?? 'sum') === 'sum' && (
                        <Field
                          label="Porcentaje de descuento de la cajita (%)"
                          hint="Escribe 0 si el cobro es la suma normal y la caja de pino es de cortesía, o un porcentaje (ej. 10%) para incentivar el combo."
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Input
                              type="number"
                              min={0}
                              max={90}
                              disabled={!editable}
                              value={c.giftDiscountPct ?? 0}
                              onChange={(e) => set('giftDiscountPct', Math.max(0, Math.min(90, Number(e.target.value) || 0)))}
                            />
                            <span style={{ fontWeight: 700, fontSize: 15, color: '#71717a' }}>%</span>
                          </div>
                        </Field>
                      )}

                      {/* Precio fijo (si modo es fixed) */}
                      {c.giftPricingMode === 'fixed' && (
                        <Field
                          label="Precio fijo del combo ($ COP)"
                          hint="Tarifa cerrada que pagará el cliente por la caja con sus frascos (ej. $85.000)."
                        >
                          <Input
                            type="number"
                            min={0}
                            step={1000}
                            disabled={!editable}
                            value={c.giftFixedPrice ?? 85000}
                            onChange={(e) => set('giftFixedPrice', Math.max(0, Number(e.target.value) || 0))}
                          />
                        </Field>
                      )}
                    </div>
                  </div>

                  {/* Sub-bloque 2: Frascos disponibles para la caja (¿Cómo se agregan productos nuevos?) */}
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid var(--line)',
                      borderRadius: 12,
                      padding: '16px',
                    }}
                  >
                    <div className="bo-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#18181b' }}>
                          2. Frascos disponibles para armar la caja y combos ({activeCatalogProducts.length} en catálogo)
                        </h4>
                        <span className="small muted" style={{ display: 'block', marginTop: 2 }}>
                          Marca qué frascos de tu catálogo pueden ser elegidos por los clientes para su caja de regalo.
                        </span>
                      </div>
                      <LinkButton
                        href="/admin/productos?nuevo=1"
                        size="sm"
                        variant="primary"
                        icon="plus"
                      >
                        + Crear nuevo frasco
                      </LinkButton>
                    </div>

                    {/* Guía explicativa para el usuario sobre productos nuevos */}
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: '12px 14px',
                        marginBottom: 14,
                        fontSize: 13,
                        color: '#334155',
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>💡 ¿Cómo se agregan productos nuevos a la caja?</strong>
                      <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                        <li>Crea el nuevo sabor en tu <b>Catálogo de Productos</b> (haz clic en <i>“+ Crear nuevo frasco”</i> arriba) con su foto, gramaje y precio.</li>
                        <li>Al guardarlo, aparecerá automáticamente en esta lista.</li>
                        <li>Usa el botón de cada frasco para activarlo o retirarlo del configurador de cajas cuando desees.</li>
                      </ol>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      {activeCatalogProducts.map((p) => {
                        const eligible = c.giftProductSlugs || [];
                        const isIncluded = eligible.length === 0 || eligible.includes(p.slug);

                        const toggleProductInBox = () => {
                          if (!editable) return;
                          let nextSlugs: string[];
                          if (eligible.length === 0) {
                            // Si estaba en "todos", excluimos este producto
                            nextSlugs = activeCatalogProducts
                              .map((it) => it.slug)
                              .filter((s) => s !== p.slug);
                          } else if (eligible.includes(p.slug)) {
                            nextSlugs = eligible.filter((s) => s !== p.slug);
                          } else {
                            nextSlugs = [...eligible, p.slug];
                          }
                          set('giftProductSlugs', nextSlugs);
                        };

                        return (
                          <div
                            key={p.id}
                            style={{
                              background: isIncluded ? '#fff' : '#f9fafb',
                              border: `1.5px solid ${isIncluded ? '#bbf7d0' : '#e5e7eb'}`,
                              borderRadius: 10,
                              padding: '10px 12px',
                              display: 'flex',
                              gap: 10,
                              alignItems: 'center',
                              opacity: isIncluded ? 1 : 0.65,
                              transition: 'all .15s',
                            }}
                          >
                            <img
                              src={p.image || '/img/fotos/mayonesa-vertical.webp'}
                              alt={p.name}
                              style={{
                                width: 38,
                                height: 48,
                                objectFit: 'contain',
                                borderRadius: 4,
                                background: '#fff',
                                padding: 2,
                                border: '1px solid #f4f4f5',
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <strong style={{ fontSize: 12.5, color: '#18181b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.name}
                              </strong>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', display: 'block', marginTop: 1 }}>
                                {cop(p.price)}
                              </span>

                              <div style={{ marginTop: 6 }}>
                                <Button
                                  size="sm"
                                  variant={isIncluded ? 'primary' : 'ghost'}
                                  onClick={toggleProductInBox}
                                  title={isIncluded ? 'Haz clic para retirar de la caja' : 'Haz clic para incluir en la caja'}
                                  style={{ fontSize: 11, padding: '2px 8px', height: 26 }}
                                >
                                  {isIncluded ? '✓ Habilitado en caja' : '✕ Excluido de caja'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sub-bloque 3: Textos Promocionales en Portada */}
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid var(--line)',
                      borderRadius: 12,
                      padding: '16px',
                    }}
                  >
                    <h4 style={{ margin: '0 0 14px', fontSize: 14.5, fontWeight: 700, color: '#18181b' }}>
                      3. Textos del Configurador en Portada
                    </h4>
                    <div className="bo-stack" style={{ gap: 14 }}>
                      <Field label="Antetítulo / Píldora (Kicker)" counter={(c.giftKicker || '').length} max={60}>
                        <Input
                          value={c.giftKicker ?? 'Edición Especial'}
                          maxLength={60}
                          disabled={!editable}
                          placeholder="Edición Especial"
                          onChange={(e) => set('giftKicker', e.target.value)}
                        />
                      </Field>

                      <Field label="Título del bloque de regalo" counter={c.giftTitle.length} max={80}>
                        <Input
                          value={c.giftTitle}
                          maxLength={80}
                          disabled={!editable}
                          onChange={(e) => set('giftTitle', e.target.value)}
                        />
                      </Field>

                      <Field
                        label="Texto explicativo del regalo"
                        counter={c.giftText.length}
                        max={400}
                        hint="Destaca la madera rústica, la dedicatoria y los frascos personalizables."
                      >
                        <Textarea
                          rows={3}
                          value={c.giftText}
                          maxLength={400}
                          disabled={!editable}
                          onChange={(e) => set('giftText', e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Sub-bloque 4: Condiciones de empaque y botón de prueba */}
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid var(--line)',
                      borderRadius: 12,
                      padding: '16px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 14,
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 13.5, color: '#18181b', display: 'block' }}>
                        🎁 Empaque incluido: Caja de pino con lazo (Rojo, Dorado o Natural) y tarjeta dedicatoria
                      </strong>
                      <span className="small muted">
                        Al completar la capacidad configurada ({c.giftCapacity ?? 4} frascos), el carrito registra automáticamente el empaque artesanal de regalo.
                      </span>
                    </div>

                    <LinkButton
                      href="/#caja"
                      external
                      size="md"
                      variant="primary"
                      icon="external"
                    >
                      Probar configurador en la tienda (#caja)
                    </LinkButton>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* SECCIÓN 7: GUÍA DE MARIDAJES */}
          {(viewMode === 'all' || activeTab === 'maridajes') && (
            <div id="maridajes">
              <Card
                title="7. Guía de Maridajes y Recetas Culinarias"
                description="Personaliza las recetas de autor, ocasiones de maridaje y vincula cada plato directamente a un frasco de tu catálogo de conservas."
                actions={
                  <LinkButton
                    href="/#maridajes"
                    external
                    size="sm"
                    variant="ghost"
                    icon="external"
                  >
                    Probar en tienda
                  </LinkButton>
                }
              >
                {/* Vista previa en vivo del Módulo de Maridajes */}
                {(() => {
                  const currentList: PairingItem[] = c.pairingItems && c.pairingItems.length > 0 ? c.pairingItems : DEFAULT_PAIRING_ITEMS;
                  const visibleItems = currentList.filter((it) => it.active !== false);
                  const activeItem = visibleItems.find((it) => it.id === (previewPairingId || visibleItems[0]?.id)) || visibleItems[0] || currentList[0];
                  const linkedProd = activeItem
                    ? products.find((p) => p.slug === activeItem.productSlug) ||
                      products.find((p) => String(p.id) === activeItem.productSlug) ||
                      products.find((p) => p.slug.replace(/-de-/g, '-') === (activeItem.productSlug || '').replace(/-de-/g, '-')) ||
                      null
                    : null;
                  const previewImg = activeItem?.image || linkedProd?.image || '/img/fotos/mayonesa-vertical.webp';

                  return (
                    <div className="bo-mockup-wrap">
                      <div className="bo-mockup-header">
                        <span>Vista previa en vivo del Módulo de Maridajes</span>
                        <Badge tone="blue">Guía Culinaria ({visibleItems.length} activas)</Badge>
                      </div>
                      <div style={{ padding: '24px 28px', background: '#faf8f5', borderBottom: '1px solid var(--line)' }}>
                        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 20px' }}>
                          <span className="bo-mockup-hero-tag" style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd', display: 'inline-block', marginBottom: 6 }}>
                            {c.pairingKicker || 'Inspiración en la Cocina'}
                          </span>
                          <h3 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 6px', color: '#18181b', lineHeight: 1.2 }}>
                            {c.pairingTitle || '¿Cómo disfrutar cada sabor en tu mesa?'}
                          </h3>
                          <p style={{ margin: 0, fontSize: 13.5, color: '#71717a' }}>
                            {c.pairingSubtitle || 'Nuestras conservas no son solo aderezos: son el toque secreto para transformar platos cotidianos en momentos gourmet memorables.'}
                          </p>
                        </div>

                        {/* Pestañas de maridaje interactivo */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                          {visibleItems.map((item) => {
                            const isSelected = activeItem?.id === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setPreviewPairingId(item.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  background: isSelected ? '#18181b' : '#fff',
                                  color: isSelected ? '#fff' : '#18181b',
                                  border: isSelected ? '1.5px solid #18181b' : '1.5px solid #e4e4e7',
                                  borderRadius: 999,
                                  padding: '6px 14px',
                                  fontSize: 12.5,
                                  fontWeight: 650,
                                  cursor: 'pointer',
                                  boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <span style={{ fontSize: 14 }}>{item.icon || '🧀'}</span>
                                <span>{item.title}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Tarjeta de maridaje activo */}
                        {activeItem && (
                          <div
                            style={{
                              background: '#fff',
                              border: '1px solid #e4e4e7',
                              borderRadius: 16,
                              padding: '24px',
                              display: 'grid',
                              gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
                              gap: 24,
                              alignItems: 'center',
                              boxShadow: '0 8px 24px -8px rgba(0,0,0,0.06)',
                            }}
                          >
                            <div>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#dc2626', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                                <span>✨</span>
                                <span>{activeItem.badge || 'Maridaje recomendado'}</span>
                              </div>
                              <h4 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px', color: '#18181b', lineHeight: 1.2 }}>
                                {activeItem.title}
                              </h4>
                              <p style={{ fontSize: 13.5, color: '#4b433c', margin: '0 0 8px', lineHeight: 1.5 }}>
                                <b>Maridajes y preparaciones ideales:</b> {activeItem.dish}
                              </p>
                              <p style={{ fontSize: 13, color: '#71717a', fontStyle: 'italic', margin: '0 0 16px', lineHeight: 1.5 }}>
                                “{activeItem.tip}”
                              </p>

                              {/* Ficha del frasco vinculado */}
                              <div
                                style={{
                                  background: '#fafaf9',
                                  border: '1px solid #e7e5e4',
                                  borderRadius: 12,
                                  padding: '10px 14px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: 12,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <div>
                                  <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, color: '#78716c', fontWeight: 700, display: 'block' }}>
                                    Frasco recomendado:
                                  </span>
                                  <strong style={{ fontSize: 13.5, color: '#1c1917' }}>
                                    {linkedProd ? linkedProd.name : 'Sin frasco vinculado'}
                                  </strong>
                                  {linkedProd && (
                                    <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626', display: 'block', marginTop: 1 }}>
                                      {cop(linkedProd.price)}
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <span
                                    style={{
                                      background: '#dc2626',
                                      color: '#fff',
                                      borderRadius: 6,
                                      padding: '6px 12px',
                                      fontSize: 12,
                                      fontWeight: 700,
                                      display: 'inline-block',
                                    }}
                                  >
                                    + Agregar
                                  </span>
                                  <span
                                    style={{
                                      background: 'transparent',
                                      color: '#18181b',
                                      border: '1px solid #d4d4d8',
                                      borderRadius: 6,
                                      padding: '6px 10px',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      display: 'inline-block',
                                    }}
                                  >
                                    Ver receta →
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Foto / Spotlight */}
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <div
                                style={{
                                  position: 'relative',
                                  width: 180,
                                  height: 180,
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                }}
                              >
                                <img
                                  src={previewImg}
                                  alt={activeItem.title}
                                  style={{
                                    maxWidth: '85%',
                                    maxHeight: 170,
                                    objectFit: 'contain',
                                    zIndex: 2,
                                    filter: 'drop-shadow(0 14px 18px rgba(0,0,0,0.18))',
                                  }}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    inset: '10%',
                                    borderRadius: '50%',
                                    background: 'radial-gradient(closest-side, rgba(212,32,39,0.18), transparent)',
                                    filter: 'blur(20px)',
                                    zIndex: 1,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="bo-stack" style={{ gap: 20 }}>
                  {/* Sub-bloque 1: Encabezado */}
                  <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '16px' }}>
                    <div style={{ marginBottom: 14 }}>
                      <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#18181b' }}>
                        1. Textos del Encabezado de la Sección
                      </h4>
                      <span className="small muted">
                        Antetítulo, título principal y párrafo de introducción gastronómica.
                      </span>
                    </div>

                    <div className="bo-stack" style={{ gap: 14 }}>
                      <Field label="Antetítulo / Píldora (Kicker)" counter={(c.pairingKicker || '').length} max={60}>
                        <Input
                          value={c.pairingKicker ?? 'Inspiración en la Cocina'}
                          maxLength={60}
                          disabled={!editable}
                          placeholder="Inspiración en la Cocina"
                          onChange={(e) => set('pairingKicker', e.target.value)}
                        />
                      </Field>

                      <Field label="Título principal" counter={(c.pairingTitle || '').length} max={100}>
                        <Input
                          value={c.pairingTitle ?? '¿Cómo disfrutar cada sabor en tu mesa?'}
                          maxLength={100}
                          disabled={!editable}
                          placeholder="¿Cómo disfrutar cada sabor en tu mesa?"
                          onChange={(e) => set('pairingTitle', e.target.value)}
                        />
                      </Field>

                      <Field label="Párrafo guía / Subtítulo" counter={(c.pairingSubtitle || '').length} max={400}>
                        <Textarea
                          rows={2}
                          value={c.pairingSubtitle ?? 'Nuestras conservas no son solo aderezos: son el toque secreto para transformar platos cotidianos en momentos gourmet memorables.'}
                          maxLength={400}
                          disabled={!editable}
                          placeholder="Nuestras conservas no son solo aderezos..."
                          onChange={(e) => set('pairingSubtitle', e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Sub-bloque 2: Recetas y Maridajes Culinarios */}
                  {(() => {
                    const currentList: PairingItem[] = c.pairingItems && c.pairingItems.length > 0 ? c.pairingItems : DEFAULT_PAIRING_ITEMS;
                    const updateItem = (index: number, patch: Partial<PairingItem>) => {
                      if (!editable) return;
                      const next = currentList.map((it, i) => (i === index ? { ...it, ...patch } : it));
                      set('pairingItems', next);
                    };

                    const addItem = () => {
                      if (!editable) return;
                      const defaultProd = activeCatalogProducts[0]?.slug || '';
                      const newItem: PairingItem = {
                        id: `maridaje-${Date.now()}`,
                        title: 'Nueva Receta de Autor',
                        badge: 'Nuevo Maridaje',
                        icon: '🧀',
                        dish: 'Describe aquí los acompañamientos o platos ideales',
                        tip: 'Consejo del chef o descripción sensorial del maridaje.',
                        productSlug: defaultProd,
                        image: '',
                        active: true,
                      };
                      set('pairingItems', [...currentList, newItem]);
                      setOpenPairingIndex(currentList.length);
                      setPreviewPairingId(newItem.id);
                    };

                    const removeItem = async (index: number) => {
                      if (!editable) return;
                      if (currentList.length <= 1) {
                        toast('Debes mantener al menos una receta en la guía de maridajes.', 'error');
                        return;
                      }
                      const toDelete = currentList[index];
                      const ok = await confirm({
                        title: '¿Eliminar receta?',
                        body: `¿Estás seguro de que deseas eliminar "${toDelete.title || 'esta receta'}"?`,
                        confirm: 'Eliminar receta',
                        cancel: 'Cancelar',
                        danger: true,
                      });
                      if (!ok) return;
                      const next = currentList.filter((_, i) => i !== index);
                      set('pairingItems', next);
                      if (openPairingIndex === index) {
                        setOpenPairingIndex(null);
                      }
                    };

                    const moveItem = (index: number, dir: 'up' | 'down') => {
                      if (!editable) return;
                      const targetIdx = dir === 'up' ? index - 1 : index + 1;
                      if (targetIdx < 0 || targetIdx >= currentList.length) return;
                      const next = [...currentList];
                      const [removed] = next.splice(index, 1);
                      next.splice(targetIdx, 0, removed);
                      set('pairingItems', next);
                      setOpenPairingIndex(targetIdx);
                    };

                    const resetDefaults = async () => {
                      if (!editable) return;
                      const ok = await confirm({
                        title: '¿Restablecer sugerencias de fábrica?',
                        body: 'Se reemplazarán las recetas personalizadas por las 5 recetas recomendadas por defecto.',
                        confirm: 'Restablecer',
                        cancel: 'Cancelar',
                      });
                      if (!ok) return;
                      set('pairingItems', DEFAULT_PAIRING_ITEMS);
                      setOpenPairingIndex(0);
                      setPreviewPairingId(DEFAULT_PAIRING_ITEMS[0].id);
                    };

                    return (
                      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '16px' }}>
                        <div className="bo-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#18181b' }}>
                              2. Recetas, Ocasiones de Consumo y Frascos Vinculados ({currentList.length} recetas)
                            </h4>
                            <span className="small muted" style={{ display: 'block', marginTop: 2 }}>
                              Crea o edita las pestañas de maridaje y asócialas a cualquier frasco de tu catálogo.
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <Button size="sm" variant="ghost" onClick={resetDefaults} disabled={!editable} title="Cargar los 5 maridajes sugeridos de fábrica">
                              Restablecer sugerencias
                            </Button>
                            <LinkButton href="/admin/productos?nuevo=1" size="sm" variant="ghost" icon="plus">
                              + Crear nuevo frasco
                            </LinkButton>
                            <Button size="sm" variant="primary" icon="plus" onClick={addItem} disabled={!editable}>
                              + Agregar receta / maridaje
                            </Button>
                          </div>
                        </div>

                        {/* Guía explicativa para el usuario */}
                        <div
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            padding: '12px 14px',
                            marginBottom: 14,
                            fontSize: 13,
                            color: '#334155',
                            lineHeight: 1.5,
                          }}
                        >
                          <strong>💡 ¿Cómo funciona la asociación con productos?</strong>
                          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                            <li>Cada receta tiene su <b>icono / emoji</b> y <b>título</b> que se muestra en las pestañas interactivas del eCommerce.</li>
                            <li>En el selector <b>“Frasco del catálogo vinculado”</b> puedes elegir qué conserva recomendar. El cliente verá su precio y podrá agregarla al carrito al instante.</li>
                            <li>Si creas una nueva conserva en el catálogo, aparecerá automáticamente disponible en el selector de frascos.</li>
                          </ul>
                        </div>

                        {/* Listado de tarjetas de recetas */}
                        <div className="bo-stack" style={{ gap: 12 }}>
                          {currentList.map((item, index) => {
                            const isExpanded = openPairingIndex === index;
                            const linkedProd =
                              activeCatalogProducts.find((p) => p.slug === item.productSlug) ||
                              activeCatalogProducts.find((p) => String(p.id) === item.productSlug) ||
                              activeCatalogProducts.find((p) => p.slug.replace(/-de-/g, '-') === (item.productSlug || '').replace(/-de-/g, '-')) ||
                              null;
                            const quickEmojis = ['🍔', '🧀', '🥩', '🥖', '🫓', '🍕', '🥗', '🌮', '🍳', '🍷', '🌶️'];

                            return (
                              <div
                                key={item.id || index}
                                style={{
                                  border: isExpanded ? '1.5px solid var(--accent)' : '1px solid var(--line)',
                                  borderRadius: 12,
                                  background: item.active ? '#ffffff' : '#fcfcfc',
                                  opacity: item.active ? 1 : 0.8,
                                  overflow: 'hidden',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {/* Barra cabecera de la tarjeta */}
                                <div
                                  style={{
                                    padding: '12px 16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 12,
                                    background: isExpanded ? '#fafaf9' : '#ffffff',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                  }}
                                  onClick={() => setOpenPairingIndex(isExpanded ? null : index)}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: '#a1a1aa', width: 22 }}>
                                      #{index + 1}
                                    </span>
                                    <span style={{ fontSize: 22 }}>{item.icon || '🧀'}</span>
                                    <strong style={{ fontSize: 14.5, color: '#18181b' }}>
                                      {item.title || 'Receta sin título'}
                                    </strong>
                                    <Badge tone="amber">{item.badge || 'Maridaje'}</Badge>
                                    {linkedProd ? (
                                      <span
                                        style={{
                                          fontSize: 12,
                                          background: '#f1f5f9',
                                          color: '#334155',
                                          padding: '2px 8px',
                                          borderRadius: 6,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                        }}
                                      >
                                        <span>🥫</span>
                                        <b>{linkedProd.name}</b> ({cop(linkedProd.price)})
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: 12, background: '#fef2f2', color: '#b91c1c', padding: '2px 8px', borderRadius: 6 }}>
                                        ⚠️ Sin frasco vinculado
                                      </span>
                                    )}
                                  </div>

                                  <div
                                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {/* Botón de visibilidad */}
                                    <button
                                      type="button"
                                      disabled={!editable}
                                      onClick={() => updateItem(index, { active: !item.active })}
                                      style={{
                                        border: '1px solid var(--line)',
                                        background: item.active ? '#dcfce7' : '#f4f4f5',
                                        color: item.active ? '#15803d' : '#71717a',
                                        borderRadius: 6,
                                        padding: '4px 8px',
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                      title={item.active ? 'Receta visible en la tienda. Haz clic para pausar.' : 'Receta oculta. Haz clic para activar.'}
                                    >
                                      {item.active ? '✓ Visible' : '✕ Oculto'}
                                    </button>

                                    {/* Mover arriba */}
                                    <button
                                      type="button"
                                      disabled={!editable || index === 0}
                                      onClick={() => moveItem(index, 'up')}
                                      style={{
                                        border: '1px solid var(--line)',
                                        background: '#fff',
                                        borderRadius: 6,
                                        width: 28,
                                        height: 28,
                                        fontSize: 11,
                                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                                        opacity: index === 0 ? 0.4 : 1,
                                      }}
                                      title="Subir posición"
                                    >
                                      ▲
                                    </button>

                                    {/* Mover abajo */}
                                    <button
                                      type="button"
                                      disabled={!editable || index === currentList.length - 1}
                                      onClick={() => moveItem(index, 'down')}
                                      style={{
                                        border: '1px solid var(--line)',
                                        background: '#fff',
                                        borderRadius: 6,
                                        width: 28,
                                        height: 28,
                                        fontSize: 11,
                                        cursor: index === currentList.length - 1 ? 'not-allowed' : 'pointer',
                                        opacity: index === currentList.length - 1 ? 0.4 : 1,
                                      }}
                                      title="Bajar posición"
                                    >
                                      ▼
                                    </button>

                                    {/* Eliminar */}
                                    <button
                                      type="button"
                                      disabled={!editable}
                                      onClick={() => removeItem(index)}
                                      style={{
                                        border: '1px solid #fee2e2',
                                        background: '#fff',
                                        color: '#ef4444',
                                        borderRadius: 6,
                                        width: 28,
                                        height: 28,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                      }}
                                      title="Eliminar esta receta"
                                    >
                                      🗑️
                                    </button>

                                    {/* Expandir / Colapsar */}
                                    <button
                                      type="button"
                                      onClick={() => setOpenPairingIndex(isExpanded ? null : index)}
                                      style={{
                                        border: '1px solid var(--line)',
                                        background: '#fff',
                                        borderRadius: 6,
                                        padding: '4px 8px',
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {isExpanded ? 'Cerrar ▲' : 'Editar ✏️'}
                                    </button>
                                  </div>
                                </div>

                                {/* Formulario expandido */}
                                {isExpanded && (
                                  <div style={{ padding: '16px', borderTop: '1px solid var(--line)', background: '#ffffff' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 14 }}>
                                      {/* Frasco vinculado */}
                                      <Field
                                        label="Frasco del catálogo vinculado"
                                        hint="Producto que el cliente podrá agregar al carrito al ver este plato."
                                      >
                                        <select
                                          disabled={!editable}
                                          value={item.productSlug}
                                          onChange={(e) => {
                                            const chosenSlug = e.target.value;
                                            updateItem(index, { productSlug: chosenSlug });
                                          }}
                                          style={{
                                            width: '100%',
                                            height: 38,
                                            padding: '0 10px',
                                            borderRadius: 8,
                                            border: '1px solid var(--line)',
                                            background: '#fff',
                                            fontSize: 13.5,
                                            fontFamily: 'inherit',
                                          }}
                                        >
                                          <option value="">-- Sin frasco vinculado --</option>
                                          {activeCatalogProducts.map((p) => (
                                            <option key={p.slug} value={p.slug}>
                                              {p.name} · {cop(p.price)}
                                            </option>
                                          ))}
                                        </select>
                                      </Field>

                                      {/* Título de la receta */}
                                      <Field
                                        label="Título de la receta o plato"
                                        counter={(item.title || '').length}
                                        max={140}
                                        hint="Nombre que se muestra en la pestaña y en la cabecera del maridaje."
                                      >
                                        <Input
                                          value={item.title}
                                          maxLength={140}
                                          disabled={!editable}
                                          placeholder="Ej: La consentida · Mayonesa de Pimentón"
                                          onChange={(e) => updateItem(index, { title: e.target.value })}
                                        />
                                      </Field>

                                      {/* Ocasión / Etiqueta */}
                                      <Field
                                        label="Etiqueta / Ocasión (Badge)"
                                        counter={(item.badge || '').length}
                                        max={80}
                                        hint="Ej: La consentida, Para la tabla, Domingo de asado, Receta rápida."
                                      >
                                        <Input
                                          value={item.badge}
                                          maxLength={80}
                                          disabled={!editable}
                                          placeholder="Ej: Para la tabla"
                                          onChange={(e) => updateItem(index, { badge: e.target.value })}
                                        />
                                      </Field>

                                      {/* Icono / Emoji */}
                                      <Field
                                        label="Icono / Emoji de la pestaña"
                                        hint="Elige un emoji rápido o escribe el que prefieras."
                                      >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                          <Input
                                            value={item.icon || '🧀'}
                                            maxLength={10}
                                            disabled={!editable}
                                            style={{ width: 80, fontSize: 18, textAlign: 'center' }}
                                            onChange={(e) => updateItem(index, { icon: e.target.value })}
                                          />
                                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {quickEmojis.map((emoji) => (
                                              <button
                                                key={emoji}
                                                type="button"
                                                disabled={!editable}
                                                onClick={() => updateItem(index, { icon: emoji })}
                                                style={{
                                                  background: item.icon === emoji ? '#18181b' : '#f4f4f5',
                                                  color: item.icon === emoji ? '#fff' : '#18181b',
                                                  border: 'none',
                                                  borderRadius: 6,
                                                  padding: '4px 7px',
                                                  fontSize: 15,
                                                  cursor: 'pointer',
                                                }}
                                              >
                                                {emoji}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      </Field>
                                    </div>

                                    {/* Maridajes y preparaciones ideales */}
                                    <Field
                                      label="Maridajes y preparaciones ideales"
                                      counter={(item.dish || '').length}
                                      max={400}
                                      hint="Lista de platos, cortes o acompañamientos ideales para este maridaje."
                                    >
                                      <Textarea
                                        rows={2}
                                        value={item.dish}
                                        maxLength={400}
                                        disabled={!editable}
                                        placeholder="Ej: Papa criolla, sándwiches, hamburguesas, mazorca asada"
                                        onChange={(e) => updateItem(index, { dish: e.target.value })}
                                      />
                                    </Field>

                                    {/* Consejo del chef */}
                                    <Field
                                      label="Consejo del chef / Frase inspiradora (Cata sensorial)"
                                      counter={(item.tip || '').length}
                                      max={500}
                                      hint="Frase descriptiva entre comillas que invita a degustar."
                                    >
                                      <Textarea
                                        rows={2}
                                        value={item.tip}
                                        maxLength={500}
                                        disabled={!editable}
                                        placeholder="Ej: Cremosa con todo el sabor del pimentón tostado al fuego, perfecta para untar sin moderación."
                                        onChange={(e) => updateItem(index, { tip: e.target.value })}
                                      />
                                    </Field>

                                    {/* Foto personalizada opcional */}
                                    <Field
                                      label="Foto personalizada del plato o receta (Opcional)"
                                      hint="Si lo dejas vacío, se usará automáticamente la foto del frasco vinculado en la tienda."
                                    >
                                      <Input
                                        value={item.image || ''}
                                        disabled={!editable}
                                        placeholder="https://... o /img/fotos/receta.webp"
                                        onChange={(e) => updateItem(index, { image: e.target.value })}
                                      />
                                    </Field>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </Card>
            </div>
          )}

          {/* SECCIÓN 8: TESTIMONIOS */}
          {(viewMode === 'all' || activeTab === 'testimonios') && (
            <div id="testimonios">
              <Card
                title={`8. Testimonios y Reseñas de Clientes · ${(c.testimonials || []).length}/12`}
                description="Gestiona las opiniones de comensales reales que aparecen en la portada de la tienda. Los cambios se reflejan en vivo en el sitio web."
                actions={
                  editable && (c.testimonials || []).length < 12 && (
                    <Button
                      size="sm"
                      variant="primary"
                      icon="plus"
                      onClick={() => {
                        const nuevo: Testimonial = {
                          name: '',
                          city: 'Bogotá D.C.',
                          stars: 5,
                          product: 'Pimentones Confitados',
                          quote: '',
                          verified: true,
                        };
                        set('testimonials', [nuevo, ...(c.testimonials || [])]);
                        setOpenTestimonial(0);
                      }}
                    >
                      Añadir testimonio
                    </Button>
                  )
                }
              >
                <div className="bo-stack" style={{ gap: 12 }}>
                  {(c.testimonials || []).map((t, idx) => {
                    const isOpen = openTestimonial === idx;
                    const updateT = (k: keyof Testimonial, v: any) => {
                      const list = [...(c.testimonials || [])];
                      list[idx] = { ...list[idx], [k]: v };
                      set('testimonials', list);
                    };

                    return (
                      <div key={idx} className="bo-box" style={{ padding: 14 }}>
                        <div
                          className="bo-row"
                          style={{ justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                          onClick={() => setOpenTestimonial(isOpen ? null : idx)}
                        >
                          <div className="bo-row" style={{ gap: 10, alignItems: 'center' }}>
                            <span style={{ color: '#d97706', fontSize: 13 }}>{'★'.repeat(t.stars)}</span>
                            <b>{t.name || <span className="muted">Nuevo testimonio...</span>}</b>
                            <span className="small muted">· {t.city}</span>
                            {t.verified && <Badge tone="green">Verificado</Badge>}
                          </div>
                          <div className="bo-row" style={{ gap: 6 }} onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              icon="arrowUp"
                              disabled={!editable || idx === 0}
                              onClick={() => moveTestimonial(idx, -1)}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              icon="arrowDown"
                              disabled={!editable || idx === (c.testimonials || []).length - 1}
                              onClick={() => moveTestimonial(idx, 1)}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              icon="trash"
                              disabled={!editable}
                              onClick={() => removeTestimonial(idx)}
                            />
                          </div>
                        </div>

                        {isOpen && (
                          <div className="bo-stack" style={{ gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                            <div className="bo-row" style={{ gap: 12 }}>
                              <div style={{ flex: 1 }}>
                                <Field label="Nombre del cliente" counter={t.name.length} max={80}>
                                  <Input
                                    value={t.name}
                                    maxLength={80}
                                    disabled={!editable}
                                    placeholder="Ej: Laura Gómez"
                                    onChange={(e) => updateT('name', e.target.value)}
                                  />
                                </Field>
                              </div>
                              <div style={{ flex: 1 }}>
                                <Field label="Ciudad" counter={t.city.length} max={80}>
                                  <Input
                                    value={t.city}
                                    maxLength={80}
                                    disabled={!editable}
                                    placeholder="Ej: Bogotá D.C."
                                    onChange={(e) => updateT('city', e.target.value)}
                                  />
                                </Field>
                              </div>
                            </div>

                            <Field label="Producto sobre el que opina" counter={t.product.length} max={80}>
                              <Input
                                value={t.product}
                                maxLength={80}
                                disabled={!editable}
                                placeholder="Ej: Mayonesa de Pimentón"
                                onChange={(e) => updateT('product', e.target.value)}
                              />
                            </Field>

                            <Field label="Cita / Opinión del cliente" counter={t.quote.length} max={400}>
                              <Textarea
                                rows={3}
                                value={t.quote}
                                maxLength={400}
                                disabled={!editable}
                                placeholder="Escribe lo que el comensal destacó del sabor o la experiencia..."
                                onChange={(e) => updateT('quote', e.target.value)}
                              />
                            </Field>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* SECCIÓN 9: PREGUNTAS FRECUENTES (FAQ) */}
          {(viewMode === 'all' || activeTab === 'faq') && (
            <div id="faq">
              <Card
                title={`9. Preguntas Frecuentes (FAQ) · ${(c.faq || []).length}/25`}
                description="Resuelve dudas sobre envíos, refrigeración y métodos de pago antes de que el cliente compre."
                actions={
                  editable && (c.faq || []).length < 25 && (
                    <Button
                      size="sm"
                      variant="primary"
                      icon="plus"
                      onClick={() => {
                        const nuevo: FAQ = { q: '', a: '' };
                        set('faq', [nuevo, ...(c.faq || [])]);
                        setOpenFaq(0);
                      }}
                    >
                      Añadir pregunta
                    </Button>
                  )
                }
              >
                <div className="bo-stack" style={{ gap: 16 }}>
                  {/* Encabezado editable del bloque FAQ */}
                  <div className="bo-box" style={{ padding: 14, background: '#faf8f5' }}>
                    <div className="bo-row" style={{ gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <Field label="Antetítulo / Kicker" counter={(c.faqKicker || '').length} max={60}>
                          <Input
                            value={c.faqKicker ?? 'Dudas Resueltas'}
                            maxLength={60}
                            disabled={!editable}
                            placeholder="Dudas Resueltas"
                            onChange={(e) => set('faqKicker', e.target.value)}
                          />
                        </Field>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Field label="Título del acordeón" counter={(c.faqTitle || '').length} max={80}>
                          <Input
                            value={c.faqTitle ?? 'Preguntas frecuentes'}
                            maxLength={80}
                            disabled={!editable}
                            placeholder="Preguntas frecuentes"
                            onChange={(e) => set('faqTitle', e.target.value)}
                          />
                        </Field>
                      </div>
                    </div>
                    <Field label="Subtítulo descriptivo" counter={(c.faqSubtitle || '').length} max={300}>
                      <Input
                        value={c.faqSubtitle ?? 'Todo sobre nuestros envíos, tiempos de entrega y conservación en casa.'}
                        maxLength={300}
                        disabled={!editable}
                        placeholder="Todo sobre nuestros envíos, tiempos de entrega y conservación en casa."
                        onChange={(e) => set('faqSubtitle', e.target.value)}
                      />
                    </Field>
                  </div>



                  {/* Lista de preguntas */}
                  <div className="bo-stack" style={{ gap: 10 }}>
                    {(c.faq || []).map((f, idx) => {
                      const isOpen = openFaq === idx;
                      const updateFaq = (field: 'q' | 'a', val: string) => {
                        const list = [...(c.faq || [])];
                        list[idx] = { ...list[idx], [field]: val };
                        set('faq', list);
                      };

                      return (
                        <div key={idx} className="bo-box" style={{ padding: 14 }}>
                          <div
                            className="bo-row"
                            style={{ justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => setOpenFaq(isOpen ? null : idx)}
                          >
                            <span style={{ fontWeight: 600, fontSize: 13.5 }}>
                              {f.q || <span className="muted">Pregunta sin título...</span>}
                            </span>
                            <div className="bo-row" style={{ gap: 6 }} onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                icon="arrowUp"
                                disabled={!editable || idx === 0}
                                onClick={() => moveFaq(idx, -1)}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                icon="arrowDown"
                                disabled={!editable || idx === (c.faq || []).length - 1}
                                onClick={() => moveFaq(idx, 1)}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                icon="trash"
                                disabled={!editable}
                                onClick={() => removeFaq(idx)}
                              />
                            </div>
                          </div>

                          {isOpen && (
                            <div className="bo-stack" style={{ gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                              <Field label="Pregunta" counter={f.q.length} max={160}>
                                <Input
                                  value={f.q}
                                  maxLength={160}
                                  disabled={!editable}
                                  placeholder="¿Cuánto dura el frasco una vez abierto?"
                                  onChange={(e) => updateFaq('q', e.target.value)}
                                />
                              </Field>
                              <Field label="Respuesta clara y detallada" counter={f.a.length} max={600}>
                                <Textarea
                                  rows={3}
                                  value={f.a}
                                  maxLength={600}
                                  disabled={!editable}
                                  placeholder="Explica con calidez la respuesta..."
                                  onChange={(e) => updateFaq('a', e.target.value)}
                                />
                              </Field>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* SECCIÓN 10: CLUB Y BOLETÍN (NEWSLETTER) */}
          {(viewMode === 'all' || activeTab === 'boletin') && (
            <div id="boletin">
              <Card
                title="10. Club y Boletín del Fogón (Newsletter)"
                description="Textos de la caja de suscripción, aviso de privacidad Ley 1581 (Habeas Data) y acceso directo a la lista de inscritos."
                actions={
                  <LinkButton size="sm" variant="secondary" icon="users" href="/admin/clientes?vista=suscriptores">
                    Ver lista de inscritos
                  </LinkButton>
                }
              >
                <div className="bo-mockup-wrap">
                  <div className="bo-mockup-header">
                    <span>Vista previa del Boletín</span>
                    <Badge tone="blue">Captación & Ley 1581</Badge>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #a51a1f 0%, #821014 48%, #52090c 100%)', padding: 28, color: '#ffffff', borderRadius: 20 }}>
                    <span className="bo-mockup-hero-tag" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff6e8', borderColor: 'rgba(255,255,255,0.3)' }}>
                      {c.newsletterKicker || '✦ Club Privado del Fogón'}
                    </span>
                    <h3 style={{ fontSize: 22, fontWeight: 800, margin: '8px 0 6px', color: '#fff' }}>
                      {c.newsletterTitle || 'Únete a La Cajita'}
                    </h3>
                    <p style={{ margin: '0 0 10px', fontSize: 13, color: 'rgba(255,255,255,0.92)' }}>
                      {c.newsletterSubtitle || 'Tandas recién salidas del fogón, recetas de autor y beneficios exclusivos antes que nadie.'}
                    </p>
                    <span style={{ fontSize: 12, color: '#ffe6e4', display: 'block', marginBottom: 12 }}>
                      {c.newsletterNote || 'Sin spam · Solo cocina honesta y avisos de tandas frescas'}
                    </span>
                    <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.22)', borderRadius: 10, fontSize: 11.5, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>☑</span>
                      <span>{c.newsletterConsentText || 'Autorizo el tratamiento de mis datos personales según la Política de Privacidad (Ley 1581 de 2012).'}</span>
                    </div>
                  </div>
                </div>

                <div className="bo-stack" style={{ gap: 16 }}>
                  <div className="bo-row bo-box" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 14, gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="bo-row" style={{ gap: 10, alignItems: 'center' }}>
                      <Icon name="shield" size={18} style={{ color: '#16a34a' }} />
                      <div>
                        <b style={{ color: '#15803d', display: 'block' }}>Cumplimiento Ley 1581 de 2012 (Habeas Data)</b>
                        <span style={{ fontSize: 12, color: '#166534' }}>Cada suscriptor registra fecha y hora de autorización expresa para recibir boletines.</span>
                      </div>
                    </div>
                    <LinkButton size="sm" variant="secondary" icon="external" href="/admin/clientes?vista=suscriptores">
                      Gestionar suscriptores
                    </LinkButton>
                  </div>

                  <Field label="Insignia / Badge" counter={(c.newsletterKicker || '').length} max={60}>
                    <Input
                      value={c.newsletterKicker ?? '✦ Club Privado del Fogón'}
                      maxLength={60}
                      disabled={!editable}
                      onChange={(e) => set('newsletterKicker', e.target.value)}
                    />
                  </Field>

                  <Field label="Título de invitación" counter={(c.newsletterTitle || '').length} max={100}>
                    <Input
                      value={c.newsletterTitle ?? 'Únete a La Cajita'}
                      maxLength={100}
                      disabled={!editable}
                      onChange={(e) => set('newsletterTitle', e.target.value)}
                    />
                  </Field>

                  <Field label="Subtítulo / Beneficios" counter={(c.newsletterSubtitle || '').length} max={300}>
                    <Textarea
                      rows={2}
                      value={c.newsletterSubtitle ?? 'Tandas recién salidas del fogón, recetas de autor y beneficios exclusivos antes que nadie.'}
                      maxLength={300}
                      disabled={!editable}
                      onChange={(e) => set('newsletterSubtitle', e.target.value)}
                    />
                  </Field>

                  <Field label="Nota de confianza (Anti-spam)" counter={(c.newsletterNote || '').length} max={160}>
                    <Input
                      value={c.newsletterNote ?? 'Sin spam · Solo cocina honesta y avisos de tandas frescas'}
                      maxLength={160}
                      disabled={!editable}
                      onChange={(e) => set('newsletterNote', e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Texto de autorización de datos (Ley 1581 de 2012)"
                    counter={(c.newsletterConsentText || '').length}
                    max={250}
                    hint="Aparece con el checkbox de autorización en texto blanco de alto contraste."
                  >
                    <Input
                      value={c.newsletterConsentText ?? 'Autorizo el tratamiento de mis datos personales según la Política de Privacidad (Ley 1581 de 2012).'}
                      maxLength={250}
                      disabled={!editable}
                      onChange={(e) => set('newsletterConsentText', e.target.value)}
                    />
                  </Field>
                </div>
              </Card>
            </div>
          )}

          {/* SECCIÓN 11: GARANTÍAS DEL PIE DE PÁGINA (RIBBON) */}
          {(viewMode === 'all' || activeTab === 'footer_ribbon') && (
            <div id="footer_ribbon">
              <Card
                title={`11. Garantías del Pie de Página · ${(c.footerPillars || []).length} tarjetas`}
                description="Cintillo de tarjetas sobre el pie de página. Puedes agregar, editar, reordenar e inhabilitar tarjetas individualmente."
                actions={
                  editable && (
                    <Button
                      size="sm"
                      variant="primary"
                      icon="plus"
                      onClick={() => {
                        const nuevo: FooterPillar = {
                          id: `fp-${Date.now()}`,
                          icon: '✨',
                          title: '',
                          desc: '',
                          active: true,
                        };
                        set('footerPillars', [...(c.footerPillars || []), nuevo]);
                        setOpenPillar((c.footerPillars || []).length);
                      }}
                    >
                      Añadir garantía
                    </Button>
                  )
                }
              >
                <div className="bo-stack" style={{ gap: 16 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={c.footerRibbonEnabled !== false}
                      disabled={!editable}
                      onChange={(e) => set('footerRibbonEnabled', e.target.checked)}
                    />
                    Mostrar cintillo de garantías en el pie de página
                  </label>

                  {/* Vista previa de las tarjetas activas */}
                  <div className="bo-mockup-wrap">
                    <div className="bo-mockup-header">
                      <span>Vista previa de las garantías</span>
                      <Badge tone={c.footerRibbonEnabled !== false ? 'green' : 'gray'}>
                        {c.footerRibbonEnabled !== false ? 'Visible' : 'Oculto'}
                      </Badge>
                    </div>
                    <div style={{ background: '#18181b', padding: 18, borderRadius: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      {(c.footerPillars || [])
                        .filter((p) => p.active !== false)
                        .map((p, idx) => (
                          <div key={p.id || idx} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 14px', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: 20 }}>{p.icon || '🌶️'}</span>
                            <div>
                              <b style={{ color: '#fff', fontSize: 13, display: 'block' }}>{p.title || 'Título de garantía'}</b>
                              <span style={{ color: '#a1a1aa', fontSize: 11.5, display: 'block', marginTop: 2 }}>{p.desc || 'Descripción...'}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Lista de tarjetas con edición */}
                  <div className="bo-stack" style={{ gap: 10 }}>
                    {(c.footerPillars || []).map((p, idx) => {
                      const isOpen = openPillar === idx;
                      const updateP = (k: keyof FooterPillar, v: any) => {
                        const list = [...(c.footerPillars || [])];
                        list[idx] = { ...list[idx], [k]: v };
                        set('footerPillars', list);
                      };

                      return (
                        <div key={p.id || idx} className="bo-box" style={{ padding: 14 }}>
                          <div
                            className="bo-row"
                            style={{ justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => setOpenPillar(isOpen ? null : idx)}
                          >
                            <div className="bo-row" style={{ gap: 12, alignItems: 'center' }}>
                              <span style={{ fontSize: 20 }}>{p.icon || '🌶️'}</span>
                              <div>
                                <b style={{ fontSize: 13.5 }}>{p.title || <span className="muted">Nueva garantía...</span>}</b>
                                <span className="small muted" style={{ display: 'block' }}>{p.desc ? p.desc.slice(0, 60) + '…' : 'Sin descripción'}</span>
                              </div>
                              {p.active === false ? (
                                <Badge tone="gray">Inhabilitada</Badge>
                              ) : (
                                <Badge tone="green">Activa</Badge>
                              )}
                            </div>
                            <div className="bo-row" style={{ gap: 6 }} onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                icon="arrowUp"
                                disabled={!editable || idx === 0}
                                onClick={() => movePillar(idx, -1)}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                icon="arrowDown"
                                disabled={!editable || idx === (c.footerPillars || []).length - 1}
                                onClick={() => movePillar(idx, 1)}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                icon="trash"
                                disabled={!editable}
                                onClick={() => removePillar(idx)}
                              />
                            </div>
                          </div>

                          {isOpen && (
                            <div className="bo-stack" style={{ gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                              <div className="bo-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                                  <input
                                    type="checkbox"
                                    checked={p.active !== false}
                                    disabled={!editable}
                                    onChange={(e) => updateP('active', e.target.checked)}
                                  />
                                  Tarjeta activa en la tienda
                                </label>
                              </div>

                              <div className="bo-row" style={{ gap: 12 }}>
                                <div style={{ width: 110 }}>
                                  <Field label="Emoji / Ícono">
                                    <Input
                                      value={p.icon || ''}
                                      maxLength={10}
                                      disabled={!editable}
                                      placeholder="🌶️"
                                      onChange={(e) => updateP('icon', e.target.value)}
                                    />
                                  </Field>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <Field label="Título de la tarjeta" counter={(p.title || '').length} max={80}>
                                    <Input
                                      value={p.title || ''}
                                      maxLength={80}
                                      disabled={!editable}
                                      placeholder="Ej: Cosecha Seleccionada"
                                      onChange={(e) => updateP('title', e.target.value)}
                                    />
                                  </Field>
                                </div>
                              </div>

                              <Field label="Descripción de la garantía" counter={(p.desc || '').length} max={200}>
                                <Textarea
                                  rows={2}
                                  value={p.desc || ''}
                                  maxLength={200}
                                  disabled={!editable}
                                  placeholder="Explica el beneficio con claridad y calidez..."
                                  onChange={(e) => updateP('desc', e.target.value)}
                                />
                              </Field>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* SECCIÓN 12: PIE DE PÁGINA & TALLER */}
          {(viewMode === 'all' || activeTab === 'footer_body') && (
            <div id="footer_body">
              <Card
                title="12. Pie de Página & Taller en Bogotá"
                description="Manifiesto de la marca, insignia de origen y estado en vivo del taller en Bogotá."
              >
                <div className="bo-mockup-wrap">
                  <div className="bo-mockup-header">
                    <span>Vista previa del pie de página</span>
                    <Badge tone="blue">Footer World-Class</Badge>
                  </div>
                  <div style={{ background: '#121214', padding: 24, borderRadius: 16, color: '#fff' }}>
                    <div style={{ maxWidth: 440 }}>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: '#d4d4d8', margin: '0 0 14px' }}>
                        {c.footerManifesto || 'Conservas de pimentón de autor elaboradas a mano en tandas cortas.'}
                      </p>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: 'rgba(255,255,255,0.08)', borderRadius: 999, fontSize: 12, color: '#fafafa' }}>
                        <span>🇨🇴</span>
                        <span>{c.footerOriginBadge || 'Hecho con orgullo y fogón en Bogotá, Colombia'}</span>
                      </div>
                    </div>
                    {c.footerWorkshopActive !== false && (
                      <div style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 999, fontSize: 12, color: '#86efac' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                        <span>{c.footerWorkshopStatus || 'Taller activo · Despachando hoy'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bo-stack" style={{ gap: 16 }}>
                  <Field
                    label="Manifiesto / Reseña de marca"
                    counter={(c.footerManifesto || '').length}
                    max={500}
                    hint="Párrafo principal bajo el logo en el pie de página."
                  >
                    <Textarea
                      rows={3}
                      value={c.footerManifesto ?? 'Conservas de pimentón de autor elaboradas a mano en tandas cortas. Honramos el tiempo de la cocina tradicional para transformar momentos sencillos en banquetes memorables.'}
                      maxLength={500}
                      disabled={!editable}
                      onChange={(e) => set('footerManifesto', e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Insignia de origen nacional"
                    counter={(c.footerOriginBadge || '').length}
                    max={120}
                    hint="Etiqueta junto a la bandera colombiana."
                  >
                    <Input
                      value={c.footerOriginBadge ?? 'Hecho con orgullo y fogón en Bogotá, Colombia'}
                      maxLength={120}
                      disabled={!editable}
                      onChange={(e) => set('footerOriginBadge', e.target.value)}
                    />
                  </Field>

                  <div className="bo-box" style={{ padding: 14 }}>
                    <div className="bo-stack" style={{ gap: 12 }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={c.footerWorkshopActive !== false}
                          disabled={!editable}
                          onChange={(e) => set('footerWorkshopActive', e.target.checked)}
                        />
                        Mostrar píldora de estado del taller en vivo
                      </label>

                      <Field
                        label="Texto del estado del taller"
                        counter={(c.footerWorkshopStatus || '').length}
                        max={100}
                        hint="Ej: Taller activo · Despachando hoy / Cerrado por festivo."
                      >
                        <Input
                          value={c.footerWorkshopStatus ?? 'Taller activo · Despachando hoy'}
                          maxLength={100}
                          disabled={!editable || c.footerWorkshopActive === false}
                          onChange={(e) => set('footerWorkshopStatus', e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* SECCIÓN 13: CARRITO DE COMPRAS */}
          {(viewMode === 'all' || activeTab === 'carrito') && (
            <div id="carrito">
              <Card
                title="13. Carrito de Compras (Gaveta Lateral)"
                description="Personaliza los textos de la barra de envío gratis, la sugerencia de compra (upsell), la dedicatoria de regalo y los botones de compra."
              >
                <div className="bo-stack" style={{ gap: 20 }}>
                  {/* Encabezado y Barra de Envío Gratis */}
                  <div className="bo-box" style={{ padding: 16 }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Encabezado & Barra de Envío Gratis</h4>
                    <div className="bo-stack" style={{ gap: 14 }}>
                      <Field label="Título de la gaveta" counter={(c.cartTitle || '').length} max={60}>
                        <Input
                          value={c.cartTitle ?? 'Carrito'}
                          maxLength={60}
                          disabled={!editable}
                          onChange={(e) => set('cartTitle', e.target.value)}
                        />
                      </Field>

                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={c.cartFreeShippingBarEnabled !== false}
                          disabled={!editable}
                          onChange={(e) => set('cartFreeShippingBarEnabled', e.target.checked)}
                        />
                        Mostrar barra de progreso hacia envío gratis
                      </label>

                      <Field
                        label="Mensaje al desbloquear envío gratis"
                        counter={(c.cartFreeShippingText || '').length}
                        max={120}
                        hint="Aparece cuando el subtotal alcanza el monto mínimo."
                      >
                        <Input
                          value={c.cartFreeShippingText ?? '¡Felicitaciones! Tienes Envío Gratis'}
                          maxLength={120}
                          disabled={!editable || c.cartFreeShippingBarEnabled === false}
                          onChange={(e) => set('cartFreeShippingText', e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* 1-Click Upsell "Completa tu mesa" */}
                  <div className="bo-box" style={{ padding: 16 }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Sugerencia 1-Click Upsell (&quot;Completa tu mesa&quot;)</h4>
                    <div className="bo-stack" style={{ gap: 14 }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={c.cartUpsellEnabled !== false}
                          disabled={!editable}
                          onChange={(e) => set('cartUpsellEnabled', e.target.checked)}
                        />
                        Habilitar tarjeta de sugerencia cruzada dentro del carrito
                      </label>

                      <Field label="Título de la sugerencia" counter={(c.cartUpsellTitle || '').length} max={80}>
                        <Input
                          value={c.cartUpsellTitle ?? 'Completa tu mesa'}
                          maxLength={80}
                          disabled={!editable || c.cartUpsellEnabled === false}
                          onChange={(e) => set('cartUpsellTitle', e.target.value)}
                        />
                      </Field>

                      <Field
                        label="Sabor sugerido preferido"
                        hint="Puedes elegir qué producto recomendar prioritariamente o dejarlo en automático (primer sabor no agregado)."
                      >
                        <select
                          className="bo-select"
                          value={c.cartUpsellProductSlug ?? 'auto'}
                          disabled={!editable || c.cartUpsellEnabled === false}
                          onChange={(e) => set('cartUpsellProductSlug', e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)' }}
                        >
                          <option value="auto">Automático (primer sabor que falte en el carrito)</option>
                          {products.map((p) => (
                            <option key={p.slug} value={p.slug}>
                              {p.name} ({p.slug})
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>

                  {/* Dedicatoria de Regalo */}
                  <div className="bo-box" style={{ padding: 16 }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Opción de Dedicatoria Artesanal de Regalo</h4>
                    <div className="bo-stack" style={{ gap: 14 }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={c.cartGiftEnabled !== false}
                          disabled={!editable}
                          onChange={(e) => set('cartGiftEnabled', e.target.checked)}
                        />
                        Habilitar acordeón de dedicatoria de regalo en el carrito
                      </label>

                      <div className="bo-row" style={{ gap: 12 }}>
                        <div style={{ flex: 2 }}>
                          <Field label="Título del botón desplegable" counter={(c.cartGiftTitle || '').length} max={100}>
                            <Input
                              value={c.cartGiftTitle ?? '¿Es un regalo? Dedicatoria artesanal'}
                              maxLength={100}
                              disabled={!editable || c.cartGiftEnabled === false}
                              onChange={(e) => set('cartGiftTitle', e.target.value)}
                            />
                          </Field>
                        </div>
                        <div style={{ flex: 1 }}>
                          <Field label="Insignia / Chip" counter={(c.cartGiftBadge || '').length} max={40}>
                            <Input
                              value={c.cartGiftBadge ?? 'Sin costo'}
                              maxLength={40}
                              disabled={!editable || c.cartGiftEnabled === false}
                              onChange={(e) => set('cartGiftBadge', e.target.value)}
                            />
                          </Field>
                        </div>
                      </div>

                      <Field label="Nota instructiva al abrir dedicatoria" counter={(c.cartGiftNote || '').length} max={200}>
                        <Input
                          value={c.cartGiftNote ?? 'Incluimos una tarjeta con dedicatoria en papel rústico dentro de tu pedido.'}
                          maxLength={200}
                          disabled={!editable || c.cartGiftEnabled === false}
                          onChange={(e) => set('cartGiftNote', e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Botones de Pago y Micro-Garantías */}
                  <div className="bo-box" style={{ padding: 16 }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Acciones de Pago & Garantías</h4>
                    <div className="bo-stack" style={{ gap: 14 }}>
                      <Field label="Aviso de costo de envío" counter={(c.cartShippingNote || '').length} max={160}>
                        <Input
                          value={c.cartShippingNote ?? 'Envío calculado en el siguiente paso según tu ciudad.'}
                          maxLength={160}
                          disabled={!editable}
                          onChange={(e) => set('cartShippingNote', e.target.value)}
                        />
                      </Field>

                      <Field label="Texto del botón principal de compra" counter={(c.cartCheckoutBtnText || '').length} max={80}>
                        <Input
                          value={c.cartCheckoutBtnText ?? 'Continuar al Pago'}
                          maxLength={80}
                          disabled={!editable}
                          onChange={(e) => set('cartCheckoutBtnText', e.target.value)}
                        />
                      </Field>

                      <div className="bo-row" style={{ gap: 12, alignItems: 'center' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={c.cartWhatsAppEnabled !== false}
                            disabled={!editable}
                            onChange={(e) => set('cartWhatsAppEnabled', e.target.checked)}
                          />
                          Botón de pedido por WhatsApp
                        </label>
                      </div>

                      <Field label="Texto del botón de WhatsApp" counter={(c.cartWhatsAppBtnText || '').length} max={80}>
                        <Input
                          value={c.cartWhatsAppBtnText ?? 'Prefiero pedir por WhatsApp'}
                          maxLength={80}
                          disabled={!editable || c.cartWhatsAppEnabled === false}
                          onChange={(e) => set('cartWhatsAppBtnText', e.target.value)}
                        />
                      </Field>

                      <Field label="Micro-garantías bajo los botones" counter={(c.cartGuaranteeText || '').length} max={160}>
                        <Input
                          value={c.cartGuaranteeText ?? '🌿 100% Sin Conservantes · 🚚 Despachos a toda Colombia'}
                          maxLength={160}
                          disabled={!editable}
                          onChange={(e) => set('cartGuaranteeText', e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* SECCIÓN 14: WHATSAPP FLOTANTE */}
          {(viewMode === 'all' || activeTab === 'whatsapp') && (
            <div id="whatsapp">
              <Card
                title="14. Globo de Asistencia por WhatsApp"
                description="Personaliza el globo flotante que invita a chatear directamente con el taller en la esquina de la pantalla."
              >
                <div className="bo-mockup-wrap">
                  <div className="bo-mockup-header">
                    <span>Vista previa del Globo Concierge</span>
                    <Badge tone={c.floatingChatEnabled !== false ? 'green' : 'gray'}>
                      {c.floatingChatEnabled !== false ? 'Activo' : 'Desactivado'}
                    </Badge>
                  </div>
                  <div style={{ padding: 24, background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ maxWidth: 320, background: '#ffffff', padding: 14, borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff5f5', border: '1px solid rgba(186, 30, 35, 0.2)', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {((c.floatingChatAvatar || '/img/isotipo.svg').startsWith('/') || (c.floatingChatAvatar || '').startsWith('http')) ? (
                          <img src={c.floatingChatAvatar || '/img/isotipo.svg'} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
                        ) : (
                          <span style={{ fontSize: 24 }}>{c.floatingChatAvatar || '🫑'}</span>
                        )}
                      </div>
                      <div>
                        <b style={{ display: 'block', fontSize: 13, color: '#18181b', marginBottom: 2 }}>
                          {c.floatingChatTitle || '¿Dudas con tus sabores o envíos?'}
                        </b>
                        <span style={{ display: 'block', fontSize: 11.5, color: '#64748b' }}>
                          {c.floatingChatText || 'Chatea directo con nuestro taller en Bogotá.'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bo-stack" style={{ gap: 16 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={c.floatingChatEnabled !== false}
                      disabled={!editable}
                      onChange={(e) => set('floatingChatEnabled', e.target.checked)}
                    />
                    Habilitar globo flotante de WhatsApp en la tienda
                  </label>

                  <Field label="Ícono / Avatar del Asistente" hint="Selecciona un preset oficial o ingresa la URL de una imagen">
                    <div className="bo-stack" style={{ gap: 10 }}>
                      <div className="bo-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        {[
                          { label: '🫑 Pimentón Oficial (Isotipo)', val: '/img/isotipo.svg' },
                          { label: '🫙 Frasco Confitados', val: '/pimentones_confitados.png' },
                          { label: '🏷️ Logo La Cajita', val: '/img/logo.svg' },
                        ].map((preset) => {
                          const isSel = (c.floatingChatAvatar || '/img/isotipo.svg') === preset.val;
                          return (
                            <button
                              key={preset.val}
                              type="button"
                              disabled={!editable}
                              onClick={() => set('floatingChatAvatar', preset.val)}
                              className={`bo-btn ${isSel ? 'bo-btn-primary' : 'bo-btn-secondary'}`}
                              style={{ fontSize: 12, padding: '6px 12px' }}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                      <Input
                        value={c.floatingChatAvatar ?? '/img/isotipo.svg'}
                        maxLength={300}
                        disabled={!editable}
                        placeholder="/img/isotipo.svg o URL https://..."
                        onChange={(e) => set('floatingChatAvatar', e.target.value)}
                      />
                    </div>
                  </Field>

                  <Field label="Título de la invitación" counter={(c.floatingChatTitle || '').length} max={100}>
                    <Input
                      value={c.floatingChatTitle ?? '¿Dudas con tus sabores o envíos?'}
                      maxLength={100}
                      disabled={!editable}
                      placeholder="¿Dudas con tus sabores o envíos?"
                      onChange={(e) => set('floatingChatTitle', e.target.value)}
                    />
                  </Field>

                  <Field label="Texto secundario del globo" counter={(c.floatingChatText || '').length} max={200}>
                    <Input
                      value={c.floatingChatText ?? 'Chatea directo con nuestro taller en Bogotá.'}
                      maxLength={200}
                      disabled={!editable}
                      placeholder="Chatea directo con nuestro taller en Bogotá."
                      onChange={(e) => set('floatingChatText', e.target.value)}
                    />
                  </Field>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {dirty && editable && (
        <SaveBar
          dirty={dirty}
          saving={saving}
          label={`${changedIn.size} ${changedIn.size === 1 ? 'sección con cambios pendientes' : 'secciones con cambios pendientes'}`}
          onSave={save}
          onDiscard={() => orig && setC(orig)}
        />
      )}

      {/* Simulador de tienda responsive */}
      <Drawer
        open={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        title="Simulador de Tienda en Vivo"
        subtitle="Previsualiza en tiempo real cómo lucen los cambios en pantalla completa antes o después de guardar."
        size="lg"
        footer={
          <div className="bo-row" style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div className="bo-chips">
              <button
                type="button"
                className={cls('bo-chip', simDevice === 'desktop' && 'is-active')}
                onClick={() => setSimDevice('desktop')}
              >
                <Icon name="monitor" size={13} />
                Computador
              </button>
              <button
                type="button"
                className={cls('bo-chip', simDevice === 'mobile' && 'is-active')}
                onClick={() => setSimDevice('mobile')}
              >
                <Icon name="smartphone" size={13} />
                Celular
              </button>
            </div>
            <LinkButton href="/" external icon="external" variant="ghost">
              Abrir web real
            </LinkButton>
          </div>
        }
      >
        <div style={{ maxWidth: simDevice === 'mobile' ? 380 : '100%', margin: '0 auto', transition: 'all .25s ease' }}>
          <div className="bo-mockup-wrap">
            <div className="bo-mockup-header">
              <span>{simDevice === 'desktop' ? 'Vista Pantalla Completa (Desktop)' : 'Vista Móvil (Smartphone)'}</span>
              <Badge tone="green">lacajita.co</Badge>
            </div>

            {/* Simulación Barra Superior */}
            {c.announcementEnabled !== false && (
              <div className="bo-mockup-bar" style={{ fontSize: 11, padding: 6 }}>
                <span>✨ <b>{c.announcementText || 'Cosecha artesanal en Bogotá'}</b></span>
                {c.announcementBadge && <span className="bar-pill">{c.announcementBadge}</span>}
              </div>
            )}

            {/* Simulación Portada Fiel */}
            <div
              className="bo-mockup-real-hero"
              style={{
                background: activeHeroBg,
                color: activeHeroFg,
                padding: simDevice === 'mobile' ? 20 : 32,
              }}
            >
              <div className="bo-mockup-hero-left">
                <div className="bo-mockup-meta-pill" style={{ fontSize: 10 }}>
                  <span className="dot" />
                  <span>{c.heroBadge || 'Bogotá D.C. · Lotes Cortos Hechos a Mano'}</span>
                </div>
                <div className="bo-mockup-hero-brand-kicker" style={{ fontSize: 10 }}>
                  {c.heroBrand || 'Pimentón de verdad. Sin atajos.'}
                </div>
                <div className="bo-mockup-hero-rating" style={{ fontSize: 11 }}>
                  <span>★★★★★</span>
                  <span>{c.heroRatingText || '4.9 (1.200+ mesas)'}</span>
                </div>
                <h1 className="bo-mockup-hero-headline" style={{ fontSize: simDevice === 'mobile' ? 20 : 25 }}>
                  {activeHeroProduct?.name || 'Pimentones Confitados'}
                </h1>
                <p className="bo-mockup-hero-desc" style={{ fontSize: 12 }}>
                  {activeHeroProduct?.tagline || c.tagline || 'Productos siempre frescos'}
                </p>
                <div className="bo-mockup-hero-ctas">
                  <span className="bo-mockup-btn-primary" style={{ padding: '6px 14px', fontSize: 11 }}>+ Agregar</span>
                  <span className="bo-mockup-btn-link" style={{ fontSize: 11 }}>
                    {c.heroCta || 'Ver notas de cata'} <Icon name="arrowRight" size={11} />
                  </span>
                </div>
              </div>
              {simDevice === 'desktop' && (
                <div className="bo-mockup-hero-stage">
                  <img
                    src={activeHeroProduct?.image || `/img/recortes/${activeHeroProduct?.slug || 'confitados'}.webp`}
                    alt="Frasco"
                    style={{ maxWidth: 130 }}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      if (!img.src.includes('confitados')) img.src = '/img/recortes/confitados.webp';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Simulación Pilares de Confianza */}
            <div className="bo-mockup-trust-row" style={{ padding: 12 }}>
              {(c.trustPillars || []).slice(0, 3).map((tp, i) => (
                <div key={i} className="bo-mockup-trust-card" style={{ padding: 8 }}>
                  <span style={{ color: '#16a34a' }}>
                    <Icon name={tp.icon === 'truck' ? 'truck' : tp.icon === 'lock' ? 'lock' : 'checkCircle'} size={15} />
                  </span>
                  <div>
                    <b style={{ fontSize: 11.5 }}>{tp.title}</b>
                    <span style={{ fontSize: 10 }}>{tp.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Simulación Manifiesto */}
            <div className="bo-mockup-story" style={{ padding: 20 }}>
              <span className="bo-mockup-hero-tag" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca', marginBottom: 8, display: 'inline-block', fontSize: 10 }}>
                ✨ {c.manifestoKicker || 'El Alma de Nuestro Fogón'}
              </span>
              <h3 style={{ fontSize: 18, margin: '6px 0' }}>{c.aboutTitle}</h3>
              {c.mission && (
                <div style={{ background: '#fffbeb', borderLeft: '3px solid #f59e0b', padding: '8px 12px', margin: '8px 0', borderRadius: 4 }}>
                  <p style={{ margin: 0, fontSize: 11.5, color: '#92400e', fontStyle: 'italic' }}>“{c.mission}”</p>
                </div>
              )}
              <p style={{ fontSize: 12.5, color: '#4b5563', margin: '6px 0 0' }}>{c.aboutText}</p>
            </div>

            {/* Simulación Ticker */}
            <div className="bo-mockup-ticker" style={{ padding: 10, fontSize: 11 }}>
              {c.values.map((v, i) => (
                <span key={i}>✦ {v}</span>
              ))}
            </div>

            {/* Simulación Catálogo */}
            <div style={{ padding: 20, background: '#faf8f5', borderBottom: '1px solid var(--line)' }}>
              <span className="small bo-t-amber" style={{ fontWeight: 700 }}>{c.catalogKicker || 'Frascos Individuales'}</span>
              <h4 style={{ fontSize: 16, margin: '2px 0 4px' }}>{c.catalogTitle || 'Nuestra Colección de Frascos'}</h4>
              <p style={{ fontSize: 12, color: '#71717a', margin: 0 }}>{c.catalogSubtitle}</p>
            </div>

            {/* Simulación Caja de Regalo */}
            <div className="bo-mockup-gift" style={{ margin: 16, padding: 16 }}>
              <div className="bo-mockup-gift-icon" style={{ width: 44, height: 44 }}>
                <Icon name="gift" size={20} />
              </div>
              <div>
                <span className="small bo-t-amber" style={{ fontWeight: 700 }}>{c.giftKicker || 'Edición Especial'}</span>
                <h4 style={{ margin: '0 0 2px', fontSize: 14, color: '#78350f' }}>{c.giftTitle}</h4>
                <p style={{ margin: 0, fontSize: 11.5, color: '#92400e' }}>{c.giftText}</p>
              </div>
            </div>

            {/* Simulación Slow Food */}
            <div style={{ background: '#1c1917', padding: 20, color: '#ffffff' }}>
              <span className="small bo-t-green" style={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                {c.slowKicker || 'Cocina sin Afán'}
              </span>
              <h4 style={{ fontSize: 16, margin: '4px 0 6px', color: '#fff' }}>{c.slowTitle}</h4>
              <p style={{ margin: 0, fontSize: 12, color: '#a8a29e', lineHeight: 1.5 }}>{c.slowText}</p>
            </div>

            {/* Simulación WhatsApp Flotante */}
            {c.floatingChatEnabled !== false && (
              <div style={{ padding: 12, background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: '#22c55e', color: '#fff', borderRadius: 99, padding: '6px 14px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  <Icon name="whatsapp" size={14} />
                  <span>{c.floatingChatTitle || '¿Dudas con tus sabores o envíos?'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </>
  );
}

/** Componente de píldoras / tags interactivos para valores */
function TagInput({
  values,
  onChange,
  disabled,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim().replace(/^,+|,+$/g, '');
    if (!v) return;
    if (values.includes(v)) {
      setDraft('');
      return;
    }
    if (values.length >= 16) return;
    onChange([...values, v.slice(0, 40)]);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="bo-tag-input">
      <div className="bo-tag-list">
        {values.map((v, i) => (
          <span key={i} className="bo-tag">
            {v}
            {!disabled && (
              <button
                type="button"
                className="bo-tag-remove"
                onClick={() => onChange(values.filter((_, n) => n !== i))}
                aria-label={`Eliminar ${v}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
        {!disabled && values.length < 16 && (
          <input
            type="text"
            className="bo-tag-field"
            value={draft}
            placeholder={values.length === 0 ? 'Ej: Sin conservantes, Tandas cortas...' : 'Añadir otro...'}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={add}
          />
        )}
      </div>
    </div>
  );
}
