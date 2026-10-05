import type { Metadata } from 'next';
import { api, DEFAULT_STORE } from '@/lib/api';
import { ContactForm } from '@/components/ContactForm';

export const metadata: Metadata = { title: 'Contáctenos', description: 'Escríbenos para pedidos de empresa, puntos de venta o cualquier duda sobre Pimentones La Cajita.' };
export const revalidate = 300;

export default async function ContactPage() {
  const store = await api.store().catch(() => DEFAULT_STORE);
  const c = store.contact;
  return (
    <section className="section contact">
      <div>
        <h1 className="h-page">Contáctenos</h1>
        <p className="muted">Pedidos para empresas, regalos corporativos, puntos de venta o cualquier duda sobre los frascos.</p>
        <ul className="contact-list">
          {store.whatsapp && <li><span>WhatsApp</span><a href={`https://wa.me/${store.whatsapp}`} target="_blank" rel="noreferrer">{c.phone || `+${store.whatsapp}`}</a></li>}
          {c.email && <li><span>Correo</span><a href={`mailto:${c.email}`}>{c.email}</a></li>}
          {c.city && <li><span>Dónde estamos</span><b>{c.city}</b></li>}
          {c.instagram && <li><span>Instagram</span><a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noreferrer">@{c.instagram}</a></li>}
        </ul>
      </div>
      <ContactForm />
    </section>
  );
}
