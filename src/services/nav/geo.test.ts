import { describe, it, expect } from 'vitest'
import { aGeo, aPlano, envolvente, rumbo } from './geo'

describe('plano local', () => {
  const p = { lat0: 41.6561, lon0: 1.149 }
  it('un km al norte son 0,008993 grados', () => {
    const [x, y] = aPlano(p, 41.6561 + 0.008993, 1.149)
    expect(x).toBeCloseTo(0, 6)
    expect(y).toBeCloseTo(1000, 0)
  })
  it('ida y vuelta', () => {
    const [x, y] = aPlano(p, 41.7, 1.2)
    const g = aGeo(p, x, y)
    expect(g.lat).toBeCloseTo(41.7, 9)
    expect(g.lon).toBeCloseTo(1.2, 9)
  })
  it('rumbo hacia donde va', () => {
    expect(rumbo(0, 1)).toBeCloseTo(0)
    expect(rumbo(1, 0)).toBeCloseTo(90)
    expect(rumbo(0, -1)).toBeCloseTo(180)
    expect(rumbo(-1, 0)).toBeCloseTo(270)
  })
  it('envolvente de un cuadrado con un punto dentro', () => {
    const pts: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10], [5, 5]]
    expect(envolvente(pts).sort()).toEqual([0, 1, 2, 3])
  })
})
