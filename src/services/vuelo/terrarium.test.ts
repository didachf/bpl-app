// src/services/vuelo/terrarium.test.ts
import { describe, it, expect } from 'vitest'
import { elevTerrarium, FaltaMosaico, rejillaTerrarium, Z_RELIEVE } from './terrarium'
import { aMosaico, cajaAlrededor } from './mosaicos'

/** La inversa de elevTerrarium. */
function codificar(e: number): [number, number, number] {
  const v = e + 32768
  return [Math.floor(v / 256), Math.floor(v) % 256, Math.round((v - Math.floor(v)) * 256)]
}

/** Mosaicos donde cada pixel vale f en sus indices globales de pixel. */
function mosaicosDe(f: (gx: number, gy: number) => number, leidos: string[] = []) {
  return (tx: number, ty: number): Uint8ClampedArray => {
    leidos.push(`${tx}/${ty}`)
    const d = new Uint8ClampedArray(256 * 256 * 4)
    for (let py = 0; py < 256; py++) {
      for (let px = 0; px < 256; px++) {
        const [r, g, b] = codificar(f(tx * 256 + px, ty * 256 + py))
        const i = (py * 256 + px) * 4
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255
      }
    }
    return d
  }
}

// Un plano en pixeles: la bilineal lo reproduce exacto.
const plano = (gx: number, gy: number) => 300 + 0.05 * (gx - 527000) - 0.03 * (gy - 390400)

describe('Terrarium', () => {
  it('decodifica el pixel', () => {
    expect(elevTerrarium(128, 0, 0)).toBe(0)
    expect(elevTerrarium(129, 44, 128)).toBe(300.5)
    expect(elevTerrarium(0, 0, 0)).toBe(-32768)
  })

  it('la rejilla reproduce un plano, cruzando mosaicos', () => {
    const leidos: string[] = []
    const c = cajaAlrededor(41.62, 1.17, 6000)
    const r = rejillaTerrarium(c, 100, 41.62, mosaicosDe(plano, leidos))
    expect(new Set(leidos).size).toBeGreaterThan(1)
    for (const [i, j] of [[0, 0], [r.nLat - 1, r.nLon - 1], [60, 17], [3, 110]]) {
      const [x, y] = aMosaico(r.lat0 + i * r.dLat, r.lon0 + j * r.dLon, Z_RELIEVE)
      const esperado = plano(x * 256 - 0.5, y * 256 - 0.5)
      expect(Math.abs(r.elevM[i * r.nLon + j] - esperado)).toBeLessThan(0.06)
    }
  })

  it('filas de sur a norte desde la esquina suroeste, sin pasarse de la caja', () => {
    const c = cajaAlrededor(41.62, 1.17, 6000)
    const r = rejillaTerrarium(c, 100, 41.62, mosaicosDe(plano))
    expect(r.lat0).toBe(c.sur)
    expect(r.lon0).toBe(c.oeste)
    expect(r.elevM).toHaveLength(r.nLat * r.nLon)
    expect(r.lat0 + (r.nLat - 1) * r.dLat).toBeLessThanOrEqual(c.norte + 1e-12)
    expect(r.lat0 + r.nLat * r.dLat).toBeGreaterThan(c.norte)
    expect(r.lon0 + (r.nLon - 1) * r.dLon).toBeLessThanOrEqual(c.este + 1e-12)
  })

  it('cada mosaico se lee una sola vez', () => {
    const leidos: string[] = []
    rejillaTerrarium(cajaAlrededor(41.62, 1.17, 6000), 100, 41.62, mosaicosDe(plano, leidos))
    expect(leidos.length).toBe(new Set(leidos).size)
  })

  it('sin un mosaico lo dice, con cual', () => {
    const c = cajaAlrededor(41.62, 1.17, 6000)
    const todos = mosaicosDe(plano)
    const [xe] = aMosaico(c.sur, c.este, Z_RELIEVE)
    const sinEste = (x: number, y: number) => (x === Math.floor(xe) ? null : todos(x, y))
    expect(() => rejillaTerrarium(c, 100, 41.62, sinEste)).toThrow(FaltaMosaico)
    try {
      rejillaTerrarium(c, 100, 41.62, sinEste)
    } catch (e) {
      expect((e as FaltaMosaico).mosaico.x).toBe(Math.floor(xe))
      expect((e as FaltaMosaico).mosaico.z).toBe(12)
    }
  })
})
