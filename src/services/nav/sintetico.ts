// src/services/nav/sintetico.ts
// Solo para las pruebas: campos y rejillas hechos a mano.
import { COMB, type Campo, type Rejilla } from './campo'
import { S_MS } from './parametros'
import { aGeo, type Plano } from './geo'
import type { Relieve } from './tipos'

export function rejillaUniforme(n: number, base = 500, paso = 76.2): Rejilla {
  return {
    altM: Array.from({ length: n }, (_, i) => base + i * paso),
    etiqueta: Array.from({ length: n }, (_, i) => `F${i}`),
  }
}

/** Un campo con un modelo «m» y el combinado iguales. */
export function campoSintetico(
  rejilla: Rejilla, minutos: number, viento: (b: number, k: number) => [number, number], t0 = 0,
): Campo {
  const n = rejilla.altM.length * (minutos + 1)
  const u = new Float64Array(n)
  const v = new Float64Array(n)
  for (let b = 0; b < rejilla.altM.length; b++) {
    for (let k = 0; k <= minutos; k++) {
      const [a, c] = viento(b, k)
      u[b * (minutos + 1) + k] = a
      v[b * (minutos + 1) + k] = c
    }
  }
  return {
    t0, minutos, rejilla, nombres: ['m', COMB],
    u: [u, Float64Array.from(u)], v: [v, Float64Array.from(v)],
    sigma: new Float64Array(n).fill(S_MS),
  }
}

/** Un relieve en el plano de `p`, con nodos cada `paso` m de (x0, y0) a (x1, y1) y el suelo de `f`. */
export function relieveSintetico(
  p: Plano, x0: number, y0: number, x1: number, y1: number, paso: number, f: (x: number, y: number) => number,
): Relieve {
  const R = 6371000
  const RAD = Math.PI / 180
  const nLat = Math.round((y1 - y0) / paso) + 1
  const nLon = Math.round((x1 - x0) / paso) + 1
  const o = aGeo(p, x0, y0)
  const elevM: number[] = []
  for (let i = 0; i < nLat; i++) for (let j = 0; j < nLon; j++) elevM.push(f(x0 + j * paso, y0 + i * paso))
  return { lat0: o.lat, lon0: o.lon, dLat: paso / (R * RAD), dLon: paso / (R * RAD * Math.cos(p.lat0 * RAD)), nLat, nLon, elevM }
}
