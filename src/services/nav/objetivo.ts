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
