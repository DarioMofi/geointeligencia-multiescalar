import { useCallback, useEffect, useRef, useState } from 'react';
import { type CapaLista, capaPorId, parametrosIniciales } from '../config/capas';

export interface EstadoCapa {
  /** Identifica la combinación capa + parámetros que se pidió por última vez. */
  clave: string;
  cargando: boolean;
  /** Se conserva la versión anterior mientras carga la nueva, para que el mapa no parpadee. */
  lista?: CapaLista;
  error?: string;
}

/** Prepara (carga + simboliza) las capas activas cada vez que cambian ellas o sus parámetros. */
export function useCapas(activas: string[], parametros: Record<string, Record<string, string>>) {
  const [estados, setEstados] = useState<Record<string, EstadoCapa>>({});
  const ref = useRef(estados);
  ref.current = estados;
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    for (const id of activas) {
      const def = capaPorId.get(id);
      if (!def) continue;
      const params = { ...(def ? parametrosIniciales(def) : {}), ...(parametros[id] ?? {}) };
      const clave = JSON.stringify(params);
      const previo = ref.current[id];
      if (previo?.clave === clave && !previo.error) continue;

      const actualizar = (cambio: Partial<EstadoCapa>) => setEstados(e =>
        // Descarta respuestas de una combinación que ya no es la vigente.
        e[id]?.clave !== clave ? e : { ...e, [id]: { ...e[id], ...cambio } });

      setEstados(e => ({ ...e, [id]: { clave, cargando: true, lista: e[id]?.lista } }));
      def.preparar(params)
        .then(lista => actualizar({ cargando: false, lista, error: undefined }))
        .catch((err: unknown) => {
          console.error(err);
          actualizar({ cargando: false, error: err instanceof Error ? err.message : String(err) });
        });
    }
  }, [activas, parametros, reintento]);

  const reintentar = useCallback(() => setReintento(n => n + 1), []);
  return { estados, reintentar };
}
