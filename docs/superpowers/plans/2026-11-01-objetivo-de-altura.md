# Objetivo de altura en el punto, plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el motor de navegación cuente la distancia al punto y la zona sólo dentro del margen de altura del objetivo (Aterrar, Passar a X ft, Qualsevol), como manda `docs/superpowers/specs/2026-11-01-objetivo-de-altura-design.md`.

**Architecture:** un módulo nuevo, `objetivo.ts`, traduce el objetivo a un margen `[bajo, alto]` y calcula qué parte de cada minuto de un cambio de altitud cae dentro (`Frac`). Las tablas de `vertical.ts` guardan, con el margen, qué franjas están dentro y la `Frac` de cada minuto de cada tránsito, que no depende del viento. `plan.ts` y `zona.ts` usan eso para decidir qué trozo de cada segmento cuenta. Con `qualsevol` todo es `[0, 1]` y el motor hace exactamente lo del 30/10.

**Tech Stack:** TypeScript (`tsc -b`), vitest (`npm test`, con `TZ=Europe/Madrid`), sin dependencias nuevas.

**Convenciones del repositorio:** comentarios en castellano sin acentos, textos de pantalla en catalán, `import type` para los tipos (`verbatimModuleSyntax`), pruebas `*.test.ts` junto al fichero. Trabajo en el worktree `~/code/bpl-app-objetivo`, rama `objetivo-altura`, creado desde `main` en `35e3c6d` con 520 pruebas en verde.

---

### Task 1: el objetivo y su margen

**Files:**
- Modify: `src/services/nav/tipos.ts` (tipo `Objetivo`, `QUALSEVOL`, campo `objetivo` del resultado)
- Create: `src/services/nav/objetivo.ts`
- Test: `src/services/nav/objetivo.test.ts`

- [ ] **Step 1: tipos**

En `src/services/nav/tipos.ts`, después de `export interface Punto`:

```ts
/**
 * El objetivo de altura en el punto (spec 2026-11-01): aterrar (franja terra),
 * pasar a una altitud sobre el mar, o a cualquier altura.
 */
export type Objetivo = { tipo: 'aterrar' } | { tipo: 'altitud'; altM: number } | { tipo: 'qualsevol' }

export const QUALSEVOL: Objetivo = { tipo: 'qualsevol' }
```

Y en `ResultadoNavegacion`, después de `estado: Estado`:

```ts
  /** El objetivo con el que se ha calculado. */
  objetivo: Objetivo
```

`tsc` fallará en `motor.ts` hasta la Task 6. Las pruebas de vitest no comprueban tipos y siguen corriendo.

- [ ] **Step 2: la prueba que falla**

`src/services/nav/objetivo.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { cruce, enMargen, fracMinutos, margenDe, MINUTO_ENTERO, SIN_MARGEN, tocaRango, type Frac } from './objetivo'
import { FRANJA_M } from './campo'

const rej = { altM: [310, 457.2, 533.4, 609.6], etiqueta: ['terra', '1 500 ft', '1 750 ft', '2 000 ft'] }

function igualFrac(a: Frac[], b: Frac[]): void {
  expect(a).toHaveLength(b.length)
  a.forEach((f, j) => {
    if (b[j] === null) expect(f).toBeNull()
    else {
      expect(f![0]).toBeCloseTo(b[j]![0], 9)
      expect(f![1]).toBeCloseTo(b[j]![1], 9)
    }
  })
}

describe('margenDe', () => {
  it('qualsevol, sin limites', () => { expect(margenDe({ tipo: 'qualsevol' }, rej)).toEqual(SIN_MARGEN) })
  it('altitud, su franja y no las vecinas', () => {
    const m = margenDe({ tipo: 'altitud', altM: 533.4 }, rej)!
    expect(m[0]).toBeCloseTo(533.4 - FRANJA_M / 2, 9)
    expect(m[1]).toBeCloseTo(533.4 + FRANJA_M / 2, 9)
    expect(enMargen(457.2, m)).toBe(false)
    expect(enMargen(533.4, m)).toBe(true)
    expect(enMargen(609.6, m)).toBe(false)
  })
  it('aterrar, la franja terra', () => { expect(margenDe({ tipo: 'aterrar' }, rej)).toEqual([309, 311]) })
  it('aterrar sin franja terra', () => {
    expect(margenDe({ tipo: 'aterrar' }, { altM: [457.2], etiqueta: ['1 500 ft'] })).toBeNull()
  })
})

describe('tocaRango', () => {
  it('dentro, y fuera por arriba y por abajo', () => {
    expect(tocaRango([500, 560], rej)).toBe(true)
    expect(tocaRango([700, 780], rej)).toBe(false)
    expect(tocaRango([200, 300], rej)).toBe(false)
  })
})

describe('cruce', () => {
  const m: [number, number] = [500, 600]
  it('subiendo a traves del margen', () => { expect(cruce(400, 800, 2, m)).toEqual([50, 100]) })
  it('bajando a traves del margen', () => { expect(cruce(800, 400, 4, m)).toEqual([50, 75]) })
  it('llegando a una franja de dentro, se queda', () => { expect(cruce(400, 550, 1, m)).toEqual([100, Infinity]) })
  it('saliendo de dentro', () => { expect(cruce(550, 800, 1, m)).toEqual([0, 50]) })
  it('sin tocarlo', () => {
    expect(cruce(400, 450, 1, m)).toBeNull()
    expect(cruce(700, 650, 1, m)).toBeNull()
  })
  it('sin margen, todo el rato', () => { expect(cruce(400, 800, 1, SIN_MARGEN)).toEqual([0, Infinity]) })
})

describe('fracMinutos', () => {
  it('el cruce a mitad de minuto', () => {
    // de 400 a 800 a 2 m/s, dentro de 50 a 100 s
    igualFrac(fracMinutos(400, 800, 2, 4, [500, 600]), [[50 / 60, 1], [0, 40 / 60], null, null])
  })
  it('llegando dentro, hasta el final del cambio', () => {
    igualFrac(fracMinutos(400, 550, 1, 3, [500, 600]), [null, [40 / 60, 1], [0, 1]])
  })
  it('sin margen, minutos enteros y el mismo objeto', () => {
    expect(fracMinutos(400, 800, 2, 4, SIN_MARGEN).every(f => f === MINUTO_ENTERO)).toBe(true)
  })
  it('sin tocarlo, nada', () => { expect(fracMinutos(400, 450, 1, 1, [500, 600])).toEqual([null]) })
})
```

- [ ] **Step 3: comprobar que falla**

Run: `npx vitest run src/services/nav/objetivo.test.ts`
Expected: FAIL, no encuentra `./objetivo`.

- [ ] **Step 4: implementar**

`src/services/nav/objetivo.ts`:

```ts
// src/services/nav/objetivo.ts
// El objetivo de altura en el punto (spec 2026-11-01): un margen de altura sobre
// el mar, y la parte de cada minuto que el globo pasa dentro. La distancia al
// punto y la zona solo cuentan dentro del margen.
import { FRANJA_M, type Rejilla } from './campo'
import type { Objetivo } from './tipos'

/** [bajo, alto] en metros sobre el mar. */
export type Margen = [number, number]
/** La parte de un minuto dentro del margen, [desde, hasta] entre 0 y 1, o null si nada. */
export type Frac = [number, number] | null

export const SIN_MARGEN: Margen = [-Infinity, Infinity]
export const MINUTO_ENTERO: Frac = [0, 1]
/** Holgura del margen de terra, que es una altitud exacta. */
const HOLGURA_TERRA_M = 1
const EPS_M = 1e-6

/** El margen del objetivo, o null si pide aterrar y no hay franja terra. */
export function margenDe(o: Objetivo, r: Rejilla): Margen | null {
  if (o.tipo === 'qualsevol') return SIN_MARGEN
  if (o.tipo === 'altitud') return [o.altM - FRANJA_M / 2, o.altM + FRANJA_M / 2]
  const i = r.etiqueta.indexOf('terra')
  return i < 0 ? null : [r.altM[i] - HOLGURA_TERRA_M, r.altM[i] + HOLGURA_TERRA_M]
}

export function enMargen(z: number, m: Margen): boolean {
  return z >= m[0] - EPS_M && z <= m[1] + EPS_M
}

/** Si alguna altitud entre la franja mas baja y la mas alta cae en el margen. */
export function tocaRango(m: Margen, r: Rejilla): boolean {
  const n = r.altM.length
  return n > 0 && m[1] >= r.altM[0] - EPS_M && m[0] <= r.altM[n - 1] + EPS_M
}

/**
 * En un cambio de z0 a z1 a vel m/s la altitud avanza a esa velocidad y, al
 * llegar, se queda. Devuelve cuando esta dentro del margen, [desde, hasta] en s
 * desde el inicio del cambio (hasta puede ser Infinity), o null si no lo toca.
 */
export function cruce(z0: number, z1: number, vel: number, m: Margen): [number, number] | null {
  const [lo, hi] = m
  if (hi < Math.min(z0, z1) - EPS_M || lo > Math.max(z0, z1) + EPS_M) return null
  const t = (z: number) => Math.abs(z - z0) / vel
  if (z1 >= z0) return [lo <= z0 ? 0 : t(lo), hi >= z1 ? Infinity : t(hi)]
  return [hi >= z0 ? 0 : t(hi), lo <= z1 ? Infinity : t(lo)]
}

/** La parte de cada minuto de un cambio de `minutos` minutos que cae dentro del margen. */
export function fracMinutos(z0: number, z1: number, vel: number, minutos: number, m: Margen): Frac[] {
  const c = cruce(z0, z1, vel, m)
  const out: Frac[] = []
  for (let j = 0; j < minutos; j++) {
    if (c === null) {
      out.push(null)
      continue
    }
    const s0 = Math.max(0, c[0] / 60 - j)
    const s1 = Math.min(1, c[1] / 60 - j)
    out.push(s0 > s1 ? null : s0 === 0 && s1 === 1 ? MINUTO_ENTERO : [s0, s1])
  }
  return out
}
```

- [ ] **Step 5: comprobar que pasa**

Run: `npx vitest run src/services/nav/objetivo.test.ts`
Expected: PASS, 15 pruebas.

- [ ] **Step 6: commit**

```bash
git add src/services/nav/tipos.ts src/services/nav/objetivo.ts src/services/nav/objetivo.test.ts
git commit -m "feat(nav): objetivo de altura y su margen"
```

---

### Task 2: las tablas saben del margen

**Files:**
- Modify: `src/services/nav/vertical.ts` (`Tablas`, `construirTablas`, nueva `fr`)
- Test: `src/services/nav/vertical.test.ts`

- [ ] **Step 1: la prueba que falla**

Añadir al final de `src/services/nav/vertical.test.ts` (y `fr` a la importación de `./vertical`):

```ts
describe('tablas con margen', () => {
  const dos: AjustesNav = { ...AJUSTES_POR_DEFECTO, altMinM: 0, altMaxM: 9999, modos: { puja_lent: 2, puja_rapid: 2, baixa_lent: 2, baixa_rapid: 2 } }
  const c = campoSintetico({ altM: [500, 800], etiqueta: ['a', 'b'] }, 10, () => [1, 0])
  it('sin margen, todo dentro y minutos enteros', () => {
    const t = construirTablas(c, 1, dos)
    expect(t.dentro).toEqual([true, true])
    expect(fr(t, 0, 1, 0)).toEqual([[0, 1], [0, 1], [0, 1]])
  })
  it('con margen, que franjas estan dentro y la parte de cada minuto de cada cambio', () => {
    // 300 m a 2 m/s son 150 s, 3 minutos. Dentro de 25 s a 75 s.
    const t = construirTablas(c, 1, dos, [550, 650])
    expect(t.dentro).toEqual([false, false])
    const f = fr(t, 0, 1, 0)
    expect(f).toHaveLength(3)
    expect(f[0]![0]).toBeCloseTo(25 / 60, 9)
    expect(f[0]![1]).toBe(1)
    expect(f[1]![0]).toBe(0)
    expect(f[1]![1]).toBeCloseTo(15 / 60, 9)
    expect(f[2]).toBeNull()
  })
})
```

`vertical.test.ts` ya importa `campoSintetico`, `AJUSTES_POR_DEFECTO` y `AjustesNav`. El `c` de dentro del `describe` tapa al de arriba a propósito.

- [ ] **Step 2: comprobar que falla**

Run: `npx vitest run src/services/nav/vertical.test.ts`
Expected: FAIL, `fr` no existe.

- [ ] **Step 3: implementar**

En `src/services/nav/vertical.ts`, importar:

```ts
import { enMargen, fracMinutos, SIN_MARGEN, type Frac, type Margen } from './objetivo'
```

Ampliar `Tablas`:

```ts
export interface Tablas {
  c: Campo
  f: number
  /** Posicion acumulada manteniendo cada franja desde el minuto 0, en idx(b, k). */
  px: Float64Array
  py: Float64Array
  /** filas[(b * B + b2) * 2 + clase][k0], null si no cabe en el horizonte. */
  filas: (Transito | null)[][]
  /** El margen del objetivo (spec 2026-11-01) y si cada franja esta dentro. */
  margen: Margen
  dentro: boolean[]
  /** frac[(b * B + b2) * 2 + clase][j]: la parte del minuto j del cambio dentro del margen. */
  frac: Frac[][]
}
```

Y `construirTablas` entera:

```ts
export function construirTablas(c: Campo, f: number, aj: AjustesNav, margen: Margen = SIN_MARGEN): Tablas {
  const B = c.rejilla.altM.length
  const H = c.minutos
  const altM = c.rejilla.altM
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
  const frac: Frac[][] = []
  for (let b = 0; b < B; b++) {
    for (let b2 = 0; b2 < B; b2++) {
      for (let cl = 0; cl < 2; cl++) {
        const fila: (Transito | null)[] = new Array<Transito | null>(H + 1).fill(null)
        let fm: Frac[] = []
        if (b !== b2) {
          const vel = velocidad(aj, altM[b2] > altM[b], cl)
          const m = minutosTransito(c, b, b2, vel)
          for (let k0 = 0; k0 + m <= H; k0++) fila[k0] = transito(c, f, b, b2, vel, k0)
          fm = fracMinutos(altM[b], altM[b2], vel, m, margen)
        }
        filas.push(fila)
        frac.push(fm)
      }
    }
  }
  return { c, f, px, py, filas, margen, dentro: altM.map(z => enMargen(z, margen)), frac }
}

/** La parte de cada minuto del cambio de b a b2 en la clase cl que cae dentro del margen. */
export function fr(t: Tablas, b: number, b2: number, cl: number): Frac[] {
  return t.frac[(b * t.c.rejilla.altM.length + b2) * 2 + cl]
}
```

- [ ] **Step 4: comprobar que pasa, y que lo demás sigue**

Run: `npx vitest run src/services/nav/`
Expected: PASS, todas.

- [ ] **Step 5: commit**

```bash
git add src/services/nav/vertical.ts src/services/nav/vertical.test.ts
git commit -m "feat(nav): las tablas guardan el margen y la parte de cada cambio dentro"
```

---

### Task 3: el plan sólo cuenta dentro del margen

**Files:**
- Modify: `src/services/nav/plan.ts` (`avanzar`, `aproximacion`, nueva `fracciones`, `candidatas`, `buscarPlan`)
- Modify: `src/services/nav/oraculo.ts` (margen y `fraccionesDirectas`)
- Test: `src/services/nav/plan.test.ts`

- [ ] **Step 1: las pruebas que fallan**

En `src/services/nav/plan.test.ts`, ampliar las importaciones:

```ts
import {
  aproximacion, aTramos, buscarPlan, caminoDirecto, caminoTabla, candidatas, debeSustituir, elegir, fracciones,
  type PlanInterno,
} from './plan'
import { fraccionesDirectas, oraculo } from './oraculo'
import { margenDe } from './objetivo'
import { construirTablas, type Tablas } from './vertical'
import type { Evaluado } from './plan'
```

(la importación de `construirTablas` que ya hay se sustituye por ésta).

Y añadir al final:

```ts
describe('aproximacion con margen', () => {
  const cam: [number, number][] = [[0, 0], [100, 0], [200, 0]]
  it('solo el trozo de dentro cuenta', () => {
    expect(aproximacion(cam, 150, 10, [null, [0.5, 1]]).distM).toBeCloseTo(10)
    expect(aproximacion(cam, 150, 10, [null, [0.8, 1]]).distM).toBeCloseTo(Math.hypot(30, 10))
  })
  it('el minuto es el del extremo del trozo mas cercano', () => {
    expect(aproximacion(cam, 150, 10, [null, [0.8, 1]]).minuto).toBe(2)
    expect(aproximacion(cam, 150, 10, [[0, 0.2], null]).minuto).toBe(0)
  })
  it('sin nada dentro, infinito', () => {
    expect(aproximacion(cam, 150, 10, [null, null]).distM).toBe(Infinity)
  })
})

describe('fracciones', () => {
  const c = campoSintetico(rejillaUniforme(3, 500), 20, () => [1, 0])
  const lento: AjustesNav = { ...aj, modos: { puja_lent: 1, puja_rapid: 1, baixa_lent: 1, baixa_rapid: 1 } }
  const m = margenDe({ tipo: 'altitud', altM: 576.2 }, c.rejilla)!
  const t = construirTablas(c, 1, lento, m)
  // 0 a 2 a 1 m/s: 152,4 m, 153 s con los pasos de 10 s, 3 minutos. Dentro de 38,1 s a 114,3 s.
  const p: PlanInterno = { franjas: [0, 2], clases: [0], dur: [4, 0] }
  it('con tablas y sin ellas, lo mismo', () => {
    expect(fracciones(t, p)).toEqual(fraccionesDirectas(c, lento, p, m))
  })
  it('mantener fuera, cruzar la franja 1, mantener fuera', () => {
    const f = fracciones(t, p)
    expect(f).toHaveLength(20)
    expect(f.slice(0, 4)).toEqual([null, null, null, null])
    expect(f[4]![0]).toBeCloseTo(38.1 / 60, 6)
    expect(f[5]![1]).toBeCloseTo(114.3 / 60 - 1, 6)
    expect(f[6]).toBeNull()
    expect(f.slice(7)).toEqual(new Array(13).fill(null))
  })
})

describe('buscarPlan con margen', () => {
  // franja 0 al este y franja 1 al norte, cambios de un minuto. El punto (3050, 2700) se alcanza
  // de dos maneras: al este y despues al norte (pasando en la franja 1), o al norte y despues al
  // este (pasando en la franja 0).
  const c = campoSintetico(rejillaUniforme(2, 500), 60, b => (b === 0 ? [5, 0] : [0, 5]))
  it('pasar a la franja 0: el plan acaba en ella', () => {
    const t = construirTablas(c, 1, rapido, margenDe({ tipo: 'altitud', altM: 500 }, c.rejilla)!)
    const e = buscarPlan(t, 0, 3050, 2700)
    expect(e.distM).toBeLessThanOrEqual(50)
    expect(e.plan.franjas).toEqual([0, 1, 0])
  })
  // Muchos planes empatan a 0 m y la busqueda guarda los 40 mejores por distancia, asi que lo que se
  // comprueba es lo que vera el piloto: el ultimo tramo de las ordenes, cortadas al pasar por el punto.
  const ultimo = (t: Tablas, e: Evaluado) => {
    const tr = aTramos(t, e.plan, Math.max(1, e.minuto))
    return tr[tr.length - 1]
  }
  it('pasar a la franja 1: pasa por el punto en ella', () => {
    const t = construirTablas(c, 1, rapido, margenDe({ tipo: 'altitud', altM: 576.2 }, c.rejilla)!)
    const e = buscarPlan(t, 0, 3050, 2700)
    expect(e.distM).toBeLessThanOrEqual(50)
    expect(ultimo(t, e).franja).toBe(1)
  })
  it('aterrar: pasa por el punto en terra', () => {
    const r = { altM: [300, 500, 576.2], etiqueta: ['terra', 'F1', 'F2'] }
    const c2 = campoSintetico(r, 60, b => (b === 0 ? [-1, 0] : b === 1 ? [0, 5] : [5, 0]))
    const t = construirTablas(c2, 1, rapido, margenDe({ tipo: 'aterrar' }, r)!)
    const e = buscarPlan(t, 2, 3000, 0)
    expect(e.distM).toBeLessThanOrEqual(50)
    expect(ultimo(t, e).franja).toBe(0)
  })
  it('no peor que la fuerza bruta con el mismo margen', () => {
    const c3 = campoSintetico(rejillaUniforme(5, 500), 60, (b, k) =>
      [Math.cos(b * 1.3 + k / 20) * 5, Math.sin(b * 1.3 + k / 20) * 5])
    const m = margenDe({ tipo: 'altitud', altM: 500 + 4 * 76.2 }, c3.rejilla)!
    const e = buscarPlan(construirTablas(c3, 1, aj, m), 2, -3000, 4000)
    const o = oraculo(c3, 1, aj, 2, -3000, 4000, m)
    expect(e.distM).toBeLessThanOrEqual(o.distM + 50)
  })
})

describe('candidatas con margen', () => {
  // 20 franjas: las de la franja 19 no estan en la envolvente ni alineadas con el punto
  const esquinas: [number, number][] = [[-3, 3], [-3, -3], [3, 3], [3, -3]]
  const c = campoSintetico(rejillaUniforme(20, 500), 20, b => (b < 4 ? [1, 0] : b === 19 ? [-1, 0] : esquinas[b % 4]))
  it('sin margen, la 19 no entra', () => {
    expect(candidatas(construirTablas(c, 1, rapido), 0, 1000, 0)).not.toContain(19)
  })
  it('con el margen en la 19, entra siempre', () => {
    const m = margenDe({ tipo: 'altitud', altM: 500 + 19 * 76.2 }, c.rejilla)!
    expect(candidatas(construirTablas(c, 1, rapido, m), 0, 1000, 0)).toContain(19)
  })
})
```

Comprobación de las cuentas de `fracciones`: de 500 a 652,4 m a 1 m/s, `transito` da pasos de 10 m y llega en 160 s (16 pasos, el último de 2,4 m), y `minutosTransito` da 3 minutos. `cruce` usa la altitud continua: entra en 538,1 m a los 38,1 s y sale en 614,3 m a los 114,3 s. El tránsito empieza en el minuto 4: `f[4]` es `[0,635, 1]`, `f[5]` es `[0, 0,905]`, `f[6]` es nulo, y del 7 al 19 se mantiene la franja 2, que está fuera.

- [ ] **Step 2: comprobar que fallan**

Run: `npx vitest run src/services/nav/plan.test.ts`
Expected: FAIL, `fracciones` y `fraccionesDirectas` no existen, y `aproximacion` ignora el cuarto argumento.

- [ ] **Step 3: implementar en `plan.ts`**

Importar:

```ts
import { fr, modoDe, tr, transito, velocidad, type Tablas } from './vertical'
import { MINUTO_ENTERO, type Frac } from './objetivo'
```

Sustituir `avanzar` y `aproximacion`:

```ts
/** Recorta el segmento al trozo de dentro del margen y apunta si pasa mas cerca. */
function avanzar(
  s: Min, ax: number, ay: number, bx: number, by: number, k: number, ox: number, oy: number, f: Frac = MINUTO_ENTERO,
): void {
  if (f === null) return
  const s0 = f[0]
  const s1 = f[1]
  if (f !== MINUTO_ENTERO) {
    const ex = bx - ax
    const ey = by - ay
    bx = ax + s1 * ex
    by = ay + s1 * ey
    ax += s0 * ex
    ay += s0 * ey
  }
  const d = distSegmento(ax, ay, bx, by, ox, oy)
  if (d < s.m) {
    s.m = d
    s.mk = Math.round(k - 1 + (Math.hypot(ax - ox, ay - oy) < Math.hypot(bx - ox, by - oy) ? s0 : s1))
  }
}

/**
 * La distancia minima de un camino al punto, por segmentos, y el minuto en que pasa.
 * `fr[k]` es la parte del segmento del minuto k al k+1 dentro del margen; sin ella, todo.
 */
export function aproximacion(cam: Camino, ox: number, oy: number, fr?: Frac[]): { distM: number; minuto: number } {
  const s: Min = { m: Infinity, mk: 0 }
  for (let k = 1; k < cam.length; k++) {
    avanzar(s, cam[k - 1][0], cam[k - 1][1], cam[k][0], cam[k][1], k, ox, oy, fr === undefined ? MINUTO_ENTERO : fr[k - 1])
  }
  return { distM: s.m, minuto: s.mk }
}

/** La parte de cada minuto del plan dentro del margen de las tablas (spec 2026-11-01 §4.1). */
export function fracciones(t: Tablas, p: PlanInterno): Frac[] {
  const H = t.c.minutos
  const out: Frac[] = []
  for (let i = 0; i < p.franjas.length && out.length < H; i++) {
    const b = p.franjas[i]
    if (i > 0) out.push(...fr(t, p.franjas[i - 1], b, p.clases[i - 1]))
    const fin = i === p.franjas.length - 1 ? H : out.length + p.dur[i]
    const f = t.dentro[b] ? MINUTO_ENTERO : null
    while (out.length < fin) out.push(f)
  }
  return out.slice(0, H)
}
```

En `candidatas`, justo después de `const set = new Set<number>([b0])`:

```ts
  // Las franjas del margen del objetivo entran siempre (spec 2026-11-01 §4.2).
  if (Number.isFinite(t.margen[0]) || Number.isFinite(t.margen[1])) {
    for (const b of todas) if (t.dentro[b]) set.add(b)
  }
```

`buscarPlan` entera:

```ts
export function buscarPlan(t: Tablas, b0: number, ox: number, oy: number): Evaluado {
  const c = t.c
  const H = c.minutos
  const W = H + 1
  const px = t.px
  const py = t.py
  const en = (b: number): Frac => (t.dentro[b] ? MINUTO_ENTERO : null)
  const cand = candidatas(t, b0, ox, oy)
  const top: Evaluado[] = []
  const meter = (plan: PlanInterno, distM: number, minuto: number) => {
    if (top.length >= TOP_PLANES && distM >= top[top.length - 1].distM) return
    top.push({ plan, distM, minuto })
    top.sort((a, b) => a.distM - b.distM)
    if (top.length > TOP_PLANES) top.pop()
  }

  // Mantener la actual: el minimo acumulado sirve a todos los planes que salen de ella.
  const minB = new Float64Array(W).fill(Infinity)
  const argB = new Int32Array(W)
  const f0 = en(b0)
  const s0: Min = { m: Infinity, mk: 0 }
  for (let k = 1; k <= H; k++) {
    avanzar(s0, px[b0 * W + k - 1], py[b0 * W + k - 1], px[b0 * W + k], py[b0 * W + k], k, ox, oy, f0)
    minB[k] = s0.m
    argB[k] = s0.mk
  }
  meter({ franjas: [b0], clases: [], dur: [H] }, minB[H], argB[H])

  for (let d0 = 0; d0 < H; d0 += 2) {
    const sx = px[b0 * W + d0]
    const sy = py[b0 * W + d0]
    for (const A of cand) {
      if (A === b0) continue
      const fA = en(A)
      for (let ca = 0; ca < 2; ca++) {
        const ta = tr(t, b0, A, ca, d0)
        if (ta === null) continue
        const ra = fr(t, b0, A, ca)
        const sA: Min = { m: minB[d0], mk: argB[d0] }
        let lx = sx
        let ly = sy
        for (let j = 0; j < ta.camino.length; j++) {
          const x = sx + ta.camino[j][0]
          const y = sy + ta.camino[j][1]
          avanzar(sA, lx, ly, x, y, d0 + 1 + j, ox, oy, ra[j])
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
            avanzar(sA, lx, ly, x, y, k, ox, oy, fA)
            lx = x
            ly = y
          }
          const dA = k - kA
          if (dA < MIN_MANTENER || dA % 2 !== 0 || k >= H) continue
          for (const Bf of cand) {
            if (Bf === A) continue
            const fB = en(Bf)
            for (let cb = 0; cb < 2; cb++) {
              const tb = tr(t, A, Bf, cb, k)
              if (tb === null) continue
              const rb = fr(t, A, Bf, cb)
              const sB: Min = { m: sA.m, mk: sA.mk }
              let mx = x
              let my = y
              for (let j = 0; j < tb.camino.length; j++) {
                const nx = x + tb.camino[j][0]
                const ny = y + tb.camino[j][1]
                avanzar(sB, mx, my, nx, ny, k + 1 + j, ox, oy, rb[j])
                mx = nx
                my = ny
              }
              const kB = k + tb.minutos
              const bx = mx - px[Bf * W + kB]
              const by = my - py[Bf * W + kB]
              for (let kk = kB + 1; kk <= H; kk++) {
                const nx = bx + px[Bf * W + kk]
                const ny = by + py[Bf * W + kk]
                avanzar(sB, mx, my, nx, ny, kk, ox, oy, fB)
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
        const a = aproximacion(cam, ox, oy, fracciones(t, p))
        meter(p, a.distM, a.minuto)
      }
    }
  }
  return elegir(top)
}
```

Los dos cambios respecto al 30/10 fuera del margen: `minB[0]` empieza en infinito (la posición del minuto 0 ya la cubre el primer segmento de lo que siga) y cada `avanzar` lleva la parte del minuto que cuenta.

- [ ] **Step 4: implementar en `oraculo.ts`**

`src/services/nav/oraculo.ts` entero:

```ts
// src/services/nav/oraculo.ts
// Solo para las pruebas: la fuerza bruta del prototipo (optim2.py) con la
// simulacion directa, sin tablas. Mantener la actual de 0 a 20 min, ir a A,
// mantenerla de 2 a 20, ir a B y mantenerla hasta el horizonte, de 2 en 2 min.
// Con un margen (spec 2026-11-01), la distancia solo cuenta dentro, con sus
// fracciones calculadas aqui sin las tablas, para no compartir errores con ellas.
import type { Campo } from './campo'
import { aproximacion, caminoDirecto, type Evaluado, type PlanInterno } from './plan'
import { minutosTransito, velocidad } from './vertical'
import { enMargen, fracMinutos, MINUTO_ENTERO, SIN_MARGEN, type Frac, type Margen } from './objetivo'
import type { AjustesNav } from './tipos'

export function fraccionesDirectas(c: Campo, aj: AjustesNav, p: PlanInterno, m: Margen): Frac[] {
  const H = c.minutos
  const z = c.rejilla.altM
  const out: Frac[] = []
  for (let i = 0; i < p.franjas.length && out.length < H; i++) {
    const b = p.franjas[i]
    if (i > 0) {
      const a = p.franjas[i - 1]
      const vel = velocidad(aj, z[b] > z[a], p.clases[i - 1])
      out.push(...fracMinutos(z[a], z[b], vel, minutosTransito(c, a, b, vel), m))
    }
    const fin = i === p.franjas.length - 1 ? H : out.length + p.dur[i]
    const f = enMargen(z[b], m) ? MINUTO_ENTERO : null
    while (out.length < fin) out.push(f)
  }
  return out.slice(0, H)
}

export function oraculo(
  c: Campo, f: number, aj: AjustesNav, b0: number, ox: number, oy: number, m: Margen = SIN_MARGEN,
): Evaluado {
  const r: { mejor: Evaluado | null } = { mejor: null }
  const probar = (plan: PlanInterno) => {
    const cam = caminoDirecto(c, f, aj, plan)
    if (cam === null) return
    const a = aproximacion(cam, ox, oy, fraccionesDirectas(c, aj, plan, m))
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

- [ ] **Step 5: comprobar que pasan, y que lo del 30/10 sigue igual**

Run: `npx vitest run src/services/nav/`
Expected: PASS, todas. Las pruebas del 30/10 (`buscarPlan`, `motor` con el 10/10 y el oráculo) pasan sin tocarlas.

- [ ] **Step 6: commit**

```bash
git add src/services/nav/plan.ts src/services/nav/oraculo.ts src/services/nav/plan.test.ts
git commit -m "feat(nav): el plan solo cuenta la distancia dentro del margen del objetivo"
```

---

### Task 4: la zona sigue al objetivo

**Files:**
- Modify: `src/services/nav/zona.ts` (`calcularZona`)
- Test: `src/services/nav/zona.test.ts`

- [ ] **Step 1: las pruebas que fallan**

En `src/services/nav/zona.test.ts`, ampliar las importaciones:

```ts
import { fraccionesDirectas } from './oraculo'
import { margenDe } from './objetivo'
```

Y añadir al final:

```ts
describe('zona con margen', () => {
  const r = { altM: [300, 500, 576.2, 652.4], etiqueta: ['terra', 'F1', 'F2', 'F3'] }
  const c = campoSintetico(r, 30, (b, k) => [Math.cos(b * 1.7 + k / 9) * 5, Math.sin(b * 1.1 + k / 13) * 5])
  const lento: AjustesNav = { ...aj, modos: { puja_lent: 0.5, puja_rapid: 2.75, baixa_lent: 0.5, baixa_rapid: 4 } }
  const zq = calcularZona(construirTablas(c, 1, lento), 2)
  const m = margenDe({ tipo: 'aterrar' }, r)!
  const za = calcularZona(construirTablas(c, 1, lento, m), 2)

  it('el minuto 0, en la franja 2, no tiene zona de aterrar', () => {
    expect(poligono(za, 0)).toEqual([])
    expect(za.h[0][0]).toBe(-Infinity)
  })
  it('dentro de la de qualsevol, minuto a minuto', () => {
    for (let k = 1; k <= 30; k++) {
      for (let d = 0; d < za.dirs.length; d++) {
        expect(za.h[d][k]).toBeLessThanOrEqual(Math.max(zq.h[d][k - 1], zq.h[d][k]) + 1e-6)
      }
    }
  })
  it('la cota exterior contiene todo lo que la fuerza bruta pasa en terra', () => {
    let trozos = 0
    let peor = -Infinity
    for (let h0 = 0; h0 <= 10; h0 += 2) {
      for (let A = 0; A < 4; A++) {
        if (A === 2) continue
        for (let ca = 0; ca < 2; ca++) {
          for (let hA = 2; hA <= 8; hA += 2) {
            for (let B = 0; B < 4; B++) {
              if (B === A) continue
              for (let cb = 0; cb < 2; cb++) {
                const p: PlanInterno = { franjas: [2, A, B], clases: [ca, cb], dur: [h0, hA, 0] }
                const cam = caminoDirecto(c, 1, lento, p)
                if (cam === null) continue
                const fr = fraccionesDirectas(c, lento, p, m)
                for (let k = 0; k < 30; k++) {
                  const f = fr[k]
                  if (f === null) continue
                  trozos++
                  for (const s of f) {
                    const x = cam[k][0] + s * (cam[k + 1][0] - cam[k][0])
                    const y = cam[k][1] + s * (cam[k + 1][1] - cam[k][1])
                    for (let d = 0; d < za.dirs.length; d++) {
                      const tope = Math.max(za.h[d][k], za.h[d][k + 1])
                      peor = Math.max(peor, x * za.dirs[d][0] + y * za.dirs[d][1] - tope)
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    expect(trozos).toBeGreaterThan(100)
    expect(peor).toBeLessThanOrEqual(1e-6)
  })
})

describe('un punto que se pasa en altura pero donde no se puede aterrizar', () => {
  // Terra hacia el oeste a 5 m/s y lo demas hacia el este a 5 m/s, 30 min, desde 576,2 m.
  // Manteniendo la franja se llega a 9 000 m al este. A terra se baja como pronto en 70 s a 4 m/s,
  // asi que lo mas al este que se esta en terra es bajando en el minuto 28: unos 8 530 m.
  const r = { altM: [300, 500, 576.2, 652.4], etiqueta: ['terra', 'F1', 'F2', 'F3'] }
  const c = campoSintetico(r, 30, b => (b === 0 ? [-5, 0] : [5, 0]))
  const lento: AjustesNav = { ...aj, modos: { puja_lent: 0.5, puja_rapid: 2.75, baixa_lent: 0.5, baixa_rapid: 4 } }
  const zq = calcularZona(construirTablas(c, 1, lento), 2)
  const za = calcularZona(construirTablas(c, 1, lento, margenDe({ tipo: 'aterrar' }, r)!), 2)
  it('a cualquier altura se alcanza', () => { expect(fueraSeguro(zq, 8800, 0)).toBe(false) })
  it('en terra no, y se sabe', () => { expect(fueraSeguro(za, 8800, 0)).toBe(true) })
  it('en el minuto 1 todavia no se puede estar en terra', () => {
    expect(za.h.every(hd => hd[1] === -Infinity)).toBe(true)
  })
})
```

Cuentas del caso: bajar de 576,2 a 300 m a 4 m/s son 7 pasos de 10 s. La deriva de esos pasos, con el viento interpolado entre franjas, suma unos +140 m, y los 50 s que quedan del segundo minuto en terra, −250 m. `cruce` entra en terra a los 68,8 s, y en ese instante la posición lineal del minuto está unos 131 m al este del inicio de la bajada. Bajando en el minuto 28 (300 × 28 = 8 400 m), lo más al este en terra son unos 8 531 m, y 8 800 queda más de 50 m fuera.

- [ ] **Step 2: comprobar que fallan**

Run: `npx vitest run src/services/nav/zona.test.ts`
Expected: FAIL. `za.h[0][0]` es 0 y no `-Infinity`, porque hoy se marca todo.

- [ ] **Step 3: implementar**

En `src/services/nav/zona.ts`, importar `fr`:

```ts
import { fr, tr, type Tablas } from './vertical'
```

Actualizar la cabecera del fichero, al final del comentario:

```ts
// exterior valga para cualquier plan. Con el margen de un objetivo (spec
// 2026-11-01 §4.3) solo se marca lo que cae dentro: la programacion dinamica no
// cambia, el margen solo decide que posiciones cuentan.
```

Y `calcularZona` entera:

```ts
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
        const tm = s % T
        const n = (Math.floor(s / T) % MAX_ALTITUDES) + 1
        const b = Math.floor(s / (T * MAX_ALTITUDES))
        if (t.dentro[b]) marcar(k, x, y)
        if (k === H) continue
        const i = b * W + k
        // De la actual se sale al minuto 0 o tras MIN_MANTENER, como en plan.ts: el primer minuto
        // mantenido cuenta desde cero.
        const sig = k === 0 && n === 1 ? 1 : Math.min(tm + 1, MIN_MANTENER)
        relajar(k + 1, st(b, n, sig), x + t.px[i + 1] - t.px[i], y + t.py[i + 1] - t.py[i])
        if (tm < MIN_MANTENER || n >= MAX_ALTITUDES) continue
        for (let b2 = 0; b2 < B; b2++) {
          if (b2 === b) continue
          for (let cl = 0; cl < 2; cl++) {
            const tt = tr(t, b, b2, cl, k)
            if (tt === null) continue
            // Solo lo que cae dentro del margen. Un trozo de minuto se marca en el minuto en que
            // acaba, y la cota exterior de fueraSeguro mira los dos extremos de cada minuto. Con el
            // minuto entero, cada posicion intermedia en su minuto, y la ultima la marca la llegada.
            const ff = fr(t, b, b2, cl)
            let qx = x
            let qy = y
            for (let j = 0; j < tt.camino.length; j++) {
              const nx = x + tt.camino[j][0]
              const ny = y + tt.camino[j][1]
              const f = ff[j]
              if (f !== null) {
                if (f[0] > 0) marcar(k + 1 + j, qx + f[0] * (nx - qx), qy + f[0] * (ny - qy))
                if (f[1] < 1 || j < tt.camino.length - 1) marcar(k + 1 + j, qx + f[1] * (nx - qx), qy + f[1] * (ny - qy))
              }
              qx = nx
              qy = ny
            }
            relajar(k + tt.minutos, st(b2, n + 1, 0), x + tt.dx, y + tt.dy)
          }
        }
      }
    }
    // Un minuto sin nada dentro del margen no tiene extremos.
    for (let k = 0; k <= H; k++) if (hd[k] > -Infinity) ext[k].push([ex[k], ey[k]])
  }
  return { minutos: H, dirs, h, ext }
}
```

Respecto al 30/10 cambian tres cosas: el estado sólo se marca si su franja está dentro, el tránsito marca los extremos del trozo de cada minuto que cae dentro, y `ext` no guarda extremos de minutos vacíos. Con todo dentro (`qualsevol`) marca exactamente lo mismo que antes.

- [ ] **Step 4: comprobar que pasan, y que lo del 30/10 sigue**

Run: `npx vitest run src/services/nav/`
Expected: PASS, todas.

- [ ] **Step 5: commit**

```bash
git add src/services/nav/zona.ts src/services/nav/zona.test.ts
git commit -m "feat(nav): la zona alcanzable sigue al margen del objetivo"
```

---

### Task 5: órdenes con el objetivo

**Files:**
- Modify: `src/services/nav/ordenes.ts` (`alturaFt`, `ordenes`)
- Test: `src/services/nav/ordenes.test.ts`

- [ ] **Step 1: las pruebas que fallan**

En `src/services/nav/ordenes.test.ts`, importar `alturaFt` de `./ordenes` y añadir:

```ts
describe('ordenes con objetivo', () => {
  const tramos: Tramo[] = [
    { tipo: 'mantener', franja: 0, modo: null, inicioMin: 0, finMin: 9 },
    { tipo: 'cambiar', franja: 1, modo: 'puja_rapid', inicioMin: 9, finMin: 10 },
  ]
  it('pasar a una altitud cruzandola: la dice', () => {
    const o = { tipo: 'altitud' as const, altM: 1600 * 0.3048 }
    expect(ordenes(c, aj, tramos, true, o)[1]).toBe('Puja ràpid (2,5 a 3 m/s) cap a 1 750 ft, i passes pel punt a 1 600 ft pujant.')
    expect(ordenes(c, aj, tramos, false, o)[1]).toBe('Puja ràpid (2,5 a 3 m/s) cap a 1 750 ft, i passes pel punt més proper a 1 600 ft pujant.')
  })
  it('aterrar llegando a terra en el punto', () => {
    const ct = campoSintetico({ altM: [380, 457.2], etiqueta: ['terra', '1 500 ft'] }, 60, () => [1, 0])
    const baja: Tramo[] = [
      { tipo: 'mantener', franja: 1, modo: null, inicioMin: 0, finMin: 9 },
      { tipo: 'cambiar', franja: 0, modo: 'baixa_rapid', inicioMin: 9, finMin: 10 },
    ]
    expect(ordenes(ct, aj, baja, true, { tipo: 'aterrar' })[1]).toBe('Baixa ràpid (3 a 5 m/s) fins a terra, i hi arribes al punt.')
    expect(ordenes(ct, aj, baja, false, { tipo: 'aterrar' })[1]).toBe('Baixa ràpid (3 a 5 m/s) fins a terra, i hi arribes al punt més proper.')
  })
  it('qualsevol, como el 30/10', () => {
    expect(ordenes(c, aj, tramos, true, { tipo: 'qualsevol' })[1]).toBe('Puja ràpid (2,5 a 3 m/s) cap a 1 750 ft, i passes pel punt pujant.')
  })
  it('altura en pies', () => { expect(alturaFt(2000 * 0.3048)).toBe('2 000 ft') })
})
```

- [ ] **Step 2: comprobar que fallan**

Run: `npx vitest run src/services/nav/ordenes.test.ts`
Expected: FAIL, `alturaFt` no existe.

- [ ] **Step 3: implementar**

En `src/services/nav/ordenes.ts`, importar:

```ts
import { idx, miles, PIE_M, type Campo } from './campo'
import { QUALSEVOL, type AjustesNav, type Modo, type Objetivo, type Tramo } from './tipos'
```

(sustituyen a las importaciones de `./campo` y `./tipos` que hay). Añadir después de `distancia`:

```ts
/** Una altitud sobre el mar en pies, «2 000 ft». */
export function alturaFt(altM: number): string {
  return `${miles(altM / PIE_M)} ft`
}
```

Y `ordenes` entera:

```ts
/**
 * `llega` falso: la ultima orden lleva al punto mas proximo, no al punto. El
 * objetivo cambia la ultima orden si el plan acaba en un cambio (spec 2026-11-01 §6).
 */
export function ordenes(c: Campo, aj: AjustesNav, tramos: Tramo[], llega = true, objetivo: Objetivo = QUALSEVOL): string[] {
  const mp = llega ? '' : ' més proper'
  return tramos.map((t, i) => {
    const alt = c.rejilla.etiqueta[t.franja]
    if (t.tipo === 'cambiar' && t.modo !== null) {
      const [a, b] = aj.rangos[t.modo]
      const base = `${NOM_MODO[t.modo]} (${decimal(a)} a ${decimal(b)} m/s)`
      let txt: string
      if (i < tramos.length - 1) txt = `${base} fins a ${alt}.`
      else if (objetivo.tipo === 'aterrar') txt = `${base} fins a ${alt}, i hi arribes al punt${mp}.`
      else {
        // Si el plan acaba en un cambio, el punto se pasa a mitad de la subida o la bajada.
        const aQue = objetivo.tipo === 'altitud' ? ` a ${alturaFt(objetivo.altM)}` : ''
        txt = `${base} cap a ${alt}, i passes pel punt${mp}${aQue} ${t.modo.startsWith('puja') ? 'pujant' : 'baixant'}.`
      }
      return t.inicioMin === 0 ? `Ara, ${txt}` : txt[0].toUpperCase() + txt.slice(1)
    }
    const w = vientoTramo(c, t.franja, t.inicioMin, t.finMin)
    const cap = `cap a ${String(Math.round(w.rumbo) % 360).padStart(3, '0')}° a ${Math.round(w.kt)} kt (${w.medido ? 'mesurat' : 'previst'})`
    return i === tramos.length - 1
      ? `Manté ${alt} fins al punt${mp}, ${cap}.`
      : `Manté ${alt} ${t.finMin - t.inicioMin} min, ${cap}.`
  })
}
```

- [ ] **Step 4: comprobar que pasan**

Run: `npx vitest run src/services/nav/ordenes.test.ts`
Expected: PASS, todas, también las del 30/10.

- [ ] **Step 5: commit**

```bash
git add src/services/nav/ordenes.ts src/services/nav/ordenes.test.ts
git commit -m "feat(nav): ordenes que dicen la altura del punto o la llegada a terra"
```

---

### Task 6: el motor con objetivo

**Files:**
- Modify: `src/services/nav/motor.ts` (`EntradaNav.objetivo`, `navegar`)
- Test: `src/services/nav/motor.test.ts`

- [ ] **Step 1: las pruebas que fallan**

En `src/services/nav/motor.test.ts`, importar:

```ts
import { margenDe } from './objetivo'
import type { Objetivo } from './tipos'
```

Y añadir al final:

```ts
describe('objetivo de altura con el 10/10', () => {
  const rec = recortar(prev, franjas(aj.altMinM, aj.altMaxM, prev.elevM + 10), ahora, 60)
  const b0 = franjaMasCercana(rec.campo.rejilla, altM)
  const punto = aGeo(despegue, ZA[0], ZA[1])
  const [ox, oy] = aPlano({ lat0: pos.lat, lon0: pos.lon }, punto.lat, punto.lon)
  const casos: [string, Objetivo][] = [['aterrar', { tipo: 'aterrar' }], ['2 500 ft', { tipo: 'altitud', altM: 2500 * 0.3048 }]]

  it('la rejilla empieza por terra', () => { expect(rec.campo.rejilla.etiqueta[0]).toBe('terra') })
  it('sin objetivo, qualsevol', () => { expect(navegar(entrada()).objetivo).toEqual({ tipo: 'qualsevol' }) })

  for (const [nom, obj] of casos) {
    it(`${nom}: no peor que la fuerza bruta con el mismo margen`, () => {
      const r = navegar(entrada({ objetivo: obj }))
      const o = oraculo(rec.campo, rec.campo.nombres.length - 1, aj, b0, ox, oy, margenDe(obj, rec.campo.rejilla)!)
      expect(r.objetivo).toEqual(obj)
      expect(Number.isFinite(o.distM)).toBe(true)
      expect(r.distanciaMinM!).toBeLessThanOrEqual(o.distM + 50)
    })
  }

  it('aterrar: el plan acaba en terra, y si no fas res no baixes', () => {
    const r = navegar(entrada({ objetivo: { tipo: 'aterrar' } }))
    expect(r.plan[r.plan.length - 1].franja).toBe(0)
    expect(r.ordenes.some(l => /^(Arribes a terra a .+ del punt a les \d\d:\d\d\.|El més a prop a terra: .+ a les \d\d:\d\d\.)$/.test(l))).toBe(true)
    expect(r.siNoHaces).toBeNull()
    expect(r.ordenes).toContain('Si no fas res, no baixes a terra.')
  })
  it('2 500 ft: el resumen dice la altura, y si no fas res no hi passes', () => {
    const r = navegar(entrada({ objetivo: { tipo: 'altitud', altM: 2500 * 0.3048 } }))
    expect(r.ordenes.some(l => /^(Passes a .+ del punt a 2 500 ft a les|El més a prop a 2 500 ft:)/.test(l))).toBe(true)
    expect(r.siNoHaces).toBeNull()
    expect(r.ordenes).toContain('Si no fas res, no hi passes a 2 500 ft.')
  })
  it('a la altura actual, si no fas res tiene distancia', () => {
    const r = navegar(entrada({ objetivo: { tipo: 'altitud', altM: 1500 * 0.3048 } }))
    expect(r.siNoHaces).not.toBeNull()
  })
  it('fuera del rango: no inventa plan', () => {
    const r = navegar(entrada({ objetivo: { tipo: 'altitud', altM: 5000 * 0.3048 } }))
    expect(r.estado).toBe('no-llega')
    expect(r.distanciaMinM).toBeNull()
    expect(r.plan).toEqual([])
    expect(r.avisos.some(a => /^5 000 ft queda fora del rang de càlcul \(terra a .+ ft\)\.$/.test(a))).toBe(true)
  })
  it('ningun plan entra en el margen dentro del horizonte', () => {
    const lento: AjustesNav = { ...aj, modos: { puja_lent: 0.05, puja_rapid: 0.05, baixa_lent: 0.05, baixa_rapid: 0.05 } }
    const r = navegar(entrada({ ajustes: lento, objetivo: { tipo: 'altitud', altM: 3750 * 0.3048 } }))
    expect(r.estado).toBe('no-llega')
    expect(r.distanciaMinM).toBeNull()
    expect(r.avisos).toContain("Cap pla hi passa a 3 750 ft dins de l'horitzó.")
  })
  it('aterrar, el mejor de tres por debajo de 2 s', () => {
    let ms = Infinity
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now()
      navegar(entrada({ objetivo: { tipo: 'aterrar' } }))
      ms = Math.min(ms, performance.now() - t0)
    }
    console.log(`motor con aterrar y el 10/10: ${ms.toFixed(0)} ms`)
    expect(ms).toBeLessThan(2000)
  }, 20000)
})
```

- [ ] **Step 2: comprobar que fallan**

Run: `npx vitest run src/services/nav/motor.test.ts`
Expected: FAIL, el resultado no lleva `objetivo` y la distancia cuenta a cualquier altura.

- [ ] **Step 3: implementar**

En `src/services/nav/motor.ts`, importaciones nuevas o ampliadas:

```ts
import { QUALSEVOL, type AjustesNav, type Objetivo, type Punto, type PuntoTraza, type ResultadoNavegacion, type Tramo } from './tipos'
import { aTramos, aproximacion, buscarPlan, caminoDirecto, fracciones, type PlanInterno } from './plan'
import { alturaFt, distancia, hora, ordenes } from './ordenes'
import { margenDe, SIN_MARGEN, tocaRango } from './objetivo'
```

En `EntradaNav`, después de `despegue?`:

```ts
  /** El objetivo de altura en el punto (spec 2026-11-01). Sin el, qualsevol. */
  objetivo?: Objetivo
```

`navegar` entera:

```ts
export function navegar(e: EntradaNav): ResultadoNavegacion {
  const iso = (ms: number) => new Date(ms).toISOString()
  const avisos: string[] = []
  const obj = e.objetivo ?? QUALSEVOL
  const vacio = (estado: ResultadoNavegacion['estado']): ResultadoNavegacion => ({
    estado, objetivo: obj, plan: [], distanciaMinM: null, horaMin: null, siNoHaces: null, dispersion: [],
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
  const terraM = e.incluirTerra || obj.tipo === 'aterrar' ? e.prevision.elevM + 10 : null
  const r = recortar(e.prevision, franjas(e.ajustes.altMinM, e.ajustes.altMaxM, terraM), e.ahora, e.ajustes.horizonteMin)
  if (r.fuera.length > 0) avisos.push(`Franges sense previsió, fora del càlcul: ${r.fuera.join(', ')}.`)
  if (r.campo.rejilla.altM.length === 0 || r.campo.minutos === 0) {
    avisos.push('Sense previsió per calcular.')
    return vacio('sin-datos')
  }
  if (r.campo.minutos < e.ajustes.horizonteMin) {
    avisos.push(`Horitzó escurçat a ${r.campo.minutos} min: la previsió no arriba més enllà.`)
  }

  // El objetivo es del punto: sin punto, la zona es la de cualquier altura.
  const rej = r.campo.rejilla
  const et = obj.tipo === 'altitud' ? alturaFt(obj.altM) : 'terra'
  const m = e.punto === null ? SIN_MARGEN : margenDe(obj, rej)
  if (m === null) {
    avisos.push("Falta la franja terra: no es pot calcular l'aterratge.")
    return vacio('no-llega')
  }
  if (!tocaRango(m, rej)) {
    avisos.push(`${et} queda fora del rang de càlcul (${rej.etiqueta[0]} a ${rej.etiqueta[rej.etiqueta.length - 1]}).`)
    return vacio('no-llega')
  }

  const medidas = medidasGps(trazaEnVuelo(e.traza, e.despegue), rej, plano)
  const corr = corregirCampo(r.campo, e.prevision, medidas, e.ahora)
  if (medidas.length > 0 && !corr.corregido) avisos.push('Vent mesurat no aplicat: el càlcul de la correcció ha fallat.')
  const c = corr.campo
  const fc = c.nombres.length - 1
  const t = construirTablas(c, fc, e.ajustes, m)
  const b0 = franjaMasCercana(c.rejilla, actual.altM)

  const zonaInt = calcularZona(t, b0)
  const minutosZona: number[] = []
  for (let k = PASO_ZONA_MIN; k < c.minutos; k += PASO_ZONA_MIN) minutosZona.push(k)
  minutosZona.push(c.minutos)
  const zona = minutosZona
    .map(k => poligono(zonaInt, k).map(([x, y]) => aGeo(plano, x, y)))
    .filter(p => p.length > 0)

  if (e.punto === null) return { ...vacio('sin-punto'), zona }

  const [ox, oy] = aPlano(plano, e.punto.lat, e.punto.lon)
  const quieto: PlanInterno = { franjas: [b0], clases: [], dur: [c.minutos] }
  const aQuieto = aproximacion(caminoDirecto(c, fc, e.ajustes, quieto)!, ox, oy, fracciones(t, quieto))
  const mejor = buscarPlan(t, b0, ox, oy)
  if (!Number.isFinite(mejor.distM)) {
    avisos.push(`Cap pla hi passa a ${et} dins de l'horitzó.`)
    return { ...vacio('no-llega'), zona }
  }
  // Quedarse si el plan mejora menos de 50 m, salvo que el plan llegue y quedarse no.
  const cruzaUmbral = mejor.distM <= LLEGA_M && aQuieto.distM > LLEGA_M
  const sinMejora = mejor.plan.franjas.length === 1 || (!cruzaUmbral && mejor.distM > aQuieto.distM - LLEGA_M)
  const elegido = sinMejora ? { plan: quieto, distM: aQuieto.distM, minuto: aQuieto.minuto } : mejor
  const tramos: Tramo[] = aTramos(t, elegido.plan, Math.max(1, elegido.minuto))

  const frElegido = fracciones(t, elegido.plan)
  const dispersion: ResultadoNavegacion['dispersion'] = []
  for (let mo = 0; mo < fc; mo++) {
    const cam = caminoDirecto(c, mo, e.ajustes, elegido.plan)
    if (cam === null || cam.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) continue
    const dm = aproximacion(cam, ox, oy, frElegido).distM
    if (Number.isFinite(dm)) dispersion.push({ modelo: c.nombres[mo], distanciaMinM: dm })
  }

  // Con la posicion vieja el origen no es donde esta el globo: no se demuestra nada.
  const fuera = edadMin < 1 && fueraSeguro(zonaInt, ox, oy)
  const llega = elegido.distM <= LLEGA_M
  const horaMs = c.t0 + elegido.minuto * 60000
  const d = distancia(elegido.distM)
  const h = hora(horaMs)
  const quietoPasa = Number.isFinite(aQuieto.distM)
  const resumen: string[] = []
  if (llega) {
    if (obj.tipo === 'aterrar') resumen.push(`Arribes a terra a ${d} del punt a les ${h}.`)
    else resumen.push(`Passes a ${d} del punt${obj.tipo === 'altitud' ? ` a ${et}` : ''} a les ${h}.`)
  } else {
    if (fuera) resumen.push("No s'hi arriba amb aquest vent.")
    resumen.push(`El més a prop${obj.tipo === 'qualsevol' ? '' : ` a ${et}`}: ${d} a les ${h}.`)
  }
  if (sinMejora) resumen.push("Cap pla s'hi acosta més que quedar-te a aquesta altitud.")
  if (quietoPasa) resumen.push(`Si no fas res: ${distancia(aQuieto.distM)} a les ${hora(c.t0 + aQuieto.minuto * 60000)}.`)
  else resumen.push(obj.tipo === 'aterrar' ? 'Si no fas res, no baixes a terra.' : `Si no fas res, no hi passes a ${et}.`)
  if (dispersion.length > 1) {
    const ds = dispersion.map(x => x.distanciaMinM)
    const [dmin, dmax] = [distancia(Math.min(...ds)), distancia(Math.max(...ds))]
    resumen.push(dmin === dmax ? `Amb tots els models, ${dmin}.` : `Amb cada model, entre ${dmin} i ${dmax}.`)
  }

  return {
    ...vacio(llega ? 'llega' : 'no-llega'),
    plan: tramos,
    distanciaMinM: elegido.distM,
    horaMin: iso(horaMs),
    siNoHaces: quietoPasa ? { distanciaMinM: aQuieto.distM, horaMin: iso(c.t0 + aQuieto.minuto * 60000) } : null,
    dispersion,
    fueraSeguro: fuera,
    zona,
    ordenes: [...ordenes(c, e.ajustes, tramos, llega, obj), ...resumen],
  }
}
```

`quieto` con `qualsevol` siempre pasa, así que el «Si no fas res» del 30/10 no cambia.

- [ ] **Step 4: comprobar que pasan, todas**

Run: `npm test`
Expected: PASS, todas. Apuntar el tiempo que imprime la prueba de rendimiento con aterrar.

- [ ] **Step 5: tipos y build**

Run: `npx tsc -b && npm run build`
Expected: sin errores.

- [ ] **Step 6: commit**

```bash
git add src/services/nav/motor.ts src/services/nav/motor.test.ts
git commit -m "feat(nav): el motor navega con el objetivo de altura del punto"
```

---

### Task 7: documentación y estado

**Files:**
- Modify: `docs/superpowers/specs/2026-11-01-objetivo-de-altura-design.md` (§6, texto de fuera del rango)
- Modify: `STATUS.md`

- [ ] **Step 1: el texto de fuera del rango en el spec**

En §6 del spec, la fila «Fuera del rango» dice «(1 500 a 3 500 ft)». El motor escribe las etiquetas de la rejilla, que empiezan por «terra» cuando la franja está. Cambiarla por:

```
| Fuera del rango | «5 000 ft queda fora del rang de càlcul (terra a 3 750 ft).» |
```

Y añadir la fila del caso sin franja terra:

```
| Aterrar sin franja terra | «Falta la franja terra: no es pot calcular l'aterratge.» |
```

- [ ] **Step 2: STATUS**

Añadir arriba del todo de `STATUS.md`, antes de «## 30/10/2026»:

```markdown
## 01/11/2026: objetivo de altura en el punto

Fusionado el motor del 30/10 en `main`. Y nuevo, en la rama `objetivo-altura`: cada punto lleva un
objetivo de altura, **Aterrar** (por defecto en la pantalla), **Passar a X ft** o **Qualsevol
altura**, y la distancia y la zona sólo cuentan dentro de su margen. Spec
`docs/superpowers/specs/2026-11-01-objetivo-de-altura-design.md`, plan
`docs/superpowers/plans/2026-11-01-objetivo-de-altura.md`. Sin pantalla todavía.

* **Siguiente:** fase 2, maquetas antes de código: marcar el punto con su objetivo, la zona
  alcanzable según el objetivo y el punto más cercano. Después la pantalla de vuelo.
```

- [ ] **Step 3: verificación completa**

Run: `npm test && npx tsc -b && npm run build`
Expected: todo verde. Apuntar el número de pruebas.

- [ ] **Step 4: commit**

```bash
git add docs/superpowers/specs/2026-11-01-objetivo-de-altura-design.md STATUS.md docs/superpowers/plans/2026-11-01-objetivo-de-altura.md
git commit -m "docs: STATUS y spec con el objetivo de altura"
```

---

## Cambios durante la ejecución, 01/11/2026

* **Una cuenta del plan estaba mal, no el código.** En la prueba «lo de fuera del margen no cuenta»
  esperaba 250 m y el motor dio 200: el mejor plan baja despacio desde la franja 2, que cruza dos
  pasos de 10 s con viento al norte, y no desde la 1. La prueba se corrigió a 200 m con la cuenta
  escrita al lado.
* **Mutación de cada guarda nueva.** Tres mutaciones de `plan.ts` (mantener A fuera, tránsito a B
  entero, refinado sin margen) y una de `zona.ts` (salida del margen en el último minuto de un
  cambio) sobrevivían a las pruebas del plan. Se añadieron tres pruebas: un caso a mano donde sólo lo
  de fuera del margen pasa por el punto, la distancia devuelta igual a la de su plan reevaluado con el
  margen, y la salida del margen en el último minuto de una subida. Después de reestructurar, las diez
  mutaciones se detectan.
* **Rendimiento.** Pasar la parte del minuto a `avanzar` en todos los segmentos hacía la búsqueda un
  50 % más lenta sin objetivo. Ahora mantener una franja usa el `avanzar` de antes, y si la franja está
  fuera del margen se salta el bucle entero. Sólo los tránsitos usan `avanzarParte`. `MINUTO_ENTERO` se
  lee una vez por módulo en `plan.ts` y `zona.ts`, porque con vitest cada lectura de una importación
  pasa por un getter.
* **Texto de fuera del rango** con las etiquetas de la rejilla («terra a 3 750 ft»), y fila nueva en
  §6 del spec para Aterrar sin franja terra.
