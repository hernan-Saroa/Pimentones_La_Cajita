'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Product } from '@lacajita/shared';
import { cop } from '@lacajita/shared';
import { QtyButton } from './QtyButton';
import { Arrow, Sparkle } from './icons';

interface PairingGuideProps {
  products: Product[];
}

export function PairingGuide({ products }: PairingGuideProps) {
  const [activeTab, setActiveTab] = useState<'tabla' | 'burger' | 'asado' | 'desayuno'>('tabla');

  const pairings = {
    tabla: {
      id: 'tabla',
      title: 'La Tabla de Quesos & Vinos',
      icon: '🧀',
      dish: 'Queso Brie, Manchego, Jamón Serrano y Frutos Secos',
      slug: 'pimentones-confitados',
      tip: 'El dulzor salado y las tiras tiernas de los confitados cortan la grasa del queso y armonizan de forma inolvidable con una copa de vino.',
      badge: 'El maridaje más elogiado',
    },
    burger: {
      id: 'burger',
      title: 'La Hamburguesa de Autor',
      icon: '🍔',
      dish: 'Carne madurada, pan brioche dorado y tocineta crocante',
      slug: 'mayonesa-de-pimenton',
      tip: 'Untada en ambas tapas del pan caliente: la textura de nube y el pimentón tostado al fuego elevan cualquier sándwich a nivel de restaurante.',
      badge: 'La consentida de la casa',
    },
    asado: {
      id: 'asado',
      title: 'El Asado a la Brasa',
      icon: '🥩',
      dish: 'Punta de anca, costillas doradas, papas criollas y mazorcas',
      slug: 'salsa-rustica-de-pimenton',
      tip: 'Mortero artesanal y trocitos crujientes de nuez tostada que aportan profundidad y ahumado auténtico a los cortes al carbón.',
      badge: 'Humo y nueces',
    },
    desayuno: {
      id: 'desayuno',
      title: 'El Desayuno con Arepa',
      icon: '🫓',
      dish: 'Arepa de maíz blanco, queso campesino derretido y huevos',
      slug: 'mermelada-de-pimenton',
      tip: 'El contraste agridulce sobre el queso caliente y salado es la sorpresa matutina que no sabías que necesitabas en tu mesa.',
      badge: 'Agridulce perfecto',
    },
  };

  const current = pairings[activeTab];
  const matchedProduct = products.find((p) => p.slug === current.slug);

  return (
    <section id="maridajes" className="section pairing-guide" aria-labelledby="pair-title">
      <div className="pairing-header">
        <span className="kicker-pill">Inspiración en la Cocina</span>
        <h2 id="pair-title">¿Cómo disfrutar cada sabor en tu mesa?</h2>
        <p className="pairing-lead">
          Nuestras conservas no son solo aderezos: son el toque secreto para transformar platos cotidianos
          en momentos gourmet memorables.
        </p>
      </div>

      {/* Selector de ocasión / plato */}
      <div className="pairing-tabs" role="tablist">
        {(Object.keys(pairings) as Array<keyof typeof pairings>).map((key) => {
          const item = pairings[key];
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={activeTab === key}
              className={`pairing-tab ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <span className="tab-icon">{item.icon}</span>
              <span className="tab-title">{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* Tarjeta de maridaje activo */}
      <div className="pairing-showcase">
        <div className="pairing-copy">
          <div className="pairing-badge">
            <Sparkle width={14} height={14} />
            <span>{current.badge}</span>
          </div>
          <h3>{current.title}</h3>
          <p className="pairing-dish"><b>Plato ideal:</b> {current.dish}</p>
          <p className="pairing-tip">“{current.tip}”</p>

          {matchedProduct && (
            <div className="pairing-action-card">
              <div className="action-product-info">
                <span className="action-recom">Frasco recomendado:</span>
                <strong>{matchedProduct.name}</strong>
                <span className="action-price">{cop(matchedProduct.price)}</span>
              </div>
              <div className="action-buttons">
                <QtyButton p={matchedProduct} size="btn-sm" />
                <Link href={`/producto/${matchedProduct.slug}`} className="btn btn-outline btn-sm">
                  Ver receta <Arrow width={14} height={14} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {matchedProduct && (
          <div className="pairing-media">
            <div className="pairing-jar-spotlight">
              <img
                src={matchedProduct.image ?? ''}
                alt={`Frasco de ${matchedProduct.name}`}
                className="spotlight-jar"
              />
              <div className="spotlight-aura" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
