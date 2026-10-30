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
