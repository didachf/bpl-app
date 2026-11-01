import { describe, it, expect } from 'vitest'
import { maximo, sueloGeo, sueloPlano, techoPlano } from './relieve'
import { aGeo } from './geo'
import { relieveSintetico } from './sintetico'
import { cargarRelieve1010 } from './prueba-1010'
import type { Relieve } from './tipos'

const r: Relieve = { lat0: 41, lon0: 1, dLat: 0.001, dLon: 0.001, nLat: 2, nLon: 2, elevM: [100, 200, 300, 400] }

describe('el suelo', () => {
  it('bilineal entre los cuatro nodos', () => {
    expect(sueloGeo(r, 41, 1)).toBeCloseTo(100, 9)
    expect(sueloGeo(r, 41, 1.001)).toBeCloseTo(200, 9)
    expect(sueloGeo(r, 41.001, 1)).toBeCloseTo(300, 9)
    expect(sueloGeo(r, 41.0005, 1.0005)).toBeCloseTo(250, 9)
  })
  it('fuera de la rejilla, NaN', () => {
    expect(sueloGeo(r, 40.999, 1)).toBeNaN()
    expect(sueloGeo(r, 41.0011, 1)).toBeNaN()
  })
  it('en el plano, lo mismo que en grados', () => {
    const p = { lat0: 41.0004, lon0: 1.0003 }
    const s = sueloPlano(r, p)
    for (const [x, y] of [[0, 0], [20, -15], [-25, 40]]) {
      const g = aGeo(p, x, y)
      expect(s(x, y)).toBeCloseTo(sueloGeo(r, g.lat, g.lon), 9)
    }
  })
  it('el techo es el maximo de la celda', () => {
    expect(techoPlano(r, { lat0: 41.0004, lon0: 1.0003 })(0, 0)).toBe(400)
    expect(maximo(r)).toBe(400)
  })
  it('un relieve sintetico devuelve su funcion', () => {
    const p = { lat0: 41.6, lon0: 1.6 }
    const f = (x: number, y: number) => 300 + x / 100 + y / 50
    expect(sueloPlano(relieveSintetico(p, -1000, -1000, 1000, 1000, 100, f), p)(123, -456)).toBeCloseTo(f(123, -456), 6)
  })
  it('el del 10/10 da el suelo de GLO-90 a menos de 3 m', () => {
    const rel = cargarRelieve1010()
    for (const [lat, lon, z] of [[41.6561, 1.149, 380], [41.6758, 1.1907, 430], [41.682, 1.19673, 440]]) {
      expect(Math.abs(sueloGeo(rel, lat, lon) - z)).toBeLessThan(3)
    }
  })
})
