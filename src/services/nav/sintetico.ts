// src/services/nav/sintetico.ts
// Solo para las pruebas: campos y rejillas hechos a mano.
import { COMB, type Campo, type Rejilla } from './campo'
import { S_MS } from './parametros'

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
