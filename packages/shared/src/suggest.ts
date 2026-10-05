/** Reglas del asistente "¿Qué vas a cocinar?". Respaldo cuando no hay modelo de IA. */
const RULES: ReadonlyArray<readonly [RegExp, string[], string]> = [
  [/papa|criolla|frita|hamburgues|sandw|sanduche|perro|hot ?dog|mazorca|choclo|wrap|empanada/, ['mayonesa-de-pimenton', 'salsa-rustica-de-pimenton'], 'Úntala generosa: la mayonesa le da cremosidad y la salsa rústica el toque ahumado.'],
  [/queso|tabla|picada|vino|jamon|charcut|aperitivo|pasaboca/, ['pimentones-confitados', 'mermelada-de-pimenton'], 'Sirve los confitados junto a quesos maduros y la mermelada con quesos frescos.'],
  [/carne|asado|parrilla|brasa|bbq|res|cerdo|chorizo|costilla|lomo|pollo/, ['salsa-rustica-de-pimenton', 'pimentones-confitados'], 'Sirve la salsa rústica al lado de la carne recién salida de la brasa.'],
  [/pescado|salmon|atun|mariscos|camaron/, ['pimentones-confitados', 'mayonesa-de-pimenton'], 'Los confitados encima del pescado y la mayonesa para acompañar.'],
  [/pasta|espagueti|arroz|risotto|verdura|vegetal|ensalada|bowl/, ['salsa-rustica-de-pimenton', 'pimentones-confitados'], 'Mezcla una cucharada de salsa rústica al final de la cocción.'],
  [/desayuno|arepa|huevo|tostada|pan|calentado|galleta|postre|dulce/, ['mermelada-de-pimenton', 'mayonesa-de-pimenton'], 'Mermelada sobre arepa con queso, o mayonesa con huevos y tostadas.'],
];
export function suggestByRules(text: string): { slugs: string[]; tip: string } {
  const t = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const hit = RULES.find(([re]) => re.test(t));
  return hit ? { slugs: [...hit[1]], tip: hit[2] } : { slugs: ['salsa-rustica-de-pimenton', 'mayonesa-de-pimenton'], tip: 'Para empezar, estas dos van con casi todo.' };
}
