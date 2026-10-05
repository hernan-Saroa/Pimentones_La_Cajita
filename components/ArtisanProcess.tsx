export function ArtisanProcess() {
  const steps = [
    {
      num: '01',
      title: 'Huerta y Cosecha a Mano',
      subtitle: 'Selección en su punto justo',
      desc: 'Pimentones madurados bajo el sol de la Sabana. Solo escogemos frutos carnosos, dulces y de color encendido.',
      badge: 'Materia prima real',
    },
    {
      num: '02',
      title: 'Asado al Fuego de Leña',
      subtitle: 'Caramelización natural',
      desc: 'El calor directo despierta los azúcares naturales del pimentón y sella ese perfume a brasa y domingo que enamora.',
      badge: 'Fuego vivo',
    },
    {
      num: '03',
      title: 'Mortero y Tandas Cortas',
      subtitle: 'Paciencia antes que prisa',
      desc: 'Molienda pausada para cuidar la textura: tiras tiernas, nuez crujiente y emulsiones con densidad de nube.',
      badge: 'Lotes pequeños',
    },
    {
      num: '04',
      title: 'Envasado en Frasco de Vidrio',
      subtitle: 'Sin químicos ni atajos',
      desc: 'Esterilizado al vacío. Cero conservantes artificiales, cero almidones, cero colorantes. Pimentón de verdad.',
      badge: 'Puro y limpio',
    },
  ];

  return (
    <section id="proceso" className="process-section" aria-labelledby="proc-h">
      <div className="process-header">
        <span className="kicker-pill">El Oficio Detrás del Frasco</span>
        <h2 id="proc-h">De la huerta a tu mesa: Sin atajos ni conservantes</h2>
        <p className="process-lead">
          En un mundo lleno de salsas industriales con químicos impronunciables, cocinamos como en casa:
          con fuego lento, mortero y amor por los ingredientes reales.
        </p>
      </div>

      <div className="process-grid">
        {steps.map((st) => (
          <div key={st.num} className="process-card">
            <div className="process-card-top">
              <span className="process-num">{st.num}</span>
              <span className="process-badge">{st.badge}</span>
            </div>
            <h3>{st.title}</h3>
            <p className="process-sub">{st.subtitle}</p>
            <p className="process-desc">{st.desc}</p>
          </div>
        ))}
      </div>

      <div className="process-quote">
        <p>
          “Nuestras cosechas se escogen con calidad y amor. Cada frasco guarda el olor a campo,
          la memoria del fogón y el orgullo de hacerlo todo a mano en Colombia.”
        </p>
      </div>
    </section>
  );
}
