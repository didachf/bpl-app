import { describe, it, expect } from 'vitest'
import {
  circularMean, meanResultantLength, circularVariance, angularStdDev,
  bearingArc, speedWeightedMean, describeSpread,
} from './circular'

const r = (n: number) => Math.round(n * 1e6) / 1e6 + 0
const r2 = (n: number) => Math.round(n * 100) / 100 + 0

describe('circularMean', () => {
  it('la media de rumbos iguales es ese rumbo', () => {
    expect(r(circularMean([90, 90, 90])!)).toBe(90)
  })

  it('CRUZA el 360, que es donde una media aritmetica se rompe', () => {
    // La media aritmetica de 350 y 10 da 180, que apunta al lado contrario.
    expect(r2(circularMean([350, 10])!)).toBe(0)
  })

  it('otro caso de cruce, 340 y 20 dan 0', () => {
    expect(r2(circularMean([340, 20])!)).toBe(0)
  })

  it('la media sale siempre en 0 a 360', () => {
    const m = circularMean([300, 20, 340])!
    expect(m).toBeGreaterThanOrEqual(0)
    expect(m).toBeLessThan(360)
  })

  it('sin datos devuelve null en lugar de NaN', () => {
    expect(circularMean([])).toBe(null)
  })
})

describe('meanResultantLength', () => {
  it('acuerdo total da 1', () => {
    expect(r(meanResultantLength([45, 45, 45])!)).toBe(1)
  })

  it('dos rumbos opuestos se cancelan y dan 0', () => {
    expect(r(meanResultantLength([0, 180])!)).toBe(0)
  })

  it('cuatro rumbos repartidos por igual dan 0', () => {
    expect(r(meanResultantLength([0, 90, 180, 270])!)).toBe(0)
  })

  it('esta siempre entre 0 y 1', () => {
    const R = meanResultantLength([10, 30, 350, 120])!
    expect(R).toBeGreaterThanOrEqual(0)
    expect(R).toBeLessThanOrEqual(1)
  })

  it('sin datos devuelve null', () => {
    expect(meanResultantLength([])).toBe(null)
  })
})

describe('circularVariance', () => {
  it('es 1 menos R, por definicion', () => {
    expect(r(circularVariance([45, 45, 45])!)).toBe(0)
    expect(r(circularVariance([0, 180])!)).toBe(1)
  })
})

describe('angularStdDev, estimador Y3 de Yamartino', () => {
  it('acuerdo total da desviacion cero', () => {
    expect(r2(angularStdDev([45, 45, 45]))).toBe(0)
  })

  it('crece cuando los rumbos se abren', () => {
    expect(angularStdDev([88, 90, 92])).toBeLessThan(angularStdDev([60, 90, 120]))
  })

  it('nunca devuelve NaN ni infinito, que es lo que le pasa al estimador de Mardia', () => {
    // Con R igual a cero, sqrt(-2 ln R) de Mardia diverge. El Y3 no.
    expect(Number.isFinite(angularStdDev([0, 90, 180, 270]))).toBe(true)
  })

  it('con menos de dos rumbos no hay dispersion que estimar', () => {
    expect(angularStdDev([90])).toBe(0)
  })
})

describe('bearingArc, el abanico', () => {
  it('un solo rumbo es un abanico de cero grados', () => {
    expect(bearingArc([90])).toEqual({ from: 90, to: 90, spanDeg: 0 })
  })

  it('el arco MENOR, no el mayor', () => {
    expect(bearingArc([80, 100])).toEqual({ from: 80, to: 100, spanDeg: 20 })
  })

  it('cruza el 360 sin abrirse a 340 grados', () => {
    expect(bearingArc([350, 10])).toEqual({ from: 350, to: 10, spanDeg: 20 })
  })

  it('tres rumbos, uno de ellos al otro lado del 360', () => {
    expect(bearingArc([10, 20, 350])).toEqual({ from: 350, to: 20, spanDeg: 30 })
  })

  it('rumbos muy repartidos dan un abanico ancho', () => {
    expect(bearingArc([0, 90, 180])!.spanDeg).toBe(180)
  })

  it('sin datos devuelve null', () => {
    expect(bearingArc([])).toBe(null)
  })
})

describe('speedWeightedMean', () => {
  it('un modelo lento no pesa lo mismo que uno rapido', () => {
    // 2 kt del norte y 12 kt del este: la media tiene que irse hacia el este.
    const m = speedWeightedMean([{ speed: 2, dir: 0 }, { speed: 12, dir: 90 }])!
    expect(m.dir).toBeGreaterThan(45)
    expect(m.dir).toBeLessThan(90)
  })

  it('con velocidades iguales coincide con la media circular', () => {
    const m = speedWeightedMean([{ speed: 5, dir: 350 }, { speed: 5, dir: 10 }])!
    expect(r2(m.dir)).toBe(0)
  })

  it('la velocidad que devuelve es la del VECTOR medio, no la media de velocidades', () => {
    // Dos vientos opuestos de 5 kt: el vector medio es cero aunque las dos
    // velocidades sean 5. Es la advertencia de la Guia CIMO de la OMM.
    const m = speedWeightedMean([{ speed: 5, dir: 0 }, { speed: 5, dir: 180 }])!
    expect(r2(m.speed)).toBe(0)
  })

  it('sin datos devuelve null', () => {
    expect(speedWeightedMean([])).toBe(null)
  })
})

describe('describeSpread', () => {
  const muestras = (dirs: number[]) => dirs.map(d => ({ speed: 8, dir: d }))

  it('rumbos apretados: los modelos van juntos', () => {
    expect(describeSpread(muestras([88, 90, 92, 91]))!.nivel).toBe('juntos')
  })

  it('rumbos abiertos: los modelos no se ponen de acuerdo', () => {
    expect(describeSpread(muestras([10, 120, 250]))!.nivel).toBe('dispares')
  })

  it('devuelve el abanico y el numero de modelos que lo sostienen', () => {
    const d = describeSpread(muestras([350, 10]))!
    expect(d.arco).toEqual({ from: 350, to: 10, spanDeg: 20 })
    expect(d.n).toBe(2)
  })

  it('NUNCA devuelve una probabilidad ni un porcentaje de acuerdo', () => {
    const claves = Object.keys(describeSpread(muestras([88, 90, 92]))!)
    for (const prohibida of ['probabilidad', 'probability', 'confianza', 'porcentaje']) {
      expect(claves).not.toContain(prohibida)
    }
  })

  it('con un solo modelo lo dice, en lugar de fingir acuerdo total', () => {
    expect(describeSpread(muestras([90]))!.nivel).toBe('un_solo_modelo')
  })

  it('sin modelos devuelve null', () => {
    expect(describeSpread([])).toBe(null)
  })
})
