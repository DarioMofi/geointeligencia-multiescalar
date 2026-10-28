import { useState } from 'react';
import type { CapaEnMapa } from './mapa';
import type { Escala } from '../config/escalas';
import { esCapaPermanente } from '../config/capas';
import Leyenda from './leyenda';

interface Props {
  capas: CapaEnMapa[];
  escala: Escala;
}

export default function PanelLeyenda({ capas, escala }: Props) {
  const [abierto, setAbierto] = useState(true);

  // Filtrar capas que tengan leyenda y no sean las capas base permanentes
  const capasConLeyenda = capas.filter(
    c => !esCapaPermanente(c.def.id, escala) && c.lista.leyenda && c.lista.leyenda.length > 0,
  );

  if (capasConLeyenda.length === 0) return null;

  if (!abierto) {
    return (
      <div
        className="pointer-events-auto absolute bottom-3 right-3 z-[1000] md:bottom-4 md:right-4"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setAbierto(true)}
          title="Mostrar simbología"
          aria-label="Mostrar simbología"
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-linea bg-superficie/95 px-3 py-2 text-[12.5px] font-semibold text-tinta shadow-xl backdrop-blur-md transition-all hover:border-linea-fuerte hover:bg-superficie active:scale-95"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4 text-acento-vivo" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="2" width="5" height="5" rx="1" />
            <rect x="9" y="2" width="5" height="5" rx="1" />
            <rect x="2" y="9" width="5" height="5" rx="1" />
            <rect x="9" y="9" width="5" height="5" rx="1" />
          </svg>
          <span>Simbología</span>
          <span className="rounded-md bg-fondo px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-acento-vivo ring-1 ring-linea">
            {capasConLeyenda.length}
          </span>
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-tinta-tenue" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 10l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-auto absolute bottom-3 right-3 z-[1000] flex w-[285px] max-w-[calc(100%-24px)] flex-col rounded-2xl border border-linea bg-superficie/95 shadow-2xl backdrop-blur-md transition-all sm:w-[315px] md:bottom-4 md:right-4 md:w-[330px]"
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {/* Cabecera del panel */}
      <div className="flex items-center justify-between border-b border-linea/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="h-4 w-4 text-acento-vivo" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="2" width="5" height="5" rx="1" />
            <rect x="9" y="2" width="5" height="5" rx="1" />
            <rect x="2" y="9" width="5" height="5" rx="1" />
            <rect x="9" y="9" width="5" height="5" rx="1" />
          </svg>
          <span className="font-display text-[13px] font-bold tracking-tight text-tinta">
            Simbología
          </span>
          <span className="rounded-md bg-fondo px-1.5 py-0.5 font-mono text-[10px] font-bold text-tinta-suave ring-1 ring-linea">
            {capasConLeyenda.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          title="Minimizar simbología"
          aria-label="Minimizar simbología"
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-tinta-tenue transition-colors hover:bg-fondo hover:text-tinta"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Lista de leyendas por capa activa */}
      <div className="scroll-fino max-h-[320px] space-y-4 overflow-y-auto px-4 py-3.5 md:max-h-[420px]">
        {capasConLeyenda.map(({ def, lista }, idx) => (
          <div key={def.id} className={idx > 0 ? 'space-y-2 pt-3 border-t border-linea/60' : 'space-y-2'}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-display text-[13px] font-bold text-tinta">
                {def.nombre}
              </span>
              <span className="shrink-0 rounded bg-fondo px-1.5 py-0.5 font-mono text-[10px] text-tinta-tenue ring-1 ring-linea">
                {def.tema}
              </span>
            </div>
            <Leyenda items={lista.leyenda} />
            {lista.nota && (
              <p className="mt-1 text-[11px] leading-snug text-tinta-tenue">
                {lista.nota}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
