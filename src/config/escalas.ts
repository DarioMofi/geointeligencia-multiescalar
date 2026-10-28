export type Escala = 'nacional' | 'estatal';

/** [[sur, oeste], [norte, este]] en grados (EPSG:4326). */
export type Encuadre = [[number, number], [number, number]];

export interface DefEscala {
  id: Escala;
  nombre: string;
  lugar: string;
  descripcion: string;
  encuadre: Encuadre;
  /** Para pantallas angostas, donde `encuadre` deja los datos demasiado pequeños. */
  encuadreCompacto?: Encuadre;
  /** Capas encendidas al entrar a la escala. */
  capasIniciales: string[];
}

/** Caso de estudio dentro de la escala estatal. */
export const ENCUADRE_TIJUANA: Encuadre = [[32.36, -117.13], [32.56, -116.74]];

export const ESCALAS: Record<Escala, DefEscala> = {
  nacional: {
    id: 'nacional',
    nombre: 'Nacional',
    lugar: 'México',
    descripcion: 'Desempeño industrial por entidad y red de proveeduría automotriz.',
    encuadre: [[14.4, -118.4], [32.8, -86.7]],
    capasIniciales: ['estados', 'ic', 'armadoras'],
  },
  estatal: {
    id: 'estatal',
    nombre: 'Estatal',
    lugar: 'Baja California',
    descripcion: 'Vulnerabilidad urbana, accesibilidad a las plantas armadoras y cartografía participativa.',
    // El corredor urbano del norte (Tijuana, Tecate, Mexicali, Ensenada) y no
    // el estado completo: a esa extensión las AGEB no se distinguen.
    encuadre: [[31.7, -117.15], [32.75, -114.75]],
    // En un teléfono el corredor completo cabe solo a zoom 7; se abre en el caso de estudio.
    encuadreCompacto: ENCUADRE_TIJUANA,
    capasIniciales: ['estados', 'municipios', 'vuln_multicriterio', 'armadoras'],
  },
};

export const ORDEN_ESCALAS: Escala[] = ['estatal', 'nacional'];

export function encuadreDe(e: Escala, compacto: boolean): Encuadre {
  return (compacto && ESCALAS[e].encuadreCompacto) || ESCALAS[e].encuadre;
}
