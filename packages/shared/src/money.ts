/** Pesos colombianos sin decimales, formato local: $22.000 */
export const cop = (n: number | string | null | undefined): string => '$' + Number(n || 0).toLocaleString('es-CO');
