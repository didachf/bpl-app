# Pantalla de vuelo, parte 2: la pantalla, plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La pantalla de vuelo de la tablet, `#/vol`: empezar el vuelo con la calibración y las descargas, el mapa con la ortofoto guardada, la traza, la proyección, los waypoints con su objetivo, el plan del motor con su zona y el punto más cercano, la franja de cifras y el menú Més.

**Architecture:** Un proveedor a nivel de app (`VolProvider`) guarda la sesión y corre el GPS mientras hay vuelo, aunque se salga de la pantalla. La pantalla `Vol` cambia entre estados sin rutas nuevas, para no rehacer el mapa de Leaflet: Començar, Mapa, Waypoints, Marcar al mapa, Coordenades y el diálogo Més. El motor corre en el worker de la capa de datos cada 15 s y al cambiar de waypoint. Lo que se puede probar sin navegador (presentación de cifras, órdenes cortas, rampa de la traza, tramos del plan, el camino del motor) va en módulos puros con prueba. La pantalla se comprueba en Chromium a 1 280 × 800 con un GPS simulado.

**Tech Stack:** Preact, Leaflet 1.9, TypeScript, Vitest, Playwright CLI con Chromium.

**Referencias:** `design/pantalla-de-vol/ESPEC_TAULETA.md` (medidas, textos y colores de las maquetas, con sus defectos y qué se hace con cada uno), las maquetas `.dc.html` de esa carpeta, el spec `docs/superpowers/specs/2026-10-10-pantalla-de-vuelo-design.md` §6 a §8 y §10, y lo hecho en los planes `2026-11-01-datos-de-vuelo.md` y `2026-11-01-vol-logica.md`.

**Desviación del método, a propósito:** en las tareas de interfaz el plan da la estructura, los datos, los textos y la comprobación, y el código se escribe al ejecutar contra `ESPEC_TAULETA.md`. Copiar aquí cada componente entero duplicaría las maquetas. Lo puro sí va con su código y su prueba.

**Fuera de este plan (parte 3):** la vista Vent, la mejor izquierda y derecha, las zonas (polígonos), Camps d'emergència, cerrar el vuelo en el Registre, y marcar waypoints en el teléfono.

---

## Decisiones técnicas

| Qué | Decisión | Por qué |
|---|---|---|
| Rutas | Sólo `#/vol`. Los paneles son estados de la pantalla | El mapa de Leaflet no se rehace al abrir la lista o marcar un punto |
| En el teléfono | `#/vol` lleva a Inicio | §7 |
| GPS y sesión | En un proveedor por encima de las rutas, activo mientras haya sesión | «Sortir a l'app: el vol i el GPS continuen» |
| Guardado de la traza | Cada 10 s y al ocultarse la app | §6.1, sin escribir IndexedDB en cada punto |
| Tema | Los tokens de la app, con los nuevos de navegación en claro y en oscuro. Lo pintado sobre la ortofoto (fichas, leyenda, tarjeta del plan, traza) va igual en los dos temas | Las maquetas sólo son oscuras y el 11/10 se decidió «tema según Android». Sobre la foto, una ficha clara no se lee |
| Ámbar y rojo | `--warn` y `--danger` de la app | Defecto 12 de la especificación. Diferencia de tono pequeña y ya razonada en `theme.css` |
| CAMPS y Vent | CAMPS no sale hasta la parte 3. Vent sale desactivado con «Aviat» | Un botón de emergencia que no hace nada no se enseña. Vent desactivado dice lo que viene sin engañar |
| Camino del plan | El motor devuelve el camino minuto a minuto (con la altitud y si va a ras) y el punto más cercano | El mapa los pinta (O11 y O12). Mismo cálculo que el generador de maquetas |
| Orden de la franja | La orden del paso en curso, corta: sin «Ara, », sin los m/s del modo y sin el viento | Maqueta: «Puja ràpid fins a 1 750 ft», «Després manté 1 750 ft 2 min» |
| Altitud en pantalla | En ft redondeados a 10 | La maqueta da «1 540». El GPS no da más |
| Despegue | Donde está la tablet al pulsar «Començar vol», con el terreno del relieve | Sin plan (pieza 3) no hay otro. §12.1 punto 3 |
| Techo | Campo obligatorio en Començar, en m y ft, recordado en el aparato | Sin valor inventado |
| GPS simulado | Sólo en desarrollo (`import.meta.env.DEV`) y con `localStorage['bpl:gpsSimulat']`, reproduce una traza | Para comprobar en Chromium. En producción no existe |

---

### Task 1: El motor devuelve el camino y el punto más cercano

**Files:**
- Modify: `src/services/nav/tipos.ts` (`ResultadoNavegacion`)
- Modify: `src/services/nav/plan.ts` (dos funciones nuevas)
- Modify: `src/services/nav/motor.ts` (`vacio` y el resultado)
- Test: `src/services/nav/motor.test.ts`

- [ ] **Step 1: Tipos.** En `ResultadoNavegacion`:

```ts
  /** El plan minuto a minuto desde ahora: el indice es el minuto. Vacio sin plan. */
  camino: { lat: number; lon: number; altM: number; aRas: boolean }[]
  /** Donde el plan pasa mas cerca del punto dentro del margen del objetivo. null sin plan. */
  masCerca: Punto | null
```

y en `vacio` del motor: `camino: [], masCerca: null`.

- [ ] **Step 2: Escribir la prueba**, en `motor.test.ts`, con la entrada del 10/10 que ya usan sus pruebas de relieve (Aterrar, Passar a 2 500 ft y Qualsevol, con `relieve: cargarRelieve1010()`):

```ts
describe('el camino y el punto mas cercano', () => {
  const casos: [string, Objetivo][] = [
    ['aterrar', { tipo: 'aterrar' }],
    ['2 500 ft', { tipo: 'altitud', altM: 2500 * 0.3048 }],
    ['qualsevol', { tipo: 'qualsevol' }],
  ]
  for (const [n, objetivo] of casos) {
    it(`${n}: el punto mas cercano esta a la distancia que dice el motor`, () => {
      const r = navegar(entrada({ objetivo, relieve: cargarRelieve1010() }))
      expect(r.masCerca).not.toBe(null)
      const [x, y] = aPlano({ lat0: r.masCerca!.lat, lon0: r.masCerca!.lon }, ...([entrada().punto!.lat, entrada().punto!.lon] as [number, number]))
      expect(Math.abs(Math.hypot(x, y) - r.distanciaMinM!)).toBeLessThan(1)
    })
    it(`${n}: el camino empieza en el globo y tiene un punto por minuto`, () => {
      const r = navegar(entrada({ objetivo, relieve: cargarRelieve1010() }))
      expect(r.camino[0].lat).toBeCloseTo(pos.lat, 6)
      expect(r.camino[0].lon).toBeCloseTo(pos.lon, 6)
      expect(r.camino.length).toBeGreaterThan(10)
    })
  }
  it('aterrar acaba a ras, y passar a 2 500 ft pasa por 2 500 ft', () => {
    const a = navegar(entrada({ objetivo: { tipo: 'aterrar' }, relieve: cargarRelieve1010() }))
    expect(a.camino[a.camino.length - 1].aRas).toBe(true)
    const p = navegar(entrada({ objetivo: { tipo: 'altitud', altM: 762 }, relieve: cargarRelieve1010() }))
    expect(p.camino.some(c => Math.abs(c.altM - 762) < 40)).toBe(true)
  })
  it('sin punto no hay camino ni punto mas cercano', () => {
    const r = navegar(entrada({ punto: null }))
    expect(r.camino).toEqual([])
    expect(r.masCerca).toBe(null)
  })
})
```

Ajustar la cuenta de la distancia al escribirla: el punto es `entrada().punto`, y la distancia entre dos puntos geográficos se saca con `aPlano({lat0, lon0}, lat, lon)` desde uno de ellos.

- [ ] **Step 3: Comprobar que falla.** `TZ=Europe/Madrid npx vitest run src/services/nav/motor.test.ts -t "camino"`. Falla porque `camino` no existe.

- [ ] **Step 4: Implementar** en `plan.ts`, con el mismo cálculo que `camino()` de `docs/prototipos/2026-11-01-objetivo/maquetas.gen.test.ts`:

```ts
/** El camino del plan con la altitud al final de cada minuto (para pintarlo). */
export function caminoConAltura(t: Tablas, p: PlanInterno, aj: AjustesNav): { x: number; y: number; z: number }[] | null {
  const c = t.c
  const cam = caminoTabla(t, p)
  if (cam === null) return null
  const z: number[] = [c.rejilla.altM[p.franjas[0]]]
  for (let i = 0; i < p.franjas.length; i++) {
    const b = p.franjas[i]
    if (i > 0) {
      const a = p.franjas[i - 1]
      const vel = velocidad(aj, c.rejilla.altM[b] > c.rejilla.altM[a], p.clases[i - 1])
      const n = minutosTransito(c, a, b, vel)
      for (let j = 1; j <= n; j++) {
        const dz = Math.min(Math.abs(c.rejilla.altM[b] - c.rejilla.altM[a]), vel * 60 * j)
        z.push(c.rejilla.altM[a] + Math.sign(c.rejilla.altM[b] - c.rejilla.altM[a]) * dz)
      }
    }
    const fin = i === p.franjas.length - 1 ? c.minutos : z.length - 1 + p.dur[i]
    while (z.length - 1 < fin) z.push(c.rejilla.altM[b])
  }
  return cam.map(([x, y], k) => ({ x, y, z: z[Math.min(k, z.length - 1)] }))
}

/** El punto del camino mas cercano a (ox, oy) dentro del margen, sobre el trozo de cada minuto. */
export function masCercaEnMargen(t: Tablas, p: PlanInterno, cam: Camino, ox: number, oy: number): [number, number] | null {
  const fr = fracciones(t, p)
  let mejor: [number, number] | null = null
  let dmin = Infinity
  for (let k = 0; k < fr.length && k + 1 < cam.length; k++) {
    const f = fr[k]
    if (f === null) continue
    const paso = (f[1] - f[0]) / 200 || 1
    for (let s = f[0]; s <= f[1] + 1e-9; s += paso) {
      const x = cam[k][0] + s * (cam[k + 1][0] - cam[k][0])
      const y = cam[k][1] + s * (cam[k + 1][1] - cam[k][1])
      const d = Math.hypot(x - ox, y - oy)
      if (d < dmin) { dmin = d; mejor = [x, y] }
    }
  }
  return mejor
}
```

`velocidad` y `minutosTransito` se importan de `./vertical`. En `motor.ts`, tras elegir `elegido` y antes de `return`:

```ts
  const conZ = caminoConAltura(t, elegido.plan, e.ajustes) ?? []
  const zTerra = t.iTerra >= 0 ? c.rejilla.altM[t.iTerra] : null
  const camino = conZ.map(({ x, y, z }) => ({ ...aGeo(plano, x, y), altM: z, aRas: zTerra !== null && Math.abs(z - zTerra) < 1 }))
  const mc = masCercaEnMargen(t, elegido.plan, caminoTabla(t, elegido.plan)!, ox, oy)
  const masCerca = mc === null ? null : aGeo(plano, mc[0], mc[1])
```

y en el objeto devuelto `camino, masCerca`. Comprobar el nombre del índice de terra en `Tablas` (`iTerra`, del 01/11) y que vale −1 o similar cuando no hay terra.

- [ ] **Step 5: Comprobar que pasa**, y toda la suite: `npm test 2>&1 | grep -E 'Tests |×'`. Mutación: quitar el `if (f === null) continue` de `masCercaEnMargen`: tiene que fallar «a la distancia que dice el motor» con Aterrar o Passar.

- [ ] **Step 6: Commit** `feat(nav): el motor devuelve el camino minuto a minuto y el punto mas cercano`.

---

### Task 2: Presentación de cifras y del plan

**Files:**
- Create: `src/ui/vol/presentacio.ts`
- Test: `src/ui/vol/presentacio.test.ts`

- [ ] **Step 1: Escribir la prueba**

```ts
// src/ui/vol/presentacio.test.ts
import { describe, it, expect } from 'vitest'
import {
  altFt, colorAltitud, etiquetaObjectiu, graus, horaLocal, kt, marquesCadaCinc, ordreCurta, pasEnCurs,
  tempsVol, textObjectiu, trossosCami, vario,
} from './presentacio'
import { miles } from '../../services/nav/campo'

describe('cifras de la franja', () => {
  it('altitud en ft redondeada a 10', () => {
    expect(altFt(469.4)).toBe(miles(1540))
    expect(altFt(380)).toBe(miles(1250))
  })
  it('vario con signo y coma, menos de verdad', () => {
    expect(vario(0.3)).toBe('+0,3')
    expect(vario(-1.24)).toBe('−1,2')
    expect(vario(0.02)).toBe('0,0')
    expect(vario(null)).toBe('–')
  })
  it('rumbo con tres cifras y velocidad en kt', () => {
    expect(graus(61.4)).toBe('061°')
    expect(graus(359.7)).toBe('000°')
    expect(kt(2.21)).toBe('4,3')
  })
  it('tiempo de vuelo y hora local', () => {
    expect(tempsVol(34 * 60_000 + 59_000)).toBe('0:34')
    expect(tempsVol(75 * 60_000)).toBe('1:15')
    expect(horaLocal(Date.parse('2026-10-10T06:34:00Z'))).toBe('08:34')
  })
})

describe('el plan', () => {
  it('la orden corta de la franja', () => {
    expect(ordreCurta('Ara, puja ràpid (2,5 a 3 m/s) fins a 1 750 ft.')).toBe('Puja ràpid fins a 1 750 ft')
    expect(ordreCurta('Manté 1 750 ft 2 min, cap a 068° a 6 kt (previst).')).toBe('Manté 1 750 ft 2 min')
    expect(ordreCurta('Baixa ràpid (3 a 5 m/s) fins a terra, i hi arribes al punt més proper.')).toBe('Baixa ràpid fins a terra, i hi arribes al punt més proper')
    expect(ordreCurta('Manté terra fins al punt més proper, cap a 011° a 2 kt (previst).')).toBe('Manté terra fins al punt més proper')
  })
  it('el paso en curso por la hora', () => {
    const plan = [
      { tipo: 'cambiar', franja: 1, modo: 'puja_rapid', inicioMin: 0, finMin: 1 },
      { tipo: 'mantener', franja: 1, modo: null, inicioMin: 1, finMin: 3 },
      { tipo: 'cambiar', franja: 0, modo: 'baixa_rapid', inicioMin: 3, finMin: 4 },
    ] as const
    const t0 = Date.parse('2026-10-10T06:34:00Z')
    expect(pasEnCurs([...plan], t0, t0 + 30_000)).toBe(0)
    expect(pasEnCurs([...plan], t0, t0 + 90_000)).toBe(1)
    expect(pasEnCurs([...plan], t0, t0 + 10 * 60_000)).toBe(2)
  })
  it('la etiqueta y el texto del objetivo', () => {
    expect(etiquetaObjectiu({ tipo: 'aterrar' })).toBe('ATERRAR')
    expect(etiquetaObjectiu({ tipo: 'altitud', altM: 762 })).toBe(`A ${miles(2500)} FT`)
    expect(etiquetaObjectiu({ tipo: 'qualsevol' })).toBe(null)
    expect(textObjectiu({ tipo: 'altitud', altM: 762 })).toBe(`a ${miles(2500)} ft`)
  })
})

describe('lo que se pinta en el mapa', () => {
  it('la rampa de la traza: del suelo a 3 750 ft', () => {
    expect(colorAltitud(380, 380, 1143)).toBe('#ffd400')
    expect(colorAltitud(1143, 380, 1143)).toBe('#a77bff')
    expect(colorAltitud(2000, 380, 1143)).toBe('#a77bff')
  })
  it('el camino en trozos a ras y en altura, sin huecos', () => {
    const c = (aRas: boolean, i: number) => ({ lat: i, lon: i, altM: aRas ? 390 : 600, aRas })
    const t = trossosCami([c(false, 0), c(false, 1), c(true, 2), c(true, 3), c(false, 4)])
    expect(t.map(x => [x.aRas, x.punts.length])).toEqual([[false, 2], [true, 3], [false, 2]])
  })
  it('marcas a los 5 y 10 min', () => {
    const cam = Array.from({ length: 12 }, (_, i) => ({ lat: i, lon: i, altM: 500, aRas: false }))
    expect(marquesCadaCinc(cam).map(m => m.min)).toEqual([5, 10])
  })
})
```

- [ ] **Step 2: Comprobar que falla** (no existe el módulo).

- [ ] **Step 3: Implementar**

```ts
// src/ui/vol/presentacio.ts
// Como se escriben las cifras y el plan en la pantalla de vuelo (maquetas,
// design/pantalla-de-vol/ESPEC_TAULETA.md). Puro, para poder probarlo.
import { miles, PIE_M } from '../../services/nav/campo'
import type { ResultadoNavegacion, Tramo } from '../../services/nav/tipos'
import type { ObjectiuWaypoint } from '../../domain/types'

const MS_KT = 3600 / 1852
const MENYS = '−'

export const altFt = (m: number) => miles(Math.round(m / PIE_M / 10) * 10)

export function vario(v: number | null): string {
  if (v === null) return '–'
  const r = Math.round(v * 10) / 10
  if (r === 0) return '0,0'
  return `${r > 0 ? '+' : MENYS}${Math.abs(r).toFixed(1).replace('.', ',')}`
}

export const graus = (r: number) => `${String(Math.round(r) % 360).padStart(3, '0')}°`
export const kt = (ms: number) => (ms * MS_KT).toFixed(1).replace('.', ',')

export function tempsVol(ms: number): string {
  const min = Math.floor(ms / 60_000)
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
}

export function horaLocal(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** «Ara, puja ràpid (2,5 a 3 m/s) fins a 1 750 ft.» a «Puja ràpid fins a 1 750 ft». */
export function ordreCurta(o: string): string {
  const s = o.replace(/^Ara, /, '').replace(/ \([^)]*m\/s\)/, '').replace(/, cap a \d{3}° a \d+ kt \((previst|mesurat)\)/, '').replace(/\.$/, '')
  return s[0].toUpperCase() + s.slice(1)
}

/** El paso del plan que toca ahora, por la hora del calculo. */
export function pasEnCurs(plan: Tramo[], calculatA: number, ara: number): number {
  const min = (ara - calculatA) / 60_000
  const i = plan.findIndex(t => min < t.finMin)
  return i < 0 ? plan.length - 1 : i
}

export function etiquetaObjectiu(o: ObjectiuWaypoint): string | null {
  if (o.tipo === 'aterrar') return 'ATERRAR'
  if (o.tipo === 'altitud') return `A ${altFt(o.altM)} FT`
  return null
}

export function textObjectiu(o: ObjectiuWaypoint): string {
  if (o.tipo === 'aterrar') return 'aterrar'
  if (o.tipo === 'altitud') return `a ${altFt(o.altM)} ft`
  return 'qualsevol altura'
}

const RAMPA = ['#ffd400', '#ff9f1a', '#ff4fd8', '#a77bff']

/** Color de la traza por altitud, del suelo al tope en cuatro escalones. */
export function colorAltitud(altM: number, sueloM: number, topeM: number): string {
  const f = Math.min(1, Math.max(0, (altM - sueloM) / (topeM - sueloM)))
  return RAMPA[Math.min(RAMPA.length - 1, Math.floor(f * RAMPA.length))]
}

type PuntCami = ResultadoNavegacion['camino'][number]

/** Trozos seguidos a ras o en altura. El ultimo punto de un trozo es el primero del siguiente. */
export function trossosCami(c: PuntCami[]): { aRas: boolean; punts: PuntCami[] }[] {
  const out: { aRas: boolean; punts: PuntCami[] }[] = []
  for (let k = 1; k < c.length; k++) {
    const aRas = c[k].aRas
    const ultim = out[out.length - 1]
    if (ultim !== undefined && ultim.aRas === aRas) ultim.punts.push(c[k])
    else out.push({ aRas, punts: [c[k - 1], c[k]] })
  }
  return out
}

export function marquesCadaCinc(c: PuntCami[]): { min: number; p: PuntCami }[] {
  const out: { min: number; p: PuntCami }[] = []
  for (let m = 5; m < c.length; m += 5) out.push({ min: m, p: c[m] })
  return out
}
```

Ajustar la prueba de `colorAltitud` si el reparto en cuatro escalones da otro color en los bordes, y la de `trossosCami` al reparto real (el primer trozo lleva el punto 0). Lo que manda es que no haya huecos entre trozos.

- [ ] **Step 4: Comprobar que pasa. Step 5: Commit** `feat(ui): presentacion de cifras y del plan de la pantalla de vuelo`.

---

### Task 3: Ruta, aparato, entradas y tema

**Files:** `src/ui/router.ts` (+ prueba), `src/app.tsx`, `vite.config.ts` (manifiesto), `src/ui/theme.css`, `src/ui/screens/ajustes/Ajustes.tsx`, `src/ui/screens/Operar.tsx`, `src/ui/components/Icon.tsx`.

- [ ] Ruta `{ name: 'vol' }` ⇄ `#/vol` en `parseHash` y `hrefOf`, con su caso en `router.test.ts` (ida y vuelta). En `app.tsx`, `case 'vol'`: si `aparell() === 'telefon'`, `<Inicio />`; si no, `<Vol />`.
- [ ] Manifiesto: `orientation: 'any'` (§7.4).
- [ ] Ajustes: fila «Aparell» con selector Tauleta | Telèfon (`desarAparell`).
- [ ] Operar, arriba en tablet: tarjeta «Començar vol» → `#/vol` («Vol en marxa · Tornar» si hay sesión).
- [ ] Banda «Vol en marxa · 0:34 · Tornar al vol» por encima de las rutas, como `BarraVersion`, cuando hay sesión y la ruta no es `vol`.
- [ ] `theme.css`, tokens nuevos con su valor oscuro de las maquetas y uno claro con contraste: `--nav` (`#35d0ff`, claro `#006d93`), `--nav-bg` (`#1f2a33`, claro `#e3eef4`), `--nav-lab` (`#8fd8f5`, claro `#00597a`), `--nav-pressed` (`#1d2c40`, claro `#dbe7f6`), `--zona` (`#3ad16b`, claro `#1d8a40`). Sobre el mapa, fijos: `--sobre-mapa: rgba(26,26,25,.9)`.
- [ ] Iconos de §0 de la especificación en `Icon.tsx`: `camps`, `waypoint`, `centrar`, `mapa`, `vent`, `mes`, `tancar`, `marcar`, `coordenades`, `avis`, `rellotge`, `parar`. Mirar antes cómo están los que hay.
- [ ] `npm test`, `tsc`. Commit `feat(ui): ruta de la pantalla de vuelo, modo del aparato y entradas`.

---

### Task 4: El proveedor del vuelo

**Files:** Create `src/ui/vol/VolProvider.tsx`, `src/ui/vol/fontGps.ts`.

- [ ] `fontGps.ts`: `observarGps(cb: (p: PuntoGps) => void, err: (m: string) => void): () => void` con `watchPosition` (`enableHighAccuracy: true, maximumAge: 0`) y `altitude` como `altElipM`, `accuracy` como `precisionM`. En desarrollo con `localStorage['bpl:gpsSimulat']` (una URL de JSON con `{t, lat, lon, altElipM}[]` relativos a ahora), reproduce esa traza a 1 Hz. Mensajes de error en catalán: sin permiso, sin señal.
- [ ] `VolProvider`: contexto con `sessio`, `ultimGps` (punto y precisión), `errorGps`, `mostres` (puntos de los últimos 30 s, para calibrar), `començar(despegue, sostreM)`, `calibrar(terrenyM)` (con `calibracion()`), `acabar()`. Con sesión o en Començar, observa el GPS y pasa cada punto por `afegirPunt`. Guarda con `desarSessio` cada 10 s y al ocultarse la app. Al arrancar, `llegirSessio()` recupera un vuelo en marcha. Mantiene la pantalla encendida con `wakeLock` mientras hay sesión, y lo vuelve a pedir al volver de segundo plano.
- [ ] `acabar()`: guarda la sesión en `vol:darrer` (idb-keyval) y borra la de ahora. El Registre llega en la parte 3.
- [ ] Montarlo en `app.tsx` por encima de las rutas. `tsc`, `npm test`. Commit `feat(ui): proveedor del vuelo con GPS, sesion y pantalla encendida`.

---

### Task 5: Començar vol

**Files:** Create `src/ui/vol/Comencar.tsx`, `src/ui/vol/Vol.tsx`.

`Vol.tsx` decide: sin sesión, `Comencar`; con sesión, el mapa (tareas siguientes).

`Comencar` (ESPEC §2.6), dos columnas:
- [ ] Izquierda: mapa de Leaflet con la ortofoto, el círculo de 3 km alrededor del despegue y el despegue. La tarjeta de arriba con los textos de la maqueta.
- [ ] Derecha, en este orden: título y subtítulo; **Sostre** (campo en m con su equivalente en ft al lado, obligatorio, recordado con `ultimSostre`); botón **«Preparar»** que lanza `prepararVol(lat, lon, ara)` desde la posición del GPS; las tres tarjetas de la maqueta con su progreso real (pronóstico con la hora de la petición y el número de modelos, mapa con mosaicos y MB, calibración con los segundos de 30 y GPS, terreno y corrección); el resumen (Finestra, de la primera a la última hora del pronóstico; Sostre en m y ft; Optimitzador, de `ajustesDeVol`; Waypoint actiu, o nada si no hay, §6.9); el botón **«Obrir la pantalla de vol»**, activo con pronóstico y calibración; y la nota «La pantalla es queda encesa mentre voles».
- [ ] El terreno del despegue sale de `sueloGeo(relieve, lat, lon)`. Sin relieve, el campo de terreno lo escribe el piloto.
- [ ] Si no se puede calibrar (sin GPS de altitud, o ya en el aire), un enlace «Obrir sense calibrar» que abre con la altitud tal cual y la franja lo dice (§10).
- [ ] Los avisos de `prepararVol` (sin conexión, mosaicos que fallan, sin relieve) en tarjetas ámbar.
- [ ] Commit `feat(ui): començar vol con descargas, techo y calibracion`.

---

### Task 6: El mapa en vuelo

**Files:** Create `src/ui/vol/MapaVol.tsx`, `src/ui/vol/capes.ts` (lo de Leaflet).

- [ ] Leaflet a pantalla completa menos la franja (1280 × 600), sin controles propios. Capa de la ortofoto con `URL_ORTO`, `crossOrigin: true`, `maxNativeZoom: 18`, y atribución propia (ESPEC §1.6) en lugar de la de Leaflet. Al abrir, centrado en el globo a zoom 14.
- [ ] Capas (ESPEC §1.2, en su orden): zona alcanzable del resultado (panel con opacidad ,26 y polígonos opacos dentro, para que no se oscurezcan al solaparse), camino del plan por trozos (`trossosCami`, a ras discontinuo `--zona`) con marcas cada 5 min, punto más cercano y su línea al destino si el estado no es `llega`, destino activo, otros waypoints, traza por altitud (`colorAltitud`, suelo el del despegue, tope el techo), despegue con su hora, proyección (`proyeccion()`) sólo sin waypoint activo, y el globo girado al rumbo, encima de todo.
- [ ] Encima del mapa, HTML: fichas (GPS con su precisión, pronóstico con su hora y modelos y «amb relleu» si hay relieve), avisos del motor en ámbar, tarjeta del plan (ESPEC §1.3, con `pasEnCurs` para la hora de cada paso: hora del cálculo más `inicioMin`), botones de la derecha (Waypoints, Centrar, +, −), leyenda según lo que se ve, escala (la de Leaflet en 1 km o el valor de su zoom, con el estilo de la maqueta) y atribución.
- [ ] Pulsación larga en el mapa (600 ms sin moverse): abre Marcar al mapa centrado ahí.
- [ ] Commit `feat(ui): mapa en vuelo con traza, proyeccion, waypoints y plan`.

---

### Task 7: La franja, el bucle del motor y el menú Més

**Files:** Create `src/ui/vol/Franja.tsx`, `src/ui/vol/useNavegacio.ts`, `src/ui/vol/Mes.tsx`.

- [ ] `useNavegacio(sessio, waypoint)`: el `Calculador` del navegador, recálculo cada `RECALCULO_MS` y al cambiar `clauDe(waypoint)`, con `entradaDeVol` (previsión de `leerPrevision`, relieve de `relieveDeZona` del despegue, una vez) y `triarPlan`. Sin waypoint activo calcula igual (zona y «si no fas res») pero la pantalla no enseña nada del waypoint (§6.9). Al cambiar de waypoint, el plan anterior se tira en el acto.
- [ ] `Franja` (ESPEC §1.7 y §1.7b): variante A con waypoint activo, B sin él. Altitud (`altFt`) con la fuente («GPS, calibrat a terra» o «GPS sense calibrar, pot sortir uns 50 m alta») y la altura sobre el terreno en ámbar si hay relieve (`sueloGeo` bajo el globo) o la altitud en m si no. Vario, rumbo y velocidad de `gps.ts` sobre la traza. Tiempo desde el despegue (o desde el inicio si no ha despegado) y la hora. Waypoint: nombre, etiqueta del objetivo, rumbo directo y distancia (`rumbo.ts`), y «a 4,3 kt, a les 08:40» con `horaLlegada`. Ordre: el paso en curso corto, el siguiente con «Després » y el resultado. Columna de vistas: Mapa pulsado, Vent desactivado con «Aviat», Més.
- [ ] `Mes` (ESPEC §2.2) sin la fila de Camps: Waypoints, Sortir a l'app (→ Inicio, el vuelo sigue), Acabar vol. Acabar pide confirmación en la propia pantalla («Acabar el vol? El GPS es para.» con «Acabar» y «Continuar volant») y llama a `acabar()`.
- [ ] Commit `feat(ui): franja, recalculo del plan y menu del vuelo`.

---

### Task 8: Waypoints, Marcar al mapa y Coordenades

**Files:** Create `src/ui/vol/Waypoints.tsx`, `src/ui/vol/MarcarPunt.tsx`, `src/ui/vol/Coordenades.tsx`.

- [ ] `Waypoints` (ESPEC §2.4): panel de 420 a la derecha con el mapa a la izquierda; lista con rumbo y distancia desde el globo, el activo arriba con borde `--nav`, Activar o Desactivar, Editar (abre Marcar al mapa con ese punto), Esborrar (con confirmación en la tarjeta: «Esborrar WP1?» «Sí» «No»). Pie: «Marcar al mapa» y «Per coordenades». Cambios con `useStore().update` y las funciones de `domain/waypoints.ts`.
- [ ] `MarcarPunt` (ESPEC §2.7 y §2.8): mapa de 860 con la cruz fija en el centro y la zona alcanzable del objetivo elegido; panel con «Punt» (Zona desactivada, «Aviat»), nombre (`nomNou`), «Sota la creu» (coordenadas en decimal, terreno con `sueloGeo` en ft, rumbo y distancia desde el globo), objetivo (Aterrar por defecto), paso de 250 ft para Passar (de `altFt` del terreno más 250 hacia arriba, editable), la explicación de cada objetivo, el resultado «Amb el vent d'ara» (el motor con ese punto y objetivo, 500 ms después de dejar de mover el mapa), y «Desar i navegar-hi» (guarda, activa y vuelve al mapa). Al editar, «Desar».
- [ ] `Coordenades` (ESPEC §2.5): formato (Decimal, Graus min s, UTM con huso 31 o 30), campos según el formato con `llegirDecimal`, `llegirDms`, `llegirUtm`, el error bajo el campo que falla, las equivalencias en los otros formatos y desde el globo, el punto en el mapa con la chincheta, y «Desar» o «Desar i activar». El objetivo de un punto por coordenadas es Aterrar, y se cambia al editarlo.
- [ ] Commit `feat(ui): waypoints, marcar al mapa con objetivo y coordenadas`.

---

### Task 9: Comprobación en Chromium

- [ ] Traza simulada del 10/10: un JSON en `docs/prototipos/2026-11-01-objetivo/gps_simulat.json` con el despegue de Tàrrega en tierra 40 s (altitud elipsoidal = 380 + 49) y después la subida y la deriva hacia el globo de las maquetas. `npm run dev`, Chromium a 1280 × 800, `localStorage['bpl:gpsSimulat']`, modo tablet.
- [ ] Recorrer: Operar → Començar vol → techo 1 200 m → Preparar (pronóstico real: **una sola petición**, 29 llamadas; ortofoto y relieve reales) → calibración → Obrir. Sin waypoint: franja B, proyección, sin nada del waypoint. Waypoints → Marcar al mapa → la cruz en la zona A → Aterrar → resultado → Desar i navegar-hi. Mapa con plan, zona, punto más cercano, tarjeta y franja A. Passar a 2 500 ft. Coordenades en los tres formatos. Esborrar el activo: desaparece todo lo del waypoint (§6.9). Més → Sortir a l'app → banda «Vol en marxa» → tornar. Acabar vol.
- [ ] Capturas de cada estado al lado de su maqueta, mirarlas y anotar lo que no coincida. La consola sin errores en todo el recorrido.
- [ ] Tema claro: inyectar los tokens claros y mirar la franja y los paneles.
- [ ] Cuidado con `dist/` y `tsconfig.tsbuildinfo`: no comitear ninguno de los dos.

---

### Task 10: Cierre

- [ ] Todo en verde, `tsc` limpio, «Cambios durante la ejecución», STATUS, y fusionar en `main` en local. Sin push ni publicar: eso lo decide Dídac, y con esto ya hay algo que probar en la tablet.

---

## Cambios durante la ejecución

1. **Tarea 1.** El camino que devuelve el motor llega hasta el punto más cercano y no hasta el
   final del horizonte, como las maquetas. El punto más cercano se busca sólo hasta donde el plan
   vale por el terreno (como `evaluar`): la mutación que lo quitaba sobrevivía con el 10/10 y hubo
   que añadir una prueba con el cerro sintético.
2. **Tareas 3 y 4.** El tema claro de los colores de navegación y la clase `.sobre-mapa` para lo
   que va encima de la ortofoto. La banda «Vol en marxa» y la entrada desde Operar van en la tarea 4,
   cuando ya existe el proveedor. La entrada desde el final del Últim xequeig no se hizo: queda Operar.
3. **Tarea 5.** Començar ensena cada fase en cuanto acaba (`prepararVol` con `alPrevisio` y
   `alRelleu`), y se puede calibrar y abrir la pantalla mientras baja la ortofoto. La ventana del
   pronóstico dice «de demà» si acaba otro día.
4. **Comprobación en Chromium, fallo de verdad:** cuatro mosaicos del ICGC no contestaron y Chrome
   los dio por perdidos a los 10 min, con los cuatro huecos de descarga ocupados y la pantalla
   parada en «Baixant…». Ahora cada mosaico tiene 15 s y open-meteo 20 s, con prueba.
5. **Comprobación en Chromium, otros:** Leaflet saltaba al quitar capas de un mapa ya quitado
   (`retirar`), las costuras entre mosaicos con zoom fraccionario (zoom entero), la altitud de la
   franja A pisaba «ft» (44 px), el botón de guardar quedaba bajo la franja con el paso de altitud
   (fijo abajo, defecto 4 de la especificación), y los campos de coordenadas perdían valores con
   cambios seguidos (actualización funcional).
6. La franja B lleva «Més» aunque la maqueta no: sin él no se puede acabar el vuelo sin waypoint
   activo. CAMPS no sale y Vent sale desactivado con «Aviat» (decisión del plan).
7. La línea de altura sobre el terreno va en ámbar por debajo de 300 ft, y en gris por encima.
8. Recorrido comprobado con GPS simulado (`gps_terra.json` y `gps_vol.json`): Començar con
   pronóstico real (una petición), relieve y 1 764 mosaicos (49 MB en menos de 20 s), calibración
   (−46 m), mapa sin waypoint, Marcar al mapa con Aterrar y Passar a 2 500 ft, guardar y navegar,
   Coordenades en grados minutos y segundos, borrar el activo (§6.9: desaparece todo lo del
   waypoint), Més, Sortir a l'app con la banda y vuelta, y Acabar vol con confirmación. Sin errores
   de la app en la consola.
9. **Sin comprobar:** el tema oscuro en pantalla (son los colores de las maquetas), la tablet de
   verdad (necesita publicar) y el GPS real. Con la traza simulada, el plan hacia el mismo punto
   cambia mucho de un minuto a otro («No s'hi arriba» y luego 2 m): el viento medido de una traza
   sintética es el mismo a todas las alturas. Hay que mirarlo con un vuelo de verdad.
10. 718 pruebas.
