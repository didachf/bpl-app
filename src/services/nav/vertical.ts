// src/services/nav/vertical.ts
// Que franjas se alcanzan y cuanto se deriva por el camino, con los modos del
// piloto (spec 2026-10-30 §6.1 y §6.2). Es la unica pieza que sabe de modos: el
// modelo fisico de la tesis de Llado-Gambin la sustituira cuando la caja de la
// temperatura de la vela.
import { idx, type Campo } from './campo'
import type { AjustesNav, Modo } from './tipos'
import { PASO_INTEGRACION_S } from './parametros'
import { enMargen, fracMinutos, SIN_MARGEN, type Frac, type Margen } from './objetivo'
import type { Suelo, Terreno } from './relieve'

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
  /** El margen del objetivo (spec 2026-11-01) y si cada franja esta dentro. */
  margen: Margen
  dentro: boolean[]
  /** frac[(b * B + b2) * 2 + clase][j]: la parte del minuto j del cambio dentro del margen. */
  frac: Frac[][]
  /** El techo del suelo en el plano y el minimo sobre el (spec 2026-11-01-relieve §4.3). Sin relieve, null. */
  techo: Suelo | null
  minM: number
  /** Por encima de esta altitud siempre vale: el suelo mas alto mas el minimo. -Infinity sin relieve. */
  alturaLibre: number
  /** La franja terra, o -1. */
  iTerra: number
  /** altTr[(b * B + b2) * 2 + clase][j]: la altitud al final del minuto j del cambio. */
  altTr: number[][]
}

export function construirTablas(
  c: Campo, f: number, aj: AjustesNav, margen: Margen = SIN_MARGEN, terreno: Terreno | null = null,
): Tablas {
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
  const altTr: number[][] = []
  for (let b = 0; b < B; b++) {
    for (let b2 = 0; b2 < B; b2++) {
      for (let cl = 0; cl < 2; cl++) {
        const fila: (Transito | null)[] = new Array<Transito | null>(H + 1).fill(null)
        let fm: Frac[] = []
        let zt: number[] = []
        if (b !== b2) {
          const vel = velocidad(aj, altM[b2] > altM[b], cl)
          const m = minutosTransito(c, b, b2, vel)
          for (let k0 = 0; k0 + m <= H; k0++) fila[k0] = transito(c, f, b, b2, vel, k0)
          fm = fracMinutos(altM[b], altM[b2], vel, m, margen)
          const dz = altM[b2] - altM[b]
          zt = Array.from({ length: m }, (_, j) => altM[b] + Math.sign(dz) * Math.min(Math.abs(dz), vel * 60 * (j + 1)))
        }
        filas.push(fila)
        frac.push(fm)
        altTr.push(zt)
      }
    }
  }
  return {
    c, f, px, py, filas, margen, dentro: altM.map(z => enMargen(z, margen)), frac,
    techo: terreno?.techo ?? null, minM: aj.minSobreTerrenoM,
    alturaLibre: terreno === null ? -Infinity : terreno.maxM + aj.minSobreTerrenoM,
    iTerra: c.rejilla.etiqueta.indexOf('terra'), altTr,
  }
}

/** La parte de cada minuto del cambio de b a b2 en la clase cl que cae dentro del margen. */
export function fr(t: Tablas, b: number, b2: number, cl: number): Frac[] {
  return t.frac[(b * t.c.rejilla.altM.length + b2) * 2 + cl]
}

/** El transito de b a b2 en la clase cl saliendo en el minuto k0, o null. */
export function tr(t: Tablas, b: number, b2: number, cl: number, k0: number): Transito | null {
  return t.filas[(b * t.c.rejilla.altM.length + b2) * 2 + cl][k0] ?? null
}

export function zTr(t: Tablas, b: number, b2: number, cl: number): number[] {
  return t.altTr[(b * t.c.rejilla.altM.length + b2) * 2 + cl]
}

/**
 * La altitud que hay que comprobar al final del minuto j del cambio de b a b2, o NaN si ninguna. Entre
 * franjas, la de cada minuto. Saliendo de terra o yendo a ella, solo la llegada a una franja que no es
 * terra (spec 2026-11-01-relieve §4.3).
 */
export function zComprobar(t: Tablas, b: number, b2: number, cl: number, j: number): number {
  const zt = zTr(t, b, b2, cl)
  if (b !== t.iTerra && b2 !== t.iTerra) return zt[j]
  return j === zt.length - 1 && b2 !== t.iTerra ? zt[j] : NaN
}

/** Si la altitud z en (x, y) queda al menos el minimo sobre el techo del suelo. Sin suelo conocido, vale. */
export function vale(t: Tablas, z: number, x: number, y: number): boolean {
  if (z >= t.alturaLibre) return true
  return !(z < t.techo!(x, y) + t.minM - 1e-6)
}
