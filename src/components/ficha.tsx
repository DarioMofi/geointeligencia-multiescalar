import { useEffect } from 'react';
import type { Ficha as DatosFicha } from '../config/capas';

interface Props {
  ficha: DatosFicha;
  capa: string;
  alCerrar: () => void;
}

export default function Ficha({ ficha, capa, alCerrar }: Props) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') alCerrar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [alCerrar]);

  return (
    <section
      aria-label={`Detalle: ${ficha.titulo}`}
      className="flex max-h-[min(56dvh,500px)] flex-col overflow-hidden rounded-2xl border border-linea bg-superficie/96 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl"
    >
      <header className="flex items-start justify-between gap-3 border-b border-linea bg-fondo/50 px-4 pt-3.5 pb-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-md border border-linea bg-superficie px-2 py-0.5 text-[11px] font-semibold tracking-wide text-acento uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-acento" aria-hidden="true" />
            <span className="truncate">{capa}</span>
          </div>
          <h2 className="font-display text-[17px] leading-snug font-bold tracking-tight text-balance text-tinta">
            {ficha.titulo}
          </h2>
          {ficha.subtitulo && (
            <p className="mt-0.5 text-[13px] leading-snug font-medium text-tinta-suave">{ficha.subtitulo}</p>
          )}
        </div>
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar detalle"
          className="-mt-1 -mr-1.5 grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl text-tinta-suave transition-colors hover:bg-superficie hover:text-tinta active:scale-95"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
            <path d="M3.5 3.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {ficha.filas.length > 0 ? (
        <dl className="scroll-fino divide-y divide-linea/70 overflow-y-auto px-4 py-2.5">
          {ficha.filas.map((f, idx) => (
            <div
              key={`${f.etiqueta}-${idx}`}
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1.5 py-2 text-[13.5px] ${
                f.destacada
                  ? 'my-1 rounded-xl border border-acento/25 bg-acento-claro/60 px-3 py-2'
                  : ''
              }`}
            >
              <dt className={f.destacada ? 'font-bold text-tinta' : 'font-medium text-tinta-suave'}>
                {f.etiqueta}
              </dt>
              <dd
                className={`text-right font-mono text-[13px] ${
                  f.destacada ? 'font-bold text-acento' : 'font-semibold text-tinta'
                }`}
              >
                {f.valor}
              </dd>
              {f.proporcion !== undefined && (
                <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-fondo ring-1 ring-linea/60" aria-hidden="true">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      f.destacada ? 'bg-acento' : 'bg-tinta-tenue'
                    }`}
                    style={{ width: `${Math.max(2, f.proporcion * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </dl>
      ) : (
        <div className="px-4 py-3 text-[13px] text-tinta-suave">
          Demarcación territorial seleccionada en el lienzo cartográfico.
        </div>
      )}
    </section>
  );
}
