'use client';
import { useState } from 'react';

/** "Quiénes somos" con el video de la página actual. El video solo se carga al tocar play (rendimiento y privacidad). */
export function About({ title, text, tagline, videoUrl }: { title: string; text: string; tagline: string; videoUrl: string }) {
  const [play, setPlay] = useState(false);
  const id = videoUrl.match(/embed\/([\w-]+)|v=([\w-]+)|youtu\.be\/([\w-]+)/)?.slice(1).find(Boolean);
  return (
    <section className="section about" aria-labelledby="about-h">
      <div className="about-copy">
        <p className="kicker">{tagline}</p>
        <h2 id="about-h">{title}</h2>
        <p>{text}</p>
      </div>
      {id && (
        <div className="video">
          {play ? (
            <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title="Video de Pimentones La Cajita" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          ) : (
            <button className="video-poster" onClick={() => setPlay(true)} aria-label="Reproducir video">
              <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
              <span className="play"><svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
