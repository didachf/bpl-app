# Pantalla de vuelo, parte 1: la lógica, plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Todo lo que la pantalla de vuelo calcula o guarda, sin pantalla y con prueba: coordenadas en tres formatos, rumbo y distancia al waypoint, lo que sale del GPS, los waypoints en el documento, la sesión de vuelo guardada y la elección del plan vigente.

**Architecture:** Módulos puros en `src/services/vuelo/` y `src/domain/`, como la capa de datos del 01/11. La parte 2 (otro plan) monta la pantalla encima, siguiendo las maquetas aprobadas el 01/11/2026 («Sí, tal como están»).

**Tech Stack:** TypeScript, Vitest en node con `fake-indexeddb`, `idb-keyval`.

**Specs:** `docs/superpowers/specs/2026-10-10-pantalla-de-vuelo-design.md` §6.1 a §6.9 y §7.4, `2026-11-01-objetivo-de-altura-design.md`, `2026-11-01-relieve-design.md`. Maquetas `TauletaComencar`, `TauletaCoordenades`, `MobilCoordenades`, `TauletaWaypoints`, `TauletaPuntAterrar` en `design/pantalla-de-vol/`.

**Fuera de este plan:** la pantalla, las zonas (polígonos y `polylabel`, parte 3), la vista Vent y la mejor izquierda y derecha (parte 3), cerrar el vuelo en el registro.

---

## Decisiones técnicas

| Qué | Decisión | Por qué |
|---|---|---|
| UTM | Serie de Krüger de orden 6 (Karney 2011), elipsoide GRS80 de ETRS89 | Milímetros dentro del huso. Probado contra PROJ (`pyproj`, EPSG:25830 y 25831) |
| Formatos | Como las maquetas: `41,6857 N 1,2115 E`, `41°41'08,7" N 1°12'41,5" E`, `31 351 155 · 4 616 431` | `TauletaCoordenades` y `MobilCoordenades` |
| Lectura decimal | Un campo por eje, o los dos pegados en el de latitud («41.6561, 1.1490» de Google Maps) | §6.6 |
| Rumbo y distancia | Círculo máximo, R = 6 371 km | §6.7 |
| Distancia en pantalla | Por debajo de 1 km en metros redondeados a 10, por encima en km con un decimal | Maquetas: «850 m», «2,1 km» |
| Calibración | Media de la altitud del GPS en tierra con precisión de 30 m o mejor, al menos 10 muestras. Corrección = terreno − GPS | §6.2. Maqueta: GPS 429 m, terreno 380 m, corrección −49 m |
| Rumbo y velocidad | Del primer al último punto de los últimos 30 s, con al menos 10 s entre ellos | §6.3 |
| Variómetro | Pendiente por mínimos cuadrados de los últimos 10 s, con al menos tres puntos y 5 s | §6.3. Menos ruido que la diferencia de dos puntos |
| Despegue | El primer punto calibrado a 15 m o más sobre el terreno del despegue | El motor no mide viento con la cesta en el suelo |
| Waypoints | En el documento, versión 3 del esquema: `waypoints` y `waypointActiuId` | §6.6 y §6.9 |
| Objetivo del waypoint | Mismo tipo que el del motor, definido en `domain/types.ts` | El dominio no importa de los servicios |
| Rango del optimizador | De 250 ft sobre el despegue al techo que pone el piloto al empezar | §6.8. El techo lo da el plan (pieza 3), que todavía no existe |
| Techo | Lo escribe el piloto en «Començar vol». Se recuerda el último en el aparato. Sin valor por defecto | No se inventa un techo de espacio aéreo |
| Plan vigente | Se sustituye si cambia el waypoint o su objetivo, si tiene 60 s o más, o si el nuevo pasa un 20 % o 200 m más cerca (`debeSustituir`) | §6.8 dice no saltar. Con 60 s la orden no salta en cada recálculo de 15 s y tampoco se queda vieja |
| Modo del aparato | `localStorage`. Por defecto, tablet si el lado corto de la pantalla mide 600 px o más | §7.4 |

## Archivos

| Archivo | Qué hace |
|---|---|
| `src/services/vuelo/coordenadas.ts` | UTM, leer y escribir los tres formatos |
| `src/services/vuelo/rumbo.ts` | Rumbo, distancia y hora de llegada por círculo máximo, y cómo se escribe la distancia |
| `src/services/vuelo/gps.ts` | Calibración, rumbo y velocidad, variómetro y proyección |
| `src/domain/types.ts`, `schema.ts`, `empty.ts`, `fixtures.ts` | Waypoints en el documento, versión 3 |
| `src/domain/waypoints.ts` | Crear, renombrar, cambiar objetivo, borrar, activar y resolver el activo |
| `src/services/vuelo/sessio.ts` | La sesión de vuelo: puntos, despegue, guardado |
| `src/services/vuelo/navegacio.ts` | La entrada del motor desde la sesión, y el plan vigente |
| `src/ui/aparell.ts` | Modo tablet o teléfono, y el último techo |

## Antes de empezar

- [ ] Worktree:

```bash
cd ~/code/bpl-app && git worktree add ../bpl-app-vol -b vol-logica && cd ../bpl-app-vol && npm install --silent && npm test 2>&1 | grep 'Tests '
```

Esperado: `Tests  652 passed (652)`.

**Cuidado:** `dist/` y `tsconfig.tsbuildinfo` están en el repositorio. `npx tsc -b` toca el segundo: devolverlo con `git checkout -- tsconfig.tsbuildinfo` antes de cada commit. No hace falta `npm run build` en este plan.

---

### Task 1: Coordenadas

**Files:**
- Create: `src/services/vuelo/coordenadas.ts`
- Test: `src/services/vuelo/coordenadas.test.ts`

Valores de referencia de PROJ (`pyproj`, EPSG:4258 a EPSG:25831 y 25830), calculados el 01/11/2026.

- [ ] **Step 1: Escribir la prueba**

```ts
// src/services/vuelo/coordenadas.test.ts
import { describe, it, expect } from 'vitest'
import {
  aUtm, deUtm, formatDecimal, formatDms, formatUtm, llegirDecimal, llegirDms, llegirUtm,
} from './coordenadas'
import { miles } from '../nav/campo'

// [huso, lat, lon, X, Y] de PROJ.
const PROJ: [number, number, number, number, number][] = [
  [31, 41.6561, 1.149, 345878.792, 4613249.538],
  [31, 41.5842, 1.6528, 387703.467, 4604488.446],
  [31, 41.3874, 2.1686, 430488.680, 4582097.035],
  [31, 41.60, 0.20, 266652.938, 4609153.380],
  [31, 42.7019, 0.7956, 319453.182, 4730068.229],
  [30, 41.6561, 1.149, 845489.776, 4619916.573],
  [30, 41.60, 0.20, 766686.248, 4610313.426],
  [30, 42.7019, 0.7956, 810883.004, 4734701.002],
]

describe('UTM en ETRS89', () => {
  it('de grados a UTM, al milimetro de PROJ', () => {
    for (const [h, lat, lon, x, y] of PROJ) {
      const u = aUtm(lat, lon, h)
      expect(Math.abs(u.x - x)).toBeLessThan(0.002)
      expect(Math.abs(u.y - y)).toBeLessThan(0.002)
    }
  })
  it('de UTM a grados, y vuelta', () => {
    for (const [h, lat, lon, x, y] of PROJ) {
      const g = deUtm(h, x, y)
      expect(Math.abs(g.lat - lat)).toBeLessThan(1e-7)
      expect(Math.abs(g.lon - lon)).toBeLessThan(1e-7)
    }
  })
})

describe('leer coordenadas', () => {
  it('decimal con coma, punto, letras o signo', () => {
    expect(llegirDecimal('41,6857', '1,2115')).toEqual({ ok: true, lat: 41.6857, lon: 1.2115 })
    expect(llegirDecimal('41.6857 N', '1.2115 E')).toEqual({ ok: true, lat: 41.6857, lon: 1.2115 })
    expect(llegirDecimal('41,6857', '0,5 W')).toEqual({ ok: true, lat: 41.6857, lon: -0.5 })
    expect(llegirDecimal('41,6857', '0,5 O')).toEqual({ ok: true, lat: 41.6857, lon: -0.5 })
    expect(llegirDecimal('-33,5', '-70,6')).toEqual({ ok: true, lat: -33.5, lon: -70.6 })
  })
  it('lo que se pega de Google Maps, todo en el campo de latitud', () => {
    expect(llegirDecimal('41.6561, 1.1490', '')).toEqual({ ok: true, lat: 41.6561, lon: 1.149 })
    expect(llegirDecimal('41,6561 N 1,1490 E', '')).toEqual({ ok: true, lat: 41.6561, lon: 1.149 })
  })
  it('decimal: dice que campo falla', () => {
    expect(llegirDecimal('91', '1')).toMatchObject({ ok: false, camp: 'lat' })
    expect(llegirDecimal('41', 'abc')).toMatchObject({ ok: false, camp: 'lon' })
    expect(llegirDecimal('41 E', '1')).toMatchObject({ ok: false, camp: 'lat' })
  })
  it('grados, minutos y segundos, con los simbolos del AIP o con espacios', () => {
    const r = llegirDms(`41°41'08,7" N`, `1°12'41,5" E`)
    expect(r.ok && Math.abs(r.lat - (41 + 41 / 60 + 8.7 / 3600))).toBeLessThan(1e-12)
    expect(r.ok && Math.abs(r.lon - (1 + 12 / 60 + 41.5 / 3600))).toBeLessThan(1e-12)
    const s = llegirDms('41 41 8.7', '1 12 41.5 W')
    expect(s.ok && s.lon).toBeCloseTo(-(1 + 12 / 60 + 41.5 / 3600), 12)
    expect(llegirDms(`41°61'00" N`, `1°00'00" E`)).toMatchObject({ ok: false, camp: 'lat' })
  })
  it('UTM con espacios o puntos de miles, y rango', () => {
    const r = llegirUtm(31, '345 878,792', '4.613.249,538')
    expect(r.ok && r.lat).toBeCloseTo(41.6561, 7)
    expect(llegirUtm(31, '345878', '')).toMatchObject({ ok: false, camp: 'y' })
    expect(llegirUtm(31, '50', '4613249')).toMatchObject({ ok: false, camp: 'x' })
  })
})

describe('escribir coordenadas', () => {
  it('como en las maquetas', () => {
    expect(formatDecimal(41.6857, 1.2115)).toBe('41,6857 N 1,2115 E')
    expect(formatDecimal(-33.5, -70.6)).toBe('33,5000 S 70,6000 W')
    expect(formatDms(41 + 41 / 60 + 8.7 / 3600, 1 + 12 / 60 + 41.5 / 3600)).toBe(`41°41'08,7" N 1°12'41,5" E`)
    expect(formatDms(41 + 59 / 60 + 59.97 / 3600, 1)).toBe(`42°00'00,0" N 1°00'00,0" E`)
    expect(formatUtm(41.6561, 1.149)).toBe(`31 ${miles(345879)} · ${miles(4613250)}`)
    expect(formatUtm(41.6561, 1.149, 30)).toBe(`30 ${miles(845490)} · ${miles(4619917)}`)
  })
})
```

- [ ] **Step 2: Comprobar que falla**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/coordenadas.test.ts`
Expected: FAIL, `Failed to resolve import "./coordenadas"`.

- [ ] **Step 3: Implementar**

```ts
// src/services/vuelo/coordenadas.ts
// Coordenadas en los tres formatos de la pantalla (spec 10/10 §6.6): decimal,
// grados minutos y segundos, y UTM en ETRS89 como los mapas del ICGC. UTM con la
// serie de Kruger de orden 6 (Karney 2011), probada contra PROJ al milimetro.
import { miles } from '../nav/campo'

const A = 6378137
const F = 1 / 298.257222101 // GRS80, el elipsoide de ETRS89
const K0 = 0.9996
const E0 = 500000
const N = F / (2 - F)
const E = Math.sqrt(F * (2 - F))
const AA = A / (1 + N) * (1 + N ** 2 / 4 + N ** 4 / 64 + N ** 6 / 256)
const RAD = Math.PI / 180

const ALFA = [
  N / 2 - 2 * N ** 2 / 3 + 5 * N ** 3 / 16 + 41 * N ** 4 / 180 - 127 * N ** 5 / 288 + 7891 * N ** 6 / 37800,
  13 * N ** 2 / 48 - 3 * N ** 3 / 5 + 557 * N ** 4 / 1440 + 281 * N ** 5 / 630 - 1983433 * N ** 6 / 1935360,
  61 * N ** 3 / 240 - 103 * N ** 4 / 140 + 15061 * N ** 5 / 26880 + 167603 * N ** 6 / 181440,
  49561 * N ** 4 / 161280 - 179 * N ** 5 / 168 + 6601661 * N ** 6 / 7257600,
  34729 * N ** 5 / 80640 - 3418889 * N ** 6 / 1995840,
  212378941 * N ** 6 / 319334400,
]
const BETA = [
  N / 2 - 2 * N ** 2 / 3 + 37 * N ** 3 / 96 - N ** 4 / 360 - 81 * N ** 5 / 512 + 96199 * N ** 6 / 604800,
  N ** 2 / 48 + N ** 3 / 15 - 437 * N ** 4 / 1440 + 46 * N ** 5 / 105 - 1118711 * N ** 6 / 3870720,
  17 * N ** 3 / 480 - 37 * N ** 4 / 840 - 209 * N ** 5 / 4480 + 5569 * N ** 6 / 90720,
  4397 * N ** 4 / 161280 - 11 * N ** 5 / 504 - 830251 * N ** 6 / 7257600,
  4583 * N ** 5 / 161280 - 108847 * N ** 6 / 3991680,
  20648693 * N ** 6 / 638668800,
]

const meridiano = (huso: number) => (huso * 6 - 183) * RAD

export function aUtm(lat: number, lon: number, huso = 31): { x: number; y: number } {
  const s = Math.sin(lat * RAD)
  const t = Math.sinh(Math.atanh(s) - E * Math.atanh(E * s))
  const dl = lon * RAD - meridiano(huso)
  const xi1 = Math.atan2(t, Math.cos(dl))
  const eta1 = Math.atanh(Math.sin(dl) / Math.sqrt(1 + t * t))
  let xi = xi1
  let eta = eta1
  for (let j = 1; j <= 6; j++) {
    xi += ALFA[j - 1] * Math.sin(2 * j * xi1) * Math.cosh(2 * j * eta1)
    eta += ALFA[j - 1] * Math.cos(2 * j * xi1) * Math.sinh(2 * j * eta1)
  }
  return { x: E0 + K0 * AA * eta, y: K0 * AA * xi }
}

export function deUtm(huso: number, x: number, y: number): { lat: number; lon: number } {
  const xi = y / (K0 * AA)
  const eta = (x - E0) / (K0 * AA)
  let xi1 = xi
  let eta1 = eta
  for (let j = 1; j <= 6; j++) {
    xi1 -= BETA[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta)
    eta1 -= BETA[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta)
  }
  const tp = Math.sin(xi1) / Math.sqrt(Math.sinh(eta1) ** 2 + Math.cos(xi1) ** 2)
  // tan(lat) desde la tangente conforme, por Newton (Karney 2011, ec. 19 a 21).
  let tau = tp
  for (let i = 0; i < 6; i++) {
    const sigma = Math.sinh(E * Math.atanh(E * tau / Math.sqrt(1 + tau * tau)))
    const tpi = tau * Math.sqrt(1 + sigma * sigma) - sigma * Math.sqrt(1 + tau * tau)
    tau += (tp - tpi) / Math.sqrt(1 + tpi * tpi)
      * (1 + (1 - E * E) * tau * tau) / ((1 - E * E) * Math.sqrt(1 + tau * tau))
  }
  return { lat: Math.atan(tau) / RAD, lon: (meridiano(huso) + Math.atan2(Math.sinh(eta1), Math.cos(xi1))) / RAD }
}

export type Camp = 'lat' | 'lon' | 'x' | 'y'
export type Lectura = { ok: true; lat: number; lon: number } | { ok: false; camp: Camp; error: string }

const fallo = (camp: Camp, error: string): Lectura => ({ ok: false, camp, error })
const numero = (s: string) => Number(s.replace(',', '.'))

/** Un eje en decimal: numero con signo o letra. null si no se entiende o la letra no es de ese eje. */
function ejeDecimal(txt: string, eje: 'lat' | 'lon'): number | null {
  const m = /^\s*([+-])?\s*(\d+(?:[.,]\d+)?)\s*°?\s*([NSEWO])?\s*$/i.exec(txt)
  if (m === null) return null
  return conHemisferio(numero(m[2]), m[1], m[3], eje)
}

function conHemisferio(v: number, signo: string | undefined, letra: string | undefined, eje: 'lat' | 'lon'): number | null {
  const l = letra?.toUpperCase()
  if (l !== undefined && (eje === 'lat') !== (l === 'N' || l === 'S')) return null
  const negativo = signo === '-' || l === 'S' || l === 'W' || l === 'O'
  return negativo ? -Math.abs(v) : v
}

function enRango(lat: number | null, lon: number | null): Lectura {
  if (lat === null || Math.abs(lat) > 90) return fallo('lat', 'La latitud ha de ser un número entre 0 i 90, amb N o S.')
  if (lon === null || Math.abs(lon) > 180) return fallo('lon', 'La longitud ha de ser un número entre 0 i 180, amb E o W.')
  return { ok: true, lat, lon }
}

export function llegirDecimal(latTxt: string, lonTxt: string): Lectura {
  if (lonTxt.trim() === '') {
    // El primer numero es codicioso: «41,6561 N 1,1490 E» no se parte en la primera coma.
    const m = /^\s*([+-]?\s*\d+(?:[.,]\d+)?\s*°?\s*[NS]?)\s*(?:[,;]\s*|\s+)([+-]?\s*\d+(?:[.,]\d+)?\s*°?\s*[EWO]?)\s*$/i.exec(latTxt)
    if (m !== null) {
      const lat = ejeDecimal(m[1], 'lat')
      const lon = ejeDecimal(m[2], 'lon')
      if (lat !== null && lon !== null) return enRango(lat, lon)
    }
  }
  return enRango(ejeDecimal(latTxt, 'lat'), ejeDecimal(lonTxt, 'lon'))
}

function ejeDms(txt: string, eje: 'lat' | 'lon'): number | null {
  const m = /^\s*(\d{1,3})\s*[°º:\s]\s*(\d{1,2})\s*['’′:\s]\s*(\d{1,2}(?:[.,]\d+)?)\s*(?:["”″]|'')?\s*([NSEWO])?\s*$/i.exec(txt)
  if (m === null) return null
  const min = Number(m[2])
  const seg = numero(m[3])
  if (min >= 60 || seg >= 60) return null
  return conHemisferio(Number(m[1]) + min / 60 + seg / 3600, undefined, m[4], eje)
}

export function llegirDms(latTxt: string, lonTxt: string): Lectura {
  return enRango(ejeDms(latTxt, 'lat'), ejeDms(lonTxt, 'lon'))
}

export function llegirUtm(huso: number, xTxt: string, yTxt: string): Lectura {
  const limpio = (s: string) => Number(s.replace(/[\s.  ]/g, '').replace(',', '.'))
  const x = limpio(xTxt)
  const y = limpio(yTxt)
  if (xTxt.trim() === '' || !Number.isFinite(x) || x < 100000 || x > 1000000) {
    return fallo('x', 'La X (est) va de 100 000 a 1 000 000 m.')
  }
  if (yTxt.trim() === '' || !Number.isFinite(y) || y < 0 || y > 10000000) {
    return fallo('y', 'La Y (nord) va de 0 a 10 000 000 m.')
  }
  return { ok: true, ...deUtm(huso, x, y) }
}

const coma = (v: number, dec: number) => v.toFixed(dec).replace('.', ',')

export function formatDecimal(lat: number, lon: number): string {
  return `${coma(Math.abs(lat), 4)} ${lat < 0 ? 'S' : 'N'} ${coma(Math.abs(lon), 4)} ${lon < 0 ? 'W' : 'E'}`
}

function dms(v: number): string {
  const decimas = Math.round(Math.abs(v) * 36000)
  const g = Math.floor(decimas / 36000)
  const m = Math.floor((decimas % 36000) / 600)
  const s = (decimas % 600) / 10
  return `${g}°${String(m).padStart(2, '0')}'${coma(s, 1).padStart(4, '0')}"`
}

export function formatDms(lat: number, lon: number): string {
  return `${dms(lat)} ${lat < 0 ? 'S' : 'N'} ${dms(lon)} ${lon < 0 ? 'W' : 'E'}`
}

export function formatUtm(lat: number, lon: number, huso = 31): string {
  const u = aUtm(lat, lon, huso)
  return `${huso} ${miles(u.x)} · ${miles(u.y)}`
}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/coordenadas.test.ts`
Expected: PASS, 8 pruebas.

- [ ] **Step 5: Mutación.** Cambiar `K0 = 0.9996` por `0.9997`: tiene que fallar la prueba de PROJ. Cambiar el `- E * Math.atanh(E * s)` de `aUtm` por `- 0`: tiene que fallar. Deshacer.

- [ ] **Step 6: Commit**

```bash
git add src/services/vuelo/coordenadas.ts src/services/vuelo/coordenadas.test.ts
git commit -m "feat(vuelo): coordenadas en decimal, grados minutos y segundos, y UTM"
```

---

### Task 2: Rumbo, distancia y hora de llegada

**Files:**
- Create: `src/services/vuelo/rumbo.ts`
- Test: `src/services/vuelo/rumbo.test.ts`

- [ ] **Step 1: Escribir la prueba**

```ts
// src/services/vuelo/rumbo.test.ts
import { describe, it, expect } from 'vitest'
import { distanciaM, formatDistancia, horaLlegada, rumboDirecto } from './rumbo'
import { aPlano } from '../nav/geo'

const T = { lat: 41.6561, lon: 1.149 }
const I = { lat: 41.5842, lon: 1.6528 }

describe('rumbo y distancia por circulo maximo', () => {
  it('norte, este, sur y oeste', () => {
    expect(rumboDirecto(T, { lat: 41.7, lon: 1.149 })).toBeCloseTo(0, 6)
    expect(rumboDirecto(T, { lat: 41.6561, lon: 1.2 })).toBeCloseTo(90, 1)
    expect(rumboDirecto(T, { lat: 41.6, lon: 1.149 })).toBeCloseTo(180, 6)
    expect(rumboDirecto(T, { lat: 41.6561, lon: 1.1 })).toBeCloseTo(270, 1)
  })
  it('Tarrega a Igualada, contra el plano del motor', () => {
    const [x, y] = aPlano({ lat0: T.lat, lon0: T.lon }, I.lat, I.lon)
    expect(distanciaM(T, I) / Math.hypot(x, y)).toBeCloseTo(1, 2)
    expect(rumboDirecto(T, I)).toBeGreaterThan(100)
    expect(rumboDirecto(T, I)).toBeLessThan(105)
  })
  it('como en las maquetas', () => {
    expect(formatDistancia(846)).toBe('850 m')
    expect(formatDistancia(2140)).toBe('2,1 km')
    expect(formatDistancia(999)).toBe('1,0 km')
  })
  it('hora de llegada a la velocidad sobre el suelo, y nada si va casi parado', () => {
    expect(horaLlegada(1000, 2, 0)).toBe(500_000)
    expect(horaLlegada(1000, 0.2, 0)).toBe(null)
  })
})
```

- [ ] **Step 2: Comprobar que falla**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/rumbo.test.ts`
Expected: FAIL, `Failed to resolve import "./rumbo"`.

- [ ] **Step 3: Implementar**

```ts
// src/services/vuelo/rumbo.ts
// Del globo al waypoint activo, por circulo maximo (spec 10/10 §6.7).
import type { Punto } from '../nav/tipos'

const R = 6371000
const RAD = Math.PI / 180
/** Por debajo de esto el globo va casi parado y la hora de llegada no dice nada. */
const VEL_MIN_MS = 0.3

export function distanciaM(a: Punto, b: Punto): number {
  const dLat = (b.lat - a.lat) * RAD
  const dLon = (b.lon - a.lon) * RAD
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Rumbo verdadero inicial, de 0 a 360. */
export function rumboDirecto(a: Punto, b: Punto): number {
  const dLon = (b.lon - a.lon) * RAD
  const y = Math.sin(dLon) * Math.cos(b.lat * RAD)
  const x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos(dLon)
  return (Math.atan2(y, x) / RAD + 360) % 360
}

export function horaLlegada(distM: number, velMs: number, ahora: number): number | null {
  return velMs < VEL_MIN_MS ? null : ahora + (distM / velMs) * 1000
}

export function formatDistancia(m: number): string {
  if (m < 995) return `${Math.round(m / 10) * 10} m`
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`
}
```

Desde 995 m, redondeado a 10 serían «1000 m», así que pasa a km.

- [ ] **Step 4: Comprobar que pasa**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/rumbo.test.ts`
Expected: PASS, 4 pruebas.

- [ ] **Step 5: Commit**

```bash
git add src/services/vuelo/rumbo.ts src/services/vuelo/rumbo.test.ts
git commit -m "feat(vuelo): rumbo, distancia y hora de llegada al waypoint"
```

---

### Task 3: Lo que sale del GPS

**Files:**
- Create: `src/services/vuelo/gps.ts`
- Test: `src/services/vuelo/gps.test.ts`

- [ ] **Step 1: Escribir la prueba**

```ts
// src/services/vuelo/gps.test.ts
import { describe, it, expect } from 'vitest'
import { calibracion, proyeccion, rumboVelocidad, vario, type PuntoGps } from './gps'
import { aGeo, aPlano } from '../nav/geo'
import type { PuntoTraza } from '../nav/tipos'

const O = { lat0: 41.6561, lon0: 1.149 }

/** Traza recta a velMs hacia rumboDeg, subiendo a varioMs, un punto por segundo. */
function recta(n: number, rumboDeg: number, velMs: number, varioMs: number, t0 = 0): PuntoTraza[] {
  const r = rumboDeg * Math.PI / 180
  return Array.from({ length: n }, (_, i) => {
    const g = aGeo(O, Math.sin(r) * velMs * i, Math.cos(r) * velMs * i)
    return { t: t0 + i * 1000, lat: g.lat, lon: g.lon, altM: 500 + varioMs * i }
  })
}

describe('calibracion en tierra', () => {
  const muestras = (alts: (number | null)[], prec = 5): PuntoGps[] =>
    alts.map((a, i) => ({ t: i * 1000, lat: O.lat0, lon: O.lon0, altElipM: a, precisionM: prec }))

  it('terreno menos la media del GPS, como en la maqueta', () => {
    const c = calibracion(muestras(Array(12).fill(429)), 380)
    expect(c).toEqual({ correccionM: -49, n: 12 })
  })
  it('sin altitud o con mala precision no cuenta, y con menos de 10 no calibra', () => {
    expect(calibracion(muestras([...Array(9).fill(429), null, null]), 380)).toBe(null)
    expect(calibracion(muestras(Array(12).fill(429), 50), 380)).toBe(null)
  })
})

describe('rumbo, velocidad y vario', () => {
  it('de una recta conocida', () => {
    const rv = rumboVelocidad(recta(40, 61, 2.2, 0.3))
    expect(rv?.rumbo).toBeCloseTo(61, 3)
    expect(rv?.velMs).toBeCloseTo(2.2, 3)
    expect(vario(recta(40, 61, 2.2, 0.3))).toBeCloseTo(0.3, 6)
  })
  it('pasando por el norte no da un rumbo de 180', () => {
    const rv = rumboVelocidad(recta(40, 359, 3, 0))
    expect(rv?.rumbo).toBeCloseTo(359, 3)
  })
  it('solo mira la ventana: 30 s para el rumbo y 10 s para el vario', () => {
    const giro = [...recta(60, 90, 2, -1), ...recta(31, 0, 2, 1, 60_000).map(p => ({ ...p, altM: p.altM - 60 }))]
    expect(rumboVelocidad(giro)?.rumbo).toBeCloseTo(0, 0)
    expect(vario(giro)).toBeCloseTo(1, 6)
  })
  it('con poco tiempo no se inventa nada', () => {
    expect(rumboVelocidad(recta(5, 61, 2, 0))).toBe(null)
    expect(vario(recta(2, 61, 2, 1))).toBe(null)
    expect(rumboVelocidad([])).toBe(null)
  })
})

describe('proyeccion', () => {
  it('marcas a 5, 10, 15 y 20 min por el rumbo y la velocidad', () => {
    const ps = proyeccion({ lat: O.lat0, lon: O.lon0 }, 90, 2)
    expect(ps).toHaveLength(4)
    const [x, y] = aPlano(O, ps[3].lat, ps[3].lon)
    expect(x).toBeCloseTo(2400, 0)
    expect(y).toBeCloseTo(0, 3)
  })
})
```

- [ ] **Step 2: Comprobar que falla**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/gps.test.ts`
Expected: FAIL, `Failed to resolve import "./gps"`.

- [ ] **Step 3: Implementar**

```ts
// src/services/vuelo/gps.ts
// Lo que sale del GPS de la tablet (spec 10/10 §6.2, §6.3 y §6.5). Chrome en
// Android da la altitud sobre el elipsoide y nunca su precision (§12.1): se
// calibra en tierra contra el terreno del despegue.
import { aGeo, aPlano, rumbo } from '../nav/geo'
import type { Punto, PuntoTraza } from '../nav/tipos'

export interface PuntoGps { t: number; lat: number; lon: number; altElipM: number | null; precisionM: number }

const PRECISION_MAX_M = 30
const MUESTRAS_MIN = 10
export const CALIBRACION_S = 30
const VENTANA_RUMBO_S = 30
const SPAN_RUMBO_MIN_S = 10
const VENTANA_VARIO_S = 10
const SPAN_VARIO_MIN_S = 5

/** Correccion = terreno menos la media del GPS en tierra. Altitud sobre el mar = GPS + correccion. */
export function calibracion(muestras: PuntoGps[], terrenoM: number): { correccionM: number; n: number } | null {
  const alts = muestras.filter(m => m.altElipM !== null && m.precisionM <= PRECISION_MAX_M).map(m => m.altElipM!)
  if (alts.length < MUESTRAS_MIN) return null
  return { correccionM: terrenoM - alts.reduce((s, a) => s + a, 0) / alts.length, n: alts.length }
}

const ventana = (traza: PuntoTraza[], s: number) => {
  const ultimo = traza[traza.length - 1]
  return ultimo === undefined ? [] : traza.filter(p => p.t >= ultimo.t - s * 1000)
}

/** Del primer al ultimo punto de los ultimos 30 s. El campo heading del GPS no sirve con el globo lento. */
export function rumboVelocidad(traza: PuntoTraza[]): { rumbo: number; velMs: number } | null {
  const v = ventana(traza, VENTANA_RUMBO_S)
  if (v.length < 2) return null
  const a = v[0]
  const b = v[v.length - 1]
  const dt = (b.t - a.t) / 1000
  if (dt < SPAN_RUMBO_MIN_S) return null
  const [x, y] = aPlano({ lat0: a.lat, lon0: a.lon }, b.lat, b.lon)
  return { rumbo: rumbo(x, y), velMs: Math.hypot(x, y) / dt }
}

/** Pendiente de la altitud por minimos cuadrados en los ultimos 10 s, en m/s. */
export function vario(traza: PuntoTraza[]): number | null {
  const v = ventana(traza, VENTANA_VARIO_S)
  if (v.length < 3 || (v[v.length - 1].t - v[0].t) / 1000 < SPAN_VARIO_MIN_S) return null
  const ts = v.map(p => (p.t - v[0].t) / 1000)
  const mt = ts.reduce((s, t) => s + t, 0) / ts.length
  const ma = v.reduce((s, p) => s + p.altM, 0) / v.length
  let num = 0
  let den = 0
  v.forEach((p, i) => { num += (ts[i] - mt) * (p.altM - ma); den += (ts[i] - mt) ** 2 })
  return num / den
}

/** Donde estarias si te quedas a esta altura, a los 5, 10, 15 y 20 min (spec 10/10 §6.5). */
export function proyeccion(pos: Punto, rumboDeg: number, velMs: number, minutos = [5, 10, 15, 20]): Punto[] {
  const r = rumboDeg * Math.PI / 180
  return minutos.map(m => aGeo({ lat0: pos.lat, lon0: pos.lon }, Math.sin(r) * velMs * m * 60, Math.cos(r) * velMs * m * 60))
}
```

Antes de correr: comprobar en `src/services/nav/geo.ts` que `rumbo(u, v)` devuelve de 0 a 360 hacia donde va el vector (su comentario lo dice). Si no, usar `(Math.atan2(x, y) * 180 / Math.PI + 360) % 360`.

- [ ] **Step 4: Comprobar que pasa**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/gps.test.ts`
Expected: PASS, 7 pruebas.

- [ ] **Step 5: Commit**

```bash
git add src/services/vuelo/gps.ts src/services/vuelo/gps.test.ts
git commit -m "feat(vuelo): calibracion, rumbo, velocidad, vario y proyeccion del GPS"
```

---

### Task 4: Waypoints en el documento, versión 3

**Files:**
- Modify: `src/domain/types.ts` (añadir tipos y campos a `LogbookDoc`)
- Modify: `src/domain/schema.ts` (versión 3, migración 2 a 3)
- Modify: `src/domain/empty.ts` (documento vacío)
- Modify: `src/domain/fixtures.ts` (`makeDoc`)
- Create: `src/domain/waypoints.ts`
- Test: `src/domain/waypoints.test.ts`, y `src/domain/schema.test.ts` (migración)

- [ ] **Step 1: Tipos**

En `src/domain/types.ts`, antes de `LogbookDoc`:

```ts
/** El objetivo de altura en el punto (spec 2026-11-01). Misma forma que `Objetivo` del motor. */
export type ObjectiuWaypoint = { tipo: 'aterrar' } | { tipo: 'altitud'; altM: number } | { tipo: 'qualsevol' }

/** Un punto al que navegar (spec 10/10 §6.6). Las zonas llegaran con la parte 3. */
export interface Waypoint {
  id: string
  nom: string
  lat: number
  lon: number
  objectiu: ObjectiuWaypoint
  nota: string
}
```

Y en `LogbookDoc`:

```ts
  /** Spec 10/10 §6.6. */
  waypoints: Waypoint[]
  /** Un identificador y no un objeto: si no se encuentra en la lista, no hay activo (§6.9). */
  waypointActiuId: string | null
```

- [ ] **Step 2: Escribir la prueba de la migración**

Añadir a `src/domain/schema.test.ts`:

```ts
describe('migracion 2 a 3', () => {
  it('anade waypoints vacios y ningun activo, sin tocar lo demas', () => {
    const v2 = { ...makeDoc(), schemaVersion: 2 } as any
    delete v2.waypoints
    delete v2.waypointActiuId
    const v3 = migrate(v2)
    expect(v3.schemaVersion).toBe(3)
    expect(v3.waypoints).toEqual([])
    expect(v3.waypointActiuId).toBe(null)
    expect(v3.flights).toEqual(v2.flights)
  })
})
```

Si `schema.test.ts` no importa ya `migrate` y `makeDoc`, añadirlos al import.

- [ ] **Step 3: Escribir la prueba de los waypoints**

```ts
// src/domain/waypoints.test.ts
import { describe, it, expect } from 'vitest'
import { activar, afegirWaypoint, canviarNom, canviarObjectiu, esborrarWaypoint, nomNou, waypointActiu } from './waypoints'
import { makeDoc } from './fixtures'
import type { Waypoint } from './types'

const wp = (id: string, nom: string): Waypoint =>
  ({ id, nom, lat: 41.68, lon: 1.21, objectiu: { tipo: 'aterrar' }, nota: '' })

describe('waypoints', () => {
  it('el nombre nuevo es WP y el siguiente numero', () => {
    expect(nomNou(makeDoc())).toBe('WP1')
    expect(nomNou(makeDoc({ waypoints: [wp('a', 'WP1'), wp('b', 'ZONA A'), wp('c', 'WP7')] }))).toBe('WP8')
  })
  it('anadir no activa, salvo que se pida', () => {
    const d = afegirWaypoint(makeDoc(), wp('a', 'WP1'))
    expect(d.waypoints).toHaveLength(1)
    expect(d.waypointActiuId).toBe(null)
    expect(afegirWaypoint(makeDoc(), wp('a', 'WP1'), true).waypointActiuId).toBe('a')
  })
  it('renombrar y cambiar objetivo', () => {
    let d = afegirWaypoint(makeDoc(), wp('a', 'WP1'))
    d = canviarNom(d, 'a', '  Camp de blat ')
    d = canviarObjectiu(d, 'a', { tipo: 'altitud', altM: 762 })
    expect(d.waypoints[0]).toMatchObject({ nom: 'Camp de blat', objectiu: { tipo: 'altitud', altM: 762 } })
  })
  it('los cuatro casos sin activo dan null y no lanzan (§6.9)', () => {
    expect(waypointActiu(makeDoc())).toBe(null)
    const d = afegirWaypoint(makeDoc(), wp('a', 'WP1'))
    expect(waypointActiu(d)).toBe(null)
    const borrado = esborrarWaypoint(activar(d, 'a'), 'a')
    expect(borrado.waypointActiuId).toBe(null)
    expect(waypointActiu(borrado)).toBe(null)
    expect(waypointActiu({ ...d, waypointActiuId: 'ya-no-existe' })).toBe(null)
  })
  it('activar uno desactiva el anterior, y activar null quita el activo', () => {
    let d = afegirWaypoint(afegirWaypoint(makeDoc(), wp('a', 'WP1')), wp('b', 'WP2'))
    d = activar(activar(d, 'a'), 'b')
    expect(waypointActiu(d)?.id).toBe('b')
    expect(activar(d, null).waypointActiuId).toBe(null)
  })
  it('borrar otro que no es el activo deja el activo', () => {
    let d = afegirWaypoint(afegirWaypoint(makeDoc(), wp('a', 'WP1')), wp('b', 'WP2'))
    d = esborrarWaypoint(activar(d, 'a'), 'b')
    expect(waypointActiu(d)?.id).toBe('a')
  })
})
```

- [ ] **Step 4: Comprobar que fallan**

Run: `TZ=Europe/Madrid npx vitest run src/domain/waypoints.test.ts src/domain/schema.test.ts`
Expected: FAIL, `./waypoints` no existe y la migración 2 a 3 falta.

- [ ] **Step 5: Implementar**

En `src/domain/schema.ts`: `CURRENT_SCHEMA_VERSION = 3` y en `MIGRATIONS`:

```ts
  // 2 -> 3: waypoints de la pantalla de vuelo (spec 10/10 §6.6), vacios y sin
  // ninguno activo.
  2: (doc: any) => ({ ...doc, schemaVersion: 3, waypoints: [], waypointActiuId: null }),
```

En `src/domain/empty.ts`, dentro de `emptyDocument()`, junto a `flights: []`: `waypoints: [], waypointActiuId: null,`. En `src/domain/fixtures.ts`, en `makeDoc`, junto a `flights: []`: `waypoints: [], waypointActiuId: null,`.

```ts
// src/domain/waypoints.ts
// Los waypoints del documento (spec 10/10 §6.6 y §6.9). El activo es un
// identificador que se resuelve cada vez: si no esta en la lista, no hay activo.
import type { LogbookDoc, ObjectiuWaypoint, Waypoint } from './types'

export function nomNou(doc: LogbookDoc): string {
  const n = doc.waypoints.map(w => /^WP(\d+)$/.exec(w.nom)).filter(m => m !== null).map(m => Number(m![1]))
  return `WP${n.length === 0 ? 1 : Math.max(...n) + 1}`
}

export function waypointActiu(doc: LogbookDoc): Waypoint | null {
  return doc.waypoints.find(w => w.id === doc.waypointActiuId) ?? null
}

export function afegirWaypoint(doc: LogbookDoc, w: Waypoint, activarlo = false): LogbookDoc {
  return { ...doc, waypoints: [...doc.waypoints, w], waypointActiuId: activarlo ? w.id : doc.waypointActiuId }
}

const cambiar = (doc: LogbookDoc, id: string, f: (w: Waypoint) => Waypoint): LogbookDoc =>
  ({ ...doc, waypoints: doc.waypoints.map(w => (w.id === id ? f(w) : w)) })

export function canviarNom(doc: LogbookDoc, id: string, nom: string): LogbookDoc {
  return cambiar(doc, id, w => ({ ...w, nom: nom.trim() }))
}

export function canviarObjectiu(doc: LogbookDoc, id: string, objectiu: ObjectiuWaypoint): LogbookDoc {
  return cambiar(doc, id, w => ({ ...w, objectiu }))
}

/** Borrar el activo lo desactiva en la misma operacion (§6.9). */
export function esborrarWaypoint(doc: LogbookDoc, id: string): LogbookDoc {
  return {
    ...doc,
    waypoints: doc.waypoints.filter(w => w.id !== id),
    waypointActiuId: doc.waypointActiuId === id ? null : doc.waypointActiuId,
  }
}

export function activar(doc: LogbookDoc, id: string | null): LogbookDoc {
  return { ...doc, waypointActiuId: id }
}
```

- [ ] **Step 6: Todas las pruebas y tipos**

Run: `npm test 2>&1 | grep -E 'Tests |×' && npx tsc -b && git checkout -- tsconfig.tsbuildinfo`
Expected: todo en verde. Si alguna prueba antigua compara un documento entero o la versión 2, ajustarla a la 3 y anotarlo en los cambios. Si `tsc` se queja de algún `LogbookDoc` escrito a mano sin los campos nuevos (pantallas, sincronización), añadirle `waypoints: []` y `waypointActiuId: null`.

- [ ] **Step 7: Commit**

```bash
git add src/domain
git commit -m "feat(domain): waypoints en el documento, esquema 3"
```

---

### Task 5: La sesión de vuelo

**Files:**
- Create: `src/services/vuelo/sessio.ts`
- Test: `src/services/vuelo/sessio.test.ts`

- [ ] **Step 1: Escribir la prueba**

```ts
// src/services/vuelo/sessio.test.ts
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { afegirPunt, ajustesDeVol, esborrarSessio, llegirSessio, novaSessio, desarSessio, type Sessio } from './sessio'
import type { PuntoGps } from './gps'

const D = { lat: 41.6561, lon: 1.149, elevM: 380 }
const p = (t: number, altElipM: number | null): PuntoGps => ({ t, lat: 41.6561, lon: 1.149, altElipM, precisionM: 5 })

describe('la sesion de vuelo', () => {
  beforeEach(async () => { await esborrarSessio() })

  it('sin calibrar guarda la altitud del GPS tal cual', () => {
    const s = afegirPunt(novaSessio(D, 1200, 0), p(1000, 429))
    expect(s.traza).toEqual([{ t: 1000, lat: 41.6561, lon: 1.149, altM: 429 }])
  })
  it('calibrada, suma la correccion', () => {
    const s = afegirPunt({ ...novaSessio(D, 1200, 0), correccioM: -49 }, p(1000, 429))
    expect(s.traza[0].altM).toBe(380)
  })
  it('sin altitud o con la hora repetida, el punto no entra', () => {
    let s = afegirPunt(novaSessio(D, 1200, 0), p(1000, 429))
    s = afegirPunt(s, p(1000, 430))
    s = afegirPunt(s, p(2000, null))
    expect(s.traza).toHaveLength(1)
  })
  it('el despegue es el primer punto calibrado a 15 m o mas sobre el terreno', () => {
    let s: Sessio = { ...novaSessio(D, 1200, 0), correccioM: -49 }
    s = afegirPunt(s, p(1000, 440))
    expect(s.enlairatA).toBe(null)
    s = afegirPunt(s, p(2000, 444))
    expect(s.enlairatA).toBe(2000)
    s = afegirPunt(s, p(3000, 429))
    expect(s.enlairatA).toBe(2000)
  })
  it('sin calibrar no se detecta el despegue', () => {
    const s = afegirPunt(novaSessio(D, 1200, 0), p(1000, 600))
    expect(s.enlairatA).toBe(null)
  })
  it('el rango: de 250 ft sobre el despegue al techo', () => {
    const a = ajustesDeVol(novaSessio(D, 1200, 0))
    expect(a.altMinM).toBeCloseTo(380 + 250 * 0.3048, 9)
    expect(a.altMaxM).toBe(1200)
  })
  it('se guarda y se lee', async () => {
    const s = afegirPunt(novaSessio(D, 1200, 5), p(1000, 429))
    await desarSessio(s)
    expect(await llegirSessio()).toEqual(s)
  })
})
```

- [ ] **Step 2: Comprobar que falla**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/sessio.test.ts`
Expected: FAIL, `Failed to resolve import "./sessio"`.

- [ ] **Step 3: Implementar**

```ts
// src/services/vuelo/sessio.ts
// La sesion de vuelo en curso: el despegue, la correccion de altitud, el techo
// y la traza, guardada en IndexedDB segun llega para no perderla si la app se
// cierra (spec 10/10 §6.1).
import { del, get, set } from 'idb-keyval'
import { PIE_M } from '../nav/campo'
import { AJUSTES_POR_DEFECTO, type AjustesNav, type PuntoTraza } from '../nav/tipos'
import type { PuntoGps } from './gps'

const CLAVE = 'vol:sessio'
/** Por encima de esto sobre el terreno del despegue, el globo ya vuela. */
const ENLAIRAT_M = 15

export interface Despegue { lat: number; lon: number; elevM: number }

export interface Sessio {
  iniciadaA: number
  despegue: Despegue
  /** Altitud sobre el mar = GPS + correccioM. null sin calibrar. */
  correccioM: number | null
  sostreM: number
  traza: PuntoTraza[]
  enlairatA: number | null
}

export function novaSessio(despegue: Despegue, sostreM: number, ara: number): Sessio {
  return { iniciadaA: ara, despegue, correccioM: null, sostreM, traza: [], enlairatA: null }
}

export function afegirPunt(s: Sessio, p: PuntoGps): Sessio {
  const ultim = s.traza[s.traza.length - 1]
  if (p.altElipM === null || (ultim !== undefined && p.t <= ultim.t)) return s
  const altM = p.altElipM + (s.correccioM ?? 0)
  const enlairatA = s.enlairatA ?? (s.correccioM !== null && altM >= s.despegue.elevM + ENLAIRAT_M ? p.t : null)
  return { ...s, traza: [...s.traza, { t: p.t, lat: p.lat, lon: p.lon, altM }], enlairatA }
}

/** El rango del optimizador: de 250 ft sobre el despegue al techo (spec 10/10 §6.8). */
export function ajustesDeVol(s: Sessio): AjustesNav {
  return { ...AJUSTES_POR_DEFECTO, altMinM: s.despegue.elevM + 250 * PIE_M, altMaxM: s.sostreM }
}

export async function desarSessio(s: Sessio): Promise<void> {
  await set(CLAVE, s)
}

export async function llegirSessio(): Promise<Sessio | null> {
  try {
    return (await get<Sessio>(CLAVE)) ?? null
  } catch {
    return null
  }
}

export async function esborrarSessio(): Promise<void> {
  await del(CLAVE)
}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/sessio.test.ts`
Expected: PASS, 7 pruebas.

- [ ] **Step 5: Commit**

```bash
git add src/services/vuelo/sessio.ts src/services/vuelo/sessio.test.ts
git commit -m "feat(vuelo): sesion de vuelo con traza, calibracion y despegue"
```

---

### Task 6: La entrada del motor y el plan vigente

**Files:**
- Create: `src/services/vuelo/navegacio.ts`
- Test: `src/services/vuelo/navegacio.test.ts`

- [ ] **Step 1: Escribir la prueba**

```ts
// src/services/vuelo/navegacio.test.ts
import { describe, it, expect } from 'vitest'
import { clauDe, entradaDeVol, MAX_VIGENT_MS, triarPlan, type PlanVigent } from './navegacio'
import { novaSessio } from './sessio'
import { parsePrevision } from '../nav/perfil'
import { cargar1010 } from '../nav/prueba-1010'
import type { ResultadoNavegacion } from '../nav/tipos'
import type { Waypoint } from '../../domain/types'

const prev = parsePrevision(cargar1010())
const s = { ...novaSessio({ lat: 41.6561, lon: 1.149, elevM: 380 }, 1200, 0), enlairatA: 5000 }
const wp: Waypoint = { id: 'za', nom: 'ZONA A', lat: 41.682, lon: 1.196, objectiu: { tipo: 'aterrar' }, nota: '' }

const pv = (clau: string, d: number | null, calculatA: number): PlanVigent =>
  ({ clau, calculatA, r: { distanciaMinM: d } as ResultadoNavegacion })

describe('la entrada del motor', () => {
  it('con waypoint: el punto, su objetivo, el relieve, terra y el despegue', () => {
    const e = entradaDeVol(s, prev, null, wp, 9000)
    expect(e.punto).toEqual({ lat: 41.682, lon: 1.196 })
    expect(e.objetivo).toEqual({ tipo: 'aterrar' })
    expect(e.incluirTerra).toBe(true)
    expect(e.despegue).toBe(5000)
    expect(e.ahora).toBe(9000)
    expect(e.relieve).toBe(undefined)
    expect(e.ajustes.altMaxM).toBe(1200)
  })
  it('sin waypoint, sin punto (§6.9)', () => {
    expect(entradaDeVol(s, prev, null, null, 9000).punto).toBe(null)
  })
  it('la clave cambia con el objetivo', () => {
    expect(clauDe(wp)).not.toBe(clauDe({ ...wp, objectiu: { tipo: 'qualsevol' } }))
    expect(clauDe(null)).toBe('')
  })
})

describe('el plan vigente', () => {
  it('sin vigente o con otro waypoint, el nuevo', () => {
    expect(triarPlan(null, pv('a', 500, 0), 0).calculatA).toBe(0)
    expect(triarPlan(pv('a', 500, 0), pv('b', 900, 15_000), 15_000).clau).toBe('b')
  })
  it('se queda el vigente si el nuevo no mejora un 20 % o 200 m', () => {
    expect(triarPlan(pv('a', 500, 0), pv('a', 450, 15_000), 15_000).calculatA).toBe(0)
    expect(triarPlan(pv('a', 500, 0), pv('a', 399, 15_000), 15_000).calculatA).toBe(15_000)
    expect(triarPlan(pv('a', 2000, 0), pv('a', 1790, 15_000), 15_000).calculatA).toBe(15_000)
  })
  it(`con ${MAX_VIGENT_MS / 1000} s o mas, el nuevo aunque no mejore`, () => {
    expect(triarPlan(pv('a', 500, 0), pv('a', 600, MAX_VIGENT_MS), MAX_VIGENT_MS).calculatA).toBe(MAX_VIGENT_MS)
  })
  it('sin distancia en alguno, el nuevo', () => {
    expect(triarPlan(pv('a', null, 0), pv('a', 600, 15_000), 15_000).calculatA).toBe(15_000)
  })
})
```

- [ ] **Step 2: Comprobar que falla**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/navegacio.test.ts`
Expected: FAIL, `Failed to resolve import "./navegacio"`.

- [ ] **Step 3: Implementar**

```ts
// src/services/vuelo/navegacio.ts
// De la sesion de vuelo a la entrada del motor, y que plan se ensena. El motor
// no guarda estado: la pantalla guarda el plan vigente y lo cambia con
// debeSustituir (spec del motor, 30/10), o cuando tiene un minuto.
import type { EntradaNav } from '../nav/motor'
import type { Previsiones } from '../nav/perfil'
import { debeSustituir } from '../nav/plan'
import type { Relieve, ResultadoNavegacion } from '../nav/tipos'
import type { Waypoint } from '../../domain/types'
import { ajustesDeVol, type Sessio } from './sessio'

/** Con esto, la orden no salta en cada recalculo de 15 s y tampoco se queda vieja. */
export const MAX_VIGENT_MS = 60_000
export const RECALCULO_MS = 15_000

export interface PlanVigent { clau: string; calculatA: number; r: ResultadoNavegacion }

/** Waypoint y objetivo: si cambia cualquiera de los dos, el plan anterior ya no vale. */
export function clauDe(w: Waypoint | null): string {
  return w === null ? '' : `${w.id}|${JSON.stringify(w.objectiu)}|${w.lat}|${w.lon}`
}

export function entradaDeVol(
  s: Sessio, prevision: Previsiones, relieve: Relieve | null, w: Waypoint | null, ara: number,
): EntradaNav {
  return {
    prevision,
    traza: s.traza,
    ajustes: ajustesDeVol(s),
    punto: w === null ? null : { lat: w.lat, lon: w.lon },
    ahora: ara,
    incluirTerra: true,
    despegue: s.enlairatA ?? undefined,
    objetivo: w?.objectiu,
    relieve: relieve ?? undefined,
  }
}

export function triarPlan(vigent: PlanVigent | null, nou: PlanVigent, ara: number): PlanVigent {
  if (vigent === null || vigent.clau !== nou.clau) return nou
  if (ara - vigent.calculatA >= MAX_VIGENT_MS) return nou
  const a = vigent.r.distanciaMinM
  const b = nou.r.distanciaMinM
  if (a === null || b === null) return nou
  return debeSustituir(a, b) ? nou : vigent
}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/navegacio.test.ts`
Expected: PASS, 7 pruebas.

- [ ] **Step 5: Mutación.** Quitar la línea de `MAX_VIGENT_MS`: tiene que fallar «con 60 s o mas». Cambiar `vigent.clau !== nou.clau` por `false`: tiene que fallar «otro waypoint». Deshacer.

- [ ] **Step 6: Commit**

```bash
git add src/services/vuelo/navegacio.ts src/services/vuelo/navegacio.test.ts
git commit -m "feat(vuelo): entrada del motor desde la sesion y plan vigente"
```

---

### Task 7: Modo del aparato y último techo

**Files:**
- Create: `src/ui/aparell.ts`
- Test: `src/ui/aparell.test.ts`

- [ ] **Step 1: Escribir la prueba**

```ts
// src/ui/aparell.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { aparell, aparellPerDefecte, desarAparell, desarSostre, ultimSostre } from './aparell'

class Memoria {
  m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
}

describe('el modo del aparato', () => {
  beforeEach(() => { (globalThis as any).localStorage = new Memoria() })

  it('por defecto, tablet si el lado corto mide 600 px o mas', () => {
    expect(aparellPerDefecte(1280, 800)).toBe('tauleta')
    expect(aparellPerDefecte(800, 1280)).toBe('tauleta')
    expect(aparellPerDefecte(390, 844)).toBe('telefon')
  })
  it('lo elegido manda sobre el defecto', () => {
    expect(aparell(1280, 800)).toBe('tauleta')
    desarAparell('telefon')
    expect(aparell(1280, 800)).toBe('telefon')
  })
  it('el ultimo techo, en metros, o null', () => {
    expect(ultimSostre()).toBe(null)
    desarSostre(1200)
    expect(ultimSostre()).toBe(1200)
  })
  it('sin localStorage no revienta', () => {
    (globalThis as any).localStorage = { getItem: () => { throw new Error('bloqueado') }, setItem: () => { throw new Error('bloqueado') } }
    expect(aparell(390, 844)).toBe('telefon')
    expect(ultimSostre()).toBe(null)
    expect(() => desarSostre(1200)).not.toThrow()
  })
})
```

- [ ] **Step 2: Comprobar que falla**

Run: `TZ=Europe/Madrid npx vitest run src/ui/aparell.test.ts`
Expected: FAIL, `Failed to resolve import "./aparell"`.

- [ ] **Step 3: Implementar**

```ts
// src/ui/aparell.ts
// Cada aparato tiene su modo y su ultimo techo, en su localStorage y no en el
// documento, que es el mismo en los dos aparatos (spec 10/10 §7.4).

export type Aparell = 'tauleta' | 'telefon'

const CLAU_APARELL = 'bpl:aparell'
const CLAU_SOSTRE = 'bpl:sostreM'
const COSTAT_TAULETA_PX = 600

const llegir = (k: string): string | null => {
  try { return localStorage.getItem(k) } catch { return null }
}
const escriure = (k: string, v: string): void => {
  try { localStorage.setItem(k, v) } catch { /* sin almacenamiento, se pierde y ya */ }
}

export function aparellPerDefecte(amplePx: number, altPx: number): Aparell {
  return Math.min(amplePx, altPx) >= COSTAT_TAULETA_PX ? 'tauleta' : 'telefon'
}

export function aparell(amplePx = screen.width, altPx = screen.height): Aparell {
  const v = llegir(CLAU_APARELL)
  return v === 'tauleta' || v === 'telefon' ? v : aparellPerDefecte(amplePx, altPx)
}

export function desarAparell(a: Aparell): void {
  escriure(CLAU_APARELL, a)
}

export function ultimSostre(): number | null {
  const v = Number(llegir(CLAU_SOSTRE))
  return llegir(CLAU_SOSTRE) === null || !Number.isFinite(v) || v <= 0 ? null : v
}

export function desarSostre(m: number): void {
  escriure(CLAU_SOSTRE, String(m))
}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `TZ=Europe/Madrid npx vitest run src/ui/aparell.test.ts`
Expected: PASS, 4 pruebas.

- [ ] **Step 5: Commit**

```bash
git add src/ui/aparell.ts src/ui/aparell.test.ts
git commit -m "feat(ui): modo del aparato y ultimo techo en el propio aparato"
```

---

### Task 8: Cierre

- [ ] **Step 1:** `npm test 2>&1 | grep -E 'Tests |×'`, `npx tsc -b && git checkout -- tsconfig.tsbuildinfo`. Todo en verde.
- [ ] **Step 2:** «Cambios durante la ejecución» al final de este plan, STATUS con una línea en la sección del día, commit `docs: logica de la pantalla de vuelo`.
- [ ] **Step 3:** `superpowers:finishing-a-development-branch`, fusionar en `main` en local, quitar el worktree. Sin push ni publicar.

---

## Cambios durante la ejecución

1. El código de cada tarea se sacó del plan con un script. Para ver fallar cada prueba antes de
   implementar, se apartó el módulo, se corrió la prueba (no encuentra el import) y se devolvió.
   Además, cada guarda se mutó: todas las mutaciones fallan alguna prueba.
2. Tarea 4: las pruebas de la migración 1 a 2 llevaban hasta la versión actual. Ahora piden la
   2 (`migrate(v1, 2)`), y «la versión actual es la 3» va en el bloque nuevo. Tres pruebas de la
   interfaz (`incomplete`, `newFlight`, `select`) construyen el documento a mano y necesitaban
   los dos campos nuevos para `tsc`.
3. Tarea 4: se escribió la migración antes de su prueba. La mutación (quitar la migración 2 a 3)
   tumba tres pruebas, la nueva incluida.
4. 696 pruebas, 44 nuevas.
