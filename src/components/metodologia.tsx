import { useEffect, useRef } from 'react';
import type { DefCapa } from '../config/capas';

interface Props {
  def: DefCapa | null;
  alCerrar: () => void;
}

/** Tabla de variables y ponderaciones del índice, tal como la entregó el visor original. */
export default function Metodologia({ def, alCerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogo.current!;
    if (def && !d.open) d.showModal();
    if (!def && d.open) d.close();
  }, [def]);

  return (
    <dialog
      ref={dialogo}
      onClose={alCerrar}
      onClick={e => { if (e.target === dialogo.current) alCerrar(); }}
      aria-labelledby="metodologia-titulo"
      className="m-auto max-h-[90dvh] w-[min(92vw,460px)] overflow-hidden rounded-2xl border border-linea bg-superficie p-0 text-tinta shadow-[0_24px_60px_rgba(15,23,42,0.28)] backdrop:bg-slate-950/50 backdrop:backdrop-blur-xs"
    >
      {def && (
        <div className="flex max-h-[90dvh] flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-linea bg-fondo/50 px-4 pt-3.5 pb-3">
            <div className="min-w-0 flex-1">
              <span className="mb-1 inline-block rounded-md border border-linea bg-superficie px-2 py-0.5 text-[11px] font-semibold tracking-wide text-acento uppercase">
                Nota metodológica
              </span>
              <h2 id="metodologia-titulo" className="font-display text-[17px] leading-snug font-bold text-tinta">
                {def.nombre}
              </h2>
              <p className="mt-0.5 text-[13px] text-tinta-suave">
                Variables, puntaje y ponderación del índice
              </p>
            </div>
            <button
              type="button"
              onClick={alCerrar}
              aria-label="Cerrar metodología"
              className="-mt-1 -mr-1.5 grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl text-tinta-suave transition-colors hover:bg-superficie hover:text-tinta active:scale-95"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                <path d="M3.5 3.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </header>
          <div className="scroll-fino overflow-y-auto p-4">
            <div className="rounded-xl border border-linea bg-fondo/40 p-3">
              <img
                src={def.metodologia}
                alt={`Tabla de variables, puntajes y ponderaciones de ${def.nombre.toLowerCase()}`}
                className="mx-auto w-full max-w-[360px] rounded-lg bg-white p-2 shadow-xs"
              />
            </div>
            <p className="mt-3 text-center text-[12px] text-tinta-tenue">
              Fuente: {def.fuente}
            </p>
          </div>
        </div>
      )}
    </dialog>
  );
}
