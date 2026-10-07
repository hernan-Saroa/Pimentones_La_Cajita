import type { Testimonial } from '@lacajita/shared';
import { Star, Check } from './icons';

interface TestimonialsProps {
  reviews?: Testimonial[];
}

export function Testimonials({ reviews }: TestimonialsProps) {
  const list = reviews && reviews.length > 0 ? reviews : [
    {
      name: 'Camila Restrepo',
      city: 'Bogotá D.C.',
      stars: 5,
      product: 'Mayonesa de Pimentón',
      quote: 'Superó todas mis expectativas. No sabe al típico aderezo industrial de supermercado: tiene la textura de una nube y un ahumado a leña espectacular.',
      verified: true,
    },
    {
      name: 'Santiago Morales',
      city: 'Medellín',
      stars: 5,
      product: 'Caja Artesanal de 4 Sabores',
      quote: 'Llevé la caja de madera de regalo para una comida familiar y fue la sensación de la mesa. Los confitados sobre queso brie volaron en 10 minutos.',
      verified: true,
    },
    {
      name: 'Andrea Peñaranda',
      city: 'Chía, Cundinamarca',
      stars: 5,
      product: 'Salsa Rústica con Nuez',
      quote: 'Qué orgullo que tengamos en Colombia productos con esta calidad. Los trocitos de nuez tostada y la textura de mortero hacen una diferencia gigante en los asados.',
      verified: true,
    },
  ];

  return (
    <section className="section testimonials-section" aria-labelledby="test-h">
      <div className="testimonials-header">
        <span className="kicker-pill">Mesas Felices en Todo el País</span>
        <h2 id="test-h">Lo que dicen quienes ya probaron La Cajita</h2>
        <div className="overall-score">
          <div className="stars-row">
            <Star /><Star /><Star /><Star /><Star />
          </div>
          <span><b>4.9 de 5</b> basado en más de 1.200 frascos entregados</span>
        </div>
      </div>

      <div className="testimonials-grid">
        {list.map((rev, i) => (
          <div key={i} className="test-card">
            <div className="test-stars">
              {Array.from({ length: rev.stars }).map((_, si) => (
                <Star key={si} width={15} height={15} />
              ))}
            </div>
            <p className="test-quote">“{rev.quote}”</p>
            <div className="test-meta">
              <div className="test-author">
                <span className="test-name">{rev.name}</span>
                <span className="test-city">{rev.city}</span>
              </div>
              <div className="test-product-tag">
                <span className="verified-badge"><Check width={11} height={11} /> Compra verificada</span>
                <span className="verified-prod">{rev.product}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
