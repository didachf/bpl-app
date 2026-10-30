import { describe, it, expect } from 'vitest'
import {
  aproximacion, aTramos, buscarPlan, caminoDirecto, caminoTabla, debeSustituir, elegir, type PlanInterno,
} from './plan'
import { oraculo } from './oraculo'
import { construirTablas } from './vertical'
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
