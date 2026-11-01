// src/services/nav/relieve.ts
// El suelo bajo el globo (spec 2026-11-01-relieve §4.1): una rejilla de elevacion en grados,
// consultada en grados o en el plano local del motor. Bilineal para el suelo, y el maximo de la
// celda para comprobar el minimo sobre el terreno, que deja el error del lado seguro.
import type { Plano } from './geo'
import type { Relieve } from './tipos'

const R = 6371000
const RAD = Math.PI / 180
const EPS = 1e-9

/** El suelo en el plano local, m sobre el mar. NaN fuera de la rejilla. */
export type Suelo = (x: number, y: number) => number

/** Lo que las tablas necesitan del relieve: el techo de cada celda y el suelo mas alto. */
export interface Terreno { techo: Suelo; maxM: number }

function celda(r: Relieve, fi: number, fj: number, max: boolean): number {
  if (!(fi >= -EPS && fj >= -EPS && fi <= r.nLat - 1 + EPS && fj <= r.nLon - 1 + EPS)) return NaN
  const i = Math.min(Math.max(Math.floor(fi), 0), r.nLat - 2)
  const j = Math.min(Math.max(Math.floor(fj), 0), r.nLon - 2)
  const n = r.nLon
  const a = r.elevM[i * n + j]
  const b = r.elevM[i * n + j + 1]
  const c = r.elevM[(i + 1) * n + j]
  const d = r.elevM[(i + 1) * n + j + 1]
  if (max) return Math.max(a, b, c, d)
  const u = Math.min(Math.max(fj - j, 0), 1)
  const v = Math.min(Math.max(fi - i, 0), 1)
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}

export function sueloGeo(r: Relieve, lat: number, lon: number): number {
  return celda(r, (lat - r.lat0) / r.dLat, (lon - r.lon0) / r.dLon, false)
}

// aGeo es lineal en el plano: lat = lat0 + y / (R RAD), lon = lon0 + x / (R RAD cos lat0).
function enPlano(r: Relieve, p: Plano, max: boolean): Suelo {
  const i0 = (p.lat0 - r.lat0) / r.dLat
  const iy = 1 / (R * RAD * r.dLat)
  const j0 = (p.lon0 - r.lon0) / r.dLon
  const jx = 1 / (R * RAD * Math.cos(p.lat0 * RAD) * r.dLon)
  return (x, y) => celda(r, i0 + y * iy, j0 + x * jx, max)
}

export function sueloPlano(r: Relieve, p: Plano): Suelo {
  return enPlano(r, p, false)
}

/** El maximo de los cuatro nodos de la celda: el que se usa para el minimo sobre el terreno. */
export function techoPlano(r: Relieve, p: Plano): Suelo {
  return enPlano(r, p, true)
}

export function maximo(r: Relieve): number {
  let m = -Infinity
  for (const z of r.elevM) if (z > m) m = z
  return m
}
