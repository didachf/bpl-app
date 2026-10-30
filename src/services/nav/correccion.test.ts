import { describe, it, expect } from 'vitest'
import { adelante, atras, cholesky, corregirCampo, nucleo } from './correccion'
import { construirCampo, idx } from './campo'
import type { Previsiones } from './perfil'
import type { Medida } from './tipos'
import { S_MS } from './parametros'

const h0 = Date.parse('2026-10-10T06:00Z')
function prevCero(): Previsiones {
  const p = [{ altM: 0, u: 0, v: 0 }, { altM: 3000, u: 0, v: 0 }]
  return { elevM: 0, horas: [h0, h0 + 7200000], modelos: ['a'], perfiles: [[p, p]] }
}
const rej = { altM: [1000, 1200], etiqueta: ['a', 'b'] }
const medida = (over: Partial<Medida> = {}): Medida =>
  ({ fuente: 'gps', t: h0, altM: 1000, u: 2, v: 0, sigma: 0.1, ...over })

describe('algebra', () => {
  it('cholesky y las dos sustituciones resuelven un sistema', () => {
    const l = cholesky(Float64Array.from([4, 2, 2, 3]), 2)!
    const x = atras(l, 2, adelante(l, 2, [6, 5]))
    expect(x[0]).toBeCloseTo(1)
    expect(x[1]).toBeCloseTo(1)
  })
  it('si no es definida positiva, null', () => {
    expect(cholesky(Float64Array.from([1, 2, 2, 1]), 2)).toBeNull()
  })
  it('nucleo exponencial', () => {
    expect(nucleo(0, 0)).toBeCloseTo(S_MS * S_MS)
    expect(nucleo(200, 0) / nucleo(0, 0)).toBeCloseTo(Math.exp(-1))
  })
})

describe('corregirCampo con un modelo que no llega a la medida', () => {
  // el modelo b solo llega a 500 m. La medida a 1000 m no le dice que acierte: le corrige como al combinado.
  const p0 = [{ altM: 0, u: 0, v: 0 }, { altM: 3000, u: 0, v: 0 }]
  const pb = [{ altM: 0, u: 0, v: 0 }, { altM: 500, u: 0, v: 0 }]
  const prev: Previsiones = { elevM: 0, horas: [h0, h0 + 7200000], modelos: ['a', 'b'], perfiles: [[p0, p0], [pb, pb]] }
  const c = construirCampo(prev, { altM: [400, 1000], etiqueta: ['x', 'y'] }, h0, 60)
  it('al modelo sin dato le aplica el residuo del combinado', () => {
    const r = corregirCampo(c, prev, [medida()], h0)
    const m0 = (2 * S_MS ** 2) / (S_MS ** 2 + 0.01)
    expect(r.campo.u[1][idx(c, 0, 0)]).toBeCloseTo(m0 * Math.exp(-3), 3)
  })
  it('una medida fuera de toda prevision no se usa', () => {
    expect(corregirCampo(c, prev, [medida({ altM: 5000 })], h0).usadas).toBe(0)
  })
})

describe('corregirCampo', () => {
  const c = construirCampo(prevCero(), rej, h0, 60)
  it('sin medidas no cambia', () => {
    const r = corregirCampo(c, prevCero(), [], h0)
    expect(r.corregido).toBe(false)
    expect(r.campo).toBe(c)
  })
  it('una medida corrige su franja, las vecinas y un rato', () => {
    const r = corregirCampo(c, prevCero(), [medida()], h0)
    const f = r.campo.nombres.length - 1
    const m0 = (2 * S_MS ** 2) / (S_MS ** 2 + 0.01)
    expect(r.campo.u[f][idx(c, 0, 0)]).toBeCloseTo(m0, 3)
    expect(r.campo.u[f][idx(c, 1, 0)]).toBeCloseTo(m0 * Math.exp(-1), 3)
    expect(r.campo.u[f][idx(c, 0, 60)]).toBeCloseTo(m0 * Math.exp(-0.5), 3)
    expect(r.campo.u[0][idx(c, 0, 0)]).toBeCloseTo(m0, 3)
    expect(r.campo.sigma[idx(c, 0, 0)]).toBeLessThan(0.2)
    expect(r.campo.sigma[idx(c, 1, 60)]).toBeGreaterThan(1)
  })
  it('descarta las medidas de mas de 6 h', () => {
    expect(corregirCampo(c, prevCero(), [medida({ t: h0 - 7 * 3600000 })], h0).usadas).toBe(0)
  })
  it('dos medidas iguales no doblan la correccion', () => {
    const r = corregirCampo(c, prevCero(), [medida(), medida()], h0)
    expect(r.campo.u[r.campo.nombres.length - 1][idx(c, 0, 0)]).toBeLessThan(2.0001)
  })
})
