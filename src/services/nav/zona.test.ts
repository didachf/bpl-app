import { describe, it, expect } from 'vitest'
import { calcularZona, fueraSeguro, poligono } from './zona'
import { caminoDirecto, type PlanInterno } from './plan'
import { construirTablas } from './vertical'
import { campoSintetico, rejillaUniforme } from './sintetico'
import { AJUSTES_POR_DEFECTO, type AjustesNav } from './tipos'

const aj: AjustesNav = { ...AJUSTES_POR_DEFECTO, altMinM: 0, altMaxM: 9999 }
const rapido: AjustesNav = {
  ...aj, modos: { puja_lent: 76.2, puja_rapid: 76.2, baixa_lent: 76.2, baixa_rapid: 76.2 },
}

describe('viento estable, cuentas a mano', () => {
  const vientos: [number, number][] = [[5, 0], [0, 5], [-5, 0]]
  const c = campoSintetico(rejillaUniforme(3, 500), 30, b => vientos[b])
  const z = calcularZona(construirTablas(c, 1, rapido), 0)
  it('al este, quedarse', () => { expect(z.h[0][30]).toBeCloseTo(9000, 6) })
  it('al norte, ir a la franja 1 enseguida', () => { expect(z.h[8][30]).toBeCloseTo(8950, 6) })
  it('al oeste, ir a la franja 2', () => { expect(z.h[16][30]).toBeCloseTo(8900, 6) })
  it('el minuto 0 es la posicion actual', () => { expect(poligono(z, 0)).toEqual([[0, 0]]) })
  it('un punto al sur no se alcanza, y se sabe', () => { expect(fueraSeguro(z, 0, -3000)).toBe(true) })
  it('un punto al norte si', () => { expect(fueraSeguro(z, 0, 3000)).toBe(false) })
})

describe('de la altitud actual se sale al minuto 0 o a partir del 2, como en el plan', () => {
  // la franja 0 va al este el primer minuto y al sur despues. Salir al minuto 1 (prohibido)
  // seria lo mas lejano en la direccion 1 al minuto 2. Lo legal es quedarse: (300, -300).
  const c = campoSintetico(rejillaUniforme(2, 500), 10, (b, k) => (b === 1 ? [0, 5] : k === 0 ? [5, 0] : [0, -5]))
  const z = calcularZona(construirTablas(c, 1, rapido), 0)
  it('la direccion 1 al minuto 2', () => {
    expect(z.h[1][2]).toBeCloseTo(300 * z.dirs[1][0] - 300 * z.dirs[1][1], 6)
  })
})

describe('las posiciones a mitad de un cambio largo tambien cuentan', () => {
  // 762 m a 1 m/s son 13 min de cambio: a los 6 min solo un plan a medio camino va al norte
  const lento: AjustesNav = { ...aj, modos: { puja_lent: 1, puja_rapid: 1, baixa_lent: 1, baixa_rapid: 1 } }
  const c = campoSintetico({ altM: [500, 1262], etiqueta: ['a', 'b'] }, 30, b => (b === 0 ? [5, 0] : [0, 5]))
  const z = calcularZona(construirTablas(c, 1, lento), 0)
  it('la cota cubre el plan en pleno cambio', () => {
    const cam = caminoDirecto(c, 1, lento, { franjas: [0, 1], clases: [1], dur: [0, 0] })!
    expect(cam[6][1]).toBeGreaterThan(0)
    for (let d = 0; d < z.dirs.length; d++) {
      expect(cam[6][0] * z.dirs[d][0] + cam[6][1] * z.dirs[d][1]).toBeLessThanOrEqual(z.h[d][6] + 1e-6)
    }
  })
})

describe('la cota exterior contiene todos los planes de la fuerza bruta', () => {
  const c = campoSintetico(rejillaUniforme(4, 500), 30, (b, k) =>
    [Math.cos(b * 1.7 + k / 9) * 5, Math.sin(b * 1.1 + k / 13) * 5])
  const z = calcularZona(construirTablas(c, 1, aj), 1)
  it('en cada minuto y cada direccion', () => {
    let planes = 0
    let peor = -Infinity
    for (let h0 = 0; h0 <= 10; h0 += 2) {
      for (let A = 0; A < 4; A++) {
        if (A === 1) continue
        for (let ca = 0; ca < 2; ca++) {
          for (let hA = 2; hA <= 8; hA += 2) {
            for (let B = 0; B < 4; B++) {
              if (B === A) continue
              for (let cb = 0; cb < 2; cb++) {
                const p: PlanInterno = { franjas: [1, A, B], clases: [ca, cb], dur: [h0, hA, 0] }
                const cam = caminoDirecto(c, 1, aj, p)
                if (cam === null) continue
                planes++
                for (let k = 0; k <= 30; k++) {
                  for (let d = 0; d < z.dirs.length; d++) {
                    peor = Math.max(peor, cam[k][0] * z.dirs[d][0] + cam[k][1] * z.dirs[d][1] - z.h[d][k])
                  }
                }
              }
            }
          }
        }
      }
    }
    expect(planes).toBeGreaterThan(100)
    expect(peor).toBeLessThanOrEqual(1e-6)
  })
})
