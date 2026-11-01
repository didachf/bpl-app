// src/services/vuelo/gps.test.ts
import { describe, it, expect } from 'vitest'
import { calibracion, proyeccion, rumboVelocidad, vario, type PuntoGps } from './gps'
import { aGeo, aPlano } from '../nav/geo'
import type { PuntoTraza } from '../nav/tipos'

const O = { lat0: 41.6561, lon0: 1.149 }

/** Traza recta a velMs hacia rumboDeg, subiendo a varioMs, un punto por segundo. */
function recta(n: number, rumboDeg: number, velMs: number, varioMs: number, t0 = 0): PuntoTraza[] {
  const r = rumboDeg * Math.PI / 180
  return Array.from({ length: n }, (_, i) => {
    const g = aGeo(O, Math.sin(r) * velMs * i, Math.cos(r) * velMs * i)
    return { t: t0 + i * 1000, lat: g.lat, lon: g.lon, altM: 500 + varioMs * i }
  })
}

describe('calibracion en tierra', () => {
  const muestras = (alts: (number | null)[], prec = 5): PuntoGps[] =>
    alts.map((a, i) => ({ t: i * 1000, lat: O.lat0, lon: O.lon0, altElipM: a, precisionM: prec }))

  it('terreno menos la media del GPS, como en la maqueta', () => {
    const c = calibracion(muestras(Array(12).fill(429)), 380)
    expect(c).toEqual({ correccionM: -49, n: 12 })
  })
  it('sin altitud o con mala precision no cuenta, y con menos de 10 no calibra', () => {
    expect(calibracion(muestras([...Array(9).fill(429), null, null]), 380)).toBe(null)
    expect(calibracion(muestras(Array(12).fill(429), 50), 380)).toBe(null)
  })
})

describe('rumbo, velocidad y vario', () => {
  it('de una recta conocida', () => {
    const rv = rumboVelocidad(recta(40, 61, 2.2, 0.3))
    expect(rv?.rumbo).toBeCloseTo(61, 3)
    expect(rv?.velMs).toBeCloseTo(2.2, 3)
    expect(vario(recta(40, 61, 2.2, 0.3))).toBeCloseTo(0.3, 6)
  })
  it('pasando por el norte no da un rumbo de 180', () => {
    const rv = rumboVelocidad(recta(40, 359, 3, 0))
    expect(rv?.rumbo).toBeCloseTo(359, 3)
  })
  it('solo mira la ventana: 30 s para el rumbo y 10 s para el vario', () => {
    const giro = [...recta(60, 90, 2, -1), ...recta(31, 0, 2, 1, 60_000).map(p => ({ ...p, altM: p.altM - 60 }))]
    expect(rumboVelocidad(giro)?.rumbo).toBeCloseTo(0, 0)
    expect(vario(giro)).toBeCloseTo(1, 6)
  })
  it('con poco tiempo no se inventa nada', () => {
    expect(rumboVelocidad(recta(5, 61, 2, 0))).toBe(null)
    expect(vario(recta(2, 61, 2, 1))).toBe(null)
    expect(rumboVelocidad([])).toBe(null)
  })
})

describe('proyeccion', () => {
  it('marcas a 5, 10, 15 y 20 min por el rumbo y la velocidad', () => {
    const ps = proyeccion({ lat: O.lat0, lon: O.lon0 }, 90, 2)
    expect(ps).toHaveLength(4)
    const [x, y] = aPlano(O, ps[3].lat, ps[3].lon)
    expect(x).toBeCloseTo(2400, 0)
    expect(y).toBeCloseTo(0, 3)
  })
})
