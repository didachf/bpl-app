import { describe, it, expect } from 'vitest'
import {
  aproximacion, aTramos, buscarPlan, caminoDirecto, caminoTabla, candidatas, debeSustituir, elegir, fracciones,
  type Evaluado, type PlanInterno,
} from './plan'
import { fraccionesDirectas, oraculo } from './oraculo'
import { margenDe } from './objetivo'
import { construirTablas, type Tablas } from './vertical'
import { campoSintetico, rejillaUniforme } from './sintetico'
import { AJUSTES_POR_DEFECTO, type AjustesNav } from './tipos'

const aj: AjustesNav = { ...AJUSTES_POR_DEFECTO, altMinM: 0, altMaxM: 9999 }
const rapido: AjustesNav = {
  ...aj, modos: { puja_lent: 7.62, puja_rapid: 76.2, baixa_lent: 7.62, baixa_rapid: 76.2 },
}

describe('aproximacion', () => {
  it('por segmentos, no solo en los minutos', () => {
    expect(aproximacion([[0, 0], [100, 0]], 50, 10).distM).toBeCloseTo(10)
  })
})

describe('caminoTabla y caminoDirecto dan lo mismo', () => {
  const c = campoSintetico(rejillaUniforme(4, 500), 40, (b, k) => [Math.cos(b + k / 10) * 4, Math.sin(b * 2 + k / 7) * 4])
  const t = construirTablas(c, 1, aj)
  const planes: PlanInterno[] = [
    { franjas: [0], clases: [], dur: [40] },
    { franjas: [0, 3], clases: [1], dur: [4, 0] },
    { franjas: [1, 3, 0], clases: [0, 1], dur: [0, 6, 0] },
    { franjas: [2, 0, 1], clases: [1, 0], dur: [7, 3, 0] },
  ]
  for (const p of planes) {
    it(p.franjas.join(' '), () => {
      const a = caminoTabla(t, p)!
      const b = caminoDirecto(c, 1, aj, p)!
      expect(a).toHaveLength(41)
      for (let k = 0; k <= 40; k++) {
        expect(a[k][0]).toBeCloseTo(b[k][0], 6)
        expect(a[k][1]).toBeCloseTo(b[k][1], 6)
      }
    })
  }
})

describe('buscarPlan', () => {
  it('dos capas, este y norte: llega', () => {
    const c = campoSintetico(rejillaUniforme(2, 500), 60, b => (b === 0 ? [5, 0] : [0, 5]))
    const e = buscarPlan(construirTablas(c, 1, rapido), 0, 6000, 6000)
    expect(e.plan.franjas).toContain(1)
    expect(e.distM).toBeLessThanOrEqual(50.01)
  })
  it('no peor que la fuerza bruta del prototipo, y con las reglas', () => {
    const c = campoSintetico(rejillaUniforme(5, 500), 60, (b, k) =>
      [Math.cos(b * 1.3 + k / 20) * 5, Math.sin(b * 1.3 + k / 20) * 5])
    const t = construirTablas(c, 1, aj)
    const e = buscarPlan(t, 2, -3000, 4000)
    const o = oraculo(c, 1, aj, 2, -3000, 4000)
    expect(e.distM).toBeLessThanOrEqual(o.distM + 50)
    expect(e.plan.franjas.length).toBeLessThanOrEqual(3)
    expect(e.plan.dur[0] === 0 || e.plan.dur[0] >= 2).toBe(true)
    for (let i = 1; i < e.plan.dur.length - 1; i++) expect(e.plan.dur[i]).toBeGreaterThanOrEqual(2)
  })
})

describe('elegir', () => {
  const p: PlanInterno = { franjas: [0], clases: [], dur: [10] }
  const q: PlanInterno = { franjas: [0, 1], clases: [0], dur: [2, 0] }
  it('a menos de 50 m del mejor, gana el que llega antes', () => {
    expect(elegir([{ plan: p, distM: 10, minuto: 20 }, { plan: q, distM: 30, minuto: 10 }]).plan).toBe(q)
  })
  it('y despues el de menos cambios', () => {
    expect(elegir([{ plan: q, distM: 10, minuto: 10 }, { plan: p, distM: 30, minuto: 10 }]).plan).toBe(p)
  })
  it('si alguno llega, no gana uno que no llega aunque llegue antes', () => {
    expect(elegir([{ plan: q, distM: 10, minuto: 40 }, { plan: p, distM: 55, minuto: 20 }]).distM).toBe(10)
  })
  it('si ninguno llega, el mas cercano', () => {
    expect(elegir([{ plan: p, distM: 2000, minuto: 0 }, { plan: q, distM: 1960, minuto: 30 }]).distM).toBe(1960)
  })
  it('a mas de 50 m, la distancia manda', () => {
    expect(elegir([{ plan: p, distM: 10, minuto: 20 }, { plan: q, distM: 70, minuto: 5 }]).plan).toBe(p)
  })
})

describe('aTramos', () => {
  const c = campoSintetico(rejillaUniforme(2, 500), 60, () => [1, 0])
  const t = construirTablas(c, 1, rapido)
  it('mantener, cambiar y mantener hasta el punto', () => {
    const tr = aTramos(t, { franjas: [0, 1], clases: [1], dur: [5, 0] }, 30)
    expect(tr.map(x => [x.tipo, x.franja, x.inicioMin, x.finMin])).toEqual([
      ['mantener', 0, 0, 5], ['cambiar', 1, 5, 6], ['mantener', 1, 6, 30],
    ])
    expect(tr[1].modo).toBe('puja_rapid')
  })
  it('sin mantener la actual si sale enseguida', () => {
    expect(aTramos(t, { franjas: [0, 1], clases: [0], dur: [0, 0] }, 10)[0].tipo).toBe('cambiar')
  })
})

describe('debeSustituir', () => {
  it('20 % o 200 m mas cerca', () => {
    expect(debeSustituir(1000, 800)).toBe(true)
    expect(debeSustituir(1000, 850)).toBe(false)
    expect(debeSustituir(5000, 4800)).toBe(true)
    expect(debeSustituir(5000, 4850)).toBe(false)
  })
})

describe('aproximacion con margen', () => {
  const cam: [number, number][] = [[0, 0], [100, 0], [200, 0]]
  it('solo el trozo de dentro cuenta', () => {
    expect(aproximacion(cam, 150, 10, [null, [0.5, 1]]).distM).toBeCloseTo(10)
    expect(aproximacion(cam, 150, 10, [null, [0.8, 1]]).distM).toBeCloseTo(Math.hypot(30, 10))
  })
  it('el minuto es el del extremo del trozo mas cercano', () => {
    expect(aproximacion(cam, 150, 10, [null, [0.8, 1]]).minuto).toBe(2)
    expect(aproximacion(cam, 150, 10, [[0, 0.2], null]).minuto).toBe(0)
  })
  it('sin nada dentro, infinito', () => {
    expect(aproximacion(cam, 150, 10, [null, null]).distM).toBe(Infinity)
  })
})

describe('fracciones', () => {
  const c = campoSintetico(rejillaUniforme(3, 500), 20, () => [1, 0])
  const lento: AjustesNav = { ...aj, modos: { puja_lent: 1, puja_rapid: 1, baixa_lent: 1, baixa_rapid: 1 } }
  const m = margenDe({ tipo: 'altitud', altM: 576.2 }, c.rejilla)!
  const t = construirTablas(c, 1, lento, m)
  // 0 a 2 a 1 m/s: 152,4 m, 160 s con los pasos de 10 s, 3 minutos. Dentro de 38,1 s a 114,3 s.
  const p: PlanInterno = { franjas: [0, 2], clases: [0], dur: [4, 0] }
  it('con tablas y sin ellas, lo mismo', () => {
    expect(fracciones(t, p)).toEqual(fraccionesDirectas(c, lento, p, m))
  })
  it('mantener fuera, cruzar la franja 1, mantener fuera', () => {
    const f = fracciones(t, p)
    expect(f).toHaveLength(20)
    expect(f.slice(0, 4)).toEqual([null, null, null, null])
    expect(f[4]![0]).toBeCloseTo(38.1 / 60, 6)
    expect(f[4]![1]).toBe(1)
    expect(f[5]![0]).toBe(0)
    expect(f[5]![1]).toBeCloseTo(114.3 / 60 - 1, 6)
    expect(f[6]).toBeNull()
    expect(f.slice(7)).toEqual(new Array(13).fill(null))
  })
})

describe('buscarPlan con margen', () => {
  // franja 0 al este y franja 1 al norte, cambios de un minuto. El punto (3050, 2700) se alcanza
  // de dos maneras: al este y despues al norte (pasando en la franja 1), o al norte y despues al
  // este (pasando en la franja 0).
  const c = campoSintetico(rejillaUniforme(2, 500), 60, b => (b === 0 ? [5, 0] : [0, 5]))
  // Muchos planes empatan a 0 m y la busqueda guarda los 40 mejores por distancia, asi que lo que se
  // comprueba es lo que vera el piloto: el ultimo tramo de las ordenes, cortadas al pasar por el punto.
  const ultimo = (t: Tablas, e: Evaluado) => {
    const tr = aTramos(t, e.plan, Math.max(1, e.minuto))
    return tr[tr.length - 1]
  }
  it('pasar a la franja 0: el plan acaba en ella', () => {
    const t = construirTablas(c, 1, rapido, margenDe({ tipo: 'altitud', altM: 500 }, c.rejilla)!)
    const e = buscarPlan(t, 0, 3050, 2700)
    expect(e.distM).toBeLessThanOrEqual(50)
    expect(e.plan.franjas).toEqual([0, 1, 0])
  })
  it('pasar a la franja 1: pasa por el punto en ella', () => {
    const t = construirTablas(c, 1, rapido, margenDe({ tipo: 'altitud', altM: 576.2 }, c.rejilla)!)
    const e = buscarPlan(t, 0, 3050, 2700)
    expect(e.distM).toBeLessThanOrEqual(50)
    expect(ultimo(t, e).franja).toBe(1)
  })
  it('aterrar: pasa por el punto en terra', () => {
    const r = { altM: [300, 500, 576.2], etiqueta: ['terra', 'F1', 'F2'] }
    const c2 = campoSintetico(r, 60, b => (b === 0 ? [-1, 0] : b === 1 ? [0, 5] : [5, 0]))
    const t = construirTablas(c2, 1, rapido, margenDe({ tipo: 'aterrar' }, r)!)
    const e = buscarPlan(t, 2, 3000, 0)
    expect(e.distM).toBeLessThanOrEqual(50)
    expect(ultimo(t, e).franja).toBe(0)
  })
  it('no peor que la fuerza bruta con el mismo margen', () => {
    const c3 = campoSintetico(rejillaUniforme(5, 500), 60, (b, k) =>
      [Math.cos(b * 1.3 + k / 20) * 5, Math.sin(b * 1.3 + k / 20) * 5])
    const m = margenDe({ tipo: 'altitud', altM: 500 + 4 * 76.2 }, c3.rejilla)!
    const e = buscarPlan(construirTablas(c3, 1, aj, m), 2, -3000, 4000)
    const o = oraculo(c3, 1, aj, 2, -3000, 4000, m)
    expect(e.distM).toBeLessThanOrEqual(o.distM + 50)
  })
})

describe('candidatas con margen', () => {
  // 20 franjas: la 19 no esta en la envolvente ni alineada con el punto
  const esquinas: [number, number][] = [[-3, 3], [-3, -3], [3, 3], [3, -3]]
  const c = campoSintetico(rejillaUniforme(20, 500), 20, b => (b < 4 ? [1, 0] : b === 19 ? [-1, 0] : esquinas[b % 4]))
  it('sin margen, la 19 no entra', () => {
    expect(candidatas(construirTablas(c, 1, rapido), 0, 1000, 0)).not.toContain(19)
  })
  it('con el margen en la 19, entra siempre', () => {
    const m = margenDe({ tipo: 'altitud', altM: 500 + 19 * 76.2 }, c.rejilla)!
    expect(candidatas(construirTablas(c, 1, rapido, m), 0, 1000, 0)).toContain(19)
  })
})

describe('lo de fuera del margen no cuenta, en ningun tramo', () => {
  // 10 min. Franja 0 en calma (el margen), franjas 1 y 2 al norte a 5 m/s, cambios de un minuto.
  // Manteniendo la 1 o cambiando a la 2 se pasa por (0, 2950), pero fuera del margen. Dentro, lo
  // mas al norte es llegar a la franja 0 en el minuto 10 bajando despacio desde la 2, que cruza dos
  // pasos de 10 s con viento al norte: 250 + 300 x 8 + 100 = 2 750 m.
  const c = campoSintetico(rejillaUniforme(3, 500), 10, b => (b === 0 ? [0, 0] : [0, 5]))
  const t = construirTablas(c, 1, rapido, margenDe({ tipo: 'altitud', altM: 500 }, c.rejilla)!)
  it('lo mas cerca dentro del margen son 200 m', () => {
    expect(buscarPlan(t, 0, 0, 2950).distM).toBeCloseTo(200, 3)
  })
})

describe('la distancia que devuelve la busqueda es la de su plan con el margen', () => {
  const c = campoSintetico(rejillaUniforme(5, 500), 60, (b, k) =>
    [Math.cos(b * 1.3 + k / 20) * 5, Math.sin(b * 1.3 + k / 20) * 5])
  for (const b of [0, 4]) {
    it(`margen en la franja ${b}`, () => {
      const t = construirTablas(c, 1, aj, margenDe({ tipo: 'altitud', altM: 500 + b * 76.2 }, c.rejilla)!)
      for (const [ox, oy] of [[-3000, 4000], [2500, 1500], [-1000, -4000]]) {
        const e = buscarPlan(t, 2, ox, oy)
        const r = aproximacion(caminoTabla(t, e.plan)!, ox, oy, fracciones(t, e.plan))
        expect(r.distM).toBeCloseTo(e.distM, 6)
      }
    })
  }
})
