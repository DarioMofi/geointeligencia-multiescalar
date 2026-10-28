// Adaptador de la simbología neutra (simbologia.ts) a Leaflet. Es el único lugar
// que sabe cómo se dibuja un Estilo; si se cambia de motor de mapas, se reemplaza
// este archivo y components/mapa.tsx.

import L from 'leaflet';
import type { Feature, FeatureCollection } from 'geojson';
import type { Estilo } from './simbologia';

/**
 * Orden de dibujo por tipo de capa, para no depender del orden en que se encienden.
 * No son panes de Leaflet: todas las capas vectoriales comparten UN canvas. Con un
 * canvas por pane solo el de arriba recibe los clics y las capas de abajo quedaban
 * inalcanzables (las AGEB, bajo el canvas de los límites municipales).
 */
export const ORDEN_PLANOS = { fondo: 0, areas: 1, lineas: 2, puntos: 3 } as const;
export type NombrePlano = keyof typeof ORDEN_PLANOS;

/** Panes reales del mapa. */
export const PANES = {
  vectores: 410,
  // Los rombos son marcadores DOM: van aparte para quedar siempre sobre el canvas.
  marcadores: 435,
  // Sin eventos de puntero (ver index.css): el resalte no debe robar clics.
  seleccion: 440,
} as const;

export const ACENTO = '#38bdf8';

function opciones(e: Estilo, renderer: L.Renderer): L.PathOptions {
  return {
    renderer,
    fill: e.relleno !== undefined,
    fillColor: e.relleno,
    fillOpacity: e.opacidadRelleno ?? 1,
    stroke: e.borde !== undefined,
    color: e.borde,
    weight: e.grosor ?? 1,
    opacity: e.opacidad ?? 1,
    dashArray: e.guiones,
  };
}

function rombo(e: Estilo, latlng: L.LatLng): L.Marker {
  const lado = Math.round((e.radio ?? 6) * 1.5);
  return L.marker(latlng, {
    pane: 'marcadores',
    keyboard: false,
    icon: L.divIcon({
      className: 'marcador-rombo',
      iconSize: [lado, lado],
      html: `<span style="background:${e.relleno};border-color:${e.borde ?? '#fff'};border-width:${e.grosor ?? 1}px"></span>`,
    }),
  });
}

function engranaje(e: Estilo, latlng: L.LatLng): L.Marker {
  const lado = Math.round((e.radio ?? 8) * 2);
  const color = e.relleno ?? '#38bdf8';
  const borde = e.borde ?? '#0a0e17';
  const svg = `<svg viewBox="0 0 24 24" width="${lado}" height="${lado}" fill="${color}" stroke="${borde}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
  </svg>`;
  return L.marker(latlng, {
    pane: 'marcadores',
    keyboard: false,
    icon: L.divIcon({
      className: 'marcador-engranaje',
      iconSize: [lado, lado],
      iconAnchor: [lado / 2, lado / 2],
      html: svg,
    }),
  });
}

// Un polígono sin relleno sigue capturando clics en todo su interior (Leaflet
// prueba el punto contra el área aunque no la pinte) y taparía a las capas de
// abajo. Como líneas, el interior queda libre.
function comoContorno(f: Feature): Feature {
  const g = f.geometry;
  if (g?.type === 'Polygon') return { ...f, geometry: { type: 'MultiLineString', coordinates: g.coordinates } };
  if (g?.type === 'MultiPolygon') return { ...f, geometry: { type: 'MultiLineString', coordinates: g.coordinates.flat() } };
  return f;
}

interface OpcionesCapa {
  datos: FeatureCollection;
  estilo: (f: Feature) => Estilo | null;
  renderer: L.Renderer;
  rotulo?: (f: Feature) => string;
  alSeleccionar: (f: Feature) => void;
}

export function crearCapa({ datos, estilo, renderer, rotulo, alSeleccionar }: OpcionesCapa): L.GeoJSON {
  const fc: FeatureCollection = {
    ...datos,
    features: datos.features.map(f => (estilo(f)?.relleno === undefined ? comoContorno(f) : f)),
  };
  return L.geoJSON(fc, {
    // estilo() devuelve null para lo que no se dibuja.
    filter: f => estilo(f as Feature) !== null,
    style: f => opciones(estilo(f as Feature) ?? {}, renderer),
    pointToLayer: (f, latlng) => {
      const e = estilo(f as Feature) ?? {};
      if (e.simbolo === 'engranaje') return engranaje(e, latlng);
      if (e.simbolo === 'rombo') return rombo(e, latlng);
      return L.circleMarker(latlng, { ...opciones(e, renderer), radius: e.radio ?? 4 });
    },
    onEachFeature: (f, capa) => {
      const r = rotulo?.(f as Feature);
      if (r) capa.bindTooltip(r, { sticky: true, direction: 'top', className: 'rotulo', offset: [0, -6] });
      capa.on('click', ev => {
        L.DomEvent.stopPropagation(ev);
        alSeleccionar(f as Feature);
      });
    },
  });
}

/** Contorno del elemento seleccionado, por encima de todo y sin capturar clics. */
export function crearResalte(f: Feature, e: Estilo | null): L.Layer {
  return L.geoJSON(f, {
    pane: 'seleccion',
    interactive: false,
    style: { color: ACENTO, weight: 3, opacity: 1, fill: false, pane: 'seleccion' },
    pointToLayer: (_, latlng) => L.circleMarker(latlng, {
      pane: 'seleccion', radius: (e?.radio ?? 5) + 4, color: ACENTO, weight: 3, fill: false, interactive: false,
    }),
  });
}
