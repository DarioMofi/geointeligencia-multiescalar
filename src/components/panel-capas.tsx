import { CAPAS, type DefCapa, esCapaPermanente } from '../config/capas';
import type { Escala } from '../config/escalas';
import type { EstadoCapa } from '../hooks/use-capas';
import FilaCapa from './fila-capa';

interface Props {
  escala: Escala;
  activas: string[];
  estados: Record<string, EstadoCapa>;
  parametros: Record<string, Record<string, string>>;
  alAlternar: (id: string) => void;
  alCambiarParametro: (capa: string, parametro: string, valor: string) => void;
  alReintentar: () => void;
  alVerMetodologia: (def: DefCapa) => void;
}

export default function PanelCapas({ escala, activas, estados, parametros, ...acciones }: Props) {
  // Temas en el orden en que aparecen en el catálogo, excluyendo capas de referencia base permanentes.
  const temas = new Map<string, DefCapa[]>();
  for (const def of CAPAS.filter(c => c.escalas.includes(escala) && !esCapaPermanente(c.id, escala))) {
    temas.set(def.tema, [...(temas.get(def.tema) ?? []), def]);
  }

  return (
    <div className="space-y-6">
      {[...temas].map(([tema, defs]) => {
        const encendidas = defs.filter(d => activas.includes(d.id)).length;
        const esExclusivo = defs.length > 1 && defs.every(d => Boolean(d.exclusiva));
        return (
          <section key={tema} aria-labelledby={`tema-${escala}-${defs[0].id}`}>
            <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
              <h2
                id={`tema-${escala}-${defs[0].id}`}
                className="font-display text-[12px] font-bold tracking-[0.06em] text-tinta-suave uppercase"
              >
                {tema}
              </h2>
              <div className="flex items-center gap-1.5">
                {esExclusivo && (
                  <span className="rounded bg-fondo px-1.5 py-0.5 text-[10.5px] font-medium text-tinta-tenue ring-1 ring-linea">
                    1 a la vez
                  </span>
                )}
                <span className="font-mono text-[11px] font-semibold text-tinta-tenue">
                  {encendidas}/{defs.length}
                </span>
              </div>
            </div>
            <ul className="space-y-2">
              {defs.map(def => (
                <FilaCapa
                  key={def.id}
                  def={def}
                  activa={activas.includes(def.id)}
                  estado={estados[def.id]}
                  parametros={parametros[def.id] ?? {}}
                  alAlternar={() => acciones.alAlternar(def.id)}
                  alCambiarParametro={(p, v) => acciones.alCambiarParametro(def.id, p, v)}
                  alReintentar={acciones.alReintentar}
                  alVerMetodologia={() => acciones.alVerMetodologia(def)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
