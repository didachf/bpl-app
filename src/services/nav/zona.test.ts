import { describe, it, expect } from 'vitest'
import { calcularZona, fueraSeguro, poligono } from './zona'
import { caminoDirecto, type PlanInterno } from './plan'
import { construirTablas } from './vertical'
import { fraccionesDirectas } from './oraculo'
import { margenDe, SIN_MARGEN } from './objetivo'
import { maximo, techoPlano } from './relieve'
import { campoSintetico, rejillaUniforme, relieveSintetico } from './sintetico'
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

describe('zona con margen', () => {
  const r = { altM: [300, 500, 576.2, 652.4], etiqueta: ['terra', 'F1', 'F2', 'F3'] }
  const c = campoSintetico(r, 30, (b, k) => [Math.cos(b * 1.7 + k / 9) * 5, Math.sin(b * 1.1 + k / 13) * 5])
  const lento: AjustesNav = { ...aj, modos: { puja_lent: 0.5, puja_rapid: 2.75, baixa_lent: 0.5, baixa_rapid: 4 } }
  const zq = calcularZona(construirTablas(c, 1, lento), 2)
  const m = margenDe({ tipo: 'aterrar' }, r)!
  const za = calcularZona(construirTablas(c, 1, lento, m), 2)

  it('el minuto 0, en la franja 2, no tiene zona de aterrar', () => {
    expect(poligono(za, 0)).toEqual([])
    expect(za.h[0][0]).toBe(-Infinity)
  })
  it('dentro de la de qualsevol, minuto a minuto', () => {
    for (let k = 1; k <= 30; k++) {
      for (let d = 0; d < za.dirs.length; d++) {
        expect(za.h[d][k]).toBeLessThanOrEqual(Math.max(zq.h[d][k - 1], zq.h[d][k]) + 1e-6)
      }
    }
  })
  /** Lo peor que un trozo de minuto dentro del margen de la fuerza bruta sale de la cota, y cuantos hay. */
  function contencion(b0: number, mg: [number, number]): { trozos: number; peor: number } {
    const z = calcularZona(construirTablas(c, 1, lento, mg), b0)
    let trozos = 0
    let peor = -Infinity
    for (let h0 = 0; h0 <= 10; h0 += 2) {
      for (let A = 0; A < 4; A++) {
        if (A === b0) continue
        for (let ca = 0; ca < 2; ca++) {
          for (let hA = 2; hA <= 8; hA += 2) {
            for (let B = 0; B < 4; B++) {
              if (B === A) continue
              for (let cb = 0; cb < 2; cb++) {
                const p: PlanInterno = { franjas: [b0, A, B], clases: [ca, cb], dur: [h0, hA, 0] }
                const cam = caminoDirecto(c, 1, lento, p)
                if (cam === null) continue
                const fr = fraccionesDirectas(c, lento, p, mg)
                for (let k = 0; k < 30; k++) {
                  const f = fr[k]
                  if (f === null) continue
                  trozos++
                  for (const s of f) {
                    const x = cam[k][0] + s * (cam[k + 1][0] - cam[k][0])
                    const y = cam[k][1] + s * (cam[k + 1][1] - cam[k][1])
                    for (let d = 0; d < z.dirs.length; d++) {
                      const tope = Math.max(z.h[d][k], z.h[d][k + 1])
                      peor = Math.max(peor, x * z.dirs[d][0] + y * z.dirs[d][1] - tope)
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return { trozos, peor }
  }
  it('la cota exterior contiene todo lo que la fuerza bruta pasa en terra', () => {
    const r = contencion(2, m)
    expect(r.trozos).toBeGreaterThan(100)
    expect(r.peor).toBeLessThanOrEqual(1e-6)
  })
  it('y todo lo que pasa cruzando 500 m, al entrar y al salir del margen a mitad de minuto', () => {
    const r = contencion(3, margenDe({ tipo: 'altitud', altM: 500 }, c.rejilla)!)
    expect(r.trozos).toBeGreaterThan(100)
    expect(r.peor).toBeLessThanOrEqual(1e-6)
  })
})

describe('un punto que se pasa en altura pero donde no se puede aterrizar', () => {
  // Terra hacia el oeste a 5 m/s y lo demas hacia el este a 5 m/s, 30 min, desde 576,2 m.
  // Manteniendo la franja se llega a 9 000 m al este. A terra se baja como pronto en 70 s a 4 m/s,
  // asi que lo mas al este que se esta en terra es bajando en el minuto 28: unos 8 530 m.
  const r = { altM: [300, 500, 576.2, 652.4], etiqueta: ['terra', 'F1', 'F2', 'F3'] }
  const c = campoSintetico(r, 30, b => (b === 0 ? [-5, 0] : [5, 0]))
  const lento: AjustesNav = { ...aj, modos: { puja_lent: 0.5, puja_rapid: 2.75, baixa_lent: 0.5, baixa_rapid: 4 } }
  const zq = calcularZona(construirTablas(c, 1, lento), 2)
  const za = calcularZona(construirTablas(c, 1, lento, margenDe({ tipo: 'aterrar' }, r)!), 2)
  it('a cualquier altura se alcanza', () => { expect(fueraSeguro(zq, 8800, 0)).toBe(false) })
  it('en terra no, y se sabe', () => { expect(fueraSeguro(za, 8800, 0)).toBe(true) })
  it('en el minuto 1 todavia no se puede estar en terra', () => {
    expect(za.h.every(hd => hd[1] === -Infinity)).toBe(true)
  })
})

describe('la salida del margen en el ultimo minuto de un cambio tambien cuenta', () => {
  // Desde terra subiendo rapido (2,75 m/s) a 576,2 m, el globo cruza 500 m entre los 59 y los 87 s,
  // en el ultimo minuto del cambio. Por encima de 500 m el viento va al norte, asi que el punto donde
  // sale del margen es lo mas al norte que se esta a 500 m entre los minutos 1 y 2.
  const r = { altM: [300, 500, 576.2], etiqueta: ['terra', 'F1', 'F2'] }
  const c = campoSintetico(r, 10, b => (b === 2 ? [0, 5] : [0, 0]))
  const lento: AjustesNav = { ...aj, modos: { puja_lent: 0.5, puja_rapid: 2.75, baixa_lent: 0.5, baixa_rapid: 4 } }
  const mg = margenDe({ tipo: 'altitud', altM: 500 }, r)!
  const z = calcularZona(construirTablas(c, 1, lento, mg), 0)
  it('la cota cubre el punto de salida', () => {
    const p: PlanInterno = { franjas: [0, 2], clases: [1], dur: [0, 0] }
    const cam = caminoDirecto(c, 1, lento, p)!
    const f = fraccionesDirectas(c, lento, p, mg)[1]!
    expect(f[1]).toBeLessThan(1)
    const y = cam[1][1] + f[1] * (cam[2][1] - cam[1][1])
    expect(y).toBeGreaterThan(10)
    expect(y).toBeLessThanOrEqual(Math.max(z.h[8][1], z.h[8][2]) + 1e-6)
  })
})

describe('la zona con el relieve', () => {
  // Solo F1 (500 m) al este a 5 m/s, y un cerro de 490 m de x = 2 000 a 3 000: F1 no vale encima.
  const p0 = { lat0: 41.6, lon0: 1.6 }
  const c = campoSintetico({ altM: [500], etiqueta: ['F1'] }, 20, () => [5, 0])
  const rel = relieveSintetico(p0, -2000, -2000, 8000, 2000, 100, x => (x >= 2000 && x <= 3000 ? 490 : 280))
  const sin = calcularZona(construirTablas(c, 1, rapido), 0)
  const con = calcularZona(construirTablas(c, 1, rapido, SIN_MARGEN, { techo: techoPlano(rel, p0), maxM: maximo(rel) }), 0)
  it('la cota exterior no cambia', () => {
    for (let d = 0; d < sin.dirs.length; d++) for (let k = 0; k <= 20; k++) expect(con.h[d][k]).toBe(sin.h[d][k])
  })
  it('la zona pintada se acaba en el cerro y no reaparece detras', () => {
    expect(poligono(con, 6).length).toBeGreaterThan(0)
    for (let k = 7; k <= 20; k++) expect(poligono(con, k)).toEqual([])
    expect(poligono(sin, 15).length).toBeGreaterThan(0)
  })
})

describe('la zona pintada no entra en un cambio que pasa bajo el minimo', () => {
  // Un cerro de 490 m en 1 km alrededor del globo. F2 (576,2 m) en calma, F1 (500 m) al norte, y
  // bajadas a 0,5 m/s. Bajando de F2 a F1, el primer minuto acaba a 546 m (vale) y el segundo a 516 m
  // (no vale: 490 + 30,5), unos 240 m al norte. Eso no se pinta.
  const p0 = { lat0: 41.6, lon0: 1.6 }
  const c = campoSintetico({ altM: [500, 576.2], etiqueta: ['F1', 'F2'] }, 10, b => (b === 0 ? [0, 5] : [0, 0]))
  const lento: AjustesNav = { ...aj, modos: { puja_lent: 0.5, puja_rapid: 0.5, baixa_lent: 0.5, baixa_rapid: 0.5 } }
  const rel = relieveSintetico(p0, -3000, -3000, 3000, 3000, 100, (x, y) => (Math.hypot(x, y) <= 1000 ? 490 : 280))
  const z = calcularZona(construirTablas(c, 1, lento, SIN_MARGEN, { techo: techoPlano(rel, p0), maxM: maximo(rel) }), 1)
  it('a partir del minuto 2, nada mas al norte que el primer minuto de la bajada', () => {
    for (let k = 2; k <= 10; k++) for (const [, y] of poligono(z, k)) expect(y).toBeLessThan(100)
  })
})
