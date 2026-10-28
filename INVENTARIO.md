# Inventario de datos — Geovisor Baja California

Datos y cartografía rescatados del Geovisualizador IIEC
(`C:\Users\dario\Downloads\iiec-main\iiec-main`) para construir un visor nuevo
con **Tijuana como caso de estudio** y dos escalas: **estatal** (solo Baja
California) y **nacional**.

**Estado: copia tal cual (2026-10-13).** Ningún archivo se ha recortado,
reproyectado ni limpiado; todos son copia exacta del original (verificado por
hash). El recorte a BC y el tratamiento quedan pendientes y se harán aparte.

Todas las capas vienen en **CRS84 / EPSG:4326** (lon, lat). Se comprobó con la
primera coordenada de cada archivo, no solo con la declaración `crs`.

## Contenido

`visor-temporal.html` es una interfaz **provisional** para revisar estas capas
tal cual están. No es el visor definitivo. Se abre con un servidor HTTP
(`python -m http.server 8765` desde esta carpeta) en
`http://localhost:8765/visor-temporal.html`.

```
datos/
  nacional/   Índice de crecimiento compuesto, Red de Proveeduría
  estatal/    Accesibilidad a armadora, vulnerabilidad (4 índices), levantamiento participativo
  contexto/   Armadoras, límites municipales, delegaciones y equipamiento de Tijuana
assets/leyendas/        Imágenes explicativas de los índices de vulnerabilidad
herramientas/red_proveeduria/   Script que regenera la Red de Proveeduría
```

| Elemento del visor original | Escala original | Escala en el visor nuevo | Archivos |
|---|---|---|---|
| Índice de crecimiento compuesto | Nacional | Nacional | `datos/nacional/IC_*.csv` |
| Red de Proveeduría (con sesión) | Visor institucional | Nacional | `datos/nacional/red_proveeduria_*.geojson` |
| Accesibilidad a la Armadora Automotriz | Estatal | Estatal | `datos/estatal/isocronas.geojson`, `denue.geojson` + `contexto/armadoras.geojson` |
| Vulnerabilidad Multicriterio | Metropolitana | Estatal | `datos/estatal/region_Norte.geojson` (campo `G_INDICE`) |
| Vulnerabilidad en Hogar | Municipal | Estatal | `datos/estatal/region_Norte.geojson` (campo `g_espacial`) |
| Deficiencias en Infraestructura | Municipal | Estatal | `datos/estatal/region_Norte.geojson` (campo `g_urbano`) |
| Sin Oportunidades | Municipal | Estatal | `datos/estatal/region_Norte.geojson` (campo `g_socioeco`) |
| Cartografía participativa | Municipal | Estatal | `datos/estatal/levantamiento.geojson` |

---

## Nacional

### Índice de crecimiento compuesto — `IC_AUTOMOTRIZ.csv`, `IC_ELECTRICA.csv`, `IC_ELECTRONICA.csv`, `IC_SEIT.csv`

- Origen: `Tablas/`. Una tabla por industria, 32 filas (entidades).
- Columnas: `Entidad` + años `2003, 2008, 2013, 2018, 2023`.
  - `IC_ELECTRONICA` trae los años en orden inverso. Hay que leer por nombre
    de columna, nunca por posición.
- Archivos UTF-8 **con BOM**, y algunos valores usan coma decimal. El visor
  original las reemplaza por punto al leer (`escala_nacional_v1.js:1032`).
- **No trae geometría.** El visor original une la tabla por nombre de entidad
  con polígonos estatales que descarga de un repositorio externo:
  `https://raw.githubusercontent.com/angelnmara/geojson/master/mexicoHigh.json`.
  La unión es frágil porque se hace por nombre (`normalizarEstadoNombre`). Ese
  archivo se descargó a `datos/contexto/mexicoHigh.json`; ver *Contexto*.
- Simbología original:
  - 5 clases por cuantiles de rango (`calcularBreaks`, `escala_global.js:1756`).
  - Rampa `#fee5d9 #fcae91 #fb6a4a #de2d26 #a50f15`.
- En el visor institucional se cruza de forma bivariada con
  `Tablas/Indice_superior_temporal.csv` (población titulada, 15 MB). Esa tabla
  **no se copió**.

### Red de Proveeduría — `red_proveeduria_enlaces_top5.geojson`, `red_proveeduria_nodos.geojson`

- Origen: `Modelos/carto/`. En `carto/` hay copias idénticas que el visor no
  usa; se copiaron una sola vez.
- **Enlaces:** 3,175 LineString (235 T1-T0, 2,505 T2-T1, 435 T3-T2). Son los 5
  principales proveedores por comprador.
  - Campos clave: `enlace`, `tier_proveedor`, `tier_comprador`, `oem_grupo`,
    `flujo_estimado`, `confiabilidad`, `distancia_km`, `entidad_p`, `entidad_c`.
- **Nodos:** 762 Point.
  - Campos clave: `tier_red` (puede venir como `"1/2"`; el visor toma lo de
    antes de la `/`), `oem_grupo`, `es_planta_ensamble`, `pagerank_proveeduria`,
    `centralidad_intermediacion`, `entidad`, `municipio`, `cvegeo_mun`.
- Es una red **inferida por modelo**, no observada. El método y sus
  limitaciones están en `herramientas/red_proveeduria/auditoria_red_proveeduria_v2.md`.
- Simbología original (`Scripts/red_proveeduria.js:16-18, 50, 181`):
  - Color de enlace: T1-T0 `#ff6d00`, T2-T1 `#ffd600`, T3-T2 `#90a4ae`
    (punteado).
  - Color de nodo por tier: 0 `#00e5ff`, 1 `#ff6d00`, 2 `#ffd600`, 3 `#90a4ae`.
  - Opacidad por `confiabilidad`: alta 0.9, media 0.6, baja 0.3.
  - Grosor proporcional a `log1p(flujo_estimado)`.
  - Radio del nodo proporcional a `sqrt(pagerank_proveeduria)`; las plantas
    (tier 0) van fijas en 7.
- En el original solo era visible con sesión iniciada. El login era una maqueta
  en el navegador (`Scripts/auth.js`), así que **no protegía los datos**: el
  archivo era público para cualquiera que conociera la ruta.

---

## Estatal

### Accesibilidad a la Armadora Automotriz — `isocronas.geojson`, `denue.geojson`

- **`isocronas.geojson`**: 60 polígonos, 20 plantas × 3 tiempos.
  - Campos: `NOMBRE`, `ENTIDAD`, `AA_MINS` (**15, 30, 60** min),
    `AA_MODE` (`driving-car`), `TOTAL_POP`, `CENTER_LON`, `CENTER_LAT`.
  - En BC hay dos plantas: **Toyota (Tijuana)** y **Grech Motors (Mexicali)**.
  - Viene con todo el país; falta recortar a BC.
- **`denue.geojson`**: 2,457 unidades económicas de la cadena (DENUE).
  - 22 registros **sin geometría**.
  - Campos útiles: `Nombre de empresa`, `Estrato`, `Industrias agrupadas`,
    `Entidad`, `Municipio`, `Nombre SCIAN`.
  - `field_15` a `field_40` vienen vacíos (basura de la exportación).
  - Es idéntico byte a byte a `carto/Vinculacion_empresas_DENUE_2026.geojson`
    del original; se copió una sola vez.
- Simbología original (`Scripts/Estatal/escala_estatal.js`):
  - Isócronas: 15 min `#00ff00` (relleno 0.8), 30 min `#ffff00` (0.4),
    60 min `#ff4500` (0.25). Las de un mismo tiempo se funden con `turf.union`.
  - Empresas, color por `Industrias agrupadas`: Automotriz `#ff3333`,
    Electrónica `#2196f3`, Eléctrica `#ffc107`, SEIT `#9c27b0`,
    otro `#bbbbbb`.
  - Empresas, radio por `Estrato`: Micro 4, Pequeña 6, Mediana 9, Grande 13.
  - El visor etiqueta cada empresa con su isócrona mediante
    `turf.booleanPointInPolygon`.
- `carto/Isocronas_Automotriz_NAL.qmd` (estilo QGIS) existe en el original pero
  el visor no lo usaba; no se copió.

### Vulnerabilidad (4 índices) — `region_Norte.geojson`

- AGEB urbanas de Baja California, Coahuila, Nuevo León, San Luis Potosí y
  Sonora (`CVEGEO` 02, 05, 19, 24, 26), con 11,202 polígonos. **BC son
  1,776** (`CVEGEO` empieza con `02`).
- Los cuatro índices están en el mismo archivo, como texto categórico
  (`Muy bajo` … `Muy alto`, `Sin dato`):

  | Índice | Campo | Imagen de leyenda | AGEB de BC sin dato |
  |---|---|---|---|
  | Vulnerabilidad Multicriterio (Índice Global) | `G_INDICE` | — | 28 |
  | Vulnerabilidad en Hogar | `g_espacial` | `assets/leyendas/Vuln_Hogar.png` | 108 |
  | Deficiencias en Infraestructura | `g_urbano` | `assets/leyendas/Vuln_Urbana.png` | **759** |
  | Sin Oportunidades | `g_socioeco` | `assets/leyendas/Vuln_oportunidades.png` | 28 |

- **«Sin dato» se conserva como está, por decisión.** No se imputa ni se
  descarta; se muestra como categoría propia.
- Campos numéricos: `m_espacial`, `m_urbano`, `m_socioeco` e `INDICE` están
  en el archivo pero el visor original no los usaba.
- Atributos de población que usaban gráficas y ventanas emergentes: `POB1_x`,
  `DISC1`, `EDU46`, `ECO4`, `NOM_ENT`.
- En el visor original la «Vulnerabilidad Multicriterio» (Metropolitana) y los
  tres índices municipales leían este mismo archivo; solo cambiaba el campo.
- Simbología original (`Scripts/Municipal/escala_municipal.js:578`). La
  comparación se hace en mayúsculas.

  | Valor | Color |
  |---|---|
  | `MUY ALTO` | `#a50f15` |
  | `ALTO` | `#de2d26` |
  | `MEDIO` | `#fb6a4a` |
  | `BAJO` | `#fcae91` |
  | `MUY BAJO` | `#fee5d9` |
  | vacío | `#333333` |
  | cualquier otro (incl. `Sin dato`) | `#444444` |

### Cartografía participativa — `levantamiento.geojson`

- 53 puntos en Tijuana. Campos: `id`, `Colonia`, `Situación`.
- Simbología original por `Situación` (`escala_municipal.js:236`):

  | `Situación` | Color |
  |---|---|
  | Riesgo geológico y falta de servicios | `#e53935` |
  | Asentamiento irregular y falta de servicios | `#8e24aa` |
  | Inseguridad | `#1e88e5` |
  | Inseguridad y falta de servicios | `#3949ab` |
  | Sin transporte | `#fdd835` |
  | otro | `#ff9800` |

- La herramienta de dibujo «Geometría Participativa» del original (Leaflet-Geoman)
  **no guardaba nada**: lo dibujado vivía en memoria y el popup mandaba a un
  Google Form externo. No hay datos que rescatar de ella; si el visor nuevo
  quiere captura participativa, necesita un backend.

---

## Contexto

| Archivo | Contenido | Notas |
|---|---|---|
| `armadoras.geojson` | 22 plantas armadoras del país (`NOMBRE`, `Estado`, `Municipio`) | Se usa en ambas escalas. En BC: Toyota (Tijuana) y Grech Motors (Mexicali). |
| `limite_delegacional_Tijuana.geojson` | 12 delegaciones de Tijuana (`Nombre`, `densidad`, `viv_aban`, `expansión`, `propues`) | Solo Tijuana. |
| `Equipamiento_Tijuana.geojson` | 231 equipamientos (`Tipo`, `Nombre`, `Dependen`, `Clasificac`) | Solo Tijuana. |
| `Limite_municipal_opt.geojson` | 1,176 polígonos municipales, nacional (17 MB) | **Usar con cuidado**, ver abajo. |
| `mexicoHigh.json` | 32 polígonos estatales (`name`, `id` ISO tipo `MX-BCN`), sin `crs` declarado (lon/lat) | Descargado el 2026-10-13 de `raw.githubusercontent.com/angelnmara/geojson` (SHA-256 `7DE22266…E33DC`). Fuente no oficial. Une con los `IC_*.csv` por nombre; la única diferencia es «México» ↔ «Estado de México». |

**Problemas de `Limite_municipal_opt.geojson`:**

- Parece el resultado de una unión espacial con estados: `CVEGEO` y `NOMGEO`
  son **del estado**, no del municipio.
- Un mismo municipio sale repetido una vez por cada estado que toca. Mexicali
  aparece dos veces (una etiquetada como Sonora), y San Luis Río Colorado (Son.)
  y Mulegé (BCS) salen etiquetados como Baja California.
- **Para filtrar BC hay que usar `cve_ent == '02'`**, nunca `CVEGEO`.
- Solo trae **5 municipios de BC** (Ensenada, Mexicali, Tecate, Tijuana, Playas
  de Rosarito). Faltan **San Quintín** (creado en 2020) y **San Felipe** (2021),
  así que es un marco geoestadístico anterior a 2020.
- Lo conveniente es reemplazarlo por el **Marco Geoestadístico vigente del
  INEGI** al hacer el recorte.

---

## Herramientas — `herramientas/red_proveeduria/`

- `red_proveeduria.py` regenera la Red de Proveeduría
  (`python red_proveeduria.py --top-n 5`).
- **No corre desde esta carpeta tal como está.** Busca sus insumos con rutas
  relativas a la estructura del repo original:
  - `Tablas/red_proveeduria_estimada_v2.csv` (9 MB)
  - `Tablas/DENUE Enriquecido.csv`
  - `Tablas/Resumen_OEM_Automotriz_Mexico_2026.xlsx`
  - `Tablas/INEGI_DENUE_14092026.xlsx` (hoja `ARMADORAS`)
- El modelo previo que produce `red_proveeduria_estimada_v2.csv`
  (`red_proveeduria_gravedad_ras.py`) **no está en el repo original**.
- `requirements.txt` no incluye `openpyxl`, que el script necesita para leer
  los `.xlsx`.

---

## Pendientes

1. **Polígonos estatales oficiales.** El Índice de crecimiento compuesto se
   pinta hoy con `mexicoHigh.json`, una fuente no oficial que se une por
   nombre. Conviene sustituirla por el Marco Geoestadístico del INEGI, con
   `CVE_ENT`, para unir por clave.
2. **Recortar a BC** las capas estatales: `isocronas`, `denue`, `region_Norte`
   y los límites municipales. Conservar las nacionales completas.
3. **Límites municipales vigentes** con San Quintín y San Felipe.
4. **Limpiar `denue.geojson`**: quitar `field_15`…`field_40` y decidir qué
   hacer con los 22 registros sin geometría.
5. **Simbología.** Los colores de este inventario son los del visor original,
   escritos a mano en JavaScript. No hay estilos QGIS de origen salvo el
   `.qmd` de isócronas, que no se copió.
