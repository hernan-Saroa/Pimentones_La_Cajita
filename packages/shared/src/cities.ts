// Ciudades principales con su departamento: el cliente escribe la ciudad y el departamento se completa solo.
export const CITIES: ReadonlyArray<readonly [string, string]> = [
  ['Bogotá', 'Bogotá D.C.'], ['Medellín', 'Antioquia'], ['Cali', 'Valle del Cauca'], ['Barranquilla', 'Atlántico'],
  ['Cartagena', 'Bolívar'], ['Bucaramanga', 'Santander'], ['Pereira', 'Risaralda'], ['Manizales', 'Caldas'],
  ['Armenia', 'Quindío'], ['Cúcuta', 'Norte de Santander'], ['Ibagué', 'Tolima'], ['Villavicencio', 'Meta'],
  ['Santa Marta', 'Magdalena'], ['Pasto', 'Nariño'], ['Neiva', 'Huila'], ['Montería', 'Córdoba'],
  ['Popayán', 'Cauca'], ['Tunja', 'Boyacá'], ['Valledupar', 'Cesar'], ['Sincelejo', 'Sucre'],
  ['Riohacha', 'La Guajira'], ['Quibdó', 'Chocó'], ['Florencia', 'Caquetá'], ['Yopal', 'Casanare'],
  ['Chía', 'Cundinamarca'], ['Cajicá', 'Cundinamarca'], ['Zipaquirá', 'Cundinamarca'], ['Soacha', 'Cundinamarca'],
  ['Mosquera', 'Cundinamarca'], ['Funza', 'Cundinamarca'], ['Madrid', 'Cundinamarca'], ['Facatativá', 'Cundinamarca'],
  ['Fusagasugá', 'Cundinamarca'], ['Girardot', 'Cundinamarca'], ['La Calera', 'Cundinamarca'], ['Sopó', 'Cundinamarca'],
  ['Envigado', 'Antioquia'], ['Sabaneta', 'Antioquia'], ['Itagüí', 'Antioquia'], ['Bello', 'Antioquia'], ['Rionegro', 'Antioquia'],
  ['Palmira', 'Valle del Cauca'], ['Buga', 'Valle del Cauca'], ['Tuluá', 'Valle del Cauca'], ['Jamundí', 'Valle del Cauca'],
  ['Soledad', 'Atlántico'], ['Floridablanca', 'Santander'], ['Girón', 'Santander'], ['Piedecuesta', 'Santander'],
  ['Dosquebradas', 'Risaralda'], ['Acacías', 'Meta'], ['Duitama', 'Boyacá'], ['Sogamoso', 'Boyacá'],
  ['Barrancabermeja', 'Santander'], ['Buenaventura', 'Valle del Cauca'], ['Ipiales', 'Nariño'], ['Arauca', 'Arauca'],
  ['Leticia', 'Amazonas'], ['San Andrés', 'San Andrés y Providencia'], ['Mocoa', 'Putumayo'], ['Puerto Carreño', 'Vichada'],
  ['Inírida', 'Guainía'], ['San José del Guaviare', 'Guaviare'], ['Mitú', 'Vaupés'],
];
export const DEPARTAMENTOS = [...new Set(CITIES.map(([, d]) => d))].sort((a, b) => a.localeCompare(b));
const norm = (s: unknown) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const searchCities = (q: string) => {
  const n = norm(q); if (n.length < 2) return [];
  return CITIES.filter(([c]) => norm(c).startsWith(n)).concat(CITIES.filter(([c]) => !norm(c).startsWith(n) && norm(c).includes(n))).slice(0, 6);
};
export const departmentOf = (city: string): string => CITIES.find(([c]) => norm(c) === norm(city))?.[1] ?? '';
