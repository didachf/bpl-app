// src/services/vuelo/mosaicos.test.ts
import { describe, it, expect } from 'vitest'
import { aMosaico, cajaAlrededor, mosaicosDeCaja } from './mosaicos'
import { aPlano } from '../nav/geo'

const lonDe = (x: number) => x / 4096 * 360 - 180
const latDe = (y: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 4096))) / (Math.PI / 180)

describe('mosaicos XYZ', () => {
  it('Tarrega e Igualada caen en los mosaicos comprobados contra los servidores', () => {
    // 12/2060/1525 es el relieve de Tarrega en AWS (EU-DEM), y 12/2066/1526 la
    // ortofoto de Igualada en el Mapa base del ICGC (spec 10/10 §12.1).
    expect(aMosaico(41.65, 1.14, 12).map(Math.floor)).toEqual([2060, 1525])
    expect(aMosaico(41.5842, 1.6528, 12).map(Math.floor)).toEqual([2066, 1526])
  })

  it('la fila crece hacia el sur', () => {
    expect(aMosaico(41, 1, 12)[1]).toBeGreaterThan(aMosaico(42, 1, 12)[1])
  })

  it('la caja tiene el radio pedido en el plano del motor', () => {
    const p = { lat0: 41.6561, lon0: 1.149 }
    const c = cajaAlrededor(p.lat0, p.lon0, 20000)
    const [xe, yn] = aPlano(p, c.norte, c.este)
    const [xo, ys] = aPlano(p, c.sur, c.oeste)
    expect(xe).toBeCloseTo(20000, 6)
    expect(yn).toBeCloseTo(20000, 6)
    expect(xo).toBeCloseTo(-20000, 6)
    expect(ys).toBeCloseTo(-20000, 6)
  })

  it('una caja pequena dentro de un mosaico da ese mosaico', () => {
    expect(mosaicosDeCaja(cajaAlrededor(41.65, 1.14, 200), 12)).toEqual([{ z: 12, x: 2060, y: 1525 }])
  })

  it('cubre la caja sin repetir, de norte a sur', () => {
    const ms = mosaicosDeCaja(cajaAlrededor(41.6561, 1.149, 15000), 14)
    expect(ms).toHaveLength(306)
    expect(new Set(ms.map(m => `${m.x}/${m.y}`)).size).toBe(306)
    expect(ms[0].y).toBeLessThan(ms[ms.length - 1].y)
  })

  it('el margen en pixeles anade el vecino cuando el borde cae a menos de un pixel', () => {
    const c = { sur: latDe(1525.6), norte: latDe(1525.4), oeste: lonDe(2060 + 0.5 / 256), este: lonDe(2060.5) }
    expect(mosaicosDeCaja(c, 12).map(m => m.x)).toEqual([2060])
    expect(mosaicosDeCaja(c, 12, 1).map(m => m.x)).toEqual([2059, 2060])
  })
})
