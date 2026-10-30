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
