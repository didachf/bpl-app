import { describe, it, expect } from 'vitest'
import { franjaMasCercana, medidasGps } from './medidas'
import { aGeo } from './geo'
import { rejillaUniforme } from './sintetico'
import type { PuntoTraza } from './tipos'

const plano = { lat0: 41.6, lon0: 1.6 }
const rej = rejillaUniforme(5, 500)

function traza(segundos: number, pos: (t: number) => [number, number], alt: (t: number) => number = () => 500): PuntoTraza[] {
  const out: PuntoTraza[] = []
  for (let t = 0; t <= segundos; t++) {
    const [x, y] = pos(t)
    const g = aGeo(plano, x, y)
    out.push({ t: t * 1000, lat: g.lat, lon: g.lon, altM: alt(t) })
  }
  return out
}

describe('franjaMasCercana', () => {
  it('la de altitud mas proxima', () => { expect(franjaMasCercana(rej, 590)).toBe(1) })
})

describe('medidasGps', () => {
  it('vuelo nivelado con viento constante', () => {
    const m = medidasGps(traza(200, t => [5 * t, 0]), rej, plano)
    expect(m.length).toBeGreaterThan(0)
    for (const x of m) {
      expect(x.u).toBeCloseTo(5, 2)
      expect(x.v).toBeCloseTo(0, 2)
      expect(x.fuente).toBe('gps')
    }
  })
  it('como mucho una medida por franja cada 2 min, la mas reciente', () => {
    const m = medidasGps(traza(239, t => [5 * t, 0]), rej, plano)
    expect(m).toHaveLength(2)
    expect(m[0].t).toBeGreaterThan(80000)
  })
  it('corrige el retraso del globo en un escalon de viento', () => {
    const tau = 130
    const w = [0, 5]
    const v0 = [5, 0]
    const pos = (t: number): [number, number] => [
      w[0] * t + (v0[0] - w[0]) * tau * (1 - Math.exp(-t / tau)),
      w[1] * t + (v0[1] - w[1]) * tau * (1 - Math.exp(-t / tau)),
    ]
    const m = medidasGps(traza(120, pos), rej, plano)
    expect(m).toHaveLength(1)
    expect(m[0].u).toBeCloseTo(0, 1)
    expect(m[0].v).toBeCloseTo(5, 1)
    const tc = m[0].t / 1000
    const crudo = [0, 1].map(i => w[i] + (v0[i] - w[i]) * Math.exp(-tc / tau))
    expect(Math.hypot(crudo[0] - w[0], crudo[1] - w[1])).toBeGreaterThan(2)
  })
  it('no mide si la ventana cruza mas de una franja', () => {
    const m = medidasGps(traza(200, t => [5 * t, 0], t => 500 + 3 * t), rej, plano)
    expect(m).toHaveLength(0)
  })
})
