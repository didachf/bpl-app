# Motor de navegación a un punto, plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** el motor de navegación de la fase 1 del spec `docs/superpowers/specs/2026-10-30-motor-navegacion-design.md`: de previsión, traza GPS, ajustes y punto a `ResultadoNavegacion`, sin pantalla.

**Architecture:** módulos puros en `src/services/nav/`, uno por responsabilidad, con datos serializables a JSON en la entrada y la salida. El viento sólo depende de altitud y hora, así que el desplazamiento de un plan es una suma: se precalculan acumulados por franja y tránsitos entre franjas, y sobre ellos corren la programación dinámica de la zona alcanzable y la búsqueda del plan. La corrección con medidas es un proceso gaussiano sobre el error de la previsión.

**Tech Stack:** TypeScript 7 (`tsc -b`), vitest 4 (`npm test`, con `TZ=Europe/Madrid`), sin dependencias nuevas.

**Convenciones del repositorio:** comentarios en castellano sin acentos (como `src/services/*.ts`), textos de pantalla en catalán, `import type` para los tipos (`verbatimModuleSyntax`), pruebas `*.test.ts` junto al fichero. Cada bloque de código va precedido de `<!-- archivo: ruta -->` con su ruta.

---

### Task 0: rama de trabajo

**Files:**
- Create: worktree `~/code/bpl-app-motor` en la rama `motor-navegacion`
- Move: `docs/superpowers/specs/2026-10-30-motor-navegacion-design.md` y este plan al worktree

- [ ] **Step 1: crear el worktree desde `main`**

El árbol de `main` tiene cambios sin commit de las maquetas del 11/10 que no son de este trabajo. El worktree parte de `HEAD` limpio y no los toca.

```bash
cd ~/code/bpl-app
git worktree add ../bpl-app-motor -b motor-navegacion
cd ../bpl-app-motor
npm ci
```

- [ ] **Step 2: mover el spec y el plan, y comprobar que la base pasa**

```bash
mv ~/code/bpl-app/docs/superpowers/specs/2026-10-30-motor-navegacion-design.md docs/superpowers/specs/
mv ~/code/bpl-app/docs/superpowers/plans/2026-10-30-motor-navegacion.md docs/superpowers/plans/
npm test
```

Expected: todas las pruebas existentes pasan (407 a 06/10/2026).

- [ ] **Step 3: commit**

```bash
git add docs/superpowers/specs/2026-10-30-motor-navegacion-design.md docs/superpowers/plans/2026-10-30-motor-navegacion.md
git commit -m "docs: spec y plan del motor de navegacion a un punto"
```

---

### Task 1: constantes, tipos y plano local

**Files:**
- Create: `src/services/nav/parametros.ts`, `src/services/nav/tipos.ts`, `src/services/nav/geo.ts`
- Test: `src/services/nav/geo.test.ts`

- [ ] **Step 1: escribir la prueba**

<!-- archivo: src/services/nav/geo.test.ts -->
```ts
import { describe, it, expect } from 'vitest'
import { aGeo, aPlano, envolvente, rumbo } from './geo'

describe('plano local', () => {
  const p = { lat0: 41.6561, lon0: 1.149 }
  it('un km al norte son 0,008993 grados', () => {
    const [x, y] = aPlano(p, 41.6561 + 0.008993, 1.149)
    expect(x).toBeCloseTo(0, 6)
    expect(y).toBeCloseTo(1000, 0)
  })
  it('ida y vuelta', () => {
    const [x, y] = aPlano(p, 41.7, 1.2)
    const g = aGeo(p, x, y)
    expect(g.lat).toBeCloseTo(41.7, 9)
    expect(g.lon).toBeCloseTo(1.2, 9)
  })
  it('rumbo hacia donde va', () => {
    expect(rumbo(0, 1)).toBeCloseTo(0)
    expect(rumbo(1, 0)).toBeCloseTo(90)
    expect(rumbo(0, -1)).toBeCloseTo(180)
    expect(rumbo(-1, 0)).toBeCloseTo(270)
  })
  it('envolvente de un cuadrado con un punto dentro', () => {
    const pts: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10], [5, 5]]
    expect(envolvente(pts).sort()).toEqual([0, 1, 2, 3])
  })
})
```

- [ ] **Step 2: comprobar que falla**

Run: `npx vitest run src/services/nav/geo.test.ts`
Expected: FAIL, no encuentra `./geo`.

- [ ] **Step 3: escribir el código**

<!-- archivo: src/services/nav/parametros.ts -->
```ts
// src/services/nav/parametros.ts
// Las constantes del motor de navegacion, con nombre y con su origen
// (spec 2026-10-30 §5 y §6). Ninguna esta ajustada todavia con vuelos nuestros:
// se reajustan cuando haya trazas grabadas.

/** Error tipico a priori de la prevision, m/s por componente: 2,5 m/s vectorial entre raiz de 2. */
export const S_MS = 1.8
/** Longitud de correlacion del error en altitud. Loon: 326 Pa, unos 200 m a 10 kPa. */
export const LZ_M = 200
/** Longitud de correlacion del error en el tiempo. Corta a proposito por la capa limite de la manana. */
export const LT_S = 2 * 3600
export const MAX_MEDIDAS = 300
export const EDAD_MAX_S = 6 * 3600

/** Constante de tiempo del globo frente a un cambio de viento: 300 s al 90 % (KNMI) entre ln 10. */
export const TAU_S = 130
/** Ventana de la regresion de la velocidad GPS. */
export const VENTANA_S = 60
export const MIN_MUESTRAS = 20
/** Como mucho una medida por franja en cada tramo de este tiempo, la mas reciente. */
export const SEPARACION_S = 120
/** Ruido de la velocidad GNSS de un telefono con pasos de 1 s, por componente (KNMI: 0,8 y 0,6). */
export const SIGMA_GPS_1S = 0.7

/** Por debajo de esto se llega, y es el margen de empate entre planes. Criterio nuestro. */
export const LLEGA_M = 50
export const PASO_INTEGRACION_S = 10
export const MIN_MANTENER = 2
export const MAX_ALTITUDES = 3
export const DIRECCIONES = 32
/** Con mas franjas que esto, el plan solo prueba franjas candidatas. */
export const MAX_FRANJAS_TODAS = 16
export const MAX_CANDIDATAS = 12
/** Cuantos planes de la busqueda gruesa pasan al refinado. */
export const TOP_PLANES = 40
/** Umbral de sustitucion del plan vigente (spec 10/10 §6.8). */
export const MEJORA_RELATIVA = 0.8
export const MEJORA_ABSOLUTA_M = 200
```

<!-- archivo: src/services/nav/tipos.ts -->
```ts
// src/services/nav/tipos.ts
// Tipos de entrada y salida del motor de navegacion a un punto. Todo lo que
// entra y sale es serializable a JSON: el motor corre en un Web Worker, en node
// y, mas adelante, como herramienta de Claude.

/** Un punto de la traza GPS. `altM` ya calibrada sobre el mar (spec 10/10 §6.2). */
export interface PuntoTraza { t: number; lat: number; lon: number; altM: number }

export type FuenteMedida = 'gps' | 'caja' | 'pibal' | 'metar'

/**
 * Una medida de viento. `u` y `v` son hacia donde va el aire, este y norte, en
 * m/s. `sigma` es el error tipico de cada componente.
 */
export interface Medida {
  fuente: FuenteMedida
  t: number
  altM: number
  u: number
  v: number
  sigma: number
}

export type Modo = 'puja_lent' | 'puja_rapid' | 'baixa_lent' | 'baixa_rapid'

export interface AjustesNav {
  /** Velocidad de calculo de cada modo en m/s, positiva (spec 10/10 §6.8). */
  modos: Record<Modo, number>
  /** El rango del piloto, solo para el texto de la orden. */
  rangos: Record<Modo, [number, number]>
  altMinM: number
  altMaxM: number
  horizonteMin: number
}

export const AJUSTES_POR_DEFECTO: Omit<AjustesNav, 'altMinM' | 'altMaxM'> = {
  modos: { puja_lent: 0.5, puja_rapid: 2.75, baixa_lent: 0.5, baixa_rapid: 4 },
  rangos: { puja_lent: [0, 1], puja_rapid: [2.5, 3], baixa_lent: [0, 1], baixa_rapid: [3, 5] },
  horizonteMin: 60,
}

export interface Punto { lat: number; lon: number }

export interface Tramo {
  tipo: 'mantener' | 'cambiar'
  /** La franja que se mantiene, o a la que se va. */
  franja: number
  modo: Modo | null
  inicioMin: number
  finMin: number
}

export type Estado = 'llega' | 'no-llega' | 'sin-punto' | 'sin-datos'

export interface ResultadoNavegacion {
  estado: Estado
  plan: Tramo[]
  distanciaMinM: number | null
  horaMin: string | null
  siNoHaces: { distanciaMinM: number; horaMin: string } | null
  dispersion: { modelo: string; distanciaMinM: number }[]
  fueraSeguro: boolean
  zona: Punto[][]
  ordenes: string[]
  avisos: string[]
  calculadoA: string
  previsionDe: string | null
}
```

<!-- archivo: src/services/nav/geo.ts -->
```ts
// src/services/nav/geo.ts
// Plano local: metros este y norte desde un origen. Equirrectangular, de sobra
// para las decenas de km de un vuelo. Y la envolvente convexa.
import type { Punto } from './tipos'

const R = 6371000
const RAD = Math.PI / 180

export interface Plano { lat0: number; lon0: number }

export function aPlano(p: Plano, lat: number, lon: number): [number, number] {
  return [(lon - p.lon0) * RAD * R * Math.cos(p.lat0 * RAD), (lat - p.lat0) * RAD * R]
}

export function aGeo(p: Plano, x: number, y: number): Punto {
  return { lat: p.lat0 + y / (R * RAD), lon: p.lon0 + x / (R * RAD * Math.cos(p.lat0 * RAD)) }
}

/** Rumbo verdadero hacia donde va el vector, de 0 a 360. */
export function rumbo(u: number, v: number): number {
  return (Math.atan2(u, v) / RAD + 360) % 360
}

/** Indices de la envolvente convexa, en sentido antihorario (cadena monotona). */
export function envolvente(pts: [number, number][]): number[] {
  const ids = pts.map((_, i) => i).sort((a, b) => pts[a][0] - pts[b][0] || pts[a][1] - pts[b][1])
  if (ids.length < 3) return ids
  const cruz = (o: number, a: number, b: number) =>
    (pts[a][0] - pts[o][0]) * (pts[b][1] - pts[o][1]) - (pts[a][1] - pts[o][1]) * (pts[b][0] - pts[o][0])
  const abajo: number[] = []
  const arriba: number[] = []
  for (const i of ids) {
    while (abajo.length >= 2 && cruz(abajo[abajo.length - 2], abajo[abajo.length - 1], i) <= 0) abajo.pop()
    abajo.push(i)
  }
  for (let j = ids.length - 1; j >= 0; j--) {
    const i = ids[j]
    while (arriba.length >= 2 && cruz(arriba[arriba.length - 2], arriba[arriba.length - 1], i) <= 0) arriba.pop()
    arriba.push(i)
  }
  abajo.pop()
  arriba.pop()
  return abajo.concat(arriba)
}
```

- [ ] **Step 4: comprobar que pasa**

Run: `npx vitest run src/services/nav/geo.test.ts`
Expected: PASS, 4 pruebas.

- [ ] **Step 5: commit**

```bash
git add src/services/nav/parametros.ts src/services/nav/tipos.ts src/services/nav/geo.ts src/services/nav/geo.test.ts
git commit -m "feat(nav): constantes, tipos y plano local del motor"
```

---

### Task 2: perfil vertical desde open-meteo

**Files:**
- Create: `src/services/nav/perfil.ts`, `src/services/nav/prueba-1010.ts`
- Test: `src/services/nav/perfil.test.ts`

Valores esperados del 10/10, sacados con el mismo criterio que `docs/prototipos/2026-10-10-vuelo/viento.py`: puntos de perfil a las 06Z por modelo, en el orden de `MODELOS_NAV`, 12, 10, 9, 7, 15, 5 y 15.

- [ ] **Step 1: escribir la prueba**

<!-- archivo: src/services/nav/perfil.test.ts -->
```ts
import { describe, it, expect } from 'vitest'
import { aVector, parsePrevision, type RespuestaOpenMeteo } from './perfil'
import { cargar1010 } from './prueba-1010'

describe('aVector', () => {
  it('viento del oeste va hacia el este', () => {
    const [u, v] = aVector(10, 270)
    expect(u).toBeCloseTo(10)
    expect(v).toBeCloseTo(0)
  })
  it('viento del sur va hacia el norte', () => {
    const [u, v] = aVector(4, 180)
    expect(u).toBeCloseTo(0)
    expect(v).toBeCloseTo(4)
  })
})

function respuesta(): RespuestaOpenMeteo {
  return {
    elevation: 300,
    hourly_units: {
      time: 'iso8601',
      wind_speed_10m_icon_eu: 'kn', wind_direction_10m_icon_eu: '°',
      wind_speed_975hPa_icon_eu: 'kn', wind_direction_975hPa_icon_eu: '°', geopotential_height_975hPa_icon_eu: 'm',
      wind_speed_925hPa_icon_eu: 'kn', wind_direction_925hPa_icon_eu: '°', geopotential_height_925hPa_icon_eu: 'm',
      wind_speed_10m_ecmwf_ifs025: 'undefined', wind_direction_10m_ecmwf_ifs025: 'undefined',
    },
    hourly: {
      time: ['2026-10-10T06:00'],
      wind_speed_10m_icon_eu: [2], wind_direction_10m_icon_eu: [180],
      wind_speed_975hPa_icon_eu: [9], wind_direction_975hPa_icon_eu: [90], geopotential_height_975hPa_icon_eu: [290],
      wind_speed_925hPa_icon_eu: [10], wind_direction_925hPa_icon_eu: [270], geopotential_height_925hPa_icon_eu: [800],
      wind_speed_10m_ecmwf_ifs025: [null], wind_direction_10m_ecmwf_ifs025: [null],
    },
  }
}

describe('parsePrevision', () => {
  it('pone la Z a las horas', () => {
    expect(parsePrevision(respuesta()).horas).toEqual([Date.parse('2026-10-10T06:00Z')])
  })
  it('pasa nudos a m/s y la direccion a vector', () => {
    const p = parsePrevision(respuesta()).perfiles[0][0]
    expect(p[0].altM).toBe(310)
    expect(p[0].u).toBeCloseTo(0)
    expect(p[0].v).toBeCloseTo((2 * 1852) / 3600)
  })
  it('descarta el nivel de presion bajo tierra', () => {
    const p = parsePrevision(respuesta()).perfiles[0][0]
    expect(p.map(x => x.altM)).toEqual([310, 800])
  })
  it('un modelo sin el nivel queda vacio', () => {
    const r = parsePrevision(respuesta())
    expect(r.perfiles[r.modelos.indexOf('ecmwf_ifs025')][0]).toEqual([])
  })
  it('una unidad desconocida lanza', () => {
    const r = respuesta()
    r.hourly_units.wind_speed_10m_icon_eu = 'furlongs'
    expect(() => parsePrevision(r)).toThrow(/Unidad/)
  })
  it('con el 10/10, los puntos por modelo que dio el prototipo', () => {
    const r = parsePrevision(cargar1010())
    expect(r.elevM).toBe(380)
    expect(r.perfiles.map(m => m[0].length)).toEqual([12, 10, 9, 7, 15, 5, 15])
    for (const m of r.perfiles) {
      for (const h of m) {
        for (let i = 1; i < h.length; i++) expect(h[i].altM).toBeGreaterThanOrEqual(h[i - 1].altM)
      }
    }
  })
})
```

- [ ] **Step 2: comprobar que falla**

Run: `npx vitest run src/services/nav/perfil.test.ts`
Expected: FAIL, no encuentra `./perfil`.

- [ ] **Step 3: escribir el código**

<!-- archivo: src/services/nav/perfil.ts -->
```ts
// src/services/nav/perfil.ts
// De la respuesta de open-meteo con los siete modelos (spec 10/10 §5.1) a un
// perfil vertical por modelo y por hora: pares (altitud sobre el mar, u, v).
// Mismas reglas que `vent_alt.py` y que el prototipo `viento.py`.

export const MODELOS_NAV = [
  'icon_eu', 'gfs_seamless', 'gem_seamless', 'ukmo_global_deterministic_10km',
  'meteofrance_arpege_europe', 'ecmwf_ifs025', 'meteofrance_arome_france',
] as const

export const ALTURAS_AGL_M = [10, 20, 50, 80, 100, 120, 150, 180, 200]
export const PRESIONES_HPA = [1000, 975, 950, 925, 900, 850, 800, 700]

/** Un nivel de presion por debajo de la elevacion mas esto se descarta (spec 10/10 §5.1). */
const MARGEN_SUELO_M = 10

export interface PuntoPerfil { altM: number; u: number; v: number }

export interface Previsiones {
  elevM: number
  /** Horas en ms desde epoch, UTC. */
  horas: number[]
  modelos: string[]
  /** [modelo][hora], ordenado por altitud. Vacio si el modelo no da nada. */
  perfiles: PuntoPerfil[][][]
}

export interface RespuestaOpenMeteo {
  elevation: number
  hourly_units: Record<string, string>
  hourly: Record<string, (number | null)[] | string[]>
}

const FACTOR_VELOCIDAD: Record<string, number> = {
  'kn': 1852 / 3600,
  'm/s': 1,
  'ms': 1,
  'km/h': 1 / 3.6,
  'mp/h': 0.44704,
}

/** La unidad "undefined" es como la API dice que el modelo no tiene ese nivel. */
function cubierto(units: Record<string, string>, k: string): boolean {
  const u = units[k]
  return u !== undefined && u !== 'undefined'
}

/** Viento meteorologico (de donde viene) a vector hacia donde va. */
export function aVector(velMs: number, dirDe: number): [number, number] {
  const r = (dirDe * Math.PI) / 180
  return [-velMs * Math.sin(r), -velMs * Math.cos(r)]
}

export function parsePrevision(d: RespuestaOpenMeteo): Previsiones {
  const h = d.hourly
  const un = d.hourly_units
  // `timezone=UTC` devuelve las horas sin zona, y `Date.parse` las tomaria como locales.
  const horas = (h.time as string[]).map(t => Date.parse(t.endsWith('Z') ? t : `${t}Z`))
  const elevM = d.elevation

  const serie = (k: string): (number | null)[] => (h[k] ?? []) as (number | null)[]
  const factor = (k: string): number => {
    const f = FACTOR_VELOCIDAD[un[k]]
    if (f === undefined) throw new Error(`Unidad de velocidad desconocida: ${un[k]} en ${k}`)
    return f
  }

  const perfiles = MODELOS_NAV.map(m => horas.map((_, i) => {
    const pts: PuntoPerfil[] = []
    for (const a of ALTURAS_AGL_M) {
      const ks = `wind_speed_${a}m_${m}`
      const kd = `wind_direction_${a}m_${m}`
      if (!cubierto(un, ks) || !cubierto(un, kd)) continue
      const s = serie(ks)[i]
      const dir = serie(kd)[i]
      if (s == null || dir == null) continue
      const [u, v] = aVector(s * factor(ks), dir)
      pts.push({ altM: elevM + a, u, v })
    }
    for (const p of PRESIONES_HPA) {
      const ks = `wind_speed_${p}hPa_${m}`
      const kd = `wind_direction_${p}hPa_${m}`
      const kz = `geopotential_height_${p}hPa_${m}`
      if (!cubierto(un, ks) || !cubierto(un, kd) || !cubierto(un, kz)) continue
      const s = serie(ks)[i]
      const dir = serie(kd)[i]
      const z = serie(kz)[i]
      if (s == null || dir == null || z == null) continue
      // Un nivel bajo tierra puede llegar con valores extrapolados: fuera.
      if (z < elevM + MARGEN_SUELO_M) continue
      const [u, v] = aVector(s * factor(ks), dir)
      pts.push({ altM: z, u, v })
    }
    return pts.sort((a, b) => a.altM - b.altM)
  }))

  return { elevM, horas, modelos: [...MODELOS_NAV], perfiles }
}
```

<!-- archivo: src/services/nav/prueba-1010.ts -->
```ts
// src/services/nav/prueba-1010.ts
// Solo para las pruebas: la respuesta real de open-meteo del 10/10/2026 sobre
// Tarrega, guardada por el prototipo en docs/prototipos/2026-10-10-vuelo.
import { readFileSync } from 'node:fs'
import type { RespuestaOpenMeteo } from './perfil'

export function cargar1010(): RespuestaOpenMeteo {
  const url = new URL('../../../docs/prototipos/2026-10-10-vuelo/openmeteo_10-10.json', import.meta.url)
  return JSON.parse(readFileSync(url, 'utf8')) as RespuestaOpenMeteo
}

/** Despegue del prototipo, en Tarrega. */
export const DESPEGUE_1010 = { lat: 41.6561, lon: 1.149 }
```

- [ ] **Step 4: comprobar que pasa**

Run: `npx vitest run src/services/nav/perfil.test.ts`
Expected: PASS, 8 pruebas.

- [ ] **Step 5: commit**

```bash
git add src/services/nav/perfil.ts src/services/nav/prueba-1010.ts src/services/nav/perfil.test.ts
git commit -m "feat(nav): perfil vertical por modelo desde open-meteo"
```

---

### Task 3: campo de viento por franja y minuto

**Files:**
- Create: `src/services/nav/campo.ts`
- Test: `src/services/nav/campo.test.ts`

Contraste con `docs/prototipos/2026-10-10-vuelo/filas.json` (rumbo al grado, nudos a la décima): terra a las 06Z, 14° y 2,2 kt; 1 500 ft a las 06Z, 60° y 4,4 kt; 2 500 ft a las 08Z, 78° y 6,2 kt.

- [ ] **Step 1: escribir la prueba**

<!-- archivo: src/services/nav/campo.test.ts -->
```ts
import { describe, it, expect } from 'vitest'
import {
  combinar, construirCampo, franjas, FRANJA_M, idx, interpAlt, miles, recortar,
  vientoCombinado, vientoModelo,
} from './campo'
import { parsePrevision, type Previsiones } from './perfil'
import { cargar1010 } from './prueba-1010'
import { rumbo } from './geo'

const KT = 1852 / 3600

describe('franjas', () => {
  it('multiplos de 250 ft dentro del rango', () => {
    const r = franjas(1500 * 0.3048, 2000 * 0.3048)
    expect(r.etiqueta).toEqual(['1 500 ft', '1 750 ft', '2 000 ft'])
    expect(r.altM[1]).toBeCloseTo(1750 * 0.3048)
  })
  it('terra debajo si se pide', () => {
    const r = franjas(457.2, 600, 390)
    expect(r.etiqueta[0]).toBe('terra')
    expect(r.altM[0]).toBe(390)
  })
  it('separador de miles', () => {
    expect(miles(10000)).toBe('10 000')
    expect(miles(750)).toBe('750')
  })
  it('una franja son 76,2 m', () => { expect(FRANJA_M).toBeCloseTo(76.2) })
})

describe('interpAlt', () => {
  const p = [{ altM: 100, u: 0, v: 0 }, { altM: 200, u: 10, v: -10 }]
  it('lineal en u y v', () => { expect(interpAlt(p, 150)).toEqual([5, -5]) })
  it('no extrapola', () => {
    expect(interpAlt(p, 99)).toBeNull()
    expect(interpAlt(p, 201)).toBeNull()
  })
  it('en los extremos da el valor', () => {
    expect(interpAlt(p, 100)).toEqual([0, 0])
    expect(interpAlt(p, 200)).toEqual([10, -10])
  })
})

describe('combinar', () => {
  it('rumbo de la suma y velocidad mediana', () => {
    const w = combinar([[0, 1], [0, 3], [0, 10]])!
    expect(w[0]).toBeCloseTo(0)
    expect(w[1]).toBeCloseTo(3)
  })
  it('sin modelos, null', () => { expect(combinar([])).toBeNull() })
})

function prevSintetica(): Previsiones {
  const h0 = Date.parse('2026-10-10T06:00Z')
  return {
    elevM: 0,
    horas: [h0, h0 + 3600000],
    modelos: ['a'],
    perfiles: [[
      [{ altM: 0, u: 0, v: 0 }, { altM: 1000, u: 10, v: 0 }],
      [{ altM: 0, u: 0, v: 0 }, { altM: 1000, u: 0, v: 10 }],
    ]],
  }
}

describe('vientoModelo', () => {
  it('interpola en el tiempo modelo a modelo', () => {
    const p = prevSintetica()
    const w = vientoModelo(p, 0, 1000, p.horas[0] + 1800000)!
    expect(w[0]).toBeCloseTo(5)
    expect(w[1]).toBeCloseTo(5)
  })
  it('fuera de las horas, null', () => {
    const p = prevSintetica()
    expect(vientoModelo(p, 0, 500, p.horas[1] + 60000)).toBeNull()
  })
})

describe('con el 10/10, contra las filas del prototipo', () => {
  const prev = parsePrevision(cargar1010())
  const casos: [string, number, number, number, number][] = [
    ['terra a las 06Z', 390, 0, 14, 2.2],
    ['1 500 ft a las 06Z', 1500 * 0.3048, 0, 60, 4.4],
    ['2 500 ft a las 08Z', 2500 * 0.3048, 2, 78, 6.2],
  ]
  for (const [nombre, alt, h, r, kt] of casos) {
    it(nombre, () => {
      const w = vientoCombinado(prev, alt, prev.horas[h])!
      expect(Math.abs(rumbo(w[0], w[1]) - r)).toBeLessThanOrEqual(0.6)
      expect(Math.abs(Math.hypot(w[0], w[1]) / KT - kt)).toBeLessThanOrEqual(0.06)
    })
  }
})

describe('construirCampo y recortar', () => {
  it('casillas por franja y minuto, con el combinado al final', () => {
    const p = prevSintetica()
    const c = construirCampo(p, { altM: [500, 1000], etiqueta: ['a', 'b'] }, p.horas[0], 60)
    expect(c.nombres).toEqual(['a', 'comb'])
    expect(c.u[1][idx(c, 1, 0)]).toBeCloseTo(10)
    expect(c.v[1][idx(c, 1, 60)]).toBeCloseTo(10)
  })
  it('quita la franja sin dato y acorta el horizonte', () => {
    const p = prevSintetica()
    const r = recortar(p, { altM: [500, 2000], etiqueta: ['a', 'b'] }, p.horas[0] + 1800000, 60)
    expect(r.fuera).toEqual(['b'])
    expect(r.campo.rejilla.etiqueta).toEqual(['a'])
    expect(r.campo.minutos).toBe(30)
  })
})
```

- [ ] **Step 2: comprobar que falla**

Run: `npx vitest run src/services/nav/campo.test.ts`
Expected: FAIL, no encuentra `./campo`.

- [ ] **Step 3: escribir el código**

<!-- archivo: src/services/nav/campo.ts -->
```ts
// src/services/nav/campo.ts
// El campo de viento del motor: u y v por franja y por minuto, de cada modelo y
// de la combinacion de todos (spec 2026-10-30 §5.2). Las franjas son las filas
// del spec del 10/10 §5.2, y el tiempo se interpola como la columna «Ara» (§5.4).
import type { Previsiones, PuntoPerfil } from './perfil'
import { S_MS } from './parametros'

export const PIE_M = 0.3048
export const FRANJA_M = 250 * PIE_M
export const COMB = 'comb'

export interface Rejilla { altM: number[]; etiqueta: string[] }

/** 2500 a "2 500". */
export function miles(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Multiplos de 250 ft entre `altMinM` y `altMaxM`, y la franja «terra» debajo
 * si se pide. «terra» es la elevacion mas 10 m (spec 10/10 §5.2).
 */
export function franjas(altMinM: number, altMaxM: number, terraM: number | null = null): Rejilla {
  const altM: number[] = []
  const etiqueta: string[] = []
  const i0 = Math.ceil(altMinM / FRANJA_M - 1e-9)
  const i1 = Math.floor(altMaxM / FRANJA_M + 1e-9)
  if (terraM !== null && (i0 > i1 || terraM < i0 * FRANJA_M - 1)) {
    altM.push(terraM)
    etiqueta.push('terra')
  }
  for (let i = i0; i <= i1; i++) {
    altM.push(i * FRANJA_M)
    etiqueta.push(`${miles(i * 250)} ft`)
  }
  return { altM, etiqueta }
}

/** Lineal en u y v, sin extrapolar (spec 10/10 §5.2). */
export function interpAlt(p: PuntoPerfil[], altM: number): [number, number] | null {
  const n = p.length
  if (n === 0 || altM < p[0].altM - 1e-6 || altM > p[n - 1].altM + 1e-6) return null
  if (n === 1) return [p[0].u, p[0].v]
  for (let i = 0; i < n - 1; i++) {
    const a = p[i]
    const b = p[i + 1]
    if (altM <= b.altM + 1e-9) {
      const t = b.altM === a.altM ? 0 : Math.min(1, Math.max(0, (altM - a.altM) / (b.altM - a.altM)))
      return [a.u + t * (b.u - a.u), a.v + t * (b.v - a.v)]
    }
  }
  return [p[n - 1].u, p[n - 1].v]
}

function enHora(horas: number[], t: number): [number, number] | null {
  const n = horas.length
  if (n === 0 || t < horas[0] - 1 || t > horas[n - 1] + 1) return null
  if (n === 1) return [0, 0]
  for (let i = 0; i < n - 1; i++) {
    if (t <= horas[i + 1]) return [i, Math.max(0, (t - horas[i]) / (horas[i + 1] - horas[i]))]
  }
  return [n - 2, 1]
}

/** Viento de un modelo a una altitud y una hora, u y v en m/s. null si no tiene dato. */
export function vientoModelo(prev: Previsiones, m: number, altM: number, t: number): [number, number] | null {
  const h = enHora(prev.horas, t)
  if (h === null) return null
  const [i, f] = h
  if (f < 1e-9) return interpAlt(prev.perfiles[m][i], altM)
  if (f > 1 - 1e-9) return interpAlt(prev.perfiles[m][i + 1], altM)
  const a = interpAlt(prev.perfiles[m][i], altM)
  const b = interpAlt(prev.perfiles[m][i + 1], altM)
  if (a === null || b === null) return null
  return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])]
}

/** La casilla del spec 10/10 §5.3 como vector: rumbo de la suma, velocidad mediana. */
export function combinar(ws: [number, number][]): [number, number] | null {
  if (ws.length === 0) return null
  let su = 0
  let sv = 0
  const vel = ws.map(([u, v]) => {
    su += u
    sv += v
    return Math.hypot(u, v)
  }).sort((a, b) => a - b)
  const n = vel.length
  const med = n % 2 === 1 ? vel[(n - 1) / 2] : (vel[n / 2 - 1] + vel[n / 2]) / 2
  const k = Math.hypot(su, sv)
  if (k < 1e-9) return [0, 0]
  return [(su / k) * med, (sv / k) * med]
}

export function vientoCombinado(prev: Previsiones, altM: number, t: number): [number, number] | null {
  const ws: [number, number][] = []
  for (let m = 0; m < prev.modelos.length; m++) {
    const w = vientoModelo(prev, m, altM, t)
    if (w !== null) ws.push(w)
  }
  return combinar(ws)
}

/** El viento de la fuente `f`: un modelo, o `modelos.length` para el combinado. */
export function vientoFuente(prev: Previsiones, f: number, altM: number, t: number): [number, number] | null {
  return f < prev.modelos.length ? vientoModelo(prev, f, altM, t) : vientoCombinado(prev, altM, t)
}

export interface Campo {
  /** Minuto 0, ms desde epoch. */
  t0: number
  minutos: number
  rejilla: Rejilla
  /** Los modelos y, al final, «comb». */
  nombres: string[]
  /** u[f][idx(b, k)], NaN si no hay dato. */
  u: Float64Array[]
  v: Float64Array[]
  /** Incertidumbre por componente del combinado, por casilla. */
  sigma: Float64Array
}

export function idx(c: Campo, b: number, k: number): number {
  return b * (c.minutos + 1) + k
}

export function construirCampo(prev: Previsiones, rejilla: Rejilla, t0: number, minutos: number): Campo {
  const nombres = [...prev.modelos, COMB]
  const n = rejilla.altM.length * (minutos + 1)
  const u = nombres.map(() => new Float64Array(n))
  const v = nombres.map(() => new Float64Array(n))
  for (let f = 0; f < nombres.length; f++) {
    for (let b = 0; b < rejilla.altM.length; b++) {
      for (let k = 0; k <= minutos; k++) {
        const w = vientoFuente(prev, f, rejilla.altM[b], t0 + k * 60000)
        const i = b * (minutos + 1) + k
        u[f][i] = w === null ? NaN : w[0]
        v[f][i] = w === null ? NaN : w[1]
      }
    }
  }
  return { t0, minutos, rejilla, nombres, u, v, sigma: new Float64Array(n).fill(S_MS) }
}

export interface Recorte { campo: Campo; fuera: string[] }

/**
 * Quita las franjas sin dato combinado y acorta el horizonte al ultimo minuto
 * con dato en todas (spec 2026-10-30 §9).
 */
export function recortar(prev: Previsiones, rejilla: Rejilla, t0: number, minutos: number): Recorte {
  const c = construirCampo(prev, rejilla, t0, minutos)
  const fc = c.nombres.length - 1
  const dentro: number[] = []
  const fuera: string[] = []
  for (let b = 0; b < rejilla.altM.length; b++) {
    if (Number.isFinite(c.u[fc][idx(c, b, 0)])) dentro.push(b)
    else fuera.push(rejilla.etiqueta[b])
  }
  let h = minutos
  for (const b of dentro) {
    for (let k = 0; k <= h; k++) {
      if (!Number.isFinite(c.u[fc][idx(c, b, k)])) {
        h = k - 1
        break
      }
    }
  }
  const r: Rejilla = { altM: dentro.map(b => rejilla.altM[b]), etiqueta: dentro.map(b => rejilla.etiqueta[b]) }
  return { campo: construirCampo(prev, r, t0, Math.max(0, h)), fuera }
}
```

- [ ] **Step 4: comprobar que pasa**

Run: `npx vitest run src/services/nav/campo.test.ts`
Expected: PASS, 16 pruebas.

- [ ] **Step 5: commit**

```bash
git add src/services/nav/campo.ts src/services/nav/campo.test.ts
git commit -m "feat(nav): campo de viento por franja y minuto, de cada modelo y combinado"
```

---

### Task 4: medidas desde la traza GPS, con el retraso corregido

**Files:**
- Create: `src/services/nav/sintetico.ts`, `src/services/nav/medidas.ts`
- Test: `src/services/nav/medidas.test.ts`

Comprobado en Python antes de escribir el plan: con un escalón de viento de (5, 0) a (0, 5) m/s y τ = 130 s, la medida del primer tramo de 2 min (centro de la ventana a 89,5 s) da (0,009, 4,991), y la deriva sin corregir en ese instante va a 3,5 m/s del viento.

- [ ] **Step 1: escribir la prueba**

<!-- archivo: src/services/nav/medidas.test.ts -->
```ts
import { describe, it, expect } from 'vitest'
import { franjaMasCercana, medidasGps } from './medidas'
import { aGeo } from './geo'
import { rejillaUniforme } from './sintetico'
import type { PuntoTraza } from './tipos'

const plano = { lat0: 41.6, lon0: 1.6 }
const rej = rejillaUniforme(5, 500)

function traza(segundos: number, pos: (t: number) => [number, number], alt: (t: number) => number = () => 500): PuntoTraza[] {
  const out: PuntoTraza[] = []
  for (let t = 0; t <= segundos; t++) {
    const [x, y] = pos(t)
    const g = aGeo(plano, x, y)
    out.push({ t: t * 1000, lat: g.lat, lon: g.lon, altM: alt(t) })
  }
  return out
}

describe('franjaMasCercana', () => {
  it('la de altitud mas proxima', () => { expect(franjaMasCercana(rej, 590)).toBe(1) })
})

describe('medidasGps', () => {
  it('vuelo nivelado con viento constante', () => {
    const m = medidasGps(traza(200, t => [5 * t, 0]), rej, plano)
    expect(m.length).toBeGreaterThan(0)
    for (const x of m) {
      expect(x.u).toBeCloseTo(5, 2)
      expect(x.v).toBeCloseTo(0, 2)
      expect(x.fuente).toBe('gps')
    }
  })
  it('como mucho una medida por franja cada 2 min, la mas reciente', () => {
    const m = medidasGps(traza(239, t => [5 * t, 0]), rej, plano)
    expect(m).toHaveLength(2)
    expect(m[0].t).toBeGreaterThan(80000)
  })
  it('corrige el retraso del globo en un escalon de viento', () => {
    const tau = 130
    const w = [0, 5]
    const v0 = [5, 0]
    const pos = (t: number): [number, number] => [
      w[0] * t + (v0[0] - w[0]) * tau * (1 - Math.exp(-t / tau)),
      w[1] * t + (v0[1] - w[1]) * tau * (1 - Math.exp(-t / tau)),
    ]
    const m = medidasGps(traza(120, pos), rej, plano)
    expect(m).toHaveLength(1)
    expect(m[0].u).toBeCloseTo(0, 1)
    expect(m[0].v).toBeCloseTo(5, 1)
    const tc = m[0].t / 1000
    const crudo = [0, 1].map(i => w[i] + (v0[i] - w[i]) * Math.exp(-tc / tau))
    expect(Math.hypot(crudo[0] - w[0], crudo[1] - w[1])).toBeGreaterThan(2)
  })
  it('no mide si la ventana cruza mas de una franja', () => {
    const m = medidasGps(traza(200, t => [5 * t, 0], t => 500 + 3 * t), rej, plano)
    expect(m).toHaveLength(0)
  })
})
```

- [ ] **Step 2: comprobar que falla**

Run: `npx vitest run src/services/nav/medidas.test.ts`
Expected: FAIL, no encuentra `./medidas`.

- [ ] **Step 3: escribir el código**

<!-- archivo: src/services/nav/sintetico.ts -->
```ts
// src/services/nav/sintetico.ts
// Solo para las pruebas: campos y rejillas hechos a mano.
import { COMB, type Campo, type Rejilla } from './campo'
import { S_MS } from './parametros'

export function rejillaUniforme(n: number, base = 500, paso = 76.2): Rejilla {
  return {
    altM: Array.from({ length: n }, (_, i) => base + i * paso),
    etiqueta: Array.from({ length: n }, (_, i) => `F${i}`),
  }
}

/** Un campo con un modelo «m» y el combinado iguales. */
export function campoSintetico(
  rejilla: Rejilla, minutos: number, viento: (b: number, k: number) => [number, number], t0 = 0,
): Campo {
  const n = rejilla.altM.length * (minutos + 1)
  const u = new Float64Array(n)
  const v = new Float64Array(n)
  for (let b = 0; b < rejilla.altM.length; b++) {
    for (let k = 0; k <= minutos; k++) {
      const [a, c] = viento(b, k)
      u[b * (minutos + 1) + k] = a
      v[b * (minutos + 1) + k] = c
    }
  }
  return {
    t0, minutos, rejilla, nombres: ['m', COMB],
    u: [u, Float64Array.from(u)], v: [v, Float64Array.from(v)],
    sigma: new Float64Array(n).fill(S_MS),
  }
}
```

<!-- archivo: src/services/nav/medidas.ts -->
```ts
// src/services/nav/medidas.ts
// Medidas de viento (spec 2026-10-30 §5.1). Hoy solo la deriva del GPS del
// globo, corregida de su retraso. Las otras fuentes entraran como otra funcion
// que devuelva `Medida[]`, sin tocar el resto del motor.
import type { Medida, PuntoTraza } from './tipos'
import { aPlano, type Plano } from './geo'
import { FRANJA_M, type Rejilla } from './campo'
import { MIN_MUESTRAS, SEPARACION_S, SIGMA_GPS_1S, TAU_S, VENTANA_S } from './parametros'

export function franjaMasCercana(rej: Rejilla, altM: number): number {
  let mejor = 0
  for (let b = 1; b < rej.altM.length; b++) {
    if (Math.abs(rej.altM[b] - altM) < Math.abs(rej.altM[mejor] - altM)) mejor = b
  }
  return mejor
}

interface Vel { t: number; u: number; v: number; z: number }

/**
 * Un globo coge el viento nuevo con retraso, como un sistema de primer orden:
 * dv/dt = (w - v) / tau, asi que w = v + tau * dv/dt. La velocidad media y la
 * pendiente de una regresion sobre la misma ventana se refieren las dos al
 * centro de la ventana, y el sesgo de la ventana se cancela.
 */
export function medidasGps(traza: PuntoTraza[], rej: Rejilla, plano: Plano): Medida[] {
  const pts = traza.map(p => {
    const [x, y] = aPlano(plano, p.lat, p.lon)
    return { t: p.t / 1000, x, y, z: p.altM }
  })
  const vel: Vel[] = []
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const dt = b.t - a.t
    if (dt <= 0) continue
    vel.push({ t: (a.t + b.t) / 2, u: (b.x - a.x) / dt, v: (b.y - a.y) / dt, z: (a.z + b.z) / 2 })
  }

  const porTramo = new Map<string, Medida>()
  let ini = 0
  for (let fin = 0; fin < vel.length; fin++) {
    while (vel[fin].t - vel[ini].t > VENTANA_S) ini++
    const n = fin - ini + 1
    if (n < MIN_MUESTRAS || vel[fin].t - vel[ini].t < 0.9 * VENTANA_S) continue

    let tm = 0
    let um = 0
    let vm = 0
    let zm = 0
    let zmin = Infinity
    let zmax = -Infinity
    for (let i = ini; i <= fin; i++) {
      const s = vel[i]
      tm += s.t
      um += s.u
      vm += s.v
      zm += s.z
      zmin = Math.min(zmin, s.z)
      zmax = Math.max(zmax, s.z)
    }
    tm /= n
    um /= n
    vm /= n
    zm /= n
    // Subiendo o bajando mas de una franja en la ventana se mezclan vientos de capas distintas.
    if (zmax - zmin > FRANJA_M) continue

    let stt = 0
    let stu = 0
    let stv = 0
    for (let i = ini; i <= fin; i++) {
      const dt = vel[i].t - tm
      stt += dt * dt
      stu += dt * (vel[i].u - um)
      stv += dt * (vel[i].v - vm)
    }

    const b = franjaMasCercana(rej, zm)
    if (Math.abs(rej.altM[b] - zm) > FRANJA_M / 2) continue

    const sigma = Math.hypot(SIGMA_GPS_1S / Math.sqrt(n), (TAU_S * SIGMA_GPS_1S) / Math.sqrt(stt))
    porTramo.set(`${b}|${Math.floor(tm / SEPARACION_S)}`, {
      fuente: 'gps', t: tm * 1000, altM: zm,
      u: um + (TAU_S * stu) / stt, v: vm + (TAU_S * stv) / stt, sigma,
    })
  }
  return [...porTramo.values()].sort((a, b) => a.t - b.t)
}
```

- [ ] **Step 4: comprobar que pasa**

Run: `npx vitest run src/services/nav/medidas.test.ts`
Expected: PASS, 5 pruebas.

- [ ] **Step 5: commit**

```bash
git add src/services/nav/sintetico.ts src/services/nav/medidas.ts src/services/nav/medidas.test.ts
git commit -m "feat(nav): medidas de viento desde el GPS con el retraso del globo corregido"
```

---

### Task 5: corrección del campo con las medidas

**Files:**
- Create: `src/services/nav/correccion.ts`
- Test: `src/services/nav/correccion.test.ts`

Valores esperados con una medida de u = 2 m/s y σ = 0,1: en su casilla `2·S²/(S² + σ²)` = 1,9938, una franja de 200 m más arriba `× e⁻¹` = 0,7335, una hora después `× e^−0,5` = 1,2093.

- [ ] **Step 1: escribir la prueba**

<!-- archivo: src/services/nav/correccion.test.ts -->
```ts
import { describe, it, expect } from 'vitest'
import { adelante, atras, cholesky, corregirCampo, nucleo } from './correccion'
import { construirCampo, idx } from './campo'
import type { Previsiones } from './perfil'
import type { Medida } from './tipos'
import { S_MS } from './parametros'

const h0 = Date.parse('2026-10-10T06:00Z')
function prevCero(): Previsiones {
  const p = [{ altM: 0, u: 0, v: 0 }, { altM: 3000, u: 0, v: 0 }]
  return { elevM: 0, horas: [h0, h0 + 7200000], modelos: ['a'], perfiles: [[p, p]] }
}
const rej = { altM: [1000, 1200], etiqueta: ['a', 'b'] }
const medida = (over: Partial<Medida> = {}): Medida =>
  ({ fuente: 'gps', t: h0, altM: 1000, u: 2, v: 0, sigma: 0.1, ...over })

describe('algebra', () => {
  it('cholesky y las dos sustituciones resuelven un sistema', () => {
    const l = cholesky(Float64Array.from([4, 2, 2, 3]), 2)!
    const x = atras(l, 2, adelante(l, 2, [6, 5]))
    expect(x[0]).toBeCloseTo(1)
    expect(x[1]).toBeCloseTo(1)
  })
  it('si no es definida positiva, null', () => {
    expect(cholesky(Float64Array.from([1, 2, 2, 1]), 2)).toBeNull()
  })
  it('nucleo exponencial', () => {
    expect(nucleo(0, 0)).toBeCloseTo(S_MS * S_MS)
    expect(nucleo(200, 0) / nucleo(0, 0)).toBeCloseTo(Math.exp(-1))
  })
})

describe('corregirCampo', () => {
  const c = construirCampo(prevCero(), rej, h0, 60)
  it('sin medidas no cambia', () => {
    const r = corregirCampo(c, prevCero(), [], h0)
    expect(r.corregido).toBe(false)
    expect(r.campo).toBe(c)
  })
  it('una medida corrige su franja, las vecinas y un rato', () => {
    const r = corregirCampo(c, prevCero(), [medida()], h0)
    const f = r.campo.nombres.length - 1
    const m0 = (2 * S_MS ** 2) / (S_MS ** 2 + 0.01)
    expect(r.campo.u[f][idx(c, 0, 0)]).toBeCloseTo(m0, 3)
    expect(r.campo.u[f][idx(c, 1, 0)]).toBeCloseTo(m0 * Math.exp(-1), 3)
    expect(r.campo.u[f][idx(c, 0, 60)]).toBeCloseTo(m0 * Math.exp(-0.5), 3)
    expect(r.campo.u[0][idx(c, 0, 0)]).toBeCloseTo(m0, 3)
    expect(r.campo.sigma[idx(c, 0, 0)]).toBeLessThan(0.2)
    expect(r.campo.sigma[idx(c, 1, 60)]).toBeGreaterThan(1)
  })
  it('descarta las medidas de mas de 6 h', () => {
    expect(corregirCampo(c, prevCero(), [medida({ t: h0 - 7 * 3600000 })], h0).usadas).toBe(0)
  })
  it('dos medidas iguales no doblan la correccion', () => {
    const r = corregirCampo(c, prevCero(), [medida(), medida()], h0)
    expect(r.campo.u[r.campo.nombres.length - 1][idx(c, 0, 0)]).toBeLessThan(2.0001)
  })
})
```

- [ ] **Step 2: comprobar que falla**

Run: `npx vitest run src/services/nav/correccion.test.ts`
Expected: FAIL, no encuentra `./correccion`.

- [ ] **Step 3: escribir el código**

<!-- archivo: src/services/nav/correccion.ts -->
```ts
// src/services/nav/correccion.ts
// Corrige el campo con las medidas (spec 2026-10-30 §5.2). No se modela el
// viento sino el ERROR de la prevision: un proceso gaussiano con nucleo
// exponencial en altitud y tiempo sobre los residuos, como hizo Loon. Una
// medida corrige su franja, las vecinas y un rato hacia delante y hacia atras.
import type { Medida } from './tipos'
import type { Previsiones } from './perfil'
import { idx, vientoFuente, type Campo } from './campo'
import { EDAD_MAX_S, LT_S, LZ_M, MAX_MEDIDAS, S_MS } from './parametros'

export function nucleo(dzM: number, dtS: number): number {
  return S_MS * S_MS * Math.exp(-Math.abs(dzM) / LZ_M - Math.abs(dtS) / LT_S)
}

/** Factor de Cholesky de una matriz simetrica n x n por filas. null si no es definida positiva. */
export function cholesky(a: Float64Array, n: number): Float64Array | null {
  const l = new Float64Array(n * n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = a[i * n + j]
      for (let k = 0; k < j; k++) s -= l[i * n + k] * l[j * n + k]
      if (i === j) {
        if (!(s > 0)) return null
        l[i * n + i] = Math.sqrt(s)
      } else {
        l[i * n + j] = s / l[j * n + j]
      }
    }
  }
  return l
}

/** Resuelve L y = b. */
export function adelante(l: Float64Array, n: number, b: ArrayLike<number>): Float64Array {
  const y = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let s = b[i]
    for (let k = 0; k < i; k++) s -= l[i * n + k] * y[k]
    y[i] = s / l[i * n + i]
  }
  return y
}

/** Resuelve L^T x = y. */
export function atras(l: Float64Array, n: number, y: Float64Array): Float64Array {
  const x = new Float64Array(n)
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i]
    for (let k = i + 1; k < n; k++) s -= l[k * n + i] * x[k]
    x[i] = s / l[i * n + i]
  }
  return x
}

export interface Corregido { campo: Campo; corregido: boolean; usadas: number }

export function corregirCampo(c: Campo, prev: Previsiones, medidas: Medida[], ahora: number): Corregido {
  const usadas = medidas
    .filter(m => m.t <= ahora + 1000 && (ahora - m.t) / 1000 <= EDAD_MAX_S)
    .sort((a, b) => b.t - a.t)
    .slice(0, MAX_MEDIDAS)
  const n = usadas.length
  if (n === 0) return { campo: c, corregido: false, usadas: 0 }

  const k = new Float64Array(n * n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      k[i * n + j] = nucleo(usadas[i].altM - usadas[j].altM, (usadas[i].t - usadas[j].t) / 1000)
    }
    k[i * n + i] += usadas[i].sigma * usadas[i].sigma
  }
  // Si la factorizacion falla, mas ruido en la diagonal. Si sigue fallando, sin correccion.
  let l: Float64Array | null = null
  for (let intento = 0; intento < 3 && l === null; intento++) {
    if (intento > 0) for (let i = 0; i < n; i++) k[i * n + i] += 1e-6 * S_MS * S_MS * 10 ** intento
    l = cholesky(k, n)
  }
  if (l === null) return { campo: c, corregido: false, usadas: 0 }

  // Las medidas son las mismas para todas las fuentes: una factorizacion, una solucion por fuente.
  const nf = c.nombres.length
  const alfaU: Float64Array[] = []
  const alfaV: Float64Array[] = []
  for (let f = 0; f < nf; f++) {
    const ru = new Float64Array(n)
    const rv = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const w = vientoFuente(prev, f, usadas[i].altM, usadas[i].t)
      ru[i] = w === null ? 0 : usadas[i].u - w[0]
      rv[i] = w === null ? 0 : usadas[i].v - w[1]
    }
    alfaU.push(atras(l, n, adelante(l, n, ru)))
    alfaV.push(atras(l, n, adelante(l, n, rv)))
  }

  const u = c.u.map(a => Float64Array.from(a))
  const v = c.v.map(a => Float64Array.from(a))
  const sigma = new Float64Array(c.sigma.length)
  const ks = new Float64Array(n)
  for (let b = 0; b < c.rejilla.altM.length; b++) {
    for (let m = 0; m <= c.minutos; m++) {
      const t = c.t0 + m * 60000
      for (let i = 0; i < n; i++) ks[i] = nucleo(c.rejilla.altM[b] - usadas[i].altM, (t - usadas[i].t) / 1000)
      const ic = idx(c, b, m)
      for (let f = 0; f < nf; f++) {
        let du = 0
        let dv = 0
        for (let i = 0; i < n; i++) {
          du += ks[i] * alfaU[f][i]
          dv += ks[i] * alfaV[f][i]
        }
        u[f][ic] += du
        v[f][ic] += dv
      }
      const y = adelante(l, n, ks)
      let q = 0
      for (let i = 0; i < n; i++) q += y[i] * y[i]
      sigma[ic] = Math.sqrt(Math.max(0, S_MS * S_MS - q))
    }
  }
  return { campo: { ...c, u, v, sigma }, corregido: true, usadas: n }
}
```

- [ ] **Step 4: comprobar que pasa**

Run: `npx vitest run src/services/nav/correccion.test.ts`
Expected: PASS, 7 pruebas.

- [ ] **Step 5: commit**

```bash
git add src/services/nav/correccion.ts src/services/nav/correccion.test.ts
git commit -m "feat(nav): correccion del error de la prevision con las medidas"
```

---

### Task 6: capacidad vertical, tránsitos y tablas

**Files:**
- Create: `src/services/nav/vertical.ts`
- Test: `src/services/nav/vertical.test.ts`

Cuenta a mano del primer caso: subir una franja de 76,2 m a 2,75 m/s son tres pasos de 10 s (27,5, 55 y el resto), con viento 0, 0,3609 y 0,7218 m/s, y 30 s ya arriba a 1 m/s: 40,83 m.

- [ ] **Step 1: escribir la prueba**

<!-- archivo: src/services/nav/vertical.test.ts -->
```ts
import { describe, it, expect } from 'vitest'
import { construirTablas, minutosTransito, modoDe, tr, transito, vientoEn } from './vertical'
import { campoSintetico, rejillaUniforme } from './sintetico'
import { AJUSTES_POR_DEFECTO, type AjustesNav } from './tipos'

const aj: AjustesNav = { ...AJUSTES_POR_DEFECTO, altMinM: 0, altMaxM: 5000 }
const rej = rejillaUniforme(4, 500)
// franja b: b m/s hacia el este
const c = campoSintetico(rej, 60, b => [b, 0])

describe('vientoEn', () => {
  it('lineal entre franjas', () => { expect(vientoEn(c, 1, 500 + 76.2 / 2, 0)[0]).toBeCloseTo(0.5) })
  it('fuera del rango, la franja del borde', () => {
    expect(vientoEn(c, 1, 100, 0)[0]).toBe(0)
    expect(vientoEn(c, 1, 9000, 0)[0]).toBe(3)
  })
})

describe('transito', () => {
  it('subir rapido una franja: tres pasos subiendo y el resto del minuto arriba', () => {
    const t = transito(c, 1, 0, 1, 2.75, 0)
    expect(t.minutos).toBe(1)
    expect(t.dx).toBeCloseTo(40.83, 1)
    expect(t.camino).toEqual([[t.dx, t.dy]])
  })
  it('bajar lento tres franjas: 46 pasos, 8 min', () => {
    expect(minutosTransito(c, 3, 0, 0.5)).toBe(8)
    expect(transito(c, 1, 3, 0, 0.5, 0).minutos).toBe(8)
  })
  it('misma franja, nada', () => { expect(transito(c, 1, 2, 2, 1, 0).minutos).toBe(0) })
  it('modos', () => {
    expect(modoDe(true, 1)).toBe('puja_rapid')
    expect(modoDe(false, 0)).toBe('baixa_lent')
  })
})

describe('construirTablas', () => {
  const t = construirTablas(c, 1, aj)
  it('mantener es una resta de acumulados', () => {
    expect(t.px[2 * 61 + 10]).toBeCloseTo(2 * 60 * 10)
  })
  it('el transito que no cabe en el horizonte es null', () => {
    expect(tr(t, 3, 0, 0, 55)).toBeNull()
    expect(tr(t, 3, 0, 0, 52)).not.toBeNull()
  })
})
```

- [ ] **Step 2: comprobar que falla**

Run: `npx vitest run src/services/nav/vertical.test.ts`
Expected: FAIL, no encuentra `./vertical`.

- [ ] **Step 3: escribir el código**

<!-- archivo: src/services/nav/vertical.ts -->
```ts
// src/services/nav/vertical.ts
// Que franjas se alcanzan y cuanto se deriva por el camino, con los modos del
// piloto (spec 2026-10-30 §6.1 y §6.2). Es la unica pieza que sabe de modos: el
// modelo fisico de la tesis de Llado-Gambin la sustituira cuando la caja de la
// temperatura de la vela.
import { idx, type Campo } from './campo'
import type { AjustesNav, Modo } from './tipos'
import { PASO_INTEGRACION_S } from './parametros'

/** Viento del campo `f` a una altitud cualquiera en el minuto `k`, lineal entre franjas. */
export function vientoEn(c: Campo, f: number, altM: number, k: number): [number, number] {
  const a = c.rejilla.altM
  const n = a.length
  const kk = Math.min(Math.max(k, 0), c.minutos)
  const en = (b: number): [number, number] => [c.u[f][idx(c, b, kk)], c.v[f][idx(c, b, kk)]]
  if (altM <= a[0]) return en(0)
  if (altM >= a[n - 1]) return en(n - 1)
  let j = 0
  while (a[j + 1] < altM) j++
  const t = (altM - a[j]) / (a[j + 1] - a[j])
  const [u0, v0] = en(j)
  const [u1, v1] = en(j + 1)
  return [u0 + t * (u1 - u0), v0 + t * (v1 - v0)]
}

/** El modo de cada clase de velocidad, 0 lenta y 1 rapida, segun se suba o se baje. */
export function modoDe(subir: boolean, clase: number): Modo {
  if (subir) return clase === 0 ? 'puja_lent' : 'puja_rapid'
  return clase === 0 ? 'baixa_lent' : 'baixa_rapid'
}

export function velocidad(aj: AjustesNav, subir: boolean, clase: number): number {
  return aj.modos[modoDe(subir, clase)]
}

export interface Transito {
  minutos: number
  dx: number
  dy: number
  /** Posicion al final de cada minuto, relativa al inicio. La ultima es (dx, dy). */
  camino: [number, number][]
}

/** Minutos enteros que dura ir de b a b2 a velMs, sin simular. Igual que `transito`. */
export function minutosTransito(c: Campo, b: number, b2: number, velMs: number): number {
  if (b === b2) return 0
  const dz = Math.abs(c.rejilla.altM[b2] - c.rejilla.altM[b])
  const pasos = Math.max(1, Math.ceil((dz - 1e-6) / (velMs * PASO_INTEGRACION_S)))
  return Math.ceil((pasos * PASO_INTEGRACION_S) / 60 - 1e-9)
}

/**
 * De la franja b a la b2 a velMs empezando en el minuto k0, integrado en pasos
 * de 10 s con el viento de la altitud de cada paso. Llegado a b2, el resto del
 * minuto se mantiene alli.
 */
export function transito(c: Campo, f: number, b: number, b2: number, velMs: number, k0: number): Transito {
  const z1 = c.rejilla.altM[b2]
  const paso = PASO_INTEGRACION_S
  const dz = velMs * paso
  let z = c.rejilla.altM[b]
  let x = 0
  let y = 0
  let s = 0
  const camino: [number, number][] = []
  while (Math.abs(z1 - z) > 1e-6 || s % 60 !== 0) {
    const [u, v] = vientoEn(c, f, z, k0 + Math.floor(s / 60))
    x += u * paso
    y += v * paso
    s += paso
    if (Math.abs(z1 - z) > 1e-6) z = Math.abs(z1 - z) <= dz + 1e-6 ? z1 : z + Math.sign(z1 - z) * dz
    if (s % 60 === 0) camino.push([x, y])
  }
  return { minutos: s / 60, dx: x, dy: y, camino }
}

export interface Tablas {
  c: Campo
  f: number
  /** Posicion acumulada manteniendo cada franja desde el minuto 0, en idx(b, k). */
  px: Float64Array
  py: Float64Array
  /** filas[(b * B + b2) * 2 + clase][k0], null si no cabe en el horizonte. */
  filas: (Transito | null)[][]
}

export function construirTablas(c: Campo, f: number, aj: AjustesNav): Tablas {
  const B = c.rejilla.altM.length
  const H = c.minutos
  const px = new Float64Array(B * (H + 1))
  const py = new Float64Array(B * (H + 1))
  for (let b = 0; b < B; b++) {
    for (let k = 0; k < H; k++) {
      const i = idx(c, b, k)
      px[i + 1] = px[i] + c.u[f][i] * 60
      py[i + 1] = py[i] + c.v[f][i] * 60
    }
  }
  const filas: (Transito | null)[][] = []
  for (let b = 0; b < B; b++) {
    for (let b2 = 0; b2 < B; b2++) {
      for (let cl = 0; cl < 2; cl++) {
        const fila: (Transito | null)[] = new Array<Transito | null>(H + 1).fill(null)
        if (b !== b2) {
          const vel = velocidad(aj, c.rejilla.altM[b2] > c.rejilla.altM[b], cl)
          const m = minutosTransito(c, b, b2, vel)
          for (let k0 = 0; k0 + m <= H; k0++) fila[k0] = transito(c, f, b, b2, vel, k0)
        }
        filas.push(fila)
      }
    }
  }
  return { c, f, px, py, filas }
}

/** El transito de b a b2 en la clase cl saliendo en el minuto k0, o null. */
export function tr(t: Tablas, b: number, b2: number, cl: number, k0: number): Transito | null {
  return t.filas[(b * t.c.rejilla.altM.length + b2) * 2 + cl][k0] ?? null
}
```

- [ ] **Step 4: comprobar que pasa**

Run: `npx vitest run src/services/nav/vertical.test.ts`
Expected: PASS, 8 pruebas.

- [ ] **Step 5: commit**

```bash
git add src/services/nav/vertical.ts src/services/nav/vertical.test.ts
git commit -m "feat(nav): transitos entre franjas con los modos del piloto y tablas precalculadas"
```

---

### Task 7: plan al punto y oráculo

**Files:**
- Create: `src/services/nav/plan.ts`, `src/services/nav/oraculo.ts`
- Test: `src/services/nav/plan.test.ts`

- [ ] **Step 1: escribir la prueba**

<!-- archivo: src/services/nav/plan.test.ts -->
```ts
import { describe, it, expect } from 'vitest'
import {
  aproximacion, aTramos, buscarPlan, caminoDirecto, caminoTabla, debeSustituir, elegir, type PlanInterno,
} from './plan'
import { oraculo } from './oraculo'
import { construirTablas } from './vertical'
import { campoSintetico, rejillaUniforme } from './sintetico'
import { AJUSTES_POR_DEFECTO, type AjustesNav } from './tipos'

const aj: AjustesNav = { ...AJUSTES_POR_DEFECTO, altMinM: 0, altMaxM: 9999 }
const rapido: AjustesNav = {
  ...aj, modos: { puja_lent: 7.62, puja_rapid: 76.2, baixa_lent: 7.62, baixa_rapid: 76.2 },
}

describe('aproximacion', () => {
  it('por segmentos, no solo en los minutos', () => {
    expect(aproximacion([[0, 0], [100, 0]], 50, 10).distM).toBeCloseTo(10)
  })
})

describe('caminoTabla y caminoDirecto dan lo mismo', () => {
  const c = campoSintetico(rejillaUniforme(4, 500), 40, (b, k) => [Math.cos(b + k / 10) * 4, Math.sin(b * 2 + k / 7) * 4])
  const t = construirTablas(c, 1, aj)
  const planes: PlanInterno[] = [
    { franjas: [0], clases: [], dur: [40] },
    { franjas: [0, 3], clases: [1], dur: [4, 0] },
    { franjas: [1, 3, 0], clases: [0, 1], dur: [0, 6, 0] },
    { franjas: [2, 0, 1], clases: [1, 0], dur: [7, 3, 0] },
  ]
  for (const p of planes) {
    it(p.franjas.join(' '), () => {
      const a = caminoTabla(t, p)!
      const b = caminoDirecto(c, 1, aj, p)!
      expect(a).toHaveLength(41)
      for (let k = 0; k <= 40; k++) {
        expect(a[k][0]).toBeCloseTo(b[k][0], 6)
        expect(a[k][1]).toBeCloseTo(b[k][1], 6)
      }
    })
  }
})

describe('buscarPlan', () => {
  it('dos capas, este y norte: llega', () => {
    const c = campoSintetico(rejillaUniforme(2, 500), 60, b => (b === 0 ? [5, 0] : [0, 5]))
    const e = buscarPlan(construirTablas(c, 1, rapido), 0, 6000, 6000)
    expect(e.plan.franjas).toContain(1)
    expect(e.distM).toBeLessThanOrEqual(50.01)
  })
  it('no peor que la fuerza bruta del prototipo, y con las reglas', () => {
    const c = campoSintetico(rejillaUniforme(5, 500), 60, (b, k) =>
      [Math.cos(b * 1.3 + k / 20) * 5, Math.sin(b * 1.3 + k / 20) * 5])
    const t = construirTablas(c, 1, aj)
    const e = buscarPlan(t, 2, -3000, 4000)
    const o = oraculo(c, 1, aj, 2, -3000, 4000)
    expect(e.distM).toBeLessThanOrEqual(o.distM + 50)
    expect(e.plan.franjas.length).toBeLessThanOrEqual(3)
    expect(e.plan.dur[0] === 0 || e.plan.dur[0] >= 2).toBe(true)
    for (let i = 1; i < e.plan.dur.length - 1; i++) expect(e.plan.dur[i]).toBeGreaterThanOrEqual(2)
  })
})

describe('elegir', () => {
  const p: PlanInterno = { franjas: [0], clases: [], dur: [10] }
  const q: PlanInterno = { franjas: [0, 1], clases: [0], dur: [2, 0] }
  it('a menos de 50 m del mejor, gana el que llega antes', () => {
    expect(elegir([{ plan: p, distM: 10, minuto: 20 }, { plan: q, distM: 30, minuto: 10 }]).plan).toBe(q)
  })
  it('y despues el de menos cambios', () => {
    expect(elegir([{ plan: q, distM: 10, minuto: 10 }, { plan: p, distM: 30, minuto: 10 }]).plan).toBe(p)
  })
  it('a mas de 50 m, la distancia manda', () => {
    expect(elegir([{ plan: p, distM: 10, minuto: 20 }, { plan: q, distM: 70, minuto: 5 }]).plan).toBe(p)
  })
})

describe('aTramos', () => {
  const c = campoSintetico(rejillaUniforme(2, 500), 60, () => [1, 0])
  const t = construirTablas(c, 1, rapido)
  it('mantener, cambiar y mantener hasta el punto', () => {
    const tr = aTramos(t, { franjas: [0, 1], clases: [1], dur: [5, 0] }, 30)
    expect(tr.map(x => [x.tipo, x.franja, x.inicioMin, x.finMin])).toEqual([
      ['mantener', 0, 0, 5], ['cambiar', 1, 5, 6], ['mantener', 1, 6, 30],
    ])
    expect(tr[1].modo).toBe('puja_rapid')
  })
  it('sin mantener la actual si sale enseguida', () => {
    expect(aTramos(t, { franjas: [0, 1], clases: [0], dur: [0, 0] }, 10)[0].tipo).toBe('cambiar')
  })
})

describe('debeSustituir', () => {
  it('20 % o 200 m mas cerca', () => {
    expect(debeSustituir(1000, 800)).toBe(true)
    expect(debeSustituir(1000, 850)).toBe(false)
    expect(debeSustituir(5000, 4800)).toBe(true)
    expect(debeSustituir(5000, 4850)).toBe(false)
  })
})
```

- [ ] **Step 2: comprobar que falla**

Run: `npx vitest run src/services/nav/plan.test.ts`
Expected: FAIL, no encuentra `./plan`.

- [ ] **Step 3: escribir el código**

<!-- archivo: src/services/nav/plan.ts -->
```ts
// src/services/nav/plan.ts
// El plan que pasa mas cerca del punto (spec 2026-10-30 §6.4). Un plan es
// [actual, A, B]: mantener la actual (0 min, o 2 o mas), ir a A, mantenerla 2 min
// o mas, ir a B y mantenerla hasta el horizonte. Busqueda exhaustiva en pasos de
// 2 min sobre acumulados y transitos ya calculados, refinado de 1 min y eleccion.
import { idx, type Campo } from './campo'
import { envolvente } from './geo'
import { modoDe, tr, transito, velocidad, type Tablas } from './vertical'
import type { AjustesNav, Tramo } from './tipos'
import {
  LLEGA_M, MAX_CANDIDATAS, MAX_FRANJAS_TODAS, MEJORA_ABSOLUTA_M, MEJORA_RELATIVA, MIN_MANTENER, TOP_PLANES,
} from './parametros'

/** franjas[0] es la actual. dur[i] es lo que se mantiene franjas[i]. La ultima va hasta el horizonte. */
export interface PlanInterno { franjas: number[]; clases: number[]; dur: number[] }
export interface Evaluado { plan: PlanInterno; distM: number; minuto: number }
/** Posicion al final de cada minuto, de 0 al horizonte, relativa a la posicion actual. */
export type Camino = [number, number][]

export function distSegmento(ax: number, ay: number, bx: number, by: number, ox: number, oy: number): number {
  const ex = bx - ax
  const ey = by - ay
  const l2 = ex * ex + ey * ey
  const s = l2 > 0 ? Math.max(0, Math.min(1, ((ox - ax) * ex + (oy - ay) * ey) / l2)) : 0
  return Math.hypot(ax + s * ex - ox, ay + s * ey - oy)
}

interface Min { m: number; mk: number }

function avanzar(s: Min, ax: number, ay: number, bx: number, by: number, k: number, ox: number, oy: number): void {
  const d = distSegmento(ax, ay, bx, by, ox, oy)
  if (d < s.m) {
    s.m = d
    s.mk = Math.hypot(ax - ox, ay - oy) < Math.hypot(bx - ox, by - oy) ? k - 1 : k
  }
}

/** La distancia minima de un camino al punto, por segmentos, y el minuto en que pasa. */
export function aproximacion(cam: Camino, ox: number, oy: number): { distM: number; minuto: number } {
  const s: Min = { m: Math.hypot(cam[0][0] - ox, cam[0][1] - oy), mk: 0 }
  for (let k = 1; k < cam.length; k++) avanzar(s, cam[k - 1][0], cam[k - 1][1], cam[k][0], cam[k][1], k, ox, oy)
  return { distM: s.m, minuto: s.mk }
}

/** Simulacion directa, sin tablas: para la dispersion entre modelos y como oraculo. */
export function caminoDirecto(c: Campo, f: number, aj: AjustesNav, p: PlanInterno): Camino | null {
  const H = c.minutos
  const out: Camino = [[0, 0]]
  let x = 0
  let y = 0
  let k = 0
  for (let i = 0; i < p.franjas.length; i++) {
    const b = p.franjas[i]
    if (i > 0) {
      const a = p.franjas[i - 1]
      const t = transito(c, f, a, b, velocidad(aj, c.rejilla.altM[b] > c.rejilla.altM[a], p.clases[i - 1]), k)
      if (k + t.minutos > H) return null
      for (const [dx, dy] of t.camino) out.push([x + dx, y + dy])
      x += t.dx
      y += t.dy
      k += t.minutos
    }
    const fin = i === p.franjas.length - 1 ? H : k + p.dur[i]
    if (fin > H) return null
    for (; k < fin; k++) {
      const j = idx(c, b, k)
      x += c.u[f][j] * 60
      y += c.v[f][j] * 60
      out.push([x, y])
    }
  }
  return out
}

/** Lo mismo con las tablas: restas de acumulados y transitos ya calculados. */
export function caminoTabla(t: Tablas, p: PlanInterno): Camino | null {
  const c = t.c
  const H = c.minutos
  const out: Camino = [[0, 0]]
  let x = 0
  let y = 0
  let k = 0
  for (let i = 0; i < p.franjas.length; i++) {
    const b = p.franjas[i]
    if (i > 0) {
      const tt = tr(t, p.franjas[i - 1], b, p.clases[i - 1], k)
      if (tt === null) return null
      for (const [dx, dy] of tt.camino) out.push([x + dx, y + dy])
      x += tt.dx
      y += tt.dy
      k += tt.minutos
    }
    const fin = i === p.franjas.length - 1 ? H : k + p.dur[i]
    if (fin > H) return null
    const i0 = idx(c, b, k)
    for (let kk = k + 1; kk <= fin; kk++) {
      const j = idx(c, b, kk)
      out.push([x + t.px[j] - t.px[i0], y + t.py[j] - t.py[i0]])
    }
    x += t.px[idx(c, b, fin)] - t.px[i0]
    y += t.py[idx(c, b, fin)] - t.py[i0]
    k = fin
  }
  return out
}

/** La menor distancia y, a menos de 50 m de ella, el que llega antes y despues el de menos cambios. */
export function elegir(es: Evaluado[]): Evaluado {
  const dmin = Math.min(...es.map(e => e.distM))
  return es
    .filter(e => e.distM < dmin + LLEGA_M)
    .sort((a, b) => a.minuto - b.minuto || a.plan.franjas.length - b.plan.franjas.length || a.distM - b.distM)[0]
}

/** Las franjas que se prueban como A y B. Todas salvo en vuelos altos con muchas franjas. */
export function candidatas(t: Tablas, b0: number, ox: number, oy: number): number[] {
  const c = t.c
  const B = c.rejilla.altM.length
  const todas = Array.from({ length: B }, (_, i) => i)
  if (B <= MAX_FRANJAS_TODAS) return todas
  const H = c.minutos
  const medio: [number, number][] = todas.map(b => [t.px[idx(c, b, H)], t.py[idx(c, b, H)]])
  const set = new Set<number>([b0])
  for (let d = -3; d <= 3; d++) if (b0 + d >= 0 && b0 + d < B) set.add(b0 + d)
  for (const b of envolvente(medio)) set.add(b)
  const r = Math.hypot(ox, oy) || 1
  const alineadas = [...todas].sort((a, b) =>
    (medio[b][0] * ox + medio[b][1] * oy) / r - (medio[a][0] * ox + medio[a][1] * oy) / r)
  for (const b of alineadas) {
    if (set.size >= MAX_CANDIDATAS) break
    set.add(b)
  }
  return [...set]
}

export function buscarPlan(t: Tablas, b0: number, ox: number, oy: number): Evaluado {
  const c = t.c
  const H = c.minutos
  const W = H + 1
  const px = t.px
  const py = t.py
  const cand = candidatas(t, b0, ox, oy)
  const top: Evaluado[] = []
  const meter = (plan: PlanInterno, distM: number, minuto: number) => {
    if (top.length >= TOP_PLANES && distM >= top[top.length - 1].distM) return
    top.push({ plan, distM, minuto })
    top.sort((a, b) => a.distM - b.distM)
    if (top.length > TOP_PLANES) top.pop()
  }

  // Mantener la actual: el minimo acumulado sirve a todos los planes que salen de ella.
  const minB = new Float64Array(W)
  const argB = new Int32Array(W)
  const s0: Min = { m: Math.hypot(ox, oy), mk: 0 }
  minB[0] = s0.m
  for (let k = 1; k <= H; k++) {
    avanzar(s0, px[b0 * W + k - 1], py[b0 * W + k - 1], px[b0 * W + k], py[b0 * W + k], k, ox, oy)
    minB[k] = s0.m
    argB[k] = s0.mk
  }
  meter({ franjas: [b0], clases: [], dur: [H] }, minB[H], argB[H])

  for (let d0 = 0; d0 < H; d0 += 2) {
    const sx = px[b0 * W + d0]
    const sy = py[b0 * W + d0]
    for (const A of cand) {
      if (A === b0) continue
      for (let ca = 0; ca < 2; ca++) {
        const ta = tr(t, b0, A, ca, d0)
        if (ta === null) continue
        const sA: Min = { m: minB[d0], mk: argB[d0] }
        let lx = sx
        let ly = sy
        for (let j = 0; j < ta.camino.length; j++) {
          const x = sx + ta.camino[j][0]
          const y = sy + ta.camino[j][1]
          avanzar(sA, lx, ly, x, y, d0 + 1 + j, ox, oy)
          lx = x
          ly = y
        }
        const kA = d0 + ta.minutos
        const ax = sx + ta.dx - px[A * W + kA]
        const ay = sy + ta.dy - py[A * W + kA]
        for (let k = kA; k <= H; k++) {
          const x = ax + px[A * W + k]
          const y = ay + py[A * W + k]
          if (k > kA) {
            avanzar(sA, lx, ly, x, y, k, ox, oy)
            lx = x
            ly = y
          }
          const dA = k - kA
          if (dA < MIN_MANTENER || dA % 2 !== 0 || k >= H) continue
          for (const Bf of cand) {
            if (Bf === A) continue
            for (let cb = 0; cb < 2; cb++) {
              const tb = tr(t, A, Bf, cb, k)
              if (tb === null) continue
              const sB: Min = { m: sA.m, mk: sA.mk }
              let mx = x
              let my = y
              for (let j = 0; j < tb.camino.length; j++) {
                const nx = x + tb.camino[j][0]
                const ny = y + tb.camino[j][1]
                avanzar(sB, mx, my, nx, ny, k + 1 + j, ox, oy)
                mx = nx
                my = ny
              }
              const kB = k + tb.minutos
              const bx = mx - px[Bf * W + kB]
              const by = my - py[Bf * W + kB]
              for (let kk = kB + 1; kk <= H; kk++) {
                const nx = bx + px[Bf * W + kk]
                const ny = by + py[Bf * W + kk]
                avanzar(sB, mx, my, nx, ny, kk, ox, oy)
                mx = nx
                my = ny
              }
              meter({ franjas: [b0, A, Bf], clases: [ca, cb], dur: [d0, dA, H - kB] }, sB.m, sB.mk)
            }
          }
        }
        meter({ franjas: [b0, A], clases: [ca], dur: [d0, H - kA] }, sA.m, sA.mk)
      }
    }
  }

  // Refinado: cada duracion un minuto arriba y abajo.
  const vistos = new Set<string>()
  for (const e of [...top]) {
    for (let i = 0; i < e.plan.dur.length - 1; i++) {
      for (const s of [-1, 1]) {
        const dur = [...e.plan.dur]
        dur[i] += s
        const valido = i === 0 ? dur[0] === 0 || dur[0] >= MIN_MANTENER : dur[i] >= MIN_MANTENER
        if (!valido) continue
        const p: PlanInterno = { ...e.plan, dur }
        const clave = `${p.franjas}|${p.clases}|${dur.slice(0, -1)}`
        if (vistos.has(clave)) continue
        vistos.add(clave)
        const cam = caminoTabla(t, p)
        if (cam === null) continue
        const a = aproximacion(cam, ox, oy)
        meter(p, a.distM, a.minuto)
      }
    }
  }
  return elegir(top)
}

/** El plan en tramos con minutos, cortado en el minuto en que pasa mas cerca. */
export function aTramos(t: Tablas, p: PlanInterno, hasta: number): Tramo[] {
  const altM = t.c.rejilla.altM
  const out: Tramo[] = []
  let k = 0
  for (let i = 0; i < p.franjas.length; i++) {
    const b = p.franjas[i]
    if (i > 0) {
      const a = p.franjas[i - 1]
      const tt = tr(t, a, b, p.clases[i - 1], k)
      if (tt === null) break
      out.push({ tipo: 'cambiar', franja: b, modo: modoDe(altM[b] > altM[a], p.clases[i - 1]), inicioMin: k, finMin: k + tt.minutos })
      k += tt.minutos
      if (k >= hasta) break
    }
    const fin = i === p.franjas.length - 1 ? t.c.minutos : k + p.dur[i]
    if (fin > k && hasta > k) out.push({ tipo: 'mantener', franja: b, modo: null, inicioMin: k, finMin: Math.min(fin, hasta) })
    k = fin
    if (k >= hasta) break
  }
  return out
}

/** El plan vigente solo se sustituye si el nuevo pasa un 20 % o 200 m mas cerca (spec 10/10 §6.8). */
export function debeSustituir(anteriorM: number, nuevoM: number): boolean {
  return nuevoM <= anteriorM * MEJORA_RELATIVA || nuevoM <= anteriorM - MEJORA_ABSOLUTA_M
}
```

<!-- archivo: src/services/nav/oraculo.ts -->
```ts
// src/services/nav/oraculo.ts
// Solo para las pruebas: la fuerza bruta del prototipo (optim2.py) con la
// simulacion directa, sin tablas. Mantener la actual de 0 a 20 min, ir a A,
// mantenerla de 2 a 20, ir a B y mantenerla hasta el horizonte, de 2 en 2 min.
import type { Campo } from './campo'
import { aproximacion, caminoDirecto, type Evaluado, type PlanInterno } from './plan'
import type { AjustesNav } from './tipos'

export function oraculo(c: Campo, f: number, aj: AjustesNav, b0: number, ox: number, oy: number): Evaluado {
  const r: { mejor: Evaluado | null } = { mejor: null }
  const probar = (plan: PlanInterno) => {
    const cam = caminoDirecto(c, f, aj, plan)
    if (cam === null) return
    const a = aproximacion(cam, ox, oy)
    if (r.mejor === null || a.distM < r.mejor.distM) r.mejor = { plan, distM: a.distM, minuto: a.minuto }
  }
  const B = c.rejilla.altM.length
  probar({ franjas: [b0], clases: [], dur: [c.minutos] })
  for (let h0 = 0; h0 <= 20; h0 += 2) {
    for (let A = 0; A < B; A++) {
      if (A === b0) continue
      for (let ca = 0; ca < 2; ca++) {
        probar({ franjas: [b0, A], clases: [ca], dur: [h0, 0] })
        for (let hA = 2; hA <= 20; hA += 2) {
          for (let Bf = 0; Bf < B; Bf++) {
            if (Bf === A) continue
            for (let cb = 0; cb < 2; cb++) probar({ franjas: [b0, A, Bf], clases: [ca, cb], dur: [h0, hA, 0] })
          }
        }
      }
    }
  }
  if (r.mejor === null) throw new Error('El oraculo no ha encontrado ningun plan')
  return r.mejor
}
```

- [ ] **Step 4: comprobar que pasa**

Run: `npx vitest run src/services/nav/plan.test.ts`
Expected: PASS, 13 pruebas.

- [ ] **Step 5: commit**

```bash
git add src/services/nav/plan.ts src/services/nav/oraculo.ts src/services/nav/plan.test.ts
git commit -m "feat(nav): plan al punto con busqueda exhaustiva sobre tablas y oraculo del prototipo"
```

---

### Task 8: zona alcanzable

**Files:**
- Create: `src/services/nav/zona.ts`
- Test: `src/services/nav/zona.test.ts`

Cuentas a mano con viento estable (franja 0 al este, 1 al norte, 2 al oeste, a 5 m/s, cambios en 10 s, 30 min): al este, quedarse, 9 000 m. Al norte, ir a la 1 enseguida: 10 s al este y 50 s al norte, y 29 min al norte, 8 950 m. Al oeste, ir a la 2 (a 76,2 m/s cruza las dos franjas en un paso): 10 s al este, 50 s al oeste y 29 min al oeste, 8 900 m.

- [ ] **Step 1: escribir la prueba**

<!-- archivo: src/services/nav/zona.test.ts -->
```ts
import { describe, it, expect } from 'vitest'
import { calcularZona, fueraSeguro, poligono } from './zona'
import { caminoDirecto, type PlanInterno } from './plan'
import { construirTablas } from './vertical'
import { campoSintetico, rejillaUniforme } from './sintetico'
import { AJUSTES_POR_DEFECTO, type AjustesNav } from './tipos'

const aj: AjustesNav = { ...AJUSTES_POR_DEFECTO, altMinM: 0, altMaxM: 9999 }
const rapido: AjustesNav = {
  ...aj, modos: { puja_lent: 76.2, puja_rapid: 76.2, baixa_lent: 76.2, baixa_rapid: 76.2 },
}

describe('viento estable, cuentas a mano', () => {
  const vientos: [number, number][] = [[5, 0], [0, 5], [-5, 0]]
  const c = campoSintetico(rejillaUniforme(3, 500), 30, b => vientos[b])
  const z = calcularZona(construirTablas(c, 1, rapido), 0)
  it('al este, quedarse', () => { expect(z.h[0][30]).toBeCloseTo(9000, 6) })
  it('al norte, ir a la franja 1 enseguida', () => { expect(z.h[8][30]).toBeCloseTo(8950, 6) })
  it('al oeste, ir a la franja 2', () => { expect(z.h[16][30]).toBeCloseTo(8900, 6) })
  it('el minuto 0 es la posicion actual', () => { expect(poligono(z, 0)).toEqual([[0, 0]]) })
  it('un punto al sur no se alcanza, y se sabe', () => { expect(fueraSeguro(z, 0, -3000)).toBe(true) })
  it('un punto al norte si', () => { expect(fueraSeguro(z, 0, 3000)).toBe(false) })
})

describe('las posiciones a mitad de un cambio largo tambien cuentan', () => {
  // 762 m a 1 m/s son 13 min de cambio: a los 6 min solo un plan a medio camino va al norte
  const lento: AjustesNav = { ...aj, modos: { puja_lent: 1, puja_rapid: 1, baixa_lent: 1, baixa_rapid: 1 } }
  const c = campoSintetico({ altM: [500, 1262], etiqueta: ['a', 'b'] }, 30, b => (b === 0 ? [5, 0] : [0, 5]))
  const z = calcularZona(construirTablas(c, 1, lento), 0)
  it('la cota cubre el plan en pleno cambio', () => {
    const cam = caminoDirecto(c, 1, lento, { franjas: [0, 1], clases: [1], dur: [0, 0] })!
    expect(cam[6][1]).toBeGreaterThan(0)
    for (let d = 0; d < z.dirs.length; d++) {
      expect(cam[6][0] * z.dirs[d][0] + cam[6][1] * z.dirs[d][1]).toBeLessThanOrEqual(z.h[d][6] + 1e-6)
    }
  })
})

describe('la cota exterior contiene todos los planes de la fuerza bruta', () => {
  const c = campoSintetico(rejillaUniforme(4, 500), 30, (b, k) =>
    [Math.cos(b * 1.7 + k / 9) * 5, Math.sin(b * 1.1 + k / 13) * 5])
  const z = calcularZona(construirTablas(c, 1, aj), 1)
  it('en cada minuto y cada direccion', () => {
    let planes = 0
    let peor = -Infinity
    for (let h0 = 0; h0 <= 10; h0 += 2) {
      for (let A = 0; A < 4; A++) {
        if (A === 1) continue
        for (let ca = 0; ca < 2; ca++) {
          for (let hA = 2; hA <= 8; hA += 2) {
            for (let B = 0; B < 4; B++) {
              if (B === A) continue
              for (let cb = 0; cb < 2; cb++) {
                const p: PlanInterno = { franjas: [1, A, B], clases: [ca, cb], dur: [h0, hA, 0] }
                const cam = caminoDirecto(c, 1, aj, p)
                if (cam === null) continue
                planes++
                for (let k = 0; k <= 30; k++) {
                  for (let d = 0; d < z.dirs.length; d++) {
                    peor = Math.max(peor, cam[k][0] * z.dirs[d][0] + cam[k][1] * z.dirs[d][1] - z.h[d][k])
                  }
                }
              }
            }
          }
        }
      }
    }
    expect(planes).toBeGreaterThan(100)
    expect(peor).toBeLessThanOrEqual(1e-6)
  })
})
```

- [ ] **Step 2: comprobar que falla**

Run: `npx vitest run src/services/nav/zona.test.ts`
Expected: FAIL, no encuentra `./zona`.

- [ ] **Step 3: escribir el código**

<!-- archivo: src/services/nav/zona.ts -->
```ts
// src/services/nav/zona.ts
// La zona alcanzable (spec 2026-10-30 §6.3). Para una direccion u, el punto mas
// lejano en esa direccion maximiza una suma por pasos: programacion dinamica
// hacia delante, exacta, con estado (franja, altitudes usadas, minutos en la
// actual). Una pasada da el extremo de todos los minutos a la vez. Las
// posiciones a mitad de un cambio de altitud tambien cuentan, para que la cota
// exterior valga para cualquier plan.
import { tr, type Tablas } from './vertical'
import { envolvente } from './geo'
import { DIRECCIONES, LLEGA_M, MAX_ALTITUDES, MIN_MANTENER } from './parametros'

export interface Zona {
  minutos: number
  dirs: [number, number][]
  /** h[d][k]: lo mas lejos que se llega en la direccion d en el minuto k. */
  h: Float64Array[]
  /** ext[k]: los extremos del minuto k, cada uno alcanzado por un plan real. */
  ext: [number, number][][]
}

export function calcularZona(t: Tablas, b0: number): Zona {
  const c = t.c
  const H = c.minutos
  const W = H + 1
  const B = c.rejilla.altM.length
  const T = MIN_MANTENER + 1 // minutos en la franja actual: 0, 1, o MIN_MANTENER o mas
  const S = B * MAX_ALTITUDES * T
  const st = (b: number, n: number, tm: number) => (b * MAX_ALTITUDES + (n - 1)) * T + tm
  const dirs: [number, number][] = Array.from({ length: DIRECCIONES }, (_, d) =>
    [Math.cos((2 * Math.PI * d) / DIRECCIONES), Math.sin((2 * Math.PI * d) / DIRECCIONES)])
  const h = dirs.map(() => new Float64Array(W).fill(-Infinity))
  const ext: [number, number][][] = Array.from({ length: W }, () => [])
  const V = Array.from({ length: W }, () => new Float64Array(S))
  const X = Array.from({ length: W }, () => new Float64Array(S))
  const Y = Array.from({ length: W }, () => new Float64Array(S))

  for (let d = 0; d < DIRECCIONES; d++) {
    const [ux, uy] = dirs[d]
    const hd = h[d]
    const ex = new Float64Array(W)
    const ey = new Float64Array(W)
    const marcar = (k: number, x: number, y: number) => {
      const val = x * ux + y * uy
      if (val > hd[k]) {
        hd[k] = val
        ex[k] = x
        ey[k] = y
      }
    }
    const relajar = (k: number, s: number, x: number, y: number) => {
      const val = x * ux + y * uy
      if (val > V[k][s]) {
        V[k][s] = val
        X[k][s] = x
        Y[k][s] = y
      }
    }
    for (let k = 0; k <= H; k++) V[k].fill(-Infinity)
    relajar(0, st(b0, 1, MIN_MANTENER), 0, 0)

    for (let k = 0; k <= H; k++) {
      for (let s = 0; s < S; s++) {
        if (V[k][s] === -Infinity) continue
        const x = X[k][s]
        const y = Y[k][s]
        marcar(k, x, y)
        if (k === H) continue
        const tm = s % T
        const n = (Math.floor(s / T) % MAX_ALTITUDES) + 1
        const b = Math.floor(s / (T * MAX_ALTITUDES))
        const i = b * W + k
        relajar(k + 1, st(b, n, Math.min(tm + 1, MIN_MANTENER)), x + t.px[i + 1] - t.px[i], y + t.py[i + 1] - t.py[i])
        if (tm < MIN_MANTENER || n >= MAX_ALTITUDES) continue
        for (let b2 = 0; b2 < B; b2++) {
          if (b2 === b) continue
          for (let cl = 0; cl < 2; cl++) {
            const tt = tr(t, b, b2, cl, k)
            if (tt === null) continue
            for (let j = 0; j < tt.camino.length - 1; j++) marcar(k + 1 + j, x + tt.camino[j][0], y + tt.camino[j][1])
            relajar(k + tt.minutos, st(b2, n + 1, 0), x + tt.dx, y + tt.dy)
          }
        }
      }
    }
    for (let k = 0; k <= H; k++) ext[k].push([ex[k], ey[k]])
  }
  return { minutos: H, dirs, h, ext }
}

/** La zona interior de un minuto: la envolvente de sus extremos, sin repetidos. */
export function poligono(z: Zona, k: number): [number, number][] {
  const vistos = new Set<string>()
  const pts = z.ext[k].filter(([x, y]) => {
    const clave = `${x.toFixed(3)},${y.toFixed(3)}`
    if (vistos.has(clave)) return false
    vistos.add(clave)
    return true
  })
  return envolvente(pts).map(i => pts[i])
}

/**
 * El punto queda fuera de la cota exterior, con margen de LLEGA_M, en todos los
 * tramos de minuto del horizonte: ningun plan pasa a menos de LLEGA_M.
 */
export function fueraSeguro(z: Zona, ox: number, oy: number): boolean {
  for (let k = 0; k < z.minutos; k++) {
    let fuera = false
    for (let d = 0; d < z.dirs.length && !fuera; d++) {
      const p = ox * z.dirs[d][0] + oy * z.dirs[d][1]
      if (p > Math.max(z.h[d][k], z.h[d][k + 1]) + LLEGA_M) fuera = true
    }
    if (!fuera) return false
  }
  return true
}
```

- [ ] **Step 4: comprobar que pasa**

Run: `npx vitest run src/services/nav/zona.test.ts`
Expected: PASS, 8 pruebas.

- [ ] **Step 5: commit**

```bash
git add src/services/nav/zona.ts src/services/nav/zona.test.ts
git commit -m "feat(nav): zona alcanzable por programacion dinamica y cota exterior"
```

---

### Task 9: órdenes en catalán

**Files:**
- Create: `src/services/nav/ordenes.ts`
- Test: `src/services/nav/ordenes.test.ts`

- [ ] **Step 1: escribir la prueba**

<!-- archivo: src/services/nav/ordenes.test.ts -->
```ts
import { describe, it, expect } from 'vitest'
import { distancia, hora, ordenes } from './ordenes'
import { campoSintetico } from './sintetico'
import { AJUSTES_POR_DEFECTO, type AjustesNav, type Tramo } from './tipos'

const KT = 1852 / 3600
const aj: AjustesNav = { ...AJUSTES_POR_DEFECTO, altMinM: 0, altMaxM: 9999 }
const rej = { altM: [457.2, 533.4], etiqueta: ['1 500 ft', '1 750 ft'] }
// 1 500 ft al este a 10 kt, 1 750 ft al norte a 10 kt
const c = campoSintetico(rej, 60, b => (b === 0 ? [10 * KT, 0] : [0, 10 * KT]))

describe('ordenes', () => {
  it('mantener, cambiar y mantener hasta el punto', () => {
    const tramos: Tramo[] = [
      { tipo: 'mantener', franja: 0, modo: null, inicioMin: 0, finMin: 9 },
      { tipo: 'cambiar', franja: 1, modo: 'puja_rapid', inicioMin: 9, finMin: 10 },
      { tipo: 'mantener', franja: 1, modo: null, inicioMin: 10, finMin: 40 },
    ]
    expect(ordenes(c, aj, tramos)).toEqual([
      'Manté 1 500 ft 9 min, cap a 090° a 10 kt (previst).',
      'Puja ràpid (2,5 a 3 m/s) fins a 1 750 ft.',
      'Manté 1 750 ft fins al punt, cap a 000° a 10 kt (previst).',
    ])
  })
  it('el primer cambio, ara', () => {
    const tramos: Tramo[] = [{ tipo: 'cambiar', franja: 1, modo: 'puja_lent', inicioMin: 0, finMin: 3 }]
    expect(ordenes(c, aj, tramos)).toEqual(['Ara, puja lent (0 a 1 m/s) fins a 1 750 ft.'])
  })
  it('medido cuando la incertidumbre ha bajado', () => {
    const c2 = { ...c, sigma: new Float64Array(c.sigma.length).fill(0.3) }
    const tramos: Tramo[] = [{ tipo: 'mantener', franja: 0, modo: null, inicioMin: 0, finMin: 5 }]
    expect(ordenes(c2, aj, tramos)[0]).toContain('(mesurat)')
  })
})

describe('formatos', () => {
  it('distancias', () => {
    expect(distancia(45)).toBe('45 m')
    expect(distancia(124)).toBe('120 m')
    expect(distancia(2340)).toBe('2,3 km')
  })
  it('hora local', () => { expect(hora(Date.parse('2026-10-10T06:52Z'))).toBe('08:52') })
})
```

- [ ] **Step 2: comprobar que falla**

Run: `npx vitest run src/services/nav/ordenes.test.ts`
Expected: FAIL, no encuentra `./ordenes`.

- [ ] **Step 3: escribir el código**

<!-- archivo: src/services/nav/ordenes.ts -->
```ts
// src/services/nav/ordenes.ts
// El plan en ordenes cortas en catalan (spec 10/10 §6.8). Pies y nudos solo aqui.
import { idx, type Campo } from './campo'
import { rumbo } from './geo'
import { S_MS } from './parametros'
import type { AjustesNav, Modo, Tramo } from './tipos'

const KT = 1852 / 3600
const NOM_MODO: Record<Modo, string> = {
  puja_lent: 'puja lent', puja_rapid: 'puja ràpid', baixa_lent: 'baixa lent', baixa_rapid: 'baixa ràpid',
}

const FMT_HORA = new Intl.DateTimeFormat('ca-ES', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Madrid',
})

export function hora(ms: number): string {
  return FMT_HORA.format(new Date(ms))
}

export function distancia(m: number): string {
  if (m < 100) return `${Math.round(m)} m`
  if (m < 1000) return `${Math.round(m / 10) * 10} m`
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`
}

function decimal(x: number): string {
  return String(x).replace('.', ',')
}

/** Viento medio de una franja en un intervalo, y si cuenta como medido (spec 2026-10-30 §6.5). */
function vientoTramo(c: Campo, b: number, k0: number, k1: number): { rumbo: number; kt: number; medido: boolean } {
  const f = c.nombres.length - 1
  let su = 0
  let sv = 0
  let ss = 0
  let n = 0
  for (let k = k0; k < Math.max(k1, k0 + 1); k++) {
    const i = idx(c, b, Math.min(k, c.minutos))
    su += c.u[f][i]
    sv += c.v[f][i]
    ss += c.sigma[i]
    n++
  }
  return { rumbo: rumbo(su / n, sv / n), kt: Math.hypot(su / n, sv / n) / KT, medido: ss / n < S_MS / 2 }
}

export function ordenes(c: Campo, aj: AjustesNav, tramos: Tramo[]): string[] {
  return tramos.map((t, i) => {
    const alt = c.rejilla.etiqueta[t.franja]
    if (t.tipo === 'cambiar' && t.modo !== null) {
      const [a, b] = aj.rangos[t.modo]
      const txt = `${NOM_MODO[t.modo]} (${decimal(a)} a ${decimal(b)} m/s) fins a ${alt}.`
      return t.inicioMin === 0 ? `Ara, ${txt}` : txt[0].toUpperCase() + txt.slice(1)
    }
    const w = vientoTramo(c, t.franja, t.inicioMin, t.finMin)
    const cap = `cap a ${String(Math.round(w.rumbo) % 360).padStart(3, '0')}° a ${Math.round(w.kt)} kt (${w.medido ? 'mesurat' : 'previst'})`
    return i === tramos.length - 1
      ? `Manté ${alt} fins al punt, ${cap}.`
      : `Manté ${alt} ${t.finMin - t.inicioMin} min, ${cap}.`
  })
}
```

- [ ] **Step 4: comprobar que pasa**

Run: `npx vitest run src/services/nav/ordenes.test.ts`
Expected: PASS, 5 pruebas.

- [ ] **Step 5: commit**

```bash
git add src/services/nav/ordenes.ts src/services/nav/ordenes.test.ts
git commit -m "feat(nav): ordenes del plan en catalan"
```

---

### Task 10: el motor entero, con el vuelo del 10/10

**Files:**
- Create: `src/services/nav/motor.ts`
- Test: `src/services/nav/motor.test.ts`

Escenario de `optim2.py`: posición a (3 460,8, 2 190,8) m del despegue de Tàrrega, zona A a (3 964,2, 2 880,1) m, a las 06:34 UTC, a 1 540 ft, con «terra» y de 1 500 a 3 750 ft. Sin las medidas ilustrativas del prototipo, así que se compara con el oráculo sobre el mismo campo y no con sus cifras.

- [ ] **Step 1: escribir la prueba**

<!-- archivo: src/services/nav/motor.test.ts -->
```ts
import { describe, it, expect } from 'vitest'
import { navegar, type EntradaNav } from './motor'
import { parsePrevision } from './perfil'
import { cargar1010, DESPEGUE_1010 } from './prueba-1010'
import { aGeo, aPlano } from './geo'
import { AJUSTES_POR_DEFECTO, type AjustesNav } from './tipos'
import { franjas, recortar } from './campo'
import { franjaMasCercana } from './medidas'
import { oraculo } from './oraculo'

const prev = parsePrevision(cargar1010())
const despegue = { lat0: DESPEGUE_1010.lat, lon0: DESPEGUE_1010.lon }
const POS: [number, number] = [3460.8, 2190.8]
const ZA: [number, number] = [3964.2, 2880.1]
const ahora = Date.parse('2026-10-10T06:34Z')
const pos = aGeo(despegue, POS[0], POS[1])
const altM = 1540 * 0.3048
const aj: AjustesNav = { ...AJUSTES_POR_DEFECTO, altMinM: 1500 * 0.3048, altMaxM: 3750 * 0.3048 }

function entrada(over: Partial<EntradaNav> = {}): EntradaNav {
  return {
    prevision: prev,
    traza: [{ t: ahora, lat: pos.lat, lon: pos.lon, altM }],
    ajustes: aj,
    punto: aGeo(despegue, ZA[0], ZA[1]),
    ahora,
    incluirTerra: true,
    ...over,
  }
}

describe('navegar con el 10/10', () => {
  const r = navegar(entrada())
  it('calcula un plan, la zona y las ordenes', () => {
    expect(['llega', 'no-llega']).toContain(r.estado)
    expect(r.zona.length).toBeGreaterThan(0)
    expect(r.distanciaMinM).not.toBeNull()
    expect(r.siNoHaces).not.toBeNull()
    expect(r.ordenes.some(l => l.startsWith('Si no fas res'))).toBe(true)
  })
  it('no peor que la fuerza bruta del prototipo en mas de 50 m', () => {
    const rec = recortar(prev, franjas(aj.altMinM, aj.altMaxM, prev.elevM + 10), ahora, 60)
    const b0 = franjaMasCercana(rec.campo.rejilla, altM)
    const punto = aGeo(despegue, ZA[0], ZA[1])
    const [ox, oy] = aPlano({ lat0: pos.lat, lon0: pos.lon }, punto.lat, punto.lon)
    const o = oraculo(rec.campo, rec.campo.nombres.length - 1, aj, b0, ox, oy)
    expect(r.distanciaMinM!).toBeLessThanOrEqual(o.distM + 50)
  })
  it('un punto alcanzable no sale como fuera seguro', () => { expect(r.fueraSeguro).toBe(false) })
  it('dispersion con los siete modelos', () => { expect(r.dispersion.length).toBeGreaterThan(1) })
  it('en menos de 1 s', () => {
    const t0 = performance.now()
    navegar(entrada())
    const ms = performance.now() - t0
    console.log(`motor entero con el 10/10: ${ms.toFixed(0)} ms`)
    expect(ms).toBeLessThan(1000)
  })
})

describe('casos limite', () => {
  it('sin punto: zona sin plan', () => {
    const r = navegar(entrada({ punto: null }))
    expect(r.estado).toBe('sin-punto')
    expect(r.plan).toEqual([])
    expect(r.zona.length).toBeGreaterThan(0)
  })
  it('sin traza: sin datos', () => { expect(navegar(entrada({ traza: [] })).estado).toBe('sin-datos') })
  it('un punto a 30 km contra el viento no se alcanza, y se sabe', () => {
    const r = navegar(entrada({ punto: aGeo(despegue, POS[0] - 21000, POS[1] - 21000) }))
    expect(r.estado).toBe('no-llega')
    expect(r.fueraSeguro).toBe(true)
    expect(r.ordenes.some(l => l.includes("No s'hi arriba"))).toBe(true)
  })
  it('horizonte acortado al final de la prevision', () => {
    const t = Date.parse('2026-10-10T08:30Z')
    const r = navegar(entrada({ ahora: t, traza: [{ t, lat: pos.lat, lon: pos.lon, altM }] }))
    expect(r.avisos.some(a => a.startsWith('Horitzó escurçat a 30 min'))).toBe(true)
  })
})
```

- [ ] **Step 2: comprobar que falla**

Run: `npx vitest run src/services/nav/motor.test.ts`
Expected: FAIL, no encuentra `./motor`.

- [ ] **Step 3: escribir el código**

<!-- archivo: src/services/nav/motor.ts -->
```ts
// src/services/nav/motor.ts
// La entrada unica del motor (spec 2026-10-30 §7): de prevision, traza, ajustes
// y punto a ResultadoNavegacion. Sin estado: la pantalla guarda el plan vigente
// y decide con `debeSustituir` si lo cambia.
import type { AjustesNav, Punto, PuntoTraza, ResultadoNavegacion, Tramo } from './tipos'
import type { Previsiones } from './perfil'
import { franjas, recortar } from './campo'
import { aGeo, aPlano, type Plano } from './geo'
import { franjaMasCercana, medidasGps } from './medidas'
import { corregirCampo } from './correccion'
import { construirTablas } from './vertical'
import { calcularZona, fueraSeguro, poligono } from './zona'
import { aTramos, aproximacion, buscarPlan, caminoDirecto, type PlanInterno } from './plan'
import { distancia, hora, ordenes } from './ordenes'
import { LLEGA_M } from './parametros'

export interface EntradaNav {
  prevision: Previsiones
  /** El ultimo punto es la posicion actual. */
  traza: PuntoTraza[]
  ajustes: AjustesNav
  punto: Punto | null
  ahora: number
  /** Incluir la franja «terra» (elevacion mas 10 m) por debajo del rango. */
  incluirTerra?: boolean
}

const PASO_ZONA_MIN = 5

export function navegar(e: EntradaNav): ResultadoNavegacion {
  const iso = (ms: number) => new Date(ms).toISOString()
  const avisos: string[] = []
  const vacio = (estado: ResultadoNavegacion['estado']): ResultadoNavegacion => ({
    estado, plan: [], distanciaMinM: null, horaMin: null, siNoHaces: null, dispersion: [],
    fueraSeguro: false, zona: [], ordenes: [], avisos, calculadoA: iso(e.ahora),
    previsionDe: e.prevision.horas.length > 0 ? iso(e.prevision.horas[0]) : null,
  })

  const actual = e.traza[e.traza.length - 1]
  if (actual === undefined) {
    avisos.push('Sense posició GPS.')
    return vacio('sin-datos')
  }
  const edadMin = Math.floor((e.ahora - actual.t) / 60000)
  if (edadMin >= 1) avisos.push(`Darrera posició de fa ${edadMin} min.`)

  const plano: Plano = { lat0: actual.lat, lon0: actual.lon }
  const terraM = e.incluirTerra ? e.prevision.elevM + 10 : null
  const r = recortar(e.prevision, franjas(e.ajustes.altMinM, e.ajustes.altMaxM, terraM), e.ahora, e.ajustes.horizonteMin)
  if (r.fuera.length > 0) avisos.push(`Franges sense previsió, fora del càlcul: ${r.fuera.join(', ')}.`)
  if (r.campo.rejilla.altM.length === 0 || r.campo.minutos === 0) {
    avisos.push('Sense previsió per calcular.')
    return vacio('sin-datos')
  }
  if (r.campo.minutos < e.ajustes.horizonteMin) {
    avisos.push(`Horitzó escurçat a ${r.campo.minutos} min: la previsió no arriba més enllà.`)
  }

  const medidas = medidasGps(e.traza, r.campo.rejilla, plano)
  const corr = corregirCampo(r.campo, e.prevision, medidas, e.ahora)
  if (medidas.length > 0 && !corr.corregido) avisos.push('Vent mesurat no aplicat: el càlcul de la correcció ha fallat.')
  const c = corr.campo
  const fc = c.nombres.length - 1
  const t = construirTablas(c, fc, e.ajustes)
  const b0 = franjaMasCercana(c.rejilla, actual.altM)

  const zonaInt = calcularZona(t, b0)
  const minutosZona: number[] = []
  for (let k = PASO_ZONA_MIN; k < c.minutos; k += PASO_ZONA_MIN) minutosZona.push(k)
  minutosZona.push(c.minutos)
  const zona = minutosZona.map(k => poligono(zonaInt, k).map(([x, y]) => aGeo(plano, x, y)))

  if (e.punto === null) return { ...vacio('sin-punto'), zona }

  const [ox, oy] = aPlano(plano, e.punto.lat, e.punto.lon)
  const quieto: PlanInterno = { franjas: [b0], clases: [], dur: [c.minutos] }
  const aQuieto = aproximacion(caminoDirecto(c, fc, e.ajustes, quieto)!, ox, oy)
  const mejor = buscarPlan(t, b0, ox, oy)
  const sinMejora = mejor.plan.franjas.length === 1 || mejor.distM > aQuieto.distM - LLEGA_M
  const elegido = sinMejora ? { plan: quieto, distM: aQuieto.distM, minuto: aQuieto.minuto } : mejor
  const tramos: Tramo[] = aTramos(t, elegido.plan, Math.max(1, elegido.minuto))

  const dispersion: ResultadoNavegacion['dispersion'] = []
  for (let m = 0; m < fc; m++) {
    const cam = caminoDirecto(c, m, e.ajustes, elegido.plan)
    if (cam === null || cam.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) continue
    dispersion.push({ modelo: c.nombres[m], distanciaMinM: aproximacion(cam, ox, oy).distM })
  }

  const fuera = fueraSeguro(zonaInt, ox, oy)
  const llega = elegido.distM <= LLEGA_M
  const horaMs = c.t0 + elegido.minuto * 60000
  const resumen: string[] = []
  if (llega) {
    resumen.push(`Passes a ${distancia(elegido.distM)} del punt a les ${hora(horaMs)}.`)
  } else {
    if (fuera) resumen.push("No s'hi arriba amb aquest vent.")
    resumen.push(`El més a prop: ${distancia(elegido.distM)} a les ${hora(horaMs)}.`)
  }
  if (sinMejora) resumen.push("Cap pla s'hi acosta més que quedar-te a aquesta altitud.")
  resumen.push(`Si no fas res: ${distancia(aQuieto.distM)} a les ${hora(c.t0 + aQuieto.minuto * 60000)}.`)
  if (dispersion.length > 1) {
    const ds = dispersion.map(x => x.distanciaMinM)
    resumen.push(`Amb cada model, entre ${distancia(Math.min(...ds))} i ${distancia(Math.max(...ds))}.`)
  }

  return {
    ...vacio(llega ? 'llega' : 'no-llega'),
    plan: tramos,
    distanciaMinM: elegido.distM,
    horaMin: iso(horaMs),
    siNoHaces: { distanciaMinM: aQuieto.distM, horaMin: iso(c.t0 + aQuieto.minuto * 60000) },
    dispersion,
    fueraSeguro: fuera,
    zona,
    ordenes: [...ordenes(c, e.ajustes, tramos), ...resumen],
  }
}
```

- [ ] **Step 4: comprobar que pasa**

Run: `npx vitest run src/services/nav/motor.test.ts`
Expected: PASS, 9 pruebas, y en la salida la línea «motor entero con el 10/10: N ms».

- [ ] **Step 5: commit**

```bash
git add src/services/nav/motor.ts src/services/nav/motor.test.ts
git commit -m "feat(nav): motor de navegacion a un punto, de prevision y traza a resultado"
```

---

### Task 11: verificación completa y estado

**Files:**
- Modify: `STATUS.md` (sección nueva al principio)

- [ ] **Step 1: todas las pruebas, tipos y build**

```bash
npm test
npx tsc -b
npm run build
```

Expected: todo en verde. Las pruebas de antes siguen pasando, más 82 nuevas.

- [ ] **Step 2: STATUS.md**

Añadir al principio, debajo del título, un bloque con: fecha 30/10/2026, «Motor de navegación a un punto, fase 1, en la rama `motor-navegacion`», dónde están el spec y el plan, el tiempo medido del motor con el 10/10, que no hay pantalla todavía, y que lo siguiente es la fase 2 (maquetas de la zona alcanzable y del punto más cercano, después la pantalla de vuelo).

- [ ] **Step 3: commit**

```bash
git add STATUS.md
git commit -m "docs: STATUS con el motor de navegacion, fase 1"
```

---

## Cambios durante la ejecución, 30/10/2026

* **Task 8:** la prueba de la cota acumula el peor caso y comprueba una vez (con un `expect` por punto tardaba 4,9 s, al borde de los 5 s de vitest). Con un fallo a propósito (quitar las posiciones a mitad de cambio) no se ponía en rojo, porque con franjas contiguas esos puntos nunca son extremos. Se añadió la prueba «las posiciones a mitad de un cambio largo también cuentan», que sí lo detecta.
* **Task 10:** con el punto inalcanzable, la última orden decía «fins al punt» y la dispersión «entre 29,7 km i 29,7 km». Ahora `ordenes()` recibe `llega` y dice «fins al punt més proper», y si todos los modelos dan lo mismo sale «Amb tots els models, …». Con su prueba primero.
* El motor entero con el 10/10 tarda unos 180 ms en node en el Mac.
