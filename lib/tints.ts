const TINTS: Record<string, string> = {
  'mayonesa-de-pimenton': '#fbf7ee',
  'pimentones-confitados': '#fbf1ef',
  'salsa-rustica-de-pimenton': '#fdf5ea',
  'mermelada-de-pimenton': '#fdf2ee',
};
export const tint = (slug: string) => TINTS[slug] || '#f6f3ee';

const HERO: Record<string, [string, string]> = {
  'mayonesa-de-pimenton': ['#f4e7c3', '#2a1a08'],
  'pimentones-confitados': ['#5a1b24', '#fff5f2'],
  'salsa-rustica-de-pimenton': ['#df9232', '#221204'],
  'mermelada-de-pimenton': ['#cf3b2a', '#fff6f2'],
};
export const heroTheme = (slug: string): [string, string] => HERO[slug] || ['#efe2c8', '#1a1714'];

export interface SensoryProfile {
  notes: string[];
  texture: string;
  intensity: string;
  pairingPill: string;
  glow: string;
  accentColor: string;
  shortDesc: string;
  smokeScore: number;
  sweetScore: number;
  textureScore: number;
  cleanIngredients: string[];
  chefIdea: string;
}

const SENSORY: Record<string, SensoryProfile> = {
  'mayonesa-de-pimenton': {
    notes: ['Nube cremosa', 'Huevos de campo', 'Aroma a leña'],
    texture: 'Emulsión de seda',
    intensity: 'Suave & sedosa',
    pairingPill: 'Papas criollas & hamburguesas',
    glow: 'rgba(245, 158, 11, 0.32)',
    accentColor: '#d97706',
    shortDesc: 'Emulsionada con paciencia campesina y pimentón ahumado.',
    smokeScore: 3,
    sweetScore: 2,
    textureScore: 5,
    cleanIngredients: ['Pimentones asados al carbón', 'Huevos campesinos pasteurizados', 'Aceite vegetal & oliva', 'Sal marina', 'Gotas de limón'],
    chefIdea: 'Sirve una cucharada colmada sobre papas criollas recién fritas y sándwiches gourmet.',
  },
  'pimentones-confitados': {
    notes: ['Tiras brillantes', 'Fuego lento', 'Confitura salada'],
    texture: 'Tiras tiernas y suaves',
    intensity: 'Dulzor natural & brasas',
    pairingPill: 'Tablas de quesos maduros & jamones',
    glow: 'rgba(185, 28, 28, 0.32)',
    accentColor: '#b91c1c',
    shortDesc: 'Tiras de pimentón rojo y amarillo caramelizadas sin prisas.',
    smokeScore: 2,
    sweetScore: 4,
    textureScore: 4,
    cleanIngredients: ['Pimentones rojos y amarillos seleccionados', 'Aceite vegetal', 'Azúcar de caña en reducción', 'Sal marina', 'Especias naturales'],
    chefIdea: 'Cubre un queso brie o madurado tibio con 2 cucharadas de confitados y acompáñalo con buen pan.',
  },
  'salsa-rustica-de-pimenton': {
    notes: ['Nuez tostada crujiente', 'Perfume a brasa', 'Mortero artesanal'],
    texture: 'Textura rústica untable',
    intensity: 'Ahumado profundo',
    pairingPill: 'Carnes a la brasa & panes rústicos',
    glow: 'rgba(217, 119, 6, 0.34)',
    accentColor: '#c2410c',
    shortDesc: 'Pimentón asado a fuego vivo, molido a mano con nueces.',
    smokeScore: 5,
    sweetScore: 2,
    textureScore: 5,
    cleanIngredients: ['Pimentón asado a fuego vivo', 'Nueces tostadas en grano', 'Aceite de oliva virgen', 'Ajo asado', 'Sal marina y pimienta'],
    chefIdea: 'Úntala generosamente sobre carne a la parrilla, pollo asado o vegetales a la brasa.',
  },
  'mermelada-de-pimenton': {
    notes: ['Balance agridulce', 'Brillo ámbar', 'Tandas cortas a mano'],
    texture: 'Glaceado brillante',
    intensity: 'Agridulce armónico',
    pairingPill: 'Quesos frescos, galletas & tostadas',
    glow: 'rgba(225, 29, 72, 0.3)',
    accentColor: '#be123c',
    shortDesc: 'El dulce exacto del pimentón maduro para contrastar salados.',
    smokeScore: 1,
    sweetScore: 5,
    textureScore: 3,
    cleanIngredients: ['Pimentón maduro en trozos finos', 'Azúcar de caña pura', 'Pectina natural de fruta', 'Zumo de limón recién exprimido'],
    chefIdea: 'Monta sobre galletas o tostadas con queso campesino o queso crema para un pasabocas inolvidable.',
  },
};

export const sensory = (slug: string): SensoryProfile => SENSORY[slug] || {
  notes: ['100% Artesanal', 'Sin conservantes', 'Lotes cortos'],
  texture: 'Artesanal',
  intensity: 'Sabor natural',
  pairingPill: 'Maridaje versátil',
  glow: 'rgba(212, 32, 39, 0.25)',
  accentColor: '#d42027',
  shortDesc: 'Conservas de pimentón con sabor a hogar.',
  smokeScore: 3,
  sweetScore: 3,
  textureScore: 4,
  cleanIngredients: ['Pimentón seleccionado', 'Aceite vegetal', 'Sal marina', 'Especias'],
  chefIdea: 'Disfrútalo directamente sobre tus recetas favoritas.',
};
