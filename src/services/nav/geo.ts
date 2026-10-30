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
