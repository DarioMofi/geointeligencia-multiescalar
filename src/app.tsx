import { useCallback, useMemo, useState } from 'react';
import { CAPAS, type DefCapa, capaPorId, esCapaPermanente } from './config/capas';
import { ENCUADRE_TIJUANA, ESCALAS, type Encuadre, type Escala, encuadreDe } from './config/escalas';
import { useCapas } from './hooks/use-capas';
import Mapa, { type CapaEnMapa, type Seleccion } from './components/mapa';
import SelectorEscala from './components/selector-escala';
import PanelCapas from './components/panel-capas';
import PanelLeyenda from './components/panel-leyenda';
import Ficha from './components/ficha';
import Metodologia from './components/metodologia';
import Preportada from './components/preportada';

const ESCALA_INICIAL: Escala = 'estatal';

// Mismo corte que el breakpoint md de Tailwind, donde el panel pasa a hoja inferior.
const esCompacto = () => window.matchMedia('(max-width: 767px)').matches;

export default function App() {
  const [escala, setEscala] = useState<Escala>(ESCALA_INICIAL);
  const [activas, setActivas] = useState<string[]>(ESCALAS[ESCALA_INICIAL].capasIniciales);
  const [parametros, setParametros] = useState<Record<string, Record<string, string>>>({});
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [encuadre, setEncuadre] = useState<{ limites: Encuadre; id: number }>(
    () => ({ limites: encuadreDe(ESCALA_INICIAL, esCompacto()), id: 0 }));
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [metodologia, setMetodologia] = useState<DefCapa | null>(null);
  const [mostrarPreportada, setMostrarPreportada] = useState(true);

  // Capas fijas obligatorias según escala que nunca se apagan
  const fijas = useMemo(
    () => (escala === 'estatal' ? ['estados', 'municipios'] : ['estados']),
    [escala],
  );

  const activasEfectivas = useMemo(
    () => Array.from(new Set([...activas, ...fijas])),
    [activas, fijas],
  );

  const { estados, reintentar } = useCapas(activasEfectivas, parametros);

  const encuadrar = (limites: Encuadre) => setEncuadre(e => ({ limites, id: e.id + 1 }));

  function cambiarEscala(e: Escala) {
    if (e !== escala) {
      setEscala(e);
      setActivas(ESCALAS[e].capasIniciales);
      setSeleccion(null);
    }
    encuadrar(encuadreDe(e, esCompacto()));
  }

  function alternar(id: string) {
    if (esCapaPermanente(id, escala)) return;
    setActivas(a => {
      if (a.includes(id)) return a.filter(x => x !== id);
      const grupo = capaPorId.get(id)?.exclusiva;
      return [...(grupo ? a.filter(x => capaPorId.get(x)?.exclusiva !== grupo) : a), id];
    });
  }

  function cambiarParametro(capa: string, parametro: string, valor: string) {
    const def = capaPorId.get(capa);
    const iniciales = def ? (def.parametros ? Object.fromEntries(def.parametros.map(x => [x.id, x.inicial])) : {}) : {};
    setParametros(p => ({
      ...p,
      [capa]: { ...iniciales, ...(p[capa] ?? {}), [parametro]: valor },
    }));
  }

  const seleccionar = useCallback((s: Seleccion | null) => {
    setSeleccion(s);
    if (s) setHojaAbierta(false); // en móvil la hoja tapaba la ficha
  }, []);
  const cerrarFicha = useCallback(() => setSeleccion(null), []);

  const capasEnMapa = useMemo<CapaEnMapa[]>(() => CAPAS
    .filter(def => def.escalas.includes(escala) && activasEfectivas.includes(def.id))
    .flatMap(def => {
      const lista = estados[def.id]?.lista;
      return lista ? [{ def, lista }] : [];
    }), [escala, activasEfectivas, estados]);

  // Una capa apagada se lleva su selección.
  const seleccionVigente = seleccion && capasEnMapa.some(c => c.def.id === seleccion.capaId) ? seleccion : null;
  const capaSeleccionada = seleccionVigente && capasEnMapa.find(c => c.def.id === seleccionVigente.capaId);
  const cargando = activasEfectivas.some(id => estados[id]?.cargando);
  const activasEnEscala = useMemo(
    () => CAPAS.filter(def => def.escalas.includes(escala) && activasEfectivas.includes(def.id)),
    [escala, activasEfectivas],
  );

  // Capas interactivas visibles en el mapa (excluye capas base permanentes)
  const capasOcultables = useMemo(
    () => activasEnEscala.filter(def => !esCapaPermanente(def.id, escala)),
    [activasEnEscala, escala],
  );

  const nActivas = capasOcultables.length;

  const inicialesEscala = ESCALAS[escala].capasIniciales;
  const capasModificadas = useMemo(() => {
    const actuales = capasOcultables.map(c => c.id);
    const inicialesOcultables = inicialesEscala.filter(id => !esCapaPermanente(id, escala));
    return actuales.length !== inicialesOcultables.length || actuales.some(id => !inicialesOcultables.includes(id));
  }, [capasOcultables, inicialesEscala, escala]);

  function restablecerCapas() {
    setActivas(inicialesEscala);
    setSeleccion(null);
  }

  return (
    <div className="flex h-dvh flex-col bg-fondo text-tinta">
      {/* Cabecera de consola cartográfica */}
      <header className="relative z-[1200] flex h-14 shrink-0 items-center justify-between gap-3 border-b border-linea bg-superficie px-3.5 md:h-15 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-acento/30 bg-acento/15 shadow-xs">
            <img
              src="/logo.svg"
              alt="Sector Automotriz"
              className="h-6 w-6 object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-[16px] leading-tight font-bold tracking-tight text-tinta md:text-[18px]">
              Geo Inteligencia Multiescalar
            </h1>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="rounded bg-fondo px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-tinta-suave uppercase ring-1 ring-linea">
                Sector Automotriz
              </span>
              <span className="hidden text-[12px] text-tinta-tenue sm:inline">
                Caso de estudio: Tijuana, Baja California
              </span>
            </div>
          </div>
        </div>

        {/* Estado global de la escala activa y botón de presentación */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarPreportada(true)}
            title="Ver presentación e integrantes del proyecto"
            className="flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl border border-linea bg-fondo/70 px-2.5 py-1.5 text-[12.5px] font-semibold text-tinta-suave transition-colors hover:border-linea-fuerte hover:bg-superficie hover:text-white active:scale-95"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4 text-acento-vivo" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="7" />
              <path d="M8 7v4M8 5h.01" />
            </svg>
            <span className="hidden sm:inline">Acerca de</span>
          </button>

          <div className="hidden items-center gap-2 rounded-xl border border-linea bg-fondo/70 px-3 py-1.5 text-[12.5px] md:flex">
            <span className="h-2 w-2 rounded-full bg-acento-vivo" aria-hidden="true" />
            <span className="font-semibold text-tinta">{ESCALAS[escala].nombre}:</span>
            <span className="text-tinta-suave">{ESCALAS[escala].lugar}</span>
            <span className="ml-1 rounded-md bg-superficie px-1.5 py-0.5 font-mono text-[11px] font-semibold text-tinta ring-1 ring-linea">
              {nActivas} {nActivas === 1 ? 'capa' : 'capas'}
            </span>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Telón de fondo en móvil cuando la hoja de capas está desplegada */}
        {hojaAbierta && (
          <div
            aria-hidden="true"
            onClick={() => setHojaAbierta(false)}
            className="fixed inset-0 z-[1080] bg-slate-950/35 backdrop-blur-[1px] transition-opacity md:hidden"
          />
        )}

        {/* Escritorio: consola lateral fija. Móvil: hoja inferior interactiva. */}
        <aside
          aria-label="Escala y capas"
          className={`absolute inset-x-0 bottom-0 z-[1100] flex flex-col rounded-t-2xl border-t border-linea bg-superficie shadow-[0_-14px_36px_rgba(15,23,42,0.16)] transition-all
            md:static md:z-auto md:w-[384px] md:shrink-0 md:rounded-none md:border-t-0 md:border-r md:shadow-none lg:w-[404px]
            ${hojaAbierta ? 'max-h-[82dvh]' : ''}`}
        >
          <div className="px-3.5 pt-2 pb-3 md:px-5 md:pt-4 md:pb-4">
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-linea-fuerte md:hidden" aria-hidden="true" />
            <div className="mb-2 hidden md:block">
              <span className="font-display text-[13px] font-bold tracking-[0.05em] text-tinta-suave uppercase md:text-[14px]">
                Escala territorial
              </span>
            </div>

            <SelectorEscala escala={escala} alCambiar={cambiarEscala} />

            {/* Barra de acciones móvil: abrir catálogo de capas + acceso directo a Tijuana */}
            <div className="mt-2.5 flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setHojaAbierta(a => !a)}
                aria-expanded={hojaAbierta}
                aria-controls="panel-capas"
                className="flex min-h-[46px] flex-1 cursor-pointer items-center justify-between rounded-xl border border-linea bg-fondo/70 px-3.5 py-2 text-[14px] font-bold text-tinta transition-colors hover:bg-fondo active:scale-[0.99]"
              >
                <span className="flex items-center gap-2">
                  <span>Capas y simbología</span>
                  <span className="rounded-md bg-acento px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-white">
                    {nActivas}
                  </span>
                </span>
                <svg
                  viewBox="0 0 16 16"
                  className={`h-4 w-4 text-tinta-suave transition-transform duration-200 ${hojaAbierta ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  <path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {escala === 'estatal' && (
                <button
                  type="button"
                  onClick={() => { encuadrar(ENCUADRE_TIJUANA); setHojaAbierta(false); }}
                  className="inline-flex min-h-[46px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-acento/30 bg-acento-claro/70 px-3 py-2 text-[13.5px] font-bold text-acento transition-colors hover:bg-acento hover:text-white active:scale-[0.98]"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" aria-hidden="true">
                    <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  <span>Tijuana</span>
                </button>
              )}
            </div>
          </div>

          <div
            id="panel-capas"
            className={`scroll-fino min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-linea px-3.5 pt-3.5 pb-6 md:block md:px-5 md:pt-4 ${
              hojaAbierta ? 'block' : 'hidden'
            }`}
          >
            {/* Resumen contextual de la escala y barra de herramientas de capas */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-linea bg-fondo/55 p-3">
              <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-tinta-suave">
                {ESCALAS[escala].descripcion}
              </p>
              {(escala === 'estatal' || capasModificadas) && (
                <div className="flex shrink-0 items-center gap-2">
                  {escala === 'estatal' && (
                    <button
                      type="button"
                      onClick={() => { encuadrar(ENCUADRE_TIJUANA); setHojaAbierta(false); }}
                      className="inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-lg border border-acento/30 bg-superficie px-2.5 py-1 text-[12px] font-semibold text-acento-vivo shadow-2xs transition-colors hover:bg-acento hover:text-white active:scale-[0.98] whitespace-nowrap"
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                        <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      <span>Enfocar Caso</span>
                    </button>
                  )}
                  {capasModificadas && (
                    <button
                      type="button"
                      onClick={restablecerCapas}
                      title="Restablecer capas iniciales"
                      className="inline-flex min-h-[34px] cursor-pointer items-center gap-1 rounded-lg border border-linea bg-superficie px-2 py-1 text-[11.5px] font-medium text-tinta-suave transition-colors hover:border-linea-fuerte hover:text-tinta active:scale-[0.98] whitespace-nowrap"
                    >
                      Restablecer
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5">
              <PanelCapas
                escala={escala}
                activas={activas}
                estados={estados}
                parametros={parametros}
                alAlternar={alternar}
                alCambiarParametro={cambiarParametro}
                alReintentar={reintentar}
                alVerMetodologia={setMetodologia}
              />
            </div>
          </div>
        </aside>

        {/* En móvil el mapa termina donde empieza la hoja plegada (~140 px), para no
            esconder sus controles ni la ficha de inspección. */}
        <main className="relative min-w-0 flex-1 pb-[140px] md:pb-0">
          <div className="relative h-full">
            <Mapa capas={capasEnMapa} seleccion={seleccionVigente} alSeleccionar={seleccionar} encuadre={encuadre} />

            {/* Barra de progreso superior durante carga de datos */}
            {cargando && (
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-[1000] h-1 overflow-hidden bg-acento-claro"
                role="status"
                aria-label="Cargando capas"
              >
                <div className="h-full w-1/3 animate-[avance_1.1s_ease-in-out_infinite] bg-acento-vivo" />
              </div>
            )}

            {/* Cápsula flotante de telemetría: capas interactivas sobre el lienzo */}
            {capasOcultables.length > 0 && (
              <div
                aria-label="Capas visibles en el mapa"
                className="pointer-events-none absolute top-3 left-3 z-[1000] flex max-w-[calc(100%-24px)] flex-wrap items-center gap-1.5 md:max-w-[calc(100%-400px)]"
              >
                {capasOcultables.map(def => {
                  const colorMuestra = estados[def.id]?.lista?.leyenda[0]?.color ?? '#0b4f7c';
                  return (
                    <button
                      key={def.id}
                      type="button"
                      onClick={() => alternar(def.id)}
                      title={`Ocultar capa: ${def.nombre}`}
                      className="pointer-events-auto inline-flex min-h-[40px] max-w-[210px] cursor-pointer items-center gap-1.5 rounded-xl border border-linea/90 bg-superficie/92 px-3 py-1.5 text-[12px] font-semibold text-tinta shadow-[0_6px_18px_rgba(15,23,42,0.10)] backdrop-blur-md transition-all hover:border-linea-fuerte hover:bg-superficie active:scale-95 md:min-h-[34px] md:rounded-lg md:px-2.5 md:py-1"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-slate-900/15"
                        style={{ backgroundColor: colorMuestra }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{def.nombre}</span>
                      <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-tinta-tenue" aria-hidden="true">
                        <path d="M3 3l6 6m0-6l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            )}

            {capaSeleccionada && seleccionVigente && (
              <div className="absolute inset-x-3 bottom-3 z-[1050] md:inset-x-auto md:top-3.5 md:right-16 md:bottom-auto md:w-[368px]">
                <Ficha
                  ficha={capaSeleccionada.lista.ficha(seleccionVigente.feature)}
                  capa={capaSeleccionada.def.nombre}
                  alCerrar={cerrarFicha}
                />
              </div>
            )}

            {/* Simbología flotante en la esquina inferior derecha */}
            <PanelLeyenda capas={capasEnMapa} escala={escala} />
          </div>
        </main>
      </div>

      <Metodologia def={metodologia} alCerrar={() => setMetodologia(null)} />
      <Preportada abierta={mostrarPreportada} alCerrar={() => setMostrarPreportada(false)} />
    </div>
  );
}
