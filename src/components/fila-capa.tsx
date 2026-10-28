import type { DefCapa, Plano } from '../config/capas';
import type { EstadoCapa } from '../hooks/use-capas';

interface Props {
  def: DefCapa;
  activa: boolean;
  estado?: EstadoCapa;
  parametros: Record<string, string>;
  alAlternar: () => void;
  alCambiarParametro: (id: string, valor: string) => void;
  alReintentar: () => void;
  alVerMetodologia: () => void;
}

const ETIQUETA_PLANO: Record<Plano, string> = {
  fondo: 'Polígonos',
  areas: 'Polígonos',
  lineas: 'Líneas',
  puntos: 'Puntos',
};

export default function FilaCapa({
  def, activa, estado, parametros, alAlternar, alCambiarParametro, alReintentar, alVerMetodologia,
}: Props) {
  const lista = estado?.lista;

  return (
    <li
      className={`overflow-hidden rounded-xl border transition-all duration-200 ${
        activa
          ? 'border-acento/35 bg-superficie shadow-[0_8px_20px_-6px_rgba(15,23,42,0.08)]'
          : 'border-linea bg-superficie/80 hover:border-linea-fuerte hover:bg-superficie'
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={activa}
        onClick={alAlternar}
        className="group flex min-h-[48px] w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-fondo/50 active:bg-fondo"
      >
        <span
          aria-hidden="true"
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 ${
            activa
              ? 'border-acento bg-acento'
              : 'border-linea-fuerte bg-slate-800 group-hover:border-tinta-tenue'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
              activa ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className={`block text-[14.5px] leading-snug ${activa ? 'font-bold text-tinta' : 'font-medium text-tinta'}`}>
            {def.nombre}
          </span>
        </span>

        {activa && estado?.cargando ? (
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-linea border-t-acento"
            role="status"
            aria-label="Cargando"
          />
        ) : (
          <span
            className={`shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10.5px] font-medium ${
              activa
                ? 'border-acento/25 bg-acento-claro/70 text-acento'
                : 'border-linea bg-fondo text-tinta-tenue'
            }`}
          >
            {ETIQUETA_PLANO[def.plano]}
          </span>
        )}
      </button>

      {activa && (
        <div className="space-y-3 border-t border-linea/80 bg-fondo/40 px-3.5 pt-3 pb-3.5">
          <p className="text-[13.5px] leading-relaxed text-tinta-suave">{def.descripcion}</p>

          {def.parametros?.map(par => (
            <div key={par.id} role="radiogroup" aria-label={par.etiqueta} className="space-y-1.5">
              <div className="text-[11.5px] font-semibold tracking-wide text-tinta-suave uppercase">
                {par.etiqueta}
              </div>
              {par.opciones.length > 5 ? (
                <div className="relative">
                  <select
                    value={parametros[par.id] ?? par.inicial}
                    onChange={e => alCambiarParametro(par.id, e.target.value)}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-linea bg-superficie px-3 py-2 pr-8 text-[13px] font-medium text-tinta transition-colors hover:border-linea-fuerte focus:border-acento focus:outline-none"
                  >
                    {par.opciones.map(o => (
                      <option key={o.valor} value={o.valor} className="bg-superficie text-tinta">
                        {o.texto}
                      </option>
                    ))}
                  </select>
                  <svg
                    viewBox="0 0 16 16"
                    className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-tinta-tenue"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {par.opciones.map(o => {
                    const elegida = (parametros[par.id] ?? par.inicial) === o.valor;
                    return (
                      <button
                        key={o.valor}
                        type="button"
                        role="radio"
                        aria-checked={elegida}
                        onClick={() => alCambiarParametro(par.id, o.valor)}
                        className={`min-h-[44px] cursor-pointer rounded-lg border px-3 py-1.5 text-[13px] leading-tight font-medium transition-all duration-150 active:scale-[0.97] md:min-h-[36px] md:px-2.5 ${
                          par.id === 'anio' ? 'font-mono' : ''
                        } ${
                          elegida
                            ? 'border-acento bg-acento text-white shadow-xs'
                            : 'border-linea bg-superficie text-tinta hover:border-linea-fuerte hover:bg-fondo'
                        }`}
                      >
                        {o.texto}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {estado?.error && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-error/25 bg-error-claro px-3 py-2 text-[13px] text-error">
              <span>No se pudo cargar la capa.</span>
              <button
                type="button"
                onClick={alReintentar}
                className="min-h-[44px] cursor-pointer rounded-md bg-superficie px-3 py-1 font-semibold text-error ring-1 ring-error/30 transition-colors hover:bg-error hover:text-white active:scale-[0.98] md:min-h-[36px] md:px-2.5"
              >
                Reintentar
              </button>
            </div>
          )}

          {(lista?.nota || def.metodologia) && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] leading-snug text-tinta-suave">
              {lista?.nota && <span>{lista.nota}</span>}
              {def.metodologia && (
                <button
                  type="button"
                  onClick={alVerMetodologia}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-lg border border-acento/25 bg-acento-claro/60 px-3 py-1.5 text-[12px] font-semibold text-acento transition-colors hover:bg-acento hover:text-white active:scale-[0.98] md:min-h-[36px] md:px-2.5 md:py-1"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                    <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 7.2v3.6M8 5.1h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  Cómo se calcula
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 border-t border-linea/70 pt-2 text-[11.5px] text-tinta-tenue">
            <span className="font-semibold text-tinta-suave">Fuente:</span>
            <span className="truncate">{def.fuente}</span>
          </div>
        </div>
      )}
    </li>
  );
}
