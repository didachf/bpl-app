# Capa de datos de la pantalla de vuelo, plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Todo lo que la pantalla de vuelo necesita por debajo, sin pantalla: la previsión de siete modelos guardada, el relieve y la ortofoto de la zona bajados y guardados para volar sin cobertura, y el motor de navegación en un Web Worker.

**Architecture:** Módulos nuevos en `src/services/vuelo/`. Lo puro (cuentas de mosaicos, Terrarium a rejilla, petición y peso de open-meteo, política de refresco, descarga con concurrencia limitada, cliente del worker) va con prueba en node. Lo que sólo existe en el navegador (Cache API, decodificar PNG, el worker de verdad, la ruta del service worker) va en dos ficheros finos y se comprueba en Chromium con datos reales del 10/10. El service worker sirve los mosaicos desde la misma caché donde los deja la descarga, así Leaflet los encuentra sin red.

**Tech Stack:** TypeScript, Vite 8 con `vite-plugin-pwa` (Workbox `generateSW`), `idb-keyval`, Vitest 4 en node con `fake-indexeddb`, Playwright CLI con Chromium para la comprobación en navegador.

**Specs:** `docs/superpowers/specs/2026-10-10-pantalla-de-vuelo-design.md` §5.1, §5.5, §8, §10 y §12.1, y `docs/superpowers/specs/2026-11-01-relieve-design.md` §3.

**Fuera de este plan:** la pantalla (espera al repaso de las maquetas de la fase 2), la capa de Leaflet (que tendrá que pedir los mosaicos con `crossOrigin: true` para que el service worker los guarde), la medida en la tablet de verdad (necesita publicar, y eso lo decide Dídac), y borrar mosaicos viejos más allá de vaciar la caché entera.

---

## Decisiones técnicas de este plan

| Qué | Decisión | Por qué |
|---|---|---|
| Ventana de la previsión | De una hora antes de ahora a 24 h después | Bajo 14 días el tiempo no cuenta en la cuota (§12.1). Cubre cualquier vuelo del día sin volver a pedir |
| Refresco | Como mucho cada 30 min, y sin red se usa la guardada | §5.5 |
| Radio del relieve | 20 km alrededor del despegue, rejilla de 100 m | 36 mosaicos z12, unos 3,6 MB, 400 × 400 nodos. El 10/10 derivó unos 10 km. El motor ya avisa si el globo sale de la rejilla |
| Ortofoto | z12 a z15 en 15 km y z16 en 3 km, 1 764 mosaicos para Tàrrega, unos 55 MB | Los radios de §8 |
| Descarga | Cuatro peticiones a la vez como mucho, sin repetir lo que ya está | Lo que pide un mapa al moverlo. Corrige el «de uno en uno» de §12.1, que con 1 764 mosaicos y la latencia del móvil serían varios minutos |
| Dónde se guardan los mosaicos | Una caché `mosaicos` de la Cache API, compartida por la descarga y el service worker | Leaflet pide un mosaico, el service worker lo encuentra ahí sin red |
| Ruta del service worker | `CacheFirst` sólo para las dos URL de mosaicos, `ignoreVary` | AWS manda `Vary: Origin`. La API de GitHub sigue sin caché |
| Decodificar el relieve | `createImageBitmap` sin conversión de color ni alfa premultiplicado, y `OffscreenCanvas` | Un píxel Terrarium es un número. Se comprueba contra `relieve_10-10.json` |
| Worker | Módulo ES. Sólo vale el último pedido: uno nuevo resuelve los anteriores con `null` | §10: el resultado que llega tarde se tira |

## Archivos

| Archivo | Qué hace |
|---|---|
| `src/services/vuelo/mosaicos.ts` | Cuentas de mosaicos XYZ: posición, caja alrededor de un punto, mosaicos de una caja |
| `src/services/vuelo/terrarium.ts` | Píxel Terrarium a metros, y mosaicos a la rejilla `Relieve` del motor |
| `src/services/vuelo/mapasDeVuelo.ts` | URL, radios, atribuciones y listas de mosaicos de la ortofoto y del relieve, y el nombre y patrón de la caché |
| `src/services/vuelo/prevision.ts` | La petición de §5.1 y su peso en la cuota |
| `src/services/vuelo/previsionGuardada.ts` | La previsión en IndexedDB y cuándo se pide otra |
| `src/services/vuelo/bajarMosaicos.ts` | Descarga con concurrencia limitada a un almacén |
| `src/services/vuelo/navegador.ts` | Sólo navegador: almacén sobre la Cache API y PNG a píxeles |
| `src/services/vuelo/preparar.ts` | Sólo navegador: lo que se baja al pulsar «Començar vol», y el relieve de la zona |
| `src/services/vuelo/calculador.ts` | Cliente del worker, el último pedido gana |
| `src/services/vuelo/nav.worker.ts` | El worker: llama a `navegar()` y mide cuánto tarda |
| `vite.config.ts` | Ruta `CacheFirst` de los mosaicos y formato ES de los workers |

Pruebas al lado de cada módulo puro, con el mismo nombre y `.test.ts`.

## Antes de empezar

- [ ] Rama y worktree, como el motor:

```bash
cd ~/code/bpl-app && git worktree add ../bpl-app-datos -b datos-de-vuelo && cd ../bpl-app-datos && npm install && npm test 2>&1 | tail -3
```

Esperado: `Tests  615 passed (615)` o el número que haya en `main`, todo en verde.

---

### Task 1: Cuentas de mosaicos

**Files:**
- Create: `src/services/vuelo/mosaicos.ts`
- Test: `src/services/vuelo/mosaicos.test.ts`

- [ ] **Step 1: Escribir la prueba**

```ts
// src/services/vuelo/mosaicos.test.ts
import { describe, it, expect } from 'vitest'
import { aMosaico, cajaAlrededor, mosaicosDeCaja } from './mosaicos'
import { aPlano } from '../nav/geo'

const lonDe = (x: number) => x / 4096 * 360 - 180
const latDe = (y: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 4096))) / (Math.PI / 180)

describe('mosaicos XYZ', () => {
  it('Tarrega e Igualada caen en los mosaicos comprobados contra los servidores', () => {
    // 12/2060/1525 es el relieve de Tarrega en AWS (EU-DEM), y 12/2066/1526 la
    // ortofoto de Igualada en el Mapa base del ICGC (spec 10/10 §12.1).
    expect(aMosaico(41.65, 1.14, 12).map(Math.floor)).toEqual([2060, 1525])
    expect(aMosaico(41.5842, 1.6528, 12).map(Math.floor)).toEqual([2066, 1526])
  })

  it('la fila crece hacia el sur', () => {
    expect(aMosaico(41, 1, 12)[1]).toBeGreaterThan(aMosaico(42, 1, 12)[1])
  })

  it('la caja tiene el radio pedido en el plano del motor', () => {
    const p = { lat0: 41.6561, lon0: 1.149 }
    const c = cajaAlrededor(p.lat0, p.lon0, 20000)
    const [xe, yn] = aPlano(p, c.norte, c.este)
    const [xo, ys] = aPlano(p, c.sur, c.oeste)
    expect(xe).toBeCloseTo(20000, 6)
    expect(yn).toBeCloseTo(20000, 6)
    expect(xo).toBeCloseTo(-20000, 6)
    expect(ys).toBeCloseTo(-20000, 6)
  })

  it('una caja pequena dentro de un mosaico da ese mosaico', () => {
    expect(mosaicosDeCaja(cajaAlrededor(41.65, 1.14, 200), 12)).toEqual([{ z: 12, x: 2060, y: 1525 }])
  })

  it('cubre la caja sin repetir, de norte a sur', () => {
    const ms = mosaicosDeCaja(cajaAlrededor(41.6561, 1.149, 15000), 14)
    expect(ms).toHaveLength(306)
    expect(new Set(ms.map(m => `${m.x}/${m.y}`)).size).toBe(306)
    expect(ms[0].y).toBeLessThan(ms[ms.length - 1].y)
  })

  it('el margen en pixeles anade el vecino cuando el borde cae a menos de un pixel', () => {
    const c = { sur: latDe(1525.6), norte: latDe(1525.4), oeste: lonDe(2060 + 0.5 / 256), este: lonDe(2060.5) }
    expect(mosaicosDeCaja(c, 12).map(m => m.x)).toEqual([2060])
    expect(mosaicosDeCaja(c, 12, 1).map(m => m.x)).toEqual([2059, 2060])
  })
})
```

- [ ] **Step 2: Comprobar que falla**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/mosaicos.test.ts`
Expected: FAIL, `Failed to resolve import "./mosaicos"`.

- [ ] **Step 3: Implementar**

```ts
// src/services/vuelo/mosaicos.ts
// Cuentas de mosaicos XYZ, fila 0 arriba como en OSM. Es el esquema del Mapa
// base del ICGC y de AWS Terrain Tiles (spec 10/10 §12.1).

const R = 6371000
const RAD = Math.PI / 180

export interface Caja { sur: number; oeste: number; norte: number; este: number }
export interface Mosaico { z: number; x: number; y: number }

/** Posicion continua en mosaicos: la parte entera es el mosaico, la fraccion el sitio dentro. */
export function aMosaico(lat: number, lon: number, z: number): [number, number] {
  const n = 2 ** z
  return [(lon + 180) / 360 * n, (1 - Math.asinh(Math.tan(lat * RAD)) / Math.PI) / 2 * n]
}

/** Caja de radioM alrededor de un punto, con el mismo plano que el motor (nav/geo.ts). */
export function cajaAlrededor(lat: number, lon: number, radioM: number): Caja {
  const dLat = radioM / (R * RAD)
  const dLon = radioM / (R * RAD * Math.cos(lat * RAD))
  return { sur: lat - dLat, oeste: lon - dLon, norte: lat + dLat, este: lon + dLon }
}

/**
 * Los mosaicos que tocan la caja en el nivel z, de norte a sur y de oeste a
 * este. margenPx agranda la caja en pixeles: la bilineal de un borde lee el
 * pixel de al lado, que puede caer en el mosaico vecino.
 */
export function mosaicosDeCaja(c: Caja, z: number, margenPx = 0): Mosaico[] {
  const m = margenPx / 256
  const [x0, y0] = aMosaico(c.norte, c.oeste, z)
  const [x1, y1] = aMosaico(c.sur, c.este, z)
  const out: Mosaico[] = []
  for (let y = Math.floor(y0 - m); y <= Math.floor(y1 + m); y++) {
    for (let x = Math.floor(x0 - m); x <= Math.floor(x1 + m); x++) out.push({ z, x, y })
  }
  return out
}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/mosaicos.test.ts`
Expected: PASS, 6 pruebas.

- [ ] **Step 5: Commit**

```bash
git add src/services/vuelo/mosaicos.ts src/services/vuelo/mosaicos.test.ts
git commit -m "feat(vuelo): cuentas de mosaicos XYZ"
```

---

### Task 2: De mosaicos Terrarium a la rejilla del motor

**Files:**
- Create: `src/services/vuelo/terrarium.ts`
- Test: `src/services/vuelo/terrarium.test.ts`

Las cuentas son las de `docs/prototipos/2026-11-01-objetivo/relieve.py`, que sacó `relieve_10-10.json`: bilineal entre centros de píxel (`gx = x · 256 − 0,5`), paso en longitud con la latitud de referencia, redondeo a 0,1 m.

- [ ] **Step 1: Escribir la prueba**

```ts
// src/services/vuelo/terrarium.test.ts
import { describe, it, expect } from 'vitest'
import { elevTerrarium, FaltaMosaico, rejillaTerrarium, Z_RELIEVE } from './terrarium'
import { aMosaico, cajaAlrededor } from './mosaicos'

/** La inversa de elevTerrarium. */
function codificar(e: number): [number, number, number] {
  const v = e + 32768
  return [Math.floor(v / 256), Math.floor(v) % 256, Math.round((v - Math.floor(v)) * 256)]
}

/** Mosaicos donde cada pixel vale f en sus indices globales de pixel. */
function mosaicosDe(f: (gx: number, gy: number) => number, leidos: string[] = []) {
  return (tx: number, ty: number): Uint8ClampedArray => {
    leidos.push(`${tx}/${ty}`)
    const d = new Uint8ClampedArray(256 * 256 * 4)
    for (let py = 0; py < 256; py++) {
      for (let px = 0; px < 256; px++) {
        const [r, g, b] = codificar(f(tx * 256 + px, ty * 256 + py))
        const i = (py * 256 + px) * 4
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255
      }
    }
    return d
  }
}

// Un plano en pixeles: la bilineal lo reproduce exacto.
const plano = (gx: number, gy: number) => 300 + 0.05 * (gx - 527000) - 0.03 * (gy - 390400)

describe('Terrarium', () => {
  it('decodifica el pixel', () => {
    expect(elevTerrarium(128, 0, 0)).toBe(0)
    expect(elevTerrarium(129, 44, 128)).toBe(300.5)
    expect(elevTerrarium(0, 0, 0)).toBe(-32768)
  })

  it('la rejilla reproduce un plano, cruzando mosaicos', () => {
    const leidos: string[] = []
    const c = cajaAlrededor(41.62, 1.17, 6000)
    const r = rejillaTerrarium(c, 100, 41.62, mosaicosDe(plano, leidos))
    expect(new Set(leidos).size).toBeGreaterThan(1)
    for (const [i, j] of [[0, 0], [r.nLat - 1, r.nLon - 1], [60, 17], [3, 110]]) {
      const [x, y] = aMosaico(r.lat0 + i * r.dLat, r.lon0 + j * r.dLon, Z_RELIEVE)
      const esperado = plano(x * 256 - 0.5, y * 256 - 0.5)
      expect(Math.abs(r.elevM[i * r.nLon + j] - esperado)).toBeLessThan(0.06)
    }
  })

  it('filas de sur a norte desde la esquina suroeste, sin pasarse de la caja', () => {
    const c = cajaAlrededor(41.62, 1.17, 6000)
    const r = rejillaTerrarium(c, 100, 41.62, mosaicosDe(plano))
    expect(r.lat0).toBe(c.sur)
    expect(r.lon0).toBe(c.oeste)
    expect(r.elevM).toHaveLength(r.nLat * r.nLon)
    expect(r.lat0 + (r.nLat - 1) * r.dLat).toBeLessThanOrEqual(c.norte + 1e-12)
    expect(r.lat0 + r.nLat * r.dLat).toBeGreaterThan(c.norte)
    expect(r.lon0 + (r.nLon - 1) * r.dLon).toBeLessThanOrEqual(c.este + 1e-12)
  })

  it('cada mosaico se lee una sola vez', () => {
    const leidos: string[] = []
    rejillaTerrarium(cajaAlrededor(41.62, 1.17, 6000), 100, 41.62, mosaicosDe(plano, leidos))
    expect(leidos.length).toBe(new Set(leidos).size)
  })

  it('sin un mosaico lo dice, con cual', () => {
    const c = cajaAlrededor(41.62, 1.17, 6000)
    const todos = mosaicosDe(plano)
    const [xe] = aMosaico(c.sur, c.este, Z_RELIEVE)
    const sinEste = (x: number, y: number) => (x === Math.floor(xe) ? null : todos(x, y))
    expect(() => rejillaTerrarium(c, 100, 41.62, sinEste)).toThrow(FaltaMosaico)
    try {
      rejillaTerrarium(c, 100, 41.62, sinEste)
    } catch (e) {
      expect((e as FaltaMosaico).mosaico.x).toBe(Math.floor(xe))
      expect((e as FaltaMosaico).mosaico.z).toBe(12)
    }
  })
})
```

- [ ] **Step 2: Comprobar que falla**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/terrarium.test.ts`
Expected: FAIL, `Failed to resolve import "./terrarium"`.

- [ ] **Step 3: Implementar**

```ts
// src/services/vuelo/terrarium.ts
// De los mosaicos Terrarium de AWS Terrain Tiles a la rejilla del motor (spec
// 2026-11-01-relieve §3). Mismas cuentas que relieve.py del prototipo, que
// saco relieve_10-10.json: bilineal entre centros de pixel y 0,1 m.
import type { Relieve } from '../nav/tipos'
import { aMosaico, type Caja, type Mosaico } from './mosaicos'

const R = 6371000
const RAD = Math.PI / 180
const LADO = 256
export const Z_RELIEVE = 12

/** RGBA de un mosaico de 256 x 256 del nivel Z_RELIEVE, o null si no se tiene. */
export type Pixeles = (x: number, y: number) => Uint8ClampedArray | null

export function elevTerrarium(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768
}

export class FaltaMosaico extends Error {
  constructor(readonly mosaico: Mosaico) {
    super(`falta el mosaic de relleu ${mosaico.z}/${mosaico.x}/${mosaico.y}`)
  }
}

/**
 * Rejilla regular en grados con paso pasoM, filas de sur a norte desde el borde
 * sur de la caja. El paso en longitud usa latRef, como el prototipo.
 */
export function rejillaTerrarium(c: Caja, pasoM: number, latRef: number, pixeles: Pixeles): Relieve {
  const dLat = pasoM / (R * RAD)
  const dLon = pasoM / (R * RAD * Math.cos(latRef * RAD))
  const nLat = Math.floor((c.norte - c.sur) / dLat) + 1
  const nLon = Math.floor((c.este - c.oeste) / dLon) + 1

  const leidos = new Map<string, Uint8ClampedArray>()
  const px = (gx: number, gy: number): number => {
    const tx = Math.floor(gx / LADO)
    const ty = Math.floor(gy / LADO)
    const k = `${tx}/${ty}`
    let d = leidos.get(k)
    if (d === undefined) {
      const p = pixeles(tx, ty)
      if (p === null) throw new FaltaMosaico({ z: Z_RELIEVE, x: tx, y: ty })
      d = p
      leidos.set(k, d)
    }
    const i = ((gy - ty * LADO) * LADO + (gx - tx * LADO)) * 4
    return elevTerrarium(d[i], d[i + 1], d[i + 2])
  }

  const elevM: number[] = new Array(nLat * nLon)
  for (let i = 0; i < nLat; i++) {
    for (let j = 0; j < nLon; j++) {
      const [x, y] = aMosaico(c.sur + i * dLat, c.oeste + j * dLon, Z_RELIEVE)
      const gx = x * LADO - 0.5
      const gy = y * LADO - 0.5
      const ix = Math.floor(gx)
      const iy = Math.floor(gy)
      const fx = gx - ix
      const fy = gy - iy
      const e = px(ix, iy) * (1 - fx) * (1 - fy) + px(ix + 1, iy) * fx * (1 - fy)
        + px(ix, iy + 1) * (1 - fx) * fy + px(ix + 1, iy + 1) * fx * fy
      elevM[i * nLon + j] = Math.round(e * 10) / 10
    }
  }
  return { lat0: c.sur, lon0: c.oeste, dLat, dLon, nLat, nLon, elevM }
}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/terrarium.test.ts`
Expected: PASS, 5 pruebas.

- [ ] **Step 5: Mutación de la guarda del mosaico que falta**

Cambiar a mano `if (p === null) throw ...` por `if (p === null) return 0` y correr la prueba: tiene que fallar «sin un mosaico lo dice». Cambiar `gx = x * LADO - 0.5` por `gx = x * LADO`: tiene que fallar «la rejilla reproduce un plano». Deshacer los dos cambios y comprobar con `git diff src/services/vuelo/terrarium.ts` que no queda nada.

- [ ] **Step 6: Commit**

```bash
git add src/services/vuelo/terrarium.ts src/services/vuelo/terrarium.test.ts
git commit -m "feat(vuelo): mosaicos Terrarium a la rejilla del relieve"
```

---

### Task 3: Las listas de mosaicos de la ortofoto y del relieve

**Files:**
- Create: `src/services/vuelo/mapasDeVuelo.ts`
- Test: `src/services/vuelo/mapasDeVuelo.test.ts`

- [ ] **Step 1: Escribir la prueba**

```ts
// src/services/vuelo/mapasDeVuelo.test.ts
import { describe, it, expect } from 'vitest'
import {
  mosaicosOrto, mosaicosRelieve, PATRON_MOSAICOS, RADIO_RELIEVE_M, URL_ORTO, URL_RELIEVE, urlDe,
} from './mapasDeVuelo'
import { aPlano } from '../nav/geo'

const T = { lat: 41.6561, lon: 1.149 }

describe('los mapas del vuelo', () => {
  it('URL de la ortofoto del Mapa base y del relieve de AWS', () => {
    expect(urlDe(URL_ORTO, { z: 12, x: 2066, y: 1526 }))
      .toBe('https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/orto/MON3857NW/12/2066/1526.png')
    expect(urlDe(URL_RELIEVE, { z: 12, x: 2060, y: 1525 }))
      .toBe('https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/2060/1525.png')
  })

  it('ortofoto de §8 en Tarrega: z12 a z15 en 15 km y z16 en 3 km', () => {
    const ms = mosaicosOrto(T.lat, T.lon)
    expect(ms).toHaveLength(1764)
    expect(ms.filter(m => m.z === 16)).toHaveLength(196)
    expect(new Set(ms.map(m => m.z))).toEqual(new Set([12, 13, 14, 15, 16]))
    expect(new Set(ms.map(m => `${m.z}/${m.x}/${m.y}`)).size).toBe(1764)
  })

  it('relieve: 20 km alrededor, 36 mosaicos z12', () => {
    const { caja, mosaicos } = mosaicosRelieve(T.lat, T.lon)
    expect(mosaicos).toHaveLength(36)
    expect(mosaicos.every(m => m.z === 12)).toBe(true)
    expect(aPlano({ lat0: T.lat, lon0: T.lon }, caja.norte, caja.este)[0]).toBeCloseTo(RADIO_RELIEVE_M, 6)
  })

  it('el patron del service worker coge los dos y nada mas', () => {
    expect(PATRON_MOSAICOS.test(urlDe(URL_ORTO, { z: 15, x: 1, y: 2 }))).toBe(true)
    expect(PATRON_MOSAICOS.test(urlDe(URL_RELIEVE, { z: 12, x: 1, y: 2 }))).toBe(true)
    expect(PATRON_MOSAICOS.test('https://api.open-meteo.com/v1/forecast')).toBe(false)
    expect(PATRON_MOSAICOS.test('https://api.github.com/repos/didachf/bpl-logbook/contents/logbook.json')).toBe(false)
    expect(PATRON_MOSAICOS.test('https://geoserveis.icgc.cat/icc_mapesmultibase/noutm/wmts/orto/GRID3857/12/1/2.jpeg')).toBe(false)
  })
})
```

- [ ] **Step 2: Comprobar que falla**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/mapasDeVuelo.test.ts`
Expected: FAIL, `Failed to resolve import "./mapasDeVuelo"`.

- [ ] **Step 3: Implementar**

```ts
// src/services/vuelo/mapasDeVuelo.ts
// Que mosaicos se bajan para volar sin cobertura (spec 10/10 §8 y §12.1) y
// donde se guardan. vite.config.ts importa de aqui el nombre y el patron de la
// cache, para que la descarga y el service worker no se separen.
import { cajaAlrededor, mosaicosDeCaja, type Caja, type Mosaico } from './mosaicos'
import { Z_RELIEVE } from './terrarium'

export const URL_ORTO = 'https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/orto/MON3857NW/{z}/{x}/{y}.png'
export const URL_RELIEVE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

export const ATRIBUCION_ORTO = "Ortofoto de Catalunya 1:5.000 de l'Institut Cartogràfic i Geològic de Catalunya (ICGC), sota una llicència CC BY 4.0"
export const ATRIBUCION_RELIEVE = 'Relleu: AWS Terrain Tiles. Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers'

export const CACHE_MOSAICOS = 'mosaicos'
/** Solo los mosaicos del Mapa base y del relieve. La API de GitHub y open-meteo, nunca. */
export const PATRON_MOSAICOS = /^https:\/\/(geoserveis\.icgc\.cat\/servei\/catalunya\/mapa-base\/wmts\/|s3\.amazonaws\.com\/elevation-tiles-prod\/terrarium\/)/

export const RADIO_ORTO_M = 15000
export const RADIO_ORTO_DETALLE_M = 3000
export const RADIO_RELIEVE_M = 20000
export const PASO_RELIEVE_M = 100

export function urlDe(plantilla: string, m: Mosaico): string {
  return plantilla.replace('{z}', String(m.z)).replace('{x}', String(m.x)).replace('{y}', String(m.y))
}

export function mosaicosOrto(lat: number, lon: number): Mosaico[] {
  const lejos = cajaAlrededor(lat, lon, RADIO_ORTO_M)
  const cerca = cajaAlrededor(lat, lon, RADIO_ORTO_DETALLE_M)
  return [12, 13, 14, 15].flatMap(z => mosaicosDeCaja(lejos, z)).concat(mosaicosDeCaja(cerca, 16))
}

export function mosaicosRelieve(lat: number, lon: number): { caja: Caja; mosaicos: Mosaico[] } {
  const caja = cajaAlrededor(lat, lon, RADIO_RELIEVE_M)
  return { caja, mosaicos: mosaicosDeCaja(caja, Z_RELIEVE, 1) }
}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/mapasDeVuelo.test.ts`
Expected: PASS, 4 pruebas.

- [ ] **Step 5: Commit**

```bash
git add src/services/vuelo/mapasDeVuelo.ts src/services/vuelo/mapasDeVuelo.test.ts
git commit -m "feat(vuelo): mosaicos de la ortofoto y del relieve para volar sin cobertura"
```

---

### Task 4: La petición de open-meteo de §5.1

**Files:**
- Create: `src/services/vuelo/prevision.ts`
- Test: `src/services/vuelo/prevision.test.ts`

- [ ] **Step 1: Escribir la prueba**

```ts
// src/services/vuelo/prevision.test.ts
import { describe, it, expect } from 'vitest'
import { CuotaAgotada, cuerpoPrevision, pedirPrevision, pesoLlamadas, variablesPrevision } from './prevision'
import { MODELOS_NAV, parsePrevision } from '../nav/perfil'
import { cargar1010 } from '../nav/prueba-1010'

describe('la peticion de la pantalla de vuelo', () => {
  it('pide las 42 variables de §5.1, sin repetir', () => {
    const v = variablesPrevision()
    expect(v).toHaveLength(42)
    expect(new Set(v).size).toBe(42)
    expect(v).toContain('wind_direction_20m')
    expect(v).toContain('geopotential_height_700hPa')
  })

  it('pesa 29,4 llamadas: esta prueba salta si alguien anade variables o modelos', () => {
    expect(pesoLlamadas(variablesPrevision().length, MODELOS_NAV.length)).toBeCloseTo(29.4, 9)
  })

  it('la regla de la cuota: minimo 1 por punto y lineal en los puntos', () => {
    expect(pesoLlamadas(5, 1)).toBe(1)
    expect(pesoLlamadas(42, 7, 91)).toBeCloseTo(2675.4, 6)
  })

  it('una hora antes de ahora y 24 h por delante, en UTC', () => {
    const b = cuerpoPrevision(41.65612, 1.14903, Date.parse('2026-11-02T06:34:10Z'))
    expect(b.start_hour).toBe('2026-11-02T05:00')
    expect(b.end_hour).toBe('2026-11-03T06:00')
    expect(b.models.split(',')).toEqual([...MODELOS_NAV])
    expect(b.timezone).toBe('UTC')
    expect(b.wind_speed_unit).toBe('ms')
    expect(b.latitude).toBe('41.6561')
  })

  it('POST con cuerpo de formulario, y devuelve la respuesta tal cual', async () => {
    let visto: RequestInit | undefined
    const f = (async (_u: string | URL | Request, init?: RequestInit) => {
      visto = init
      return new Response(JSON.stringify(cargar1010()))
    }) as typeof fetch
    const r = await pedirPrevision(41.65, 1.14, Date.parse('2026-11-02T06:00Z'), f)
    expect(visto?.method).toBe('POST')
    expect(new URLSearchParams(visto?.body as string).get('models')).toBe(MODELOS_NAV.join(','))
    expect(parsePrevision(r).modelos).toHaveLength(7)
  })

  it('429 es la cuota, y otro error dice el codigo', async () => {
    const f = (s: number) => (async () => new Response('', { status: s })) as typeof fetch
    await expect(pedirPrevision(41, 1, 0, f(429))).rejects.toBeInstanceOf(CuotaAgotada)
    await expect(pedirPrevision(41, 1, 0, f(500))).rejects.toThrow('500')
  })
})
```

- [ ] **Step 2: Comprobar que falla**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/prevision.test.ts`
Expected: FAIL, `Failed to resolve import "./prevision"`.

- [ ] **Step 3: Implementar**

```ts
// src/services/vuelo/prevision.ts
// La peticion de open-meteo de la pantalla de vuelo (spec 10/10 §5.1 y §12.1):
// siete modelos, 42 variables y el dia entero de una vez, porque por debajo de
// 14 dias el tiempo no cuenta en la cuota.
import { ALTURAS_AGL_M, MODELOS_NAV, PRESIONES_HPA, type RespuestaOpenMeteo } from '../nav/perfil'

const URL_API = 'https://api.open-meteo.com/v1/forecast'
export const HORAS_ADELANTE = 24

export function variablesPrevision(): string[] {
  const v: string[] = []
  for (const a of ALTURAS_AGL_M) v.push(`wind_speed_${a}m`, `wind_direction_${a}m`)
  for (const p of PRESIONES_HPA) v.push(`wind_speed_${p}hPa`, `wind_direction_${p}hPa`, `geopotential_height_${p}hPa`)
  return v
}

/** Peso en llamadas, formula del servidor de open-meteo (spec 10/10 §12.1), por debajo de 14 dias. */
export function pesoLlamadas(variables: number, modelos: number, puntos = 1): number {
  return puntos * Math.max(1, variables * modelos / 10)
}

function horaUtc(ms: number): string {
  return `${new Date(ms).toISOString().slice(0, 13)}:00`
}

export function cuerpoPrevision(lat: number, lon: number, ahora: number): Record<string, string> {
  return {
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: variablesPrevision().join(','),
    models: MODELOS_NAV.join(','),
    timezone: 'UTC',
    wind_speed_unit: 'ms',
    start_hour: horaUtc(ahora - 3_600_000),
    end_hour: horaUtc(ahora + HORAS_ADELANTE * 3_600_000),
  }
}

export class CuotaAgotada extends Error {}

/** POST y no GET: 42 variables por siete modelos no caben en una URL. */
export async function pedirPrevision(
  lat: number, lon: number, ahora: number, f: typeof fetch = fetch,
): Promise<RespuestaOpenMeteo> {
  const res = await f(URL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(cuerpoPrevision(lat, lon, ahora)).toString(),
  })
  if (res.status === 429) throw new CuotaAgotada("open-meteo ha rebutjat la petició per quota. Torna-ho a provar d'aquí a un minut.")
  if (!res.ok) throw new Error(`open-meteo ha respost ${res.status}`)
  return await res.json() as RespuestaOpenMeteo
}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/prevision.test.ts`
Expected: PASS, 6 pruebas.

- [ ] **Step 5: Commit**

```bash
git add src/services/vuelo/prevision.ts src/services/vuelo/prevision.test.ts
git commit -m "feat(vuelo): peticion de siete modelos para el dia y su peso en la cuota"
```

---

### Task 5: La previsión guardada y cuándo se pide otra

**Files:**
- Create: `src/services/vuelo/previsionGuardada.ts`
- Test: `src/services/vuelo/previsionGuardada.test.ts`

- [ ] **Step 1: Escribir la prueba**

```ts
// src/services/vuelo/previsionGuardada.test.ts
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  borrarPrevision, distanciaKm, leerPrevision, obtenerPrevision, REFRESCO_MIN, type PrevisionGuardada,
} from './previsionGuardada'
import { CuotaAgotada } from './prevision'
import { cargar1010 } from '../nav/prueba-1010'
import type { RespuestaOpenMeteo } from '../nav/perfil'

const T0 = Date.parse('2026-11-02T06:00Z')
const MIN = 60_000

function pedidor() {
  const llamadas: number[] = []
  const pedir = async (_lat: number, _lon: number, ahora: number): Promise<RespuestaOpenMeteo> => {
    llamadas.push(ahora)
    return cargar1010()
  }
  return { llamadas, pedir }
}

describe('la prevision guardada', () => {
  beforeEach(async () => { await borrarPrevision() })

  it('sin nada guardado pide, guarda y la da como nueva', async () => {
    const { llamadas, pedir } = pedidor()
    const o = await obtenerPrevision(41.65, 1.14, T0, pedir)
    expect(llamadas).toEqual([T0])
    expect(o.nueva).toBe(true)
    expect(o.error).toBe(null)
    expect((await leerPrevision())?.pedidaEn).toBe(T0)
  })

  it('antes de 30 min no vuelve a pedir', async () => {
    const { llamadas, pedir } = pedidor()
    await obtenerPrevision(41.65, 1.14, T0, pedir)
    const o = await obtenerPrevision(41.66, 1.15, T0 + (REFRESCO_MIN - 1) * MIN, pedir)
    expect(llamadas).toHaveLength(1)
    expect(o.nueva).toBe(false)
    expect(o.guardada?.pedidaEn).toBe(T0)
  })

  it('a los 30 min pide otra en la posicion de ahora', async () => {
    const { llamadas, pedir } = pedidor()
    await obtenerPrevision(41.65, 1.14, T0, pedir)
    const o = await obtenerPrevision(41.70, 1.20, T0 + REFRESCO_MIN * MIN, pedir)
    expect(llamadas).toHaveLength(2)
    expect(o.guardada?.lat).toBe(41.70)
  })

  it('si falla al refrescar, la guardada y el error de la cuota', async () => {
    const { pedir } = pedidor()
    await obtenerPrevision(41.65, 1.14, T0, pedir)
    const falla = async (): Promise<RespuestaOpenMeteo> => { throw new CuotaAgotada('quota') }
    const o = await obtenerPrevision(41.65, 1.14, T0 + 40 * MIN, falla)
    expect(o.guardada?.pedidaEn).toBe(T0)
    expect(o.nueva).toBe(false)
    expect(o.error).toBe('quota')
  })

  it('sin red y sin nada guardado lo dice', async () => {
    const sinRed = async (): Promise<RespuestaOpenMeteo> => { throw new TypeError('Failed to fetch') }
    const o = await obtenerPrevision(41.65, 1.14, T0, sinRed)
    expect(o.guardada).toBe(null)
    expect(o.error).toBe('Sense connexió amb open-meteo.')
  })

  it('a cuantos km se pidio', () => {
    const p: PrevisionGuardada = { respuesta: cargar1010(), lat: 41.65, lon: 1.14, pedidaEn: T0 }
    expect(distanciaKm(p, 41.65 + 1000 / (6371000 * Math.PI / 180), 1.14)).toBeCloseTo(1, 6)
  })
})
```

- [ ] **Step 2: Comprobar que falla**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/previsionGuardada.test.ts`
Expected: FAIL, `Failed to resolve import "./previsionGuardada"`.

- [ ] **Step 3: Implementar**

```ts
// src/services/vuelo/previsionGuardada.ts
// La ultima prevision de la pantalla de vuelo, en IndexedDB, y cuando se puede
// pedir otra: como mucho cada 30 min, en la posicion de ese momento (spec 10/10
// §5.5). Sin red, la guardada con el error, nunca nada inventado.
import { del, get, set } from 'idb-keyval'
import type { RespuestaOpenMeteo } from '../nav/perfil'
import { aPlano } from '../nav/geo'
import { CuotaAgotada, pedirPrevision } from './prevision'

const CLAVE = 'vol:prevision'
export const REFRESCO_MIN = 30

export interface PrevisionGuardada { respuesta: RespuestaOpenMeteo; lat: number; lon: number; pedidaEn: number }
export interface Obtenida { guardada: PrevisionGuardada | null; nueva: boolean; error: string | null }

export async function leerPrevision(): Promise<PrevisionGuardada | null> {
  try {
    return (await get<PrevisionGuardada>(CLAVE)) ?? null
  } catch {
    return null
  }
}

export async function borrarPrevision(): Promise<void> {
  await del(CLAVE)
}

function puedePedir(p: PrevisionGuardada | null, ahora: number): boolean {
  return p === null || ahora - p.pedidaEn >= REFRESCO_MIN * 60_000
}

/** A cuantos km de aqui se pidio. La pantalla lo dice (spec 10/10 §5.5). */
export function distanciaKm(p: PrevisionGuardada, lat: number, lon: number): number {
  const [x, y] = aPlano({ lat0: p.lat, lon0: p.lon }, lat, lon)
  return Math.hypot(x, y) / 1000
}

export async function obtenerPrevision(
  lat: number, lon: number, ahora: number, pedir = pedirPrevision,
): Promise<Obtenida> {
  const guardada = await leerPrevision()
  if (!puedePedir(guardada, ahora)) return { guardada, nueva: false, error: null }
  try {
    const p: PrevisionGuardada = { respuesta: await pedir(lat, lon, ahora), lat, lon, pedidaEn: ahora }
    await set(CLAVE, p)
    return { guardada: p, nueva: true, error: null }
  } catch (e) {
    const deOpenMeteo = e instanceof CuotaAgotada || (e instanceof Error && e.message.startsWith('open-meteo'))
    return { guardada, nueva: false, error: deOpenMeteo ? (e as Error).message : 'Sense connexió amb open-meteo.' }
  }
}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/previsionGuardada.test.ts`
Expected: PASS, 6 pruebas.

- [ ] **Step 5: Mutación**

Cambiar `>= REFRESCO_MIN * 60_000` por `> REFRESCO_MIN * 60_000`: tiene que fallar «a los 30 min pide otra». Deshacer.

- [ ] **Step 6: Commit**

```bash
git add src/services/vuelo/previsionGuardada.ts src/services/vuelo/previsionGuardada.test.ts
git commit -m "feat(vuelo): prevision guardada con refresco cada 30 min"
```

---

### Task 6: Bajar mosaicos con pocas peticiones a la vez

**Files:**
- Create: `src/services/vuelo/bajarMosaicos.ts`
- Test: `src/services/vuelo/bajarMosaicos.test.ts`

- [ ] **Step 1: Escribir la prueba**

```ts
// src/services/vuelo/bajarMosaicos.test.ts
import { describe, it, expect } from 'vitest'
import { A_LA_VEZ, bajarMosaicos, type Almacen } from './bajarMosaicos'

function almacenEnMemoria(ya: string[] = []) {
  const guardados = new Map<string, string>(ya.map(u => [u, 'antes']))
  const a: Almacen = {
    tiene: async u => guardados.has(u),
    guardar: async (u, r) => { guardados.set(u, await r.text()) },
  }
  return { a, guardados }
}

const urls = (n: number) => Array.from({ length: n }, (_, i) => `https://x/${i}.png`)
const ok = (async (u: string | URL | Request) => new Response(`cuerpo ${String(u)}`)) as typeof fetch

describe('bajar mosaicos', () => {
  it('baja todos, los guarda y suma los bytes', async () => {
    const { a, guardados } = almacenEnMemoria()
    const p = await bajarMosaicos(urls(10), a, { fetch: ok })
    expect(p).toMatchObject({ total: 10, hechos: 10, bajados: 10, yaEstaban: 0, fallidos: 0 })
    expect(guardados.get('https://x/3.png')).toBe('cuerpo https://x/3.png')
    expect(p.bytes).toBe(urls(10).reduce((s, u) => s + `cuerpo ${u}`.length, 0))
  })

  it('no vuelve a pedir lo que ya esta', async () => {
    const { a } = almacenEnMemoria(['https://x/1.png', 'https://x/2.png'])
    const pedidos: string[] = []
    const f = (async (u: string | URL | Request) => { pedidos.push(String(u)); return new Response('x') }) as typeof fetch
    const p = await bajarMosaicos(urls(4), a, { fetch: f })
    expect(pedidos).toEqual(['https://x/0.png', 'https://x/3.png'])
    expect(p).toMatchObject({ bajados: 2, yaEstaban: 2, hechos: 4 })
  })

  it('un 404 o un fallo de red cuentan como fallidos y no se guardan', async () => {
    const { a, guardados } = almacenEnMemoria()
    const f = (async (u: string | URL | Request) => {
      if (String(u).endsWith('1.png')) return new Response('', { status: 404 })
      if (String(u).endsWith('2.png')) throw new TypeError('Failed to fetch')
      return new Response('x')
    }) as typeof fetch
    const p = await bajarMosaicos(urls(4), a, { fetch: f })
    expect(p).toMatchObject({ bajados: 2, fallidos: 2, hechos: 4 })
    expect(guardados.has('https://x/1.png')).toBe(false)
  })

  it(`nunca mas de ${A_LA_VEZ} a la vez`, async () => {
    const { a } = almacenEnMemoria()
    let enCurso = 0
    let maximo = 0
    const f = (async () => {
      enCurso++
      maximo = Math.max(maximo, enCurso)
      await new Promise(r => setTimeout(r, 2))
      enCurso--
      return new Response('x')
    }) as typeof fetch
    await bajarMosaicos(urls(30), a, { fetch: f })
    expect(maximo).toBe(A_LA_VEZ)
  })

  it('al cancelar no pide mas', async () => {
    const { a } = almacenEnMemoria()
    const ctl = new AbortController()
    const pedidos: string[] = []
    const f = (async (u: string | URL | Request) => {
      pedidos.push(String(u))
      if (pedidos.length === 5) ctl.abort()
      return new Response('x')
    }) as typeof fetch
    await bajarMosaicos(urls(100), a, { fetch: f, senal: ctl.signal })
    expect(pedidos.length).toBeLessThanOrEqual(5 + A_LA_VEZ)
  })

  it('avisa del progreso hasta el total', async () => {
    const { a } = almacenEnMemoria()
    const vistos: number[] = []
    await bajarMosaicos(urls(6), a, { fetch: ok, alProgreso: p => vistos.push(p.hechos) })
    expect(vistos).toEqual([1, 2, 3, 4, 5, 6])
  })
})
```

- [ ] **Step 2: Comprobar que falla**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/bajarMosaicos.test.ts`
Expected: FAIL, `Failed to resolve import "./bajarMosaicos"`.

- [ ] **Step 3: Implementar**

```ts
// src/services/vuelo/bajarMosaicos.ts
// Baja una lista de mosaicos a un almacen antes de despegar (spec 10/10 §8):
// sin repetir los que ya estan y con pocas peticiones a la vez, lo que pide un
// mapa al moverlo. El almacen es la Cache API en el navegador y un Map en las pruebas.

export interface Almacen {
  tiene(url: string): Promise<boolean>
  guardar(url: string, r: Response): Promise<void>
}

export interface Progreso { total: number; hechos: number; bajados: number; yaEstaban: number; fallidos: number; bytes: number }

export interface OpcionesBajar {
  fetch?: typeof fetch
  alProgreso?: (p: Progreso) => void
  senal?: AbortSignal
  aLaVez?: number
}

export const A_LA_VEZ = 4

export async function bajarMosaicos(urls: string[], almacen: Almacen, o: OpcionesBajar = {}): Promise<Progreso> {
  const f = o.fetch ?? fetch
  const p: Progreso = { total: urls.length, hechos: 0, bajados: 0, yaEstaban: 0, fallidos: 0, bytes: 0 }
  let siguiente = 0

  const uno = async (url: string): Promise<void> => {
    if (await almacen.tiene(url)) {
      p.yaEstaban++
      return
    }
    try {
      const r = await f(url, { signal: o.senal })
      if (!r.ok) {
        p.fallidos++
        return
      }
      const cuerpo = await r.blob()
      await almacen.guardar(url, new Response(cuerpo, { status: r.status, headers: r.headers }))
      p.bajados++
      p.bytes += cuerpo.size
    } catch {
      p.fallidos++
    }
  }

  const hilo = async (): Promise<void> => {
    while (siguiente < urls.length && o.senal?.aborted !== true) {
      await uno(urls[siguiente++])
      p.hechos++
      o.alProgreso?.({ ...p })
    }
  }

  await Promise.all(Array.from({ length: Math.min(o.aLaVez ?? A_LA_VEZ, urls.length) }, hilo))
  return p
}
```

- [ ] **Step 4: Comprobar que pasa**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/bajarMosaicos.test.ts`
Expected: PASS, 6 pruebas.

- [ ] **Step 5: Commit**

```bash
git add src/services/vuelo/bajarMosaicos.ts src/services/vuelo/bajarMosaicos.test.ts
git commit -m "feat(vuelo): bajar mosaicos con cuatro peticiones a la vez como mucho"
```

---

### Task 7: El cliente del worker, donde gana el último pedido

**Files:**
- Create: `src/services/vuelo/calculador.ts`
- Test: `src/services/vuelo/calculador.test.ts`

- [ ] **Step 1: Escribir la prueba**

```ts
// src/services/vuelo/calculador.test.ts
import { describe, it, expect } from 'vitest'
import { crearCalculador, type Hilo, type Pedido, type Respuesta } from './calculador'
import type { EntradaNav } from '../nav/motor'
import type { ResultadoNavegacion } from '../nav/tipos'

function hiloFalso() {
  const enviados: Pedido[] = []
  let terminado = false
  const h: Hilo = {
    onmessage: null,
    postMessage: p => { enviados.push(p) },
    terminate: () => { terminado = true },
  }
  const responder = (r: Respuesta) => h.onmessage?.({ data: r })
  return { h, enviados, responder, terminado: () => terminado }
}

const entrada = {} as EntradaNav
const res = (n: string) => ({ calculadoA: n }) as ResultadoNavegacion

describe('el calculador', () => {
  it('manda el pedido y devuelve el resultado con lo que ha tardado', async () => {
    const { h, enviados, responder } = hiloFalso()
    const c = crearCalculador(h)
    const p = c.calcular(entrada)
    expect(enviados).toEqual([{ id: 1, entrada }])
    responder({ id: 1, resultado: res('a'), ms: 230 })
    expect(await p).toEqual({ resultado: res('a'), ms: 230 })
  })

  it('un pedido nuevo deja el anterior en null y tira su respuesta', async () => {
    const { h, responder } = hiloFalso()
    const c = crearCalculador(h)
    const p1 = c.calcular(entrada)
    const p2 = c.calcular(entrada)
    expect(await p1).toBe(null)
    responder({ id: 1, resultado: res('viejo'), ms: 1 })
    responder({ id: 2, resultado: res('nuevo'), ms: 2 })
    expect((await p2)?.resultado.calculadoA).toBe('nuevo')
  })

  it('un error del motor llega como error', async () => {
    const { h, responder } = hiloFalso()
    const c = crearCalculador(h)
    const p = c.calcular(entrada)
    responder({ id: 1, error: 'peta', ms: 3 })
    await expect(p).rejects.toThrow('peta')
  })

  it('cerrar deja lo pendiente en null y para el hilo', async () => {
    const { h, terminado } = hiloFalso()
    const c = crearCalculador(h)
    const p = c.calcular(entrada)
    c.cerrar()
    expect(await p).toBe(null)
    expect(terminado()).toBe(true)
  })
})
```

- [ ] **Step 2: Comprobar que falla**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/calculador.test.ts`
Expected: FAIL, `Failed to resolve import "./calculador"`.

- [ ] **Step 3: Implementar el cliente**

```ts
// src/services/vuelo/calculador.ts
// El motor de navegacion corre en un Web Worker para no parar la pantalla. Solo
// vale el ultimo pedido: si llega uno nuevo, los anteriores se resuelven con
// null y su respuesta se tira (spec 10/10 §10).
import type { EntradaNav } from '../nav/motor'
import type { ResultadoNavegacion } from '../nav/tipos'

export interface Pedido { id: number; entrada: EntradaNav }
export type Respuesta =
  | { id: number; resultado: ResultadoNavegacion; ms: number }
  | { id: number; error: string; ms: number }

/** Lo que hace falta de un Worker, para poder probarlo sin navegador. */
export interface Hilo {
  onmessage: ((e: { data: Respuesta }) => void) | null
  postMessage(p: Pedido): void
  terminate(): void
}

export interface Calculo { resultado: ResultadoNavegacion; ms: number }

export interface Calculador {
  calcular(entrada: EntradaNav): Promise<Calculo | null>
  cerrar(): void
}

export function crearCalculador(hilo: Hilo): Calculador {
  let ultimo = 0
  const pendientes = new Map<number, { ok: (c: Calculo | null) => void; ko: (e: Error) => void }>()
  const soltar = () => {
    for (const p of pendientes.values()) p.ok(null)
    pendientes.clear()
  }
  hilo.onmessage = ({ data }) => {
    const p = pendientes.get(data.id)
    if (p === undefined) return
    pendientes.delete(data.id)
    if ('error' in data) p.ko(new Error(data.error))
    else p.ok({ resultado: data.resultado, ms: data.ms })
  }
  return {
    calcular(entrada) {
      soltar()
      const id = ++ultimo
      return new Promise((ok, ko) => {
        pendientes.set(id, { ok, ko })
        hilo.postMessage({ id, entrada })
      })
    },
    cerrar() {
      soltar()
      hilo.terminate()
    },
  }
}

export function crearCalculadorNavegador(): Calculador {
  const w = new Worker(new URL('./nav.worker.ts', import.meta.url), { type: 'module' })
  return crearCalculador(w as unknown as Hilo)
}
```

- [ ] **Step 4: El worker**

```ts
// src/services/vuelo/nav.worker.ts
// El motor de navegacion fuera del hilo de la pantalla. Mide lo que tarda,
// para saber en la tablet si cabe en 1 s (spec 10/10 §12.1).
import { navegar } from '../nav/motor'
import type { Pedido, Respuesta } from './calculador'

const ambito = self as unknown as {
  onmessage: ((e: MessageEvent<Pedido>) => void) | null
  postMessage(r: Respuesta): void
}

ambito.onmessage = ({ data: { id, entrada } }) => {
  const t0 = performance.now()
  try {
    const resultado = navegar(entrada)
    ambito.postMessage({ id, resultado, ms: performance.now() - t0 })
  } catch (e) {
    ambito.postMessage({ id, error: e instanceof Error ? e.message : String(e), ms: performance.now() - t0 })
  }
}
```

- [ ] **Step 5: Comprobar que pasa y que compila**

Run: `TZ=Europe/Madrid npx vitest run src/services/vuelo/calculador.test.ts && npx tsc -b`
Expected: PASS, 4 pruebas, y `tsc` sin salida.

- [ ] **Step 6: Commit**

```bash
git add src/services/vuelo/calculador.ts src/services/vuelo/calculador.test.ts src/services/vuelo/nav.worker.ts
git commit -m "feat(vuelo): motor en un Web Worker, gana el ultimo pedido"
```

---

### Task 8: Lo del navegador: Cache API, PNG y la preparación del vuelo

**Files:**
- Create: `src/services/vuelo/navegador.ts`
- Create: `src/services/vuelo/preparar.ts`

Sin prueba en node: no hay Cache API ni `createImageBitmap`. Se comprueba en Chromium en la tarea 10.

- [ ] **Step 1: `navegador.ts`**

```ts
// src/services/vuelo/navegador.ts
// Lo que solo existe en el navegador: la cache de mosaicos y un PNG a pixeles.
// Se comprueba en Chromium (plan 2026-11-01-datos-de-vuelo, tarea 10).
import type { Almacen } from './bajarMosaicos'
import { CACHE_MOSAICOS } from './mapasDeVuelo'

// AWS manda `Vary: Origin`: sin ignoreVary, una peticion sin Origin no encuentra lo guardado.
const SIN_VARY: CacheQueryOptions = { ignoreVary: true }

export async function almacenCache(): Promise<Almacen> {
  const c = await caches.open(CACHE_MOSAICOS)
  return {
    tiene: async url => (await c.match(url, SIN_VARY)) !== undefined,
    guardar: (url, r) => c.put(url, r),
  }
}

export async function leerDeCache(url: string): Promise<Blob | null> {
  const r = await (await caches.open(CACHE_MOSAICOS)).match(url, SIN_VARY)
  return r === undefined ? null : await r.blob()
}

export async function vaciarMosaicos(): Promise<boolean> {
  return caches.delete(CACHE_MOSAICOS)
}

/** RGBA sin gestion de color ni alfa premultiplicado: un pixel Terrarium es un numero, no un color. */
export async function pixelesDePng(b: Blob): Promise<Uint8ClampedArray> {
  const bmp = await createImageBitmap(b, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
  const lienzo = new OffscreenCanvas(bmp.width, bmp.height)
  const ctx = lienzo.getContext('2d', { willReadFrequently: true })
  if (ctx === null) throw new Error('sense context 2d per llegir el relleu')
  ctx.drawImage(bmp, 0, 0)
  bmp.close()
  return ctx.getImageData(0, 0, lienzo.width, lienzo.height).data
}
```

- [ ] **Step 2: `preparar.ts`**

```ts
// src/services/vuelo/preparar.ts
// Lo que se baja al pulsar «Començar vol», antes de despegar (spec 10/10 §8):
// prevision, relieve y ortofoto, de lo mas pequeno a lo mas grande. Lo que falle
// queda en avisos, no para el vuelo.
import type { Relieve } from '../nav/tipos'
import { bajarMosaicos, type Progreso } from './bajarMosaicos'
import { almacenCache, leerDeCache, pixelesDePng } from './navegador'
import { mosaicosOrto, mosaicosRelieve, PASO_RELIEVE_M, URL_ORTO, URL_RELIEVE, urlDe } from './mapasDeVuelo'
import { obtenerPrevision, type Obtenida } from './previsionGuardada'
import { FaltaMosaico, rejillaTerrarium } from './terrarium'

export type Fase = 'previsio' | 'relleu' | 'ortofoto'

export interface Preparado { prevision: Obtenida; relieve: Relieve | null; orto: Progreso; avisos: string[] }

/** El relieve de 20 km alrededor del punto, de la cache y bajando lo que falte. Sin red sirve lo guardado. */
export async function relieveDeZona(
  lat: number, lon: number, alProgreso?: (p: Progreso) => void, senal?: AbortSignal,
): Promise<Relieve> {
  const { caja, mosaicos } = mosaicosRelieve(lat, lon)
  await bajarMosaicos(mosaicos.map(m => urlDe(URL_RELIEVE, m)), await almacenCache(), { alProgreso, senal })
  const pix = new Map<string, Uint8ClampedArray>()
  for (const m of mosaicos) {
    const b = await leerDeCache(urlDe(URL_RELIEVE, m))
    if (b !== null) pix.set(`${m.x}/${m.y}`, await pixelesDePng(b))
  }
  return rejillaTerrarium(caja, PASO_RELIEVE_M, lat, (x, y) => pix.get(`${x}/${y}`) ?? null)
}

export async function prepararVol(
  lat: number, lon: number, ahora: number,
  alProgreso?: (f: Fase, p: Progreso | null) => void, senal?: AbortSignal,
): Promise<Preparado> {
  const avisos: string[] = []
  alProgreso?.('previsio', null)
  const prevision = await obtenerPrevision(lat, lon, ahora)
  if (prevision.error !== null) avisos.push(prevision.error)

  let relieve: Relieve | null = null
  try {
    relieve = await relieveDeZona(lat, lon, p => alProgreso?.('relleu', p), senal)
  } catch (e) {
    if (!(e instanceof FaltaMosaico)) throw e
    avisos.push(`Sense relleu: ${e.message}.`)
  }

  const urls = mosaicosOrto(lat, lon).map(m => urlDe(URL_ORTO, m))
  const orto = await bajarMosaicos(urls, await almacenCache(), { alProgreso: p => alProgreso?.('ortofoto', p), senal })
  if (orto.fallidos > 0) avisos.push(`No s'han pogut baixar ${orto.fallidos} de ${orto.total} trossos de l'ortofoto.`)
  return { prevision, relieve, orto, avisos }
}
```

- [ ] **Step 3: Compilar**

Run: `npx tsc -b`
Expected: sin salida.

- [ ] **Step 4: Commit**

```bash
git add src/services/vuelo/navegador.ts src/services/vuelo/preparar.ts
git commit -m "feat(vuelo): cache de mosaicos, PNG a pixeles y preparar el vuelo"
```

---

### Task 9: El service worker sirve los mosaicos guardados

**Files:**
- Modify: `vite.config.ts` (bloque `workbox` y raíz de la config)

- [ ] **Step 1: Ruta de los mosaicos y workers en ES**

En `vite.config.ts`, importar arriba:

```ts
import { CACHE_MOSAICOS, PATRON_MOSAICOS } from './src/services/vuelo/mapasDeVuelo'
```

Sustituir el comentario y añadir la ruta dentro de `workbox`:

```ts
        // Ninguna ruta para la API de GitHub, a proposito: servir un
        // logbook.json viejo de la cache haria creer que la copia esta al dia
        // cuando no lo esta, y podria disparar un conflicto falso.
        // La unica ruta es la de los mosaicos de la ortofoto y del relieve,
        // primero de la cache, que es donde los deja bajarMosaicos antes del
        // vuelo (spec 10/10 §8). Mismo nombre de cache que la descarga.
        runtimeCaching: [{
          urlPattern: PATRON_MOSAICOS,
          handler: 'CacheFirst',
          options: {
            cacheName: CACHE_MOSAICOS,
            matchOptions: { ignoreVary: true },
            cacheableResponse: { statuses: [200] },
          },
        }],
        cleanupOutdatedCaches: true,
```

Y en la raíz de `defineConfig`, junto a `plugins`:

```ts
  // El motor corre en un worker de modulo (src/services/vuelo/nav.worker.ts).
  worker: { format: 'es' },
```

- [ ] **Step 2: Compilar y mirar el service worker generado**

Run: `npm run build 2>&1 | tail -5 && grep -c "mosaicos" dist/sw.js && grep -o "elevation-tiles-prod[^,]*" dist/sw.js | head -2 && ls dist/assets | grep -i worker`
Expected: build sin errores, al menos una aparición de `mosaicos` en `dist/sw.js`, el patrón de AWS dentro, y un fichero `nav.worker-*.js` en `dist/assets`.

- [ ] **Step 3: Todas las pruebas**

Run: `npm test 2>&1 | tail -3`
Expected: todo en verde, las de `main` más las 37 nuevas.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts
git commit -m "feat(pwa): el service worker sirve los mosaicos guardados para volar sin cobertura"
```

---

### Task 10: Comprobación en Chromium con datos reales

Sin cambios de código salvo que algo falle. Ver la memoria de Playwright (`probar-la-app-en-webkit`): Chromium, `install-browser chrome-for-testing` si hace falta, y cuidado con el service worker viejo tras un build.

- [ ] **Step 1: El relieve del 10/10 en el navegador es el del prototipo**

Arrancar `npm run dev` en segundo plano y abrir `http://localhost:5173/bpl-app/` en Chromium. Con `eval`, importar los módulos de Vite y construir la caja del prototipo (`relieve.py`: de (−5 000, −3 000) a (15 000, 11 500) m desde el despegue de Tàrrega, paso 100 m):

```js
async () => {
  const { rejillaTerrarium } = await import('/bpl-app/src/services/vuelo/terrarium.ts')
  const { mosaicosDeCaja } = await import('/bpl-app/src/services/vuelo/mosaicos.ts')
  const { bajarMosaicos } = await import('/bpl-app/src/services/vuelo/bajarMosaicos.ts')
  const { almacenCache, leerDeCache, pixelesDePng } = await import('/bpl-app/src/services/vuelo/navegador.ts')
  const { URL_RELIEVE, urlDe } = await import('/bpl-app/src/services/vuelo/mapasDeVuelo.ts')
  const { aGeo } = await import('/bpl-app/src/services/nav/geo.ts')
  const p = { lat0: 41.6561, lon0: 1.149 }
  const so = aGeo(p, -3000, -5000), ne = aGeo(p, 11500, 15000)
  const caja = { sur: so.lat, oeste: so.lon, norte: ne.lat, este: ne.lon }
  const ms = mosaicosDeCaja(caja, 12, 1)
  const prog = await bajarMosaicos(ms.map(m => urlDe(URL_RELIEVE, m)), await almacenCache())
  const pix = new Map()
  for (const m of ms) pix.set(`${m.x}/${m.y}`, await pixelesDePng(await leerDeCache(urlDe(URL_RELIEVE, m))))
  const r = rejillaTerrarium(caja, 100, p.lat0, (x, y) => pix.get(`${x}/${y}`) ?? null)
  const ref = await (await fetch('/bpl-app/docs/prototipos/2026-10-10-vuelo/relieve_10-10.json')).json()
  let max = 0
  for (let i = 0; i < ref.elevM.length; i++) max = Math.max(max, Math.abs(ref.elevM[i] - r.elevM[i]))
  return { prog, n: [r.nLat, r.nLon], ref: [ref.nLat, ref.nLon], maxDif: max }
}
```

Expected: `n` igual a `ref` (145 y 201), `maxDif` ≤ 0,1 m (el redondeo a 0,1 m de Python y de JS puede discrepar en una décima). Si es mayor, el PNG llega con conversión de color: mirar `pixelesDePng` antes de seguir.

Si Vite no sirve `/bpl-app/docs/...`, copiar el JSON a `public/` sólo para esta comprobación, sin commit, y borrarlo después.

- [ ] **Step 2: El worker da lo mismo que el motor en el hilo principal, y cuánto tarda**

```js
async () => {
  const { crearCalculadorNavegador } = await import('/bpl-app/src/services/vuelo/calculador.ts')
  const { navegar } = await import('/bpl-app/src/services/nav/motor.ts')
  const { parsePrevision } = await import('/bpl-app/src/services/nav/perfil.ts')
  const { aGeo } = await import('/bpl-app/src/services/nav/geo.ts')
  const { AJUSTES_POR_DEFECTO } = await import('/bpl-app/src/services/nav/tipos.ts')
  const om = await (await fetch('/bpl-app/docs/prototipos/2026-10-10-vuelo/openmeteo_10-10.json')).json()
  const relieve = await (await fetch('/bpl-app/docs/prototipos/2026-10-10-vuelo/relieve_10-10.json')).json()
  const d = { lat0: 41.6561, lon0: 1.149 }
  const ahora = Date.parse('2026-10-10T06:34Z')
  const pos = aGeo(d, 3460.8, 2190.8)
  const entrada = {
    prevision: parsePrevision(om),
    traza: [{ t: ahora, lat: pos.lat, lon: pos.lon, altM: 1540 * 0.3048 }],
    ajustes: { ...AJUSTES_POR_DEFECTO, altMinM: 1500 * 0.3048, altMaxM: 3750 * 0.3048 },
    punto: aGeo(d, 3964.2, 2880.1), ahora, incluirTerra: true,
    objetivo: { tipo: 'aterrar' }, relieve,
  }
  const c = crearCalculadorNavegador()
  const tiempos = []
  let enWorker
  for (let i = 0; i < 5; i++) { enWorker = await c.calcular(entrada); tiempos.push(Math.round(enWorker.ms)) }
  c.cerrar()
  const enHilo = navegar(entrada)
  const sinHora = r => JSON.stringify({ ...r, calculadoA: '' })
  return { iguales: sinHora(enWorker.resultado) === sinHora(enHilo), tiempos, estado: enHilo.estado, d: enHilo.distanciaMinM }
}
```

Expected: `iguales: true`, el estado y la distancia de la prueba de `motor.test.ts` para Aterrar con relieve (140 m), y los tiempos del worker. Anotarlos.

- [ ] **Step 3: El service worker sirve un mosaico desde la caché**

Parar el servidor de desarrollo. `npm run build && npm run preview` en segundo plano, abrir `http://localhost:4173/bpl-app/`, recargar una vez para que el service worker controle la página (`navigator.serviceWorker.controller !== null`). Entonces:

```js
async () => {
  const url = 'https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/orto/MON3857NW/99/0/0.png'
  const c = await caches.open('mosaicos')
  await c.put(url, new Response('desde-la-cache', { headers: { 'Content-Type': 'text/plain' } }))
  const r = await fetch(url, { mode: 'cors' })
  const t = await r.text()
  await c.delete(url)
  return { controla: navigator.serviceWorker.controller !== null, t }
}
```

Expected: `controla: true` y `t: 'desde-la-cache'`. El mosaico 99/0/0 no existe en el servidor, así que sólo puede salir de la caché.

Comprobar también que la API de GitHub no pasa por la caché: `(await caches.open('mosaicos')).keys()` no tiene ninguna URL de `api.github.com` tras abrir la app.

- [ ] **Step 4: Parar los servidores y dejar el repositorio limpio**

Run: `git status --short`
Expected: nada salvo `.playwright-cli/`, que ya estaba sin seguimiento.

---

### Task 11: Specs, estado y cierre

**Files:**
- Modify: `docs/superpowers/specs/2026-10-10-pantalla-de-vuelo-design.md` (§12.1, punto 1)
- Modify: `docs/superpowers/specs/2026-11-01-relieve-design.md` (§3)
- Modify: `STATUS.md`
- Modify: `docs/superpowers/plans/2026-11-01-datos-de-vuelo.md` (sección final)

- [ ] **Step 1: Specs**

En §12.1 del spec del 10/10, cambiar «Unos 1 700 mosaicos una vez por vuelo, de uno en uno y no en paralelo, queda lejos de eso.» por «Unos 1 800 mosaicos una vez por vuelo, como mucho cuatro a la vez, lo que pide un mapa al moverlo, queda lejos de eso.», y añadir al final de §12.1 una línea con los tiempos del worker medidos en Chromium (tarea 10, paso 2).

En §3 del spec del relieve, añadir al final: «En la app (plan `2026-11-01-datos-de-vuelo`): 20 km alrededor del despegue, 36 mosaicos y unos 3,6 MB, rejilla de 100 m (400 × 400 nodos), guardados en la caché `mosaicos` con la ortofoto. Comprobado en Chromium contra `relieve_10-10.json`.» con la diferencia máxima medida.

- [ ] **Step 2: STATUS.md**

Sección nueva arriba, `## 01/11/2026 (o la fecha de `date`): capa de datos de la pantalla de vuelo`, con lo hecho, las pruebas, los tiempos y lo que sigue: la pantalla, después del repaso de las maquetas.

- [ ] **Step 3: «Cambios durante la ejecución»** al final de este plan, con todo lo que se apartó de lo escrito.

- [ ] **Step 4: Todo en verde y commit**

```bash
npm test 2>&1 | tail -3 && npx tsc -b && npm run build 2>&1 | tail -2
git add docs STATUS.md
git commit -m "docs: capa de datos de la pantalla de vuelo, specs y estado"
```

- [ ] **Step 5: Cerrar la rama** con `superpowers:finishing-a-development-branch`. Fusionar en `main` en local lo decido yo, como el 01/11. Sin push ni publicar.

---

## Cambios durante la ejecución

1. **Tarea 9, el worker no sale en `dist/assets`** con el build normal: nada de la app importa
   todavía `crearCalculadorNavegador`, así que el módulo no entra en el grafo. Comprobado con
   un import temporal en `main.tsx` (sin commit): sale `nav.worker-*.js`, 24 KB. Saldrá solo
   cuando la pantalla lo importe.
2. **`dist/` está en el repositorio** y sólo cambia al publicar (último commit, el del 10/10).
   El build de la tarea 9 lo tocó y se devolvió a como estaba. Las comprobaciones de la tarea
   10 se hicieron con builds en el scratchpad (`--outDir`), no en `dist/`.
3. **Tarea 10, paso 1, la caja del eval tenía x e y cambiadas** respecto a `relieve.py` (allí
   `geo(x, y)` es este y norte). La primera vuelta comparó cajas distintas. Con la caja bien,
   diferencia 0 en los 29 145 nodos. El código no cambió.
4. **Tarea 10, paso 3, ampliado:** además del mosaico inventado servido de la caché, se
   comprobó que un mosaico real visto con conexión (`<img crossOrigin>`) queda en la caché
   `mosaicos`. Workbox lo guarda en segundo plano: tarda un momento en aparecer.
5. **Tarea 9, paso 3:** la primera vuelta de la suite dio 1 fallo en 652, justo después del
   build. No se reprodujo en once vueltas más, dos con un build en paralelo. No se sabe cuál
   fue: la salida se cortó con `tail`. Las candidatas son las tres pruebas de tiempo de
   `motor.test.ts` (20 s de límite).
6. Mutaciones de más, no previstas en el plan: el corte al cancelar y el «ya está» de
   `bajarMosaicos`, y el «gana el último» del calculador. Las tres detectadas.
7. Chromium para pruebas no estaba instalado: `install-browser chrome-for-testing`.
