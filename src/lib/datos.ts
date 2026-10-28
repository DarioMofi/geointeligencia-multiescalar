// Punto único de acceso a los datos del visor. Hoy lee los archivos estáticos que
// genera scripts/preparar-capas.mjs en public/capas/; cuando las capas pasen a una
// base de datos, este es el único módulo que debería cambiar.

import type { FeatureCollection } from 'geojson';

const cache = new Map<string, Promise<unknown>>();

function pedir<T>(ruta: string, leer: (r: Response) => Promise<T>): Promise<T> {
  let p = cache.get(ruta) as Promise<T> | undefined;
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}capas/${ruta}`).then(r => {
      if (!r.ok) throw new Error(`No se pudo cargar ${ruta} (HTTP ${r.status})`);
      return leer(r);
    });
    // Un fallo no debe quedar en caché: el siguiente intento vuelve a pedirlo.
    p.catch(() => cache.delete(ruta));
    cache.set(ruta, p);
  }
  return p;
}

export const cargarGeoJSON = (ruta: string) => pedir<FeatureCollection>(ruta, r => r.json());

/** CSV con comillas; los IC_*.csv mezclan "0,71" (coma decimal entrecomillada) y 0.71. */
export const cargarTabla = (ruta: string) => pedir(ruta, async r => parsearCSV(await r.text()));

export function parsearCSV(texto: string): string[][] {
  const filas: string[][] = [];
  for (const linea of texto.replace(/^﻿/, '').split(/\r?\n/)) {
    if (!linea.trim()) continue;
    const celdas: string[] = [];
    let actual = '', comillas = false;
    for (const ch of linea) {
      if (ch === '"') comillas = !comillas;
      else if (ch === ',' && !comillas) { celdas.push(actual); actual = ''; }
      else actual += ch;
    }
    celdas.push(actual);
    filas.push(celdas);
  }
  return filas;
}

export function aNumero(s: unknown): number | null {
  const n = parseFloat(String(s ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
