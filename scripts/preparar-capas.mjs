// Genera las capas que sirve el visor (public/capas/) y las siluetas del
// selector de escala (src/data/siluetas.json) a partir de datos/.
//
// datos/ conserva la copia exacta del visor original y no se modifica. Aquí
// solo se SELECCIONA por atributo lo que corresponde a cada escala (p. ej. las
// AGEB de BC dentro de region_Norte) y se redondean coordenadas a 6 decimales
// (~0.1 m). No se recortan ni simplifican geometrías: ese tratamiento está
// pendiente (ver INVENTARIO.md) y, cuando exista, reemplazará este paso.
//
// Provisional: cuando las capas vivan en una base de datos este script desaparece.
//
// Uso: node scripts/preparar-capas.mjs   (corre solo antes de dev y build)

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATOS = join(RAIZ, 'datos');
const SALIDA = join(RAIZ, 'public', 'capas');

const leer = ruta => JSON.parse(readFileSync(join(DATOS, ruta), 'utf8').replace(/^﻿/, ''));

function redondear(c) {
  return typeof c[0] === 'number' ? c.map(n => Math.round(n * 1e6) / 1e6) : c.map(redondear);
}

function escribir(ruta, features) {
  const destino = join(SALIDA, ruta);
  mkdirSync(dirname(destino), { recursive: true });
  const fc = {
    type: 'FeatureCollection',
    features: features.map(f => ({
      type: 'Feature',
      properties: f.properties,
      geometry: f.geometry && { ...f.geometry, coordinates: redondear(f.geometry.coordinates) },
    })),
  };
  writeFileSync(destino, JSON.stringify(fc));
  console.log(`  ${ruta.padEnd(32)} ${String(features.length).padStart(5)} elementos  ${(statSync(destino).size / 1e6).toFixed(2)} MB`);
}

function copiar(origen, destino) {
  mkdirSync(dirname(destino), { recursive: true });
  copyFileSync(origen, destino);
}

const esBC = s => String(s ?? '').trim().toUpperCase() === 'BAJA CALIFORNIA';

console.log('Preparando capas en public/capas/');

// ---- Escala estatal: solo Baja California
const ageb = leer('estatal/region_Norte.geojson').features;
escribir('estatal/ageb.geojson', ageb.filter(f => String(f.properties.CVEGEO).startsWith('02')));

escribir('estatal/isocronas.geojson',
  leer('estatal/isocronas.geojson').features.filter(f => esBC(f.properties.ENTIDAD)));

// 22 registros del DENUE no traen geometría; no hay dónde dibujarlos.
escribir('estatal/denue.geojson',
  leer('estatal/denue.geojson').features.filter(f => esBC(f.properties.Entidad) && f.geometry));

escribir('estatal/levantamiento.geojson', leer('estatal/levantamiento.geojson').features);

// Filtrar por cve_ent y no por CVEGEO: en este archivo CVEGEO es la clave del
// estado con el que se cruzó cada polígono, no la del municipio (ver INVENTARIO.md).
const municipios = leer('contexto/Limite_municipal_opt.geojson').features;
const municipiosBC = municipios.filter(f => f.properties.cve_ent === '02');
escribir('estatal/municipios.geojson', municipiosBC);

escribir('estatal/delegaciones.geojson', leer('contexto/limite_delegacional_Tijuana.geojson').features);
escribir('estatal/equipamiento.geojson', leer('contexto/Equipamiento_Tijuana.geojson').features);

// ---- Escala nacional
const estados = leer('contexto/mexicoHigh.json').features;
escribir('nacional/estados.geojson', estados);
escribir('nacional/red_enlaces.geojson', leer('nacional/red_proveeduria_enlaces_top5.geojson').features);
escribir('nacional/red_nodos.geojson', leer('nacional/red_proveeduria_nodos.geojson').features);
for (const ind of ['IC_AUTOMOTRIZ', 'IC_ELECTRICA', 'IC_ELECTRONICA', 'IC_SEIT']) {
  copiar(join(DATOS, 'nacional', `${ind}.csv`), join(SALIDA, 'nacional', `${ind}.csv`));
}

// ---- Ambas escalas
escribir('comun/armadoras.geojson', leer('contexto/armadoras.geojson').features);

// ---- Imágenes de metodología de los índices de vulnerabilidad
for (const img of ['Vuln_Hogar.png', 'Vuln_Urbana.png', 'Vuln_oportunidades.png']) {
  copiar(join(RAIZ, 'assets', 'leyendas', img), join(RAIZ, 'public', 'metodologia', img));
}

// ---- Siluetas del selector de escala
// Equirectangular corregida por coseno de la latitud media: basta para un
// pictograma de 100 px; no es una proyección para medir.
function anillosExteriores(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return [geom.coordinates[0]];
  if (geom.type === 'MultiPolygon') return geom.coordinates.map(p => p[0]);
  return [];
}

// Douglas-Peucker iterativo para evitar desbordamiento de pila con geometrías de alta resolución.
function simplificar(pts, tol) {
  if (pts.length < 3) return pts;
  const marcado = new Uint8Array(pts.length);
  marcado[0] = 1;
  marcado[pts.length - 1] = 1;
  const pila = [[0, pts.length - 1]];

  while (pila.length > 0) {
    const [inicio, fin] = pila.pop();
    let max = 0, idx = 0;
    const [a, b] = [pts[inicio], pts[fin]];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const denom = Math.hypot(dx, dy);

    for (let i = inicio + 1; i < fin; i++) {
      const [x, y] = pts[i];
      const d = denom === 0
        ? Math.hypot(x - a[0], y - a[1])
        : Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / denom;
      if (d > max) { max = d; idx = i; }
    }

    if (max > tol) {
      marcado[idx] = 1;
      pila.push([inicio, idx]);
      pila.push([idx, fin]);
    }
  }

  const res = [];
  for (let i = 0; i < pts.length; i++) {
    if (marcado[i]) res.push(pts[i]);
  }
  return res;
}

function silueta(base, resalte, ancho = 100) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const f of [...base, ...resalte]) {
    for (const anillo of anillosExteriores(f.geometry)) {
      for (const [lon, lat] of anillo) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  const kx = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const escala = ancho / ((maxLon - minLon) * kx);
  const alto = (maxLat - minLat) * escala;
  const proyectar = ([lon, lat]) => [(lon - minLon) * kx * escala, (maxLat - lat) * escala];
  const ruta = feats => feats.flatMap(f => anillosExteriores(f.geometry))
    .map(anillo => simplificar(anillo.map(proyectar), 0.35))
    .filter(pts => pts.length >= 4)
    .map(pts => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z')
    .join('');
  return { viewBox: `0 0 ${ancho} ${alto.toFixed(1)}`, base: ruta(base), resalte: ruta(resalte) };
}

const bc = estados.filter(f => f.properties.name === 'Baja California');
const tijuana = municipiosBC.filter(f => f.properties.nom_mun === 'Tijuana');
const siluetas = {
  nacional: silueta(estados.filter(f => f.properties.name !== 'Baja California'), bc),
  estatal: silueta(municipiosBC.filter(f => f.properties.nom_mun !== 'Tijuana'), tijuana),
};
const rutaSiluetas = join(RAIZ, 'src', 'data', 'siluetas.json');
mkdirSync(dirname(rutaSiluetas), { recursive: true });
writeFileSync(rutaSiluetas, JSON.stringify(siluetas));
console.log(`  src/data/siluetas.json           ${(statSync(rutaSiluetas).size / 1e3).toFixed(1)} KB`);
