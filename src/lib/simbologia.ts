// Simbología en términos neutros: colores, clases y leyenda. No importa Leaflet
// ni React a propósito, para que la misma definición pueda alimentar otro motor
// de mapas o calcularse en el servidor cuando las capas vivan en una base de datos.
// El adaptador a Leaflet está en leaflet-capa.ts.

export interface Estilo {
  relleno?: string;
  opacidadRelleno?: number;
  borde?: string;
  grosor?: number;
  opacidad?: number;
  guiones?: string;
  /** Solo puntos. */
  radio?: number;
  simbolo?: 'circulo' | 'rombo' | 'engranaje';
}

export type FormaLeyenda = 'area' | 'linea' | 'guiones' | 'punto' | 'rombo' | 'engranaje';

export interface ItemLeyenda {
  color: string;
  etiqueta: string;
  forma: FormaLeyenda;
  conteo?: number;
}

/** Interfaz y cartografía de referencia en modo obscuro. */
export const TINTA = '#f8fafc';
export const TINTA_SUAVE = '#94a3b8';
export const SIN_DATO = '#334155';

// ColorBrewer Reds: la vulnerabilidad conserva la rampa del visor original.
export const RAMPA_VULNERABILIDAD = ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'];
// ColorBrewer Greens para el índice de crecimiento compuesto:
export const RAMPA_CRECIMIENTO = ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'];

/**
 * Cortes por posición (quintiles de rango), como el visor original
 * (calcularBreaks): con muchos valores repetidos dos clases pueden compartir límite.
 */
export function cortesCuantiles(valores: number[], clases = 5): number[] {
  const orden = [...valores].sort((a, b) => a - b);
  const paso = Math.floor(orden.length / clases);
  return Array.from({ length: clases - 1 }, (_, i) => orden[paso * (i + 1)]);
}

export function claseDe(valor: number, cortes: number[]): number {
  const i = cortes.findIndex(c => valor <= c);
  return i === -1 ? cortes.length : i;
}

export function contarPor<T>(elementos: T[], clave: (e: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of elementos) m.set(clave(e), (m.get(clave(e)) ?? 0) + 1);
  return m;
}

const fmt = new Intl.NumberFormat('es-MX');
export const formatoEntero = (n: number) => fmt.format(Math.round(n));
export const formatoDecimal = (n: number, d = 2) =>
  n.toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
