import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Feature } from 'geojson';
import type { CapaLista, DefCapa } from '../config/capas';
import type { Encuadre } from '../config/escalas';
import { ORDEN_PLANOS, PANES, crearCapa, crearResalte } from '../lib/leaflet-capa';

export interface CapaEnMapa {
  def: DefCapa;
  lista: CapaLista;
}

export interface Seleccion {
  capaId: string;
  feature: Feature;
}

interface Props {
  /** En orden de catálogo: dentro de un mismo plano, la última queda encima. */
  capas: CapaEnMapa[];
  seleccion: Seleccion | null;
  alSeleccionar: (s: Seleccion | null) => void;
  /** Cambia `id` para pedir un nuevo encuadre aunque los límites se repitan. */
  encuadre: { limites: Encuadre; id: number };
}

export type TipoMapaBase = 'oscuro' | 'satelital';

interface ConfigMapaBase {
  url: string;
  maxNativeZoom: number;
  maxZoom: number;
  attribution: string;
}

const CONFIG_MAPA_BASE: Record<TipoMapaBase, ConfigMapaBase> = {
  oscuro: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    maxNativeZoom: 16,
    maxZoom: 19,
    attribution: 'Mapa base: Esri, HERE, Garmin, © OpenStreetMap',
  },
  satelital: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxNativeZoom: 18,
    maxZoom: 19,
    attribution: 'Imágenes: Esri, Maxar, Earthstar Geographics',
  },
};

const reducirMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Mapa({ capas, seleccion, alSeleccionar, encuadre }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [mapa, setMapa] = useState<L.Map | null>(null);
  const [mapaBase, setMapaBase] = useState<TipoMapaBase>('oscuro');
  const [menuCapasAbierto, setMenuCapasAbierto] = useState(false);
  const capaBaseRef = useRef<L.TileLayer | null>(null);

  const renderer = useRef<L.Renderer | null>(null);
  const dibujadas = useRef(new Map<string, { lista: CapaLista; capa: L.GeoJSON }>());
  const alSeleccionarRef = useRef(alSeleccionar);
  alSeleccionarRef.current = alSeleccionar;

  // Crear el mapa una sola vez.
  useEffect(() => {
    const div = contenedor.current!;
    const m = L.map(div, { preferCanvas: true, zoomControl: false, minZoom: 3, maxZoom: 19 });

    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(m);
    m.attributionControl.setPosition('bottomleft');
    m.attributionControl.setPrefix(false);

    for (const [nombre, z] of Object.entries(PANES)) m.createPane(nombre).style.zIndex = String(z);
    renderer.current = L.canvas({ pane: 'vectores', tolerance: 4 });
    m.on('click', () => alSeleccionarRef.current(null));
    m.setView([23.5, -102], 5);
    setMapa(m);

    return () => {
      dibujadas.current.clear();
      m.remove();
      setMapa(null);
    };
  }, []);

  // Sincronizar capa base (Oscuro / Satelital)
  useEffect(() => {
    if (!mapa) return;
    if (capaBaseRef.current) {
      mapa.removeLayer(capaBaseRef.current);
    }
    const cfg = CONFIG_MAPA_BASE[mapaBase];
    const nuevaCapa = L.tileLayer(cfg.url, {
      maxZoom: cfg.maxZoom,
      maxNativeZoom: cfg.maxNativeZoom,
      attribution: cfg.attribution,
    }).addTo(mapa);
    nuevaCapa.bringToBack();
    capaBaseRef.current = nuevaCapa;
  }, [mapa, mapaBase]);

  // Encuadre: un solo vuelo al cambiar de escala.
  useEffect(() => {
    if (!mapa) return;
    const ir = () => {
      const limites = L.latLngBounds(encuadre.limites);
      if (reducirMovimiento()) mapa.fitBounds(limites, { animate: false });
      else mapa.flyToBounds(limites, { duration: 1.1 });
    };
    if (contenedor.current!.clientWidth > 0) { ir(); return; }
    const obs = new ResizeObserver(([e]) => {
      if (e.contentRect.width === 0) return;
      obs.disconnect();
      mapa.invalidateSize();
      mapa.fitBounds(L.latLngBounds(encuadre.limites), { animate: false });
    });
    obs.observe(contenedor.current!);
    return () => obs.disconnect();
  }, [mapa, encuadre]);

  // Sincronizar capas: quitar las que se apagaron o cambiaron, añadir las nuevas.
  useEffect(() => {
    if (!mapa) return;
    const vigentes = new Map(capas.map(c => [c.def.id, c]));
    for (const [id, d] of dibujadas.current) {
      if (vigentes.get(id)?.lista !== d.lista) {
        mapa.removeLayer(d.capa);
        dibujadas.current.delete(id);
      }
    }
    let hubo = false;
    for (const { def, lista } of capas) {
      if (dibujadas.current.has(def.id)) continue;
      const capa = crearCapa({
        datos: lista.datos, estilo: lista.estilo, rotulo: lista.rotulo, renderer: renderer.current!,
        alSeleccionar: feature => alSeleccionarRef.current({ capaId: def.id, feature }),
      }).addTo(mapa);
      dibujadas.current.set(def.id, { lista, capa });
      hubo = true;
    }
    // Restablecer el orden: por plano y, dentro de cada uno, por catálogo.
    if (hubo) {
      [...capas]
        .sort((a, b) => ORDEN_PLANOS[a.def.plano] - ORDEN_PLANOS[b.def.plano])
        .forEach(({ def }) => dibujadas.current.get(def.id)?.capa.bringToFront());
    }
  }, [mapa, capas]);

  // Resalte del elemento seleccionado.
  useEffect(() => {
    if (!mapa || !seleccion) return;
    const lista = capas.find(c => c.def.id === seleccion.capaId)?.lista;
    const resalte = crearResalte(seleccion.feature, lista?.estilo(seleccion.feature) ?? null).addTo(mapa);
    return () => { mapa.removeLayer(resalte); };
  }, [mapa, seleccion, capas]);

  return (
    <div className="relative h-full w-full">
      <div ref={contenedor} className="mapa h-full w-full" role="region" aria-label="Mapa" />

      {/* Controles cartográficos superiores derechos (Selector de mapa base y Zoom) */}
      <div
        className="pointer-events-auto absolute top-3.5 right-3.5 z-[1000] flex flex-col items-center gap-2"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        {/* Botón selector de mapa base (Layers) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuCapasAbierto(a => !a)}
            title="Cambiar mapa base"
            aria-label="Cambiar mapa base"
            aria-expanded={menuCapasAbierto}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border shadow-lg backdrop-blur-md transition-all ${
              menuCapasAbierto
                ? 'border-acento bg-acento/20 text-white ring-1 ring-acento'
                : 'border-linea bg-superficie/92 text-tinta hover:border-linea-fuerte hover:bg-superficie hover:text-white'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </button>

          {/* Menú flotante de mapas base */}
          {menuCapasAbierto && (
            <div className="absolute top-0 right-11 z-[1100] w-44 rounded-xl border border-linea bg-superficie/95 p-1.5 shadow-2xl backdrop-blur-md">
              <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-tinta-tenue uppercase">
                Mapa base
              </div>
              <div className="mt-1 space-y-1">
                <button
                  type="button"
                  onClick={() => { setMapaBase('oscuro'); setMenuCapasAbierto(false); }}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                    mapaBase === 'oscuro'
                      ? 'bg-acento/20 text-white font-semibold ring-1 ring-acento/40'
                      : 'text-tinta-suave hover:bg-fondo hover:text-tinta'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded border border-linea-fuerte bg-[#0a0e17]" />
                    <span>Oscuro</span>
                  </span>
                  {mapaBase === 'oscuro' && (
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-acento-vivo" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setMapaBase('satelital'); setMenuCapasAbierto(false); }}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                    mapaBase === 'satelital'
                      ? 'bg-acento/20 text-white font-semibold ring-1 ring-acento/40'
                      : 'text-tinta-suave hover:bg-fondo hover:text-tinta'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded border border-linea-fuerte bg-[#1e3a1e]" />
                    <span>Satelital</span>
                  </span>
                  {mapaBase === 'satelital' && (
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-acento-vivo" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Botones de Zoom */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-linea bg-superficie/92 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => mapa?.zoomIn()}
            title="Acercar mapa"
            aria-label="Acercar mapa"
            className="flex h-9 w-9 cursor-pointer items-center justify-center text-tinta transition-colors hover:bg-fondo hover:text-white active:bg-acento/20"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
          </button>
          <div className="h-px w-full bg-linea" />
          <button
            type="button"
            onClick={() => mapa?.zoomOut()}
            title="Alejar mapa"
            aria-label="Alejar mapa"
            className="flex h-9 w-9 cursor-pointer items-center justify-center text-tinta transition-colors hover:bg-fondo hover:text-white active:bg-acento/20"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 8h10" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
