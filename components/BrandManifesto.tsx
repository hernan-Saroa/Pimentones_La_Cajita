'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Sparkle, Fire, Leaf } from './icons';

interface BrandManifestoProps {
  mission: string;
  title: string;
  text: string;
  tagline: string;
  videoUrl: string;
}

export function BrandManifesto({ mission, text, videoUrl }: BrandManifestoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoId = videoUrl.match(/embed\/([\w-]+)|v=([\w-]+)|youtu\.be\/([\w-]+)/)?.slice(1).find(Boolean) || 'nKZEfpe_bng';

  return (
    <section id="historia" className="manifesto-section" aria-labelledby="manifesto-title">
      <div className="manifesto-inner">
        {/* Columna Izquierda: Historia y Manifiesto Artesanal */}
        <div className="manifesto-copy">
          <div className="manifesto-kicker">
            <Sparkle width={14} height={14} />
            <span>El Alma de Nuestro Fogón</span>
          </div>

          <h2 id="manifesto-title" className="manifesto-heading">
            Pimentón de verdad. <br />
            <span>Sin atajos ni conservantes.</span>
          </h2>

          <div className="manifesto-quote-card">
            <span className="quote-mark">“</span>
            <p className="manifesto-quote-text">{mission}</p>
          </div>

          <p className="manifesto-desc">{text}</p>

          <div className="manifesto-pillars">
            <div className="pillar-item">
              <span className="pillar-icon"><Fire width={18} height={18} /></span>
              <div className="pillar-text">
                <strong>Fuego Directo</strong>
                <span>Asamos a llama viva para caramelizar el dulzor natural.</span>
              </div>
            </div>

            <div className="pillar-item">
              <span className="pillar-icon">🥣</span>
              <div className="pillar-text">
                <strong>Tandas en Olla</strong>
                <span>Mortero y paciencia en Bogotá: tandas cortas que cuidan el sabor.</span>
              </div>
            </div>

            <div className="pillar-item">
              <span className="pillar-icon"><Leaf width={18} height={18} /></span>
              <div className="pillar-text">
                <strong>Etiqueta Limpia</strong>
                <span>Sin conservantes químicos, sin gomas ni colorantes sintéticos.</span>
              </div>
            </div>
          </div>

          <div className="manifesto-actions">
            <Link href="/#tienda" className="btn btn-red btn-md">
              Ver los frascos de la cosecha ↓
            </Link>
            <span className="manifesto-batch-badge">
              🌿 Cosecha de la Sabana de Bogotá
            </span>
          </div>
        </div>

        {/* Columna Derecha: Video Cinematográfico del Taller */}
        <div className="manifesto-media">
          <div className="video-card-container">
            <div className="video-top-tag">
              <span className="live-dot" />
              <span>Cocinando en Bogotá D.C.</span>
            </div>

            {isPlaying ? (
              <div className="video-frame-wrap">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                  title="Cómo cocinamos en Pimentones La Cajita"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="manifesto-iframe"
                />
              </div>
            ) : (
              <button
                type="button"
                className="video-poster-btn"
                onClick={() => setIsPlaying(true)}
                aria-label="Reproducir video del taller de cocina"
              >
                <img
                  src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                  alt="Taller de cocina de Pimentones La Cajita"
                  className="video-poster-img"
                  loading="lazy"
                />
                <div className="video-overlay">
                  <div className="video-play-halo">
                    <span className="video-play-btn">
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </div>
                  <div className="video-cta-text">
                    <strong>Ver cómo cocinamos cada tanda</strong>
                    <span>1:30 min de cocina real y fuego lento</span>
                  </div>
                </div>
              </button>
            )}

            <div className="video-card-footer">
              <div className="footer-origin">
                <span className="origin-icon">📍</span>
                <span>Taller artesanal: Calle 45, Bogotá D.C.</span>
              </div>
              <span className="footer-batches">Solo 120 frascos por tanda</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
