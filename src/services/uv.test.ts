import { describe, it, expect } from 'vitest'
import { toUV, toSpeedDir, msToKt, ktToMs } from './uv'

/**
 * Redondeo a seis decimales, normalizando el -0.
 *
 * `Math.cos(PI/2)` no da 0 exacto sino 6,1e-17, y al redondear sale -0, que
 * `Object.is` no considera igual a 0. El valor de verdad es cero.
 */
const r = (n: number) => Math.round(n * 1e6) / 1e6 + 0

describe('toUV, convencion meteorologica', () => {
  it('viento del norte, 0 grados, sopla HACIA el sur', () => {
    const { u, v } = toUV(10, 0)
    expect(r(u)).toBe(0)
    expect(r(v)).toBe(-10)
  })

  it('viento del este, 90 grados, sopla hacia el oeste', () => {
    const { u, v } = toUV(10, 90)
    expect(r(u)).toBe(-10)
    expect(r(v)).toBe(0)
  })

  it('viento del sur, 180 grados, sopla hacia el norte', () => {
    const { u, v } = toUV(10, 180)
    expect(r(u)).toBe(0)
    expect(r(v)).toBe(10)
  })

  it('viento del oeste, 270 grados, sopla hacia el este', () => {
    const { u, v } = toUV(10, 270)
    expect(r(u)).toBe(10)
    expect(r(v)).toBe(0)
  })
})

describe('toSpeedDir', () => {
  it('deshace toUV en las cuatro direcciones cardinales', () => {
    for (const d of [0, 90, 180, 270]) {
      const { u, v } = toUV(7, d)
      const back = toSpeedDir(u, v)
      expect(r(back.speed)).toBe(7)
      expect(r(back.dir)).toBe(d)
    }
  })

  it('viento en calma da direccion 0 y no NaN', () => {
    expect(toSpeedDir(0, 0)).toEqual({ speed: 0, dir: 0 })
  })

  it('la direccion sale siempre en 0 a 360, nunca negativa', () => {
    const { u, v } = toUV(5, 315)
    expect(r(toSpeedDir(u, v).dir)).toBe(315)
  })
})

describe('nudos', () => {
  it('un nudo es 0,514444 m/s', () => {
    expect(r(ktToMs(1))).toBe(0.514444)
  })

  it('ida y vuelta', () => {
    expect(r(msToKt(ktToMs(15)))).toBe(15)
  })

  it('los 15 kt del manual son 7,7 m/s', () => {
    expect(Math.round(ktToMs(15) * 10) / 10).toBe(7.7)
  })
})
