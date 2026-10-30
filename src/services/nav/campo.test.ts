import { describe, it, expect } from 'vitest'
import {
  combinar, construirCampo, franjas, FRANJA_M, idx, interpAlt, miles, recortar,
  vientoCombinado, vientoModelo,
} from './campo'
import { parsePrevision, type Previsiones } from './perfil'
import { cargar1010 } from './prueba-1010'
import { rumbo } from './geo'

const KT = 1852 / 3600

describe('franjas', () => {
  it('multiplos de 250 ft dentro del rango', () => {
    const r = franjas(1500 * 0.3048, 2000 * 0.3048)
    expect(r.etiqueta).toEqual(['1 500 ft', '1 750 ft', '2 000 ft'])
    expect(r.altM[1]).toBeCloseTo(1750 * 0.3048)
  })
  it('terra debajo si se pide', () => {
    const r = franjas(457.2, 600, 390)
    expect(r.etiqueta[0]).toBe('terra')
    expect(r.altM[0]).toBe(390)
  })
  it('separador de miles', () => {
    expect(miles(10000)).toBe('10 000')
    expect(miles(750)).toBe('750')
  })
  it('una franja son 76,2 m', () => { expect(FRANJA_M).toBeCloseTo(76.2) })
})

describe('interpAlt', () => {
  const p = [{ altM: 100, u: 0, v: 0 }, { altM: 200, u: 10, v: -10 }]
  it('lineal en u y v', () => { expect(interpAlt(p, 150)).toEqual([5, -5]) })
  it('no extrapola', () => {
    expect(interpAlt(p, 99)).toBeNull()
    expect(interpAlt(p, 201)).toBeNull()
  })
  it('en los extremos da el valor', () => {
    expect(interpAlt(p, 100)).toEqual([0, 0])
    expect(interpAlt(p, 200)).toEqual([10, -10])
  })
})

describe('combinar', () => {
  it('rumbo de la suma y velocidad mediana', () => {
    const w = combinar([[0, 1], [0, 3], [0, 10]])!
    expect(w[0]).toBeCloseTo(0)
    expect(w[1]).toBeCloseTo(3)
  })
  it('sin modelos, null', () => { expect(combinar([])).toBeNull() })
})

function prevSintetica(): Previsiones {
  const h0 = Date.parse('2026-10-10T06:00Z')
  return {
    elevM: 0,
    horas: [h0, h0 + 3600000],
    modelos: ['a'],
    perfiles: [[
      [{ altM: 0, u: 0, v: 0 }, { altM: 1000, u: 10, v: 0 }],
      [{ altM: 0, u: 0, v: 0 }, { altM: 1000, u: 0, v: 10 }],
    ]],
  }
}

describe('vientoModelo', () => {
  it('interpola en el tiempo modelo a modelo', () => {
    const p = prevSintetica()
    const w = vientoModelo(p, 0, 1000, p.horas[0] + 1800000)!
    expect(w[0]).toBeCloseTo(5)
    expect(w[1]).toBeCloseTo(5)
  })
  it('fuera de las horas, null', () => {
    const p = prevSintetica()
    expect(vientoModelo(p, 0, 500, p.horas[1] + 60000)).toBeNull()
  })
})

describe('con el 10/10, contra las filas del prototipo', () => {
  const prev = parsePrevision(cargar1010())
  const casos: [string, number, number, number, number][] = [
    ['terra a las 06Z', 390, 0, 14, 2.2],
    ['1 500 ft a las 06Z', 1500 * 0.3048, 0, 60, 4.4],
    ['2 500 ft a las 08Z', 2500 * 0.3048, 2, 78, 6.2],
  ]
  for (const [nombre, alt, h, r, kt] of casos) {
    it(nombre, () => {
      const w = vientoCombinado(prev, alt, prev.horas[h])!
      expect(Math.abs(rumbo(w[0], w[1]) - r)).toBeLessThanOrEqual(0.6)
      expect(Math.abs(Math.hypot(w[0], w[1]) / KT - kt)).toBeLessThanOrEqual(0.06)
    })
  }
})

describe('construirCampo y recortar', () => {
  it('casillas por franja y minuto, con el combinado al final', () => {
    const p = prevSintetica()
    const c = construirCampo(p, { altM: [500, 1000], etiqueta: ['a', 'b'] }, p.horas[0], 60)
    expect(c.nombres).toEqual(['a', 'comb'])
    expect(c.u[1][idx(c, 1, 0)]).toBeCloseTo(10)
    expect(c.v[1][idx(c, 1, 60)]).toBeCloseTo(10)
  })
  it('quita la franja sin dato y acorta el horizonte', () => {
    const p = prevSintetica()
    const r = recortar(p, { altM: [500, 2000], etiqueta: ['a', 'b'] }, p.horas[0] + 1800000, 60)
    expect(r.fuera).toEqual(['b'])
    expect(r.campo.rejilla.etiqueta).toEqual(['a'])
    expect(r.campo.minutos).toBe(30)
  })
})
