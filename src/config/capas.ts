// Catálogo de capas del visor. Cada capa declara su escala, su lugar en el panel
// y cómo se prepara: datos + estilo por elemento + leyenda + ficha. La leyenda se
// calcula aquí mismo desde la simbología y los datos, nunca en una tabla aparte.
//
// No depende de Leaflet ni de React: el mapa (components/mapa.tsx) solo traduce
// lo que devuelve `preparar` mediante lib/leaflet-capa.ts.
//
// La simbología parte del visor original (INVENTARIO.md) con ajustes para el mapa
// base claro: allá era oscuro y el amarillo de la red y de algunos puntos no se leía.

import type { Feature, FeatureCollection, GeoJsonProperties } from 'geojson';
import type { Escala } from './escalas';
import { aNumero, cargarGeoJSON, cargarTabla } from '../lib/datos';
import {
  type Estilo, type ItemLeyenda,
  RAMPA_CRECIMIENTO, RAMPA_VULNERABILIDAD, SIN_DATO, TINTA_SUAVE,
  claseDe, contarPor, cortesCuantiles, formatoDecimal, formatoEntero,
} from '../lib/simbologia';

export type Plano = 'fondo' | 'areas' | 'lineas' | 'puntos';

export interface Parametro {
  id: string;
  etiqueta: string;
  opciones: { valor: string; texto: string }[];
  inicial: string;
}

export interface FilaFicha {
  etiqueta: string;
  valor: string;
  /** 0 a 1: dibuja una barra junto al valor. */
  proporcion?: number;
  destacada?: boolean;
}

export interface Ficha {
  titulo: string;
  subtitulo?: string;
  filas: FilaFicha[];
}

export interface CapaLista {
  datos: FeatureCollection;
  /** null = el elemento no se dibuja. */
  estilo: (f: Feature) => Estilo | null;
  leyenda: ItemLeyenda[];
  nota?: string;
  ficha: (f: Feature) => Ficha;
  /** Texto breve al pasar el cursor. */
  rotulo?: (f: Feature) => string;
}

export interface DefCapa {
  id: string;
  escalas: Escala[];
  tema: string;
  nombre: string;
  descripcion: string;
  fuente: string;
  plano: Plano;
  /** Capas con el mismo valor se excluyen entre sí (comparten geometría). */
  exclusiva?: string;
  /** Imagen con la ponderación de variables del índice. */
  metodologia?: string;
  parametros?: Parametro[];
  preparar: (parametros: Record<string, string>) => Promise<CapaLista>;
}

// ---------------------------------------------------------------- utilidades

const p = (f: Feature): NonNullable<GeoJsonProperties> => f.properties ?? {};
const texto = (v: unknown) => (v === null || v === undefined || String(v).trim() === '' ? '—' : String(v).trim());
const capitalizar = (s: string) => s.toLowerCase().replace(/(^|[\s/(-])\p{L}/gu, m => m.toUpperCase());

function ordenadas(fc: FeatureCollection, clave: (f: Feature) => number): FeatureCollection {
  return { ...fc, features: [...fc.features].sort((a, b) => clave(a) - clave(b)) };
}

const PUNTO_BORDE: Estilo = { borde: '#ffffff', grosor: 1, opacidad: 1, opacidadRelleno: 1 };

// ---------------------------------------------------------------- nacional

const INDUSTRIAS = [
  { valor: 'IC_AUTOMOTRIZ', texto: 'Automotriz' },
  { valor: 'IC_ELECTRONICA', texto: 'Electrónica' },
  { valor: 'IC_ELECTRICA', texto: 'Eléctrica' },
  { valor: 'IC_SEIT', texto: 'Servicios SEIT' },
];

// Los CSV y la capa de estados nombran igual a las entidades salvo «Estado de México».
const ALIAS_ENTIDAD: Record<string, string> = {
  'estado de mexico': 'mexico', 'distrito federal': 'ciudad de mexico',
  'coahuila de zaragoza': 'coahuila', 'michoacan de ocampo': 'michoacan',
  'veracruz de ignacio de la llave': 'veracruz',
};
function normEntidad(s: unknown) {
  const n = String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return ALIAS_ENTIDAD[n] ?? n;
}

const fmtIndice = (n: number) => n.toLocaleString('es-MX', { maximumFractionDigits: 3 });

const indiceCrecimiento: DefCapa = {
  id: 'ic',
  escalas: ['nacional'],
  tema: 'Desempeño industrial',
  nombre: 'Índice de crecimiento compuesto',
  descripcion: 'Valor del índice por entidad federativa, de 0 a 1, clasificado en quintiles.',
  fuente: 'Geovisualizador IIEC',
  plano: 'fondo',
  parametros: [
    { id: 'industria', etiqueta: 'Industria', opciones: INDUSTRIAS, inicial: 'IC_AUTOMOTRIZ' },
    {
      id: 'anio', etiqueta: 'Año', inicial: '2023',
      opciones: ['2003', '2008', '2013', '2018', '2023'].map(a => ({ valor: a, texto: a })),
    },
  ],
  async preparar({ industria = 'IC_AUTOMOTRIZ', anio = '2023' }: Record<string, string> = {}) {
    const [tabla, datos] = await Promise.all([
      cargarTabla(`nacional/${industria}.csv`), cargarGeoJSON('nacional/estados.geojson')]);
    const [encabezado, ...filas] = tabla;
    // Por nombre de columna: IC_ELECTRONICA trae los años en orden inverso.
    const anios = encabezado.slice(1).sort();
    const serie = new Map(filas.map(f => [
      normEntidad(f[0]),
      new Map(anios.map(a => [a, aNumero(f[encabezado.indexOf(a)])])),
    ]));
    const valor = (f: Feature) => serie.get(normEntidad(p(f).name))?.get(anio) ?? null;
    const valores = datos.features.map(valor).filter((v): v is number => v !== null);
    const cortes = cortesCuantiles(valores);
    const limites = [Math.min(...valores), ...cortes, Math.max(...valores)];
    const conteo = contarPor(valores, v => String(claseDe(v, cortes)));
    const nombreIndustria = INDUSTRIAS.find(i => i.valor === industria)?.texto ?? industria;
    const sinDato = datos.features.length - valores.length;

    const leyenda: ItemLeyenda[] = RAMPA_CRECIMIENTO.map((color, i) => ({
      color, forma: 'area' as const, conteo: conteo.get(String(i)) ?? 0,
      etiqueta: limites[i] === limites[i + 1]
        ? fmtIndice(limites[i]) : `${fmtIndice(limites[i])} a ${fmtIndice(limites[i + 1])}`,
    })).reverse();
    if (sinDato) leyenda.push({ color: SIN_DATO, etiqueta: 'Sin dato', forma: 'area', conteo: sinDato });

    return {
      datos,
      leyenda,
      nota: `Industria ${nombreIndustria.toLowerCase()}, ${anio}.`,
      estilo: f => {
        const v = valor(f);
        return {
          relleno: v === null ? SIN_DATO : RAMPA_CRECIMIENTO[claseDe(v, cortes)],
          opacidadRelleno: 0.85, borde: '#0a0e17', grosor: 0.8, opacidad: 1,
        };
      },
      rotulo: f => texto(p(f).name),
      ficha: f => {
        const s = serie.get(normEntidad(p(f).name));
        return {
          titulo: texto(p(f).name),
          subtitulo: `Industria ${nombreIndustria.toLowerCase()}`,
          filas: anios.map(a => {
            const v = s?.get(a) ?? null;
            return {
              etiqueta: a, destacada: a === anio,
              valor: v === null ? 'Sin dato' : fmtIndice(v),
              proporcion: v === null ? undefined : Math.max(0, Math.min(1, v)),
            };
          }),
        };
      },
    };
  },
};

const ENLACES: Record<string, { color: string; texto: string; guiones?: string; escala: number }> = {
  'T1-T0': { color: '#ff6d00', texto: 'Nivel 1 a armadora', escala: 1 },
  'T2-T1': { color: '#ffd600', texto: 'Nivel 2 a nivel 1', escala: 0.55 },
  'T3-T2': { color: '#90a4ae', texto: 'Nivel 3 a nivel 2', guiones: '4 4', escala: 0.55 },
};
const OPACIDAD_CONFIABILIDAD: Record<string, number> = { alta: 0.9, media: 0.6, baja: 0.3 };

const TIPOS_ENLACE = [
  { valor: 'TODOS', texto: 'Todos los enlaces' },
  { valor: 'T1-T0', texto: 'Tier 1 → OEM' },
  { valor: 'T2-T1', texto: 'Tier 2 → Tier 1' },
  { valor: 'T3-T2', texto: 'Tier 3 → Tier 2' },
];

const FABRICANTES_OEM = [
  { valor: 'TODOS', texto: 'Todos los fabricantes' },
  { valor: 'BMW', texto: 'BMW' },
  { valor: 'Ford', texto: 'Ford' },
  { valor: 'General Motors', texto: 'General Motors' },
  { valor: 'JAC', texto: 'JAC' },
  { valor: 'KIA / Hyundai', texto: 'KIA / Hyundai' },
  { valor: 'Nissan', texto: 'Nissan' },
  { valor: 'Stellantis', texto: 'Stellantis' },
  { valor: 'Toyota', texto: 'Toyota' },
  { valor: 'Volkswagen', texto: 'Volkswagen' },
];

const redEnlaces: DefCapa = {
  id: 'red_enlaces',
  escalas: ['nacional'],
  tema: 'Red de proveeduría automotriz',
  nombre: 'Enlaces entre proveedores',
  descripcion: 'Los cinco proveedores principales de cada comprador. El grosor indica el flujo estimado y la opacidad, la confiabilidad.',
  fuente: 'Modelo de red de proveeduría, Geovisualizador IIEC',
  plano: 'lineas',
  parametros: [
    { id: 'tier', etiqueta: 'Tipo de enlace', opciones: TIPOS_ENLACE, inicial: 'TODOS' },
    { id: 'fabricante', etiqueta: 'Fabricante (OEM)', opciones: FABRICANTES_OEM, inicial: 'TODOS' },
  ],
  async preparar({ tier = 'TODOS', fabricante = 'TODOS' }: Record<string, string> = {}) {
    const fc = await cargarGeoJSON('nacional/red_enlaces.geojson');
    const maxLog = Math.log1p(Math.max(...fc.features.map(f => Number(p(f).flujo_estimado) || 0))) || 1;

    let featuresFiltradas = fc.features;
    if (fabricante !== 'TODOS') {
      const t1Links = fc.features.filter(f => p(f).enlace === 'T1-T0' && p(f).oem_grupo === fabricante);
      const t1SupplierIds = new Set(t1Links.map(f => p(f).id_proveedor));

      const t2Links = fc.features.filter(f => p(f).enlace === 'T2-T1' && t1SupplierIds.has(p(f).id_comprador));
      const t2SupplierIds = new Set(t2Links.map(f => p(f).id_proveedor));

      const t3Links = fc.features.filter(f => p(f).enlace === 'T3-T2' && t2SupplierIds.has(p(f).id_comprador));

      const permitidos = new Set([...t1Links, ...t2Links, ...t3Links]);
      featuresFiltradas = featuresFiltradas.filter(f => permitidos.has(f));
    }

    if (tier !== 'TODOS') {
      featuresFiltradas = featuresFiltradas.filter(f => String(p(f).enlace) === tier);
    }

    const orden = ['T3-T2', 'T2-T1', 'T1-T0'];
    const datos = ordenadas({ ...fc, features: featuresFiltradas }, f => orden.indexOf(String(p(f).enlace)));
    const conteo = contarPor(featuresFiltradas, f => String(p(f).enlace));

    const tiposVisibles = orden.slice().reverse().filter(k => tier === 'TODOS' || tier === k);
    const leyenda: ItemLeyenda[] = tiposVisibles.map(k => ({
      color: ENLACES[k].color,
      etiqueta: ENLACES[k].texto,
      forma: ENLACES[k].guiones ? ('guiones' as const) : ('linea' as const),
      conteo: conteo.get(k) ?? 0,
    }));

    return {
      datos,
      nota: fabricante !== 'TODOS'
        ? `Red vinculada a ${fabricante} (${formatoEntero(featuresFiltradas.length)} enlaces).`
        : 'Red inferida por modelo: no son transacciones observadas.',
      leyenda,
      estilo: f => {
        const e = ENLACES[String(p(f).enlace)];
        if (!e) return null;
        return {
          borde: e.color, guiones: e.guiones,
          grosor: (0.6 + 4.4 * Math.log1p(Number(p(f).flujo_estimado) || 0) / maxLog) * e.escala,
          opacidad: OPACIDAD_CONFIABILIDAD[String(p(f).confiabilidad)] ?? 0.5,
        };
      },
      ficha: f => {
        const q = p(f);
        return {
          titulo: capitalizar(texto(q.proveedor)),
          subtitulo: `Provee a ${capitalizar(texto(q.comprador))}`,
          filas: [
            { etiqueta: 'Nivel del enlace', valor: ENLACES[String(q.enlace)]?.texto ?? texto(q.enlace) },
            { etiqueta: 'Grupo armador', valor: texto(q.oem_grupo) },
            { etiqueta: 'Entidad del proveedor', valor: capitalizar(texto(q.entidad_p)) },
            { etiqueta: 'Entidad del comprador', valor: capitalizar(texto(q.entidad_c)) },
            { etiqueta: 'Distancia', valor: `${formatoEntero(Number(q.distancia_km) || 0)} km` },
            { etiqueta: 'Flujo estimado', valor: formatoDecimal(Number(q.flujo_estimado) || 0) },
            { etiqueta: 'Confiabilidad', valor: texto(q.confiabilidad) },
          ],
        };
      },
    };
  },
};

const NIVELES_RED: Record<string, { color: string; texto: string }> = {
  // No confundir con la capa «Plantas armadoras» (22 plantas): el nivel 0 del
  // modelo son 47 unidades de fabricación de vehículos (SCIAN 336110 y 336120),
  // camiones y autobuses incluidos.
  '0': { color: '#00e5ff', texto: 'Fabricante de vehículos (nivel 0)' },
  '1': { color: '#ff6d00', texto: 'Proveedor nivel 1' },
  '2': { color: '#ffd600', texto: 'Proveedor nivel 2' },
  '3': { color: '#90a4ae', texto: 'Proveedor nivel 3' },
};
const nivelNodo = (f: Feature) => String(p(f).tier_red).split('/')[0];

const NIVELES_NODOS = [
  { valor: 'TODOS', texto: 'Todos los niveles' },
  { valor: '0', texto: 'Fabricante OEM (nivel 0)' },
  { valor: '1', texto: 'Proveedor nivel 1' },
  { valor: '2', texto: 'Proveedor nivel 2' },
  { valor: '3', texto: 'Proveedor nivel 3' },
];

const redNodos: DefCapa = {
  id: 'red_nodos',
  escalas: ['nacional'],
  tema: 'Red de proveeduría automotriz',
  nombre: 'Empresas de la red',
  descripcion: 'Fabricantes de vehículos y sus proveedores por nivel. El tamaño indica su centralidad en la red (PageRank).',
  fuente: 'Modelo de red de proveeduría, Geovisualizador IIEC',
  plano: 'puntos',
  parametros: [
    { id: 'nivel', etiqueta: 'Nivel en la red', opciones: NIVELES_NODOS, inicial: 'TODOS' },
  ],
  async preparar({ nivel = 'TODOS' }: Record<string, string> = {}) {
    const fc = await cargarGeoJSON('nacional/red_nodos.geojson');
    const maxPR = Math.max(...fc.features.filter(f => nivelNodo(f) !== '0')
      .map(f => Number(p(f).pagerank_proveeduria) || 0)) || 1;

    let featuresFiltradas = fc.features;
    if (nivel !== 'TODOS') {
      featuresFiltradas = featuresFiltradas.filter(f => nivelNodo(f) === nivel);
    }

    const datos = ordenadas({ ...fc, features: featuresFiltradas }, f => -Number(nivelNodo(f)));
    const conteo = contarPor(featuresFiltradas, nivelNodo);

    const nivelesVisibles = Object.entries(NIVELES_RED).filter(([k]) => nivel === 'TODOS' || nivel === k);
    const leyenda: ItemLeyenda[] = nivelesVisibles.map(([k, n]) => ({
      color: n.color,
      etiqueta: n.texto,
      forma: 'punto' as const,
      conteo: conteo.get(k) ?? 0,
    }));

    return {
      datos,
      nota: nivel !== 'TODOS'
        ? `${formatoEntero(featuresFiltradas.length)} empresas en ${NIVELES_RED[nivel]?.texto ?? nivel}.`
        : undefined,
      leyenda,
      estilo: f => {
        const n = nivelNodo(f);
        return {
          ...PUNTO_BORDE, relleno: NIVELES_RED[n]?.color ?? '#adb5bd',
          radio: n === '0' ? 7 : 2.5 + 6 * Math.sqrt((Number(p(f).pagerank_proveeduria) || 0) / maxPR),
          grosor: n === '0' ? 1.5 : 0.75,
        };
      },
      rotulo: f => capitalizar(texto(p(f).nombre)),
      ficha: f => {
        const q = p(f);
        return {
          titulo: capitalizar(texto(q.nombre)),
          subtitulo: NIVELES_RED[nivelNodo(f)]?.texto,
          filas: [
            { etiqueta: 'Grupo armador', valor: texto(q.oem_grupo) },
            { etiqueta: 'Municipio', valor: capitalizar(texto(q.municipio)) },
            { etiqueta: 'Entidad', valor: capitalizar(texto(q.entidad)) },
            { etiqueta: 'Clientes en la red', valor: texto(q.n_clientes) },
            { etiqueta: 'Proveedores en la red', valor: texto(q.n_proveedores) },
            { etiqueta: 'Centralidad (PageRank)', valor: formatoDecimal(Number(q.pagerank_proveeduria) || 0, 4) },
          ],
        };
      },
    };
  },
};

// ---------------------------------------------------------------- ambas escalas

const armadoras: DefCapa = {
  id: 'armadoras',
  escalas: ['nacional', 'estatal'],
  tema: 'Referencia',
  nombre: 'Plantas armadoras',
  descripcion: 'Plantas de ensamble automotriz en operación.',
  fuente: 'Geovisualizador IIEC',
  plano: 'puntos',
  async preparar() {
    const datos = await cargarGeoJSON('comun/armadoras.geojson');
    return {
      datos,
      leyenda: [{ color: '#38bdf8', etiqueta: 'Planta armadora', forma: 'engranaje', conteo: datos.features.length }],
      estilo: () => ({ relleno: '#38bdf8', borde: '#0a0e17', grosor: 1.5, radio: 8, simbolo: 'engranaje' }),
      rotulo: f => capitalizar(texto(p(f).NOMBRE)),
      ficha: f => ({
        titulo: capitalizar(texto(p(f).NOMBRE)),
        subtitulo: 'Planta armadora',
        filas: [
          { etiqueta: 'Municipio', valor: texto(p(f).Municipio) },
          { etiqueta: 'Entidad', valor: texto(p(f).Estado) },
        ],
      }),
    };
  },
};

// ---------------------------------------------------------------- estatal

const NIVELES_VULN = ['Muy alto', 'Alto', 'Medio', 'Bajo', 'Muy bajo'];
const COLOR_NIVEL: Record<string, string> = Object.fromEntries(
  NIVELES_VULN.map((n, i) => [n.toUpperCase(), RAMPA_VULNERABILIDAD[4 - i]]));
/** Nivel canónico o «Sin dato»; los originales vienen en texto con caja variable. */
function nivelVuln(v: unknown): string {
  const n = String(v ?? '').trim().toUpperCase();
  return NIVELES_VULN.find(x => x.toUpperCase() === n) ?? 'Sin dato';
}

const INDICES_VULN = [
  {
    id: 'vuln_multicriterio', campo: 'G_INDICE', nombre: 'Vulnerabilidad multicriterio',
    descripcion: 'Índice global que integra las dimensiones de hogar, infraestructura y oportunidades.',
  },
  {
    id: 'vuln_hogar', campo: 'g_espacial', nombre: 'Vulnerabilidad del hogar',
    descripcion: 'Crecimiento urbano, vivienda deshabitada o de uso temporal, hacinamiento y déficit de servicios.',
  },
  {
    id: 'vuln_infraestructura', campo: 'g_urbano', nombre: 'Deficiencias en infraestructura',
    descripcion: 'Viviendas sin agua entubada, sin electricidad y sin drenaje.',
  },
  {
    id: 'vuln_oportunidades', campo: 'g_socioeco', nombre: 'Sin oportunidades',
    descripcion: 'Densidad, población dependiente, discapacidad, rezago educativo, falta de servicios de salud y desocupación.',
  },
];

const capasVulnerabilidad: DefCapa[] = INDICES_VULN.map(ind => ({
  id: ind.id,
  escalas: ['estatal'],
  tema: 'Índices de Vulnerabilidad',
  nombre: ind.nombre,
  descripcion: ind.descripcion,
  fuente: 'Geovisualizador IIEC con datos del INEGI',
  plano: 'fondo',
  exclusiva: 'vulnerabilidad',
  async preparar() {
    const datos = await cargarGeoJSON('estatal/ageb.geojson');
    const conteo = contarPor(datos.features, f => nivelVuln(p(f)[ind.campo]));
    const sinDato = conteo.get('Sin dato') ?? 0;
    return {
      datos,
      // «Sin dato» se conserva como categoría propia por decisión del proyecto.
      leyenda: [
        ...NIVELES_VULN.map(n => ({ color: COLOR_NIVEL[n.toUpperCase()], etiqueta: n, forma: 'area' as const, conteo: conteo.get(n) ?? 0 })),
        { color: SIN_DATO, etiqueta: 'Sin dato', forma: 'area', conteo: sinDato },
      ],
      nota: `${formatoEntero(datos.features.length)} AGEB urbanas${sinDato ? `, ${formatoEntero(sinDato)} sin dato` : ''}.`,
      estilo: f => ({
        relleno: COLOR_NIVEL[nivelVuln(p(f)[ind.campo]).toUpperCase()] ?? SIN_DATO,
        opacidadRelleno: 0.85, borde: '#0a0e17', grosor: 0.4, opacidad: 0.8,
      }),
      ficha: f => {
        const q = p(f);
        const poblacion = aNumero(q.POB1_x);
        return {
          titulo: `AGEB ${texto(q.CVEGEO)}`,
          subtitulo: 'Área geoestadística básica urbana',
          filas: [
            { etiqueta: 'Población total', valor: poblacion === null ? '—' : formatoEntero(poblacion) },
            ...INDICES_VULN.map(i => ({ etiqueta: i.nombre, valor: nivelVuln(q[i.campo]), destacada: i.id === ind.id })),
          ],
        };
      },
    };
  },
}));

const ISOCRONAS: Record<number, { color: string; relleno: number }> = {
  15: { color: '#ea580c', relleno: 0.24 },
  30: { color: '#f97316', relleno: 0.16 },
  60: { color: '#fbbf24', relleno: 0.10 },
};
const nombrePlanta = (v: unknown) => capitalizar(texto(v).replace(/^\d+\s*/, ''));

const isocronas: DefCapa = {
  id: 'isocronas',
  escalas: ['estatal'],
  tema: 'Accesibilidad a la armadora',
  nombre: 'Tiempo de traslado en automóvil',
  descripcion: 'Área alcanzable en 15, 30 y 60 minutos desde Toyota (Tijuana) y Grech Motors (Mexicali).',
  fuente: 'Geovisualizador IIEC',
  plano: 'areas',
  async preparar() {
    const fc = await cargarGeoJSON('estatal/isocronas.geojson');
    // 60 abajo y 15 arriba: si no, la de 60 minutos tapa a las menores.
    const datos = ordenadas(fc, f => -Number(p(f).AA_MINS));
    return {
      datos,
      leyenda: Object.entries(ISOCRONAS).map(([m, s]) => ({ color: s.color, etiqueta: `${m} minutos`, forma: 'area' as const })),
      estilo: f => {
        const s = ISOCRONAS[Number(p(f).AA_MINS)];
        return s ? { relleno: s.color, opacidadRelleno: s.relleno, borde: s.color, grosor: 1.5, opacidad: 0.9 } : null;
      },
      ficha: f => {
        const q = p(f);
        const pob = aNumero(q.TOTAL_POP);
        return {
          titulo: `${texto(q.AA_MINS)} minutos desde ${nombrePlanta(q.NOMBRE)}`,
          subtitulo: 'Área alcanzable en automóvil',
          filas: [
            { etiqueta: 'Planta', valor: nombrePlanta(q.NOMBRE) },
            { etiqueta: 'Tiempo de traslado', valor: `${texto(q.AA_MINS)} min` },
            { etiqueta: 'Población dentro del área', valor: pob === null ? '—' : formatoEntero(pob) },
          ],
        };
      },
    };
  },
};

const SECTORES: Record<string, string> = {
  'Automotriz': '#4361ee',
  'Electrónica': '#d946ef',
  'Eléctrica': '#f97316',
  'Servicios SEIT': '#06b6d4',
  'Multisectorial': '#94a3b8',
  'Sin clasificar': '#64748b',
};
function sector(v: unknown): string {
  const s = String(v ?? '').trim();
  if (!s) return 'Sin clasificar';
  if (s.includes('+')) return 'Multisectorial'; // p. ej. «IA + IE»
  if (s.includes('Automotriz')) return 'Automotriz';
  if (s.includes('Electrónica')) return 'Electrónica';
  if (s.includes('Eléctrica')) return 'Eléctrica';
  if (s.includes('SEIT')) return 'Servicios SEIT';
  return 'Sin clasificar';
}
// El DENUE mezcla rangos de personal («251 y más personas») con categorías
// («GRANDE»). Se agrupan con los cortes de tamaño de empresa: 0-10, 11-50, 51-250, 251+.
function radioEstrato(v: unknown): number {
  const s = String(v ?? '').trim().toUpperCase();
  if (/^251|^GRANDE/.test(s)) return 7.5;
  if (/^(51|101) |^MEDIANA/.test(s)) return 5.5;
  if (/^(11|31) |^PEQUE/.test(s)) return 4;
  return 3;
}

const denue: DefCapa = {
  id: 'denue',
  escalas: ['estatal'],
  tema: 'Accesibilidad a la armadora',
  nombre: 'Empresas de la cadena',
  descripcion: 'Unidades económicas automotrices, electrónicas, eléctricas y de servicios SEIT. El tamaño indica el personal ocupado.',
  fuente: 'INEGI, DENUE',
  plano: 'puntos',
  async preparar() {
    const fc = await cargarGeoJSON('estatal/denue.geojson');
    const campo = 'Industrias agrupadas';
    const datos = ordenadas(fc, f => -radioEstrato(p(f).Estrato));
    const conteo = contarPor(fc.features, f => sector(p(f)[campo]));
    return {
      datos,
      leyenda: Object.entries(SECTORES)
        .filter(([s]) => conteo.has(s))
        .map(([s, color]) => ({ color, etiqueta: s, forma: 'punto' as const, conteo: conteo.get(s) })),
      estilo: f => ({ ...PUNTO_BORDE, relleno: SECTORES[sector(p(f)[campo])], radio: radioEstrato(p(f).Estrato) }),
      rotulo: f => texto(p(f)['Nombre de empresa']),
      ficha: f => {
        const q = p(f);
        return {
          titulo: texto(q['Nombre de empresa']),
          subtitulo: texto(q['Nombre SCIAN']),
          filas: [
            { etiqueta: 'Sector', valor: sector(q[campo]) },
            { etiqueta: 'Personal ocupado', valor: capitalizar(texto(q.Estrato)) },
            { etiqueta: 'Municipio', valor: capitalizar(texto(q.Municipio)) },
            { etiqueta: 'Localidad', valor: capitalizar(texto(q.Localidad)) },
          ],
        };
      },
    };
  },
};

const SITUACIONES: Record<string, string> = {
  'Riesgo geológico y falta de servicios': '#e03131',
  'Asentamiento irregular y falta de servicios': '#9c36b5',
  'Inseguridad': '#1971c2',
  'Inseguridad y falta de servicios': '#3b5bdb',
  'Sin transporte': '#e0a800',
};

const levantamiento: DefCapa = {
  id: 'levantamiento',
  escalas: ['estatal'],
  tema: 'Cartografía participativa',
  nombre: 'Problemáticas en colonias de Tijuana',
  descripcion: 'Situaciones señaladas por habitantes durante el levantamiento en campo.',
  fuente: 'Levantamiento participativo, Geovisualizador IIEC',
  plano: 'puntos',
  async preparar() {
    const datos = await cargarGeoJSON('estatal/levantamiento.geojson');
    const conteo = contarPor(datos.features, f => texto(p(f)['Situación']));
    return {
      datos,
      leyenda: Object.entries(SITUACIONES).map(([s, color]) => ({ color, etiqueta: s, forma: 'punto' as const, conteo: conteo.get(s) ?? 0 })),
      estilo: f => ({ ...PUNTO_BORDE, grosor: 1.5, radio: 6, relleno: SITUACIONES[texto(p(f)['Situación'])] ?? TINTA_SUAVE }),
      rotulo: f => {
        const sit = texto(p(f)['Situación'] || p(f).Situacion);
        const col = p(f).Colonia ? ` (${texto(p(f).Colonia)})` : '';
        return `${sit}${col}`;
      },
      ficha: f => ({
        titulo: `Colonia ${texto(p(f).Colonia)}`,
        subtitulo: 'Cartografía participativa',
        filas: [{ etiqueta: 'Situación', valor: texto(p(f)['Situación']) }],
      }),
    };
  },
};

const limitesEstatales: DefCapa = {
  id: 'estados',
  escalas: ['nacional', 'estatal'],
  tema: 'Referencia',
  nombre: 'Límites del país y entidades',
  descripcion: 'Límites internacionales y división política de las 32 entidades federativas de México.',
  fuente: 'INEGI',
  plano: 'lineas',
  async preparar() {
    const datos = await cargarGeoJSON('nacional/estados.geojson');
    return {
      datos,
      leyenda: [{ color: '#64748b', etiqueta: 'Límite estatal / nacional', forma: 'linea' }],
      estilo: f => ({
        borde: normEntidad(p(f).name) === 'baja california' ? '#38bdf8' : '#64748b',
        grosor: normEntidad(p(f).name) === 'baja california' ? 1.6 : 1.1,
        opacidad: 0.85,
      }),
      rotulo: f => texto(p(f).name),
      ficha: f => ({
        titulo: texto(p(f).name),
        subtitulo: 'Entidad federativa de México',
        filas: [
          { etiqueta: 'Identificador', valor: texto(p(f).id) },
          { etiqueta: 'País', valor: texto(p(f).CNTRY) },
        ],
      }),
    };
  },
};

const municipios: DefCapa = {
  id: 'municipios',
  escalas: ['estatal'],
  tema: 'Referencia',
  nombre: 'Límites municipales',
  descripcion: 'División municipal de Baja California.',
  fuente: 'Geovisualizador IIEC',
  plano: 'lineas',
  async preparar() {
    const datos = await cargarGeoJSON('estatal/municipios.geojson');
    return {
      datos,
      nota: 'Marco anterior a 2020: no incluye San Quintín ni San Felipe.',
      leyenda: [{ color: TINTA_SUAVE, etiqueta: 'Límite municipal', forma: 'linea' }],
      estilo: () => ({ borde: TINTA_SUAVE, grosor: 1.4, opacidad: 0.9 }),
      rotulo: f => texto(p(f).nom_mun),
      ficha: f => ({
        titulo: texto(p(f).nom_mun),
        subtitulo: 'Municipio de Baja California',
        filas: [{ etiqueta: 'Clave municipal', valor: texto(p(f).cve_umun) }],
      }),
    };
  },
};

const TIPOS_EQUIPAMIENTO: Record<string, string> = {
  Educativo: '#1971c2', Salud: '#e03131', Deportivo: '#2f9e44', Cultural: '#9c36b5',
};

const equipamiento: DefCapa = {
  id: 'equipamiento',
  escalas: ['estatal'],
  tema: 'Equipamiento urbano',
  nombre: 'Equipamiento Urbano',
  descripcion: 'Escuelas, unidades de salud, instalaciones deportivas y culturales.',
  fuente: 'Geovisualizador IIEC',
  plano: 'puntos',
  async preparar() {
    const datos = await cargarGeoJSON('estatal/equipamiento.geojson');
    const conteo = contarPor(datos.features, f => texto(p(f).Tipo));
    return {
      datos,
      leyenda: Object.entries(TIPOS_EQUIPAMIENTO).map(([t, color]) => ({ color, etiqueta: t, forma: 'punto' as const, conteo: conteo.get(t) ?? 0 })),
      estilo: f => ({ ...PUNTO_BORDE, radio: 3.5, relleno: TIPOS_EQUIPAMIENTO[texto(p(f).Tipo)] ?? TINTA_SUAVE }),
      rotulo: f => texto(p(f).Nombre),
      ficha: f => ({
        titulo: texto(p(f).Nombre),
        subtitulo: `Equipamiento ${texto(p(f).Tipo).toLowerCase()}`,
        filas: [
          { etiqueta: 'Clasificación', valor: texto(p(f).Clasificac) },
          { etiqueta: 'Dependencia', valor: texto(p(f).Dependen) },
        ],
      }),
    };
  },
};

// Orden = orden en el panel (temas incluidos).
export const CAPAS: DefCapa[] = [
  indiceCrecimiento,
  redEnlaces,
  redNodos,
  ...capasVulnerabilidad,
  isocronas,
  denue,
  equipamiento,
  levantamiento,
  limitesEstatales,
  municipios,
  armadoras,
];

/**
 * Capas de referencia base permanentes que permanecen siempre activas en el mapa
 * sin control de encendido/apagado en el panel ni botón para ocultarlas.
 */
export function esCapaPermanente(id: string, escala: Escala): boolean {
  if (id === 'estados') return true;
  if (id === 'municipios' && escala === 'estatal') return true;
  return false;
}

export const capaPorId = new Map(CAPAS.map(c => [c.id, c]));

export function parametrosIniciales(def: DefCapa): Record<string, string> {
  return Object.fromEntries((def.parametros ?? []).map(x => [x.id, x.inicial]));
}
