import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { products, settings, shippingZones, content } from './schema';
import { DEPARTAMENTOS, SiteContentSchema } from '@lacajita/shared';

/** Datos iniciales. Nunca pisa datos existentes. Precios de ejemplo: ajústalos desde el admin. */
export async function seed(db: NodePgDatabase<any>) {
  await db.insert(settings).values([
    { key: 'shipping_flat', value: '12000' }, { key: 'shipping_local', value: '8000' }, { key: 'shipping_local_city', value: 'Bogotá' },
    { key: 'shipping_free_from', value: '90000' }, { key: 'whatsapp', value: '573103347621' },
    { key: 'contact_email', value: 'contacto@pimentoneslacajita.com' }, { key: 'contact_phone', value: '+57 310 334 7621' }, { key: 'contact_city', value: 'Bogotá, Colombia' }, { key: 'instagram', value: 'pimentones_la_cajita' },
    { key: 'transfer_instructions', value: 'Te enviaremos los datos de la cuenta por WhatsApp. Responde con el comprobante y tu número de pedido.' },
  ]).onConflictDoNothing();

  // Zonas de envío: Bogotá local y rápida; el resto, tarifa nacional. Se ajustan desde el admin.
  await db.insert(shippingZones).values(DEPARTAMENTOS.map((d) => d === 'Bogotá D.C.'
    ? { department: d, rate: 8000, daysMin: 1, daysMax: 2, codAvailable: true }
    : d === 'Cundinamarca' ? { department: d, rate: 10000, daysMin: 2, daysMax: 3, codAvailable: true }
    : { department: d, rate: 12000, daysMin: 2, daysMax: 5, codAvailable: false })).onConflictDoNothing();

  await db.insert(content).values({ key: 'site', value: JSON.stringify(SiteContentSchema.parse({ faq: [
    { q: '¿A dónde envían?', a: 'A toda Colombia. En Bogotá entregamos en 1 a 2 días hábiles y al resto del país en 2 a 5 días con transportadora.' },
    { q: '¿Cuánto duran los frascos?', a: 'Cerrados, en un lugar fresco y sin sol. Como no llevan conservantes, una vez abiertos van a la nevera y se disfrutan en las siguientes dos semanas.' },
    { q: '¿Cómo puedo pagar?', a: 'En línea con tarjeta, PSE, Nequi o Bancolombia a través de Wompi, por transferencia o contraentrega donde haya cobertura.' },
    { q: '¿Hacen cajas para empresas?', a: 'Sí. Escríbenos por Instagram o al correo con la cantidad y la fecha, y te armamos la propuesta.' },
  ] })) }).onConflictDoNothing();

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(products);
  if (count > 0) return;

  await db.insert(products).values([
    { slug: 'mayonesa-de-pimenton', sort: 1, price: 22000, stock: 30, kicker: 'La consentida', name: 'Mayonesa de Pimentón',
      tagline: 'Cremosa, con todo el sabor del pimentón tostado al fuego.',
      description: 'Suavemente emulsionada con aceite y huevos campesinos. Color coral, textura de nube densa y un final que huele a cocina de domingo.\n\nUna nueva experiencia para que una papa criolla se vuelva memorable, para que un sándwich eleve su sabor.\n\nHecha en lotes cortos, sin apuros ni conservantes. Solo ingredientes reales que se entienden. Untá, mezclá, bañá: donde la pongas, la comida habla más fuerte.',
      pairing: 'Papa criolla, sándwiches, hamburguesas, mazorca asada', image: '/img/recortes/mayonesa.webp' },
    { slug: 'pimentones-confitados', sort: 2, price: 24000, stock: 30, kicker: 'Para la tabla', name: 'Pimentones Confitados',
      tagline: 'Tiras de pimentón rojo y amarillo, tiernas y brillantes.',
      description: 'Hechos artesanalmente, cocinados hasta quedar tiernos y brillantes, guardando todo el dulzor de la huerta y la memoria del fogón.\n\nNo es encurtido ácido ni mermelada: es confitura salada.\n\nHecho a mano en tandas pequeñas. Cada frasco atrapa el sabor de hogar.',
      pairing: 'Quesos maduros, tablas de jamones, carnes frías, pescados', image: '/img/recortes/confitados.webp' },
    { slug: 'salsa-rustica-de-pimenton', sort: 3, price: 24000, stock: 30, kicker: 'Humo y nuez', name: 'Salsa Rústica de Pimentón',
      tagline: 'Pimentón asado y molido con nueces tostadas.',
      description: 'Agridulce y profunda. Textura rústica, untable, con trocitos de nuez que crujen y perfume a brasa y especias.\n\nHecha artesanal, en mortero y paciencia. Cada cucharada trae humo, nuez y ese ácido con balance de sabor.',
      pairing: 'Pan tostado, carnes a la brasa, verduras asadas', image: '/img/recortes/salsa.webp' },
    { slug: 'mermelada-de-pimenton', sort: 4, price: 20000, stock: 30, kicker: 'La agridulce', name: 'Mermelada de Pimentón',
      tagline: 'Agridulce y suave, cocinada a fuego lento.',
      description: 'Cocinada a fuego lento para sacar todo el sabor del pimentón. Agridulce, de sabor suave.',
      pairing: 'Quesos, carnes, galletas, tablas', image: '/img/recortes/mermelada.webp' },
  ]);
}
