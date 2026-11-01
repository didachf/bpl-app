import { describe, it, expect } from 'vitest'
import { cruce, enMargen, fracMinutos, margenDe, MINUTO_ENTERO, SIN_MARGEN, tocaRango, type Frac } from './objetivo'
import { FRANJA_M } from './campo'

const rej = { altM: [310, 457.2, 533.4, 609.6], etiqueta: ['terra', '1 500 ft', '1 750 ft', '2 000 ft'] }

function igualFrac(a: Frac[], b: Frac[]): void {
  expect(a).toHaveLength(b.length)
  a.forEach((f, j) => {
    if (b[j] === null) expect(f).toBeNull()
    else {
      expect(f![0]).toBeCloseTo(b[j]![0], 9)
      expect(f![1]).toBeCloseTo(b[j]![1], 9)
    }
  })
}

describe('margenDe', () => {
  it('qualsevol, sin limites', () => { expect(margenDe({ tipo: 'qualsevol' }, rej)).toEqual(SIN_MARGEN) })
  it('altitud, su franja y no las vecinas', () => {
    const m = margenDe({ tipo: 'altitud', altM: 533.4 }, rej)!
    expect(m[0]).toBeCloseTo(533.4 - FRANJA_M / 2, 9)
    expect(m[1]).toBeCloseTo(533.4 + FRANJA_M / 2, 9)
    expect(enMargen(457.2, m)).toBe(false)
    expect(enMargen(533.4, m)).toBe(true)
    expect(enMargen(609.6, m)).toBe(false)
  })
  it('aterrar, la franja terra', () => { expect(margenDe({ tipo: 'aterrar' }, rej)).toEqual([309, 311]) })
  it('aterrar sin franja terra', () => {
    expect(margenDe({ tipo: 'aterrar' }, { altM: [457.2], etiqueta: ['1 500 ft'] })).toBeNull()
  })
})

describe('tocaRango', () => {
  it('dentro, y fuera por arriba y por abajo', () => {
    expect(tocaRango([500, 560], rej)).toBe(true)
    expect(tocaRango([700, 780], rej)).toBe(false)
    expect(tocaRango([200, 300], rej)).toBe(false)
  })
})

describe('cruce', () => {
  const m: [number, number] = [500, 600]
  it('subiendo a traves del margen', () => { expect(cruce(400, 800, 2, m)).toEqual([50, 100]) })
  it('bajando a traves del margen', () => { expect(cruce(800, 400, 4, m)).toEqual([50, 75]) })
  it('llegando a una franja de dentro, se queda', () => { expect(cruce(400, 550, 1, m)).toEqual([100, Infinity]) })
  it('saliendo de dentro', () => { expect(cruce(550, 800, 1, m)).toEqual([0, 50]) })
  it('sin tocarlo', () => {
    expect(cruce(400, 450, 1, m)).toBeNull()
    expect(cruce(700, 650, 1, m)).toBeNull()
  })
  it('sin margen, todo el rato', () => { expect(cruce(400, 800, 1, SIN_MARGEN)).toEqual([0, Infinity]) })
})

describe('fracMinutos', () => {
  it('el cruce a mitad de minuto', () => {
    // de 400 a 800 a 2 m/s, dentro de 50 a 100 s
    igualFrac(fracMinutos(400, 800, 2, 4, [500, 600]), [[50 / 60, 1], [0, 40 / 60], null, null])
  })
  it('llegando dentro, hasta el final del cambio', () => {
    igualFrac(fracMinutos(400, 550, 1, 3, [500, 600]), [null, [40 / 60, 1], [0, 1]])
  })
  it('sin margen, minutos enteros y el mismo objeto', () => {
    expect(fracMinutos(400, 800, 2, 4, SIN_MARGEN).every(f => f === MINUTO_ENTERO)).toBe(true)
  })
  it('sin tocarlo, nada', () => { expect(fracMinutos(400, 450, 1, 1, [500, 600])).toEqual([null]) })
})
