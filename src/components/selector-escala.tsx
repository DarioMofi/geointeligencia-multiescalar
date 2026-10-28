import siluetas from '../data/siluetas.json';
import { ESCALAS, ORDEN_ESCALAS, type Escala } from '../config/escalas';

interface Props {
  escala: Escala;
  alCambiar: (e: Escala) => void;
}

// Cada silueta resalta el ámbito de la escala siguiente (BC dentro de México,
// Tijuana dentro de BC): el selector muestra el anidamiento territorial real.
export default function SelectorEscala({ escala, alCambiar }: Props) {
  return (
    <div role="radiogroup" aria-label="Escala de análisis" className="grid grid-cols-2 gap-2.5">
      {ORDEN_ESCALAS.map(id => {
        const def = ESCALAS[id];
        const s = siluetas[id];
        const activa = id === escala;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={activa}
            title={`Escala ${def.nombre}`}
            onClick={() => alCambiar(id)}
            className={`group relative flex min-h-[52px] cursor-pointer items-center justify-between gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-200 active:scale-[0.98] md:p-3
              ${activa
                ? 'border-acento bg-acento/20 text-white shadow-[0_12px_26px_-6px_rgba(2,132,199,0.35)] ring-1 ring-acento/50'
                : 'border-linea bg-superficie text-tinta hover:border-linea-fuerte hover:bg-fondo/70'}`}
          >
            {/* Texto a la izquierda */}
            <div className="min-w-0 flex-1">
              <span
                className={`block font-display text-[15px] leading-tight font-bold tracking-tight md:text-[16px] ${
                  activa ? 'text-white' : 'text-tinta'
                }`}
              >
                {def.nombre}
              </span>
              <span
                className={`mt-0.5 block truncate text-[12px] leading-tight font-medium ${
                  activa ? 'text-slate-300' : 'text-tinta-suave'
                }`}
              >
                {def.lugar}
              </span>
            </div>

            {/* Mapa sin fondo a la derecha al mismo nivel */}
            <svg
              viewBox={s.viewBox}
              aria-hidden="true"
              preserveAspectRatio="xMidYMid meet"
              className="h-9 w-10 shrink-0 transition-transform duration-200 group-hover:scale-110 md:h-10 md:w-11"
            >
              <path
                d={s.base}
                fill={activa ? '#334155' : '#1e293b'}
                stroke={activa ? '#475569' : '#334155'}
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={s.resalte}
                fill={activa ? '#38bdf8' : '#0284c7'}
                stroke={activa ? '#f8fafc' : '#38bdf8'}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
