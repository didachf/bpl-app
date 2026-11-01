// src/services/vuelo/navegacio.test.ts
import { describe, it, expect } from 'vitest'
import { clauDe, entradaDeVol, MAX_VIGENT_MS, triarPlan, type PlanVigent } from './navegacio'
import { novaSessio } from './sessio'
import { parsePrevision } from '../nav/perfil'
import { cargar1010 } from '../nav/prueba-1010'
import type { ResultadoNavegacion } from '../nav/tipos'
import type { Waypoint } from '../../domain/types'

const prev = parsePrevision(cargar1010())
const s = { ...novaSessio({ lat: 41.6561, lon: 1.149, elevM: 380 }, 1200, 0), enlairatA: 5000 }
const wp: Waypoint = { id: 'za', nom: 'ZONA A', lat: 41.682, lon: 1.196, objectiu: { tipo: 'aterrar' }, nota: '' }

const pv = (clau: string, d: number | null, calculatA: number): PlanVigent =>
  ({ clau, calculatA, r: { distanciaMinM: d } as ResultadoNavegacion })

describe('la entrada del motor', () => {
  it('con waypoint: el punto, su objetivo, el relieve, terra y el despegue', () => {
    const e = entradaDeVol(s, prev, null, wp, 9000)
    expect(e.punto).toEqual({ lat: 41.682, lon: 1.196 })
    expect(e.objetivo).toEqual({ tipo: 'aterrar' })
    expect(e.incluirTerra).toBe(true)
    expect(e.despegue).toBe(5000)
    expect(e.ahora).toBe(9000)
    expect(e.relieve).toBe(undefined)
    expect(e.ajustes.altMaxM).toBe(1200)
  })
  it('sin waypoint, sin punto (§6.9)', () => {
    expect(entradaDeVol(s, prev, null, null, 9000).punto).toBe(null)
  })
  it('la clave cambia con el objetivo', () => {
    expect(clauDe(wp)).not.toBe(clauDe({ ...wp, objectiu: { tipo: 'qualsevol' } }))
    expect(clauDe(null)).toBe('')
  })
})

describe('el plan vigente', () => {
  it('sin vigente o con otro waypoint, el nuevo', () => {
    expect(triarPlan(null, pv('a', 500, 0), 0).calculatA).toBe(0)
    expect(triarPlan(pv('a', 500, 0), pv('b', 900, 15_000), 15_000).clau).toBe('b')
  })
  it('se queda el vigente si el nuevo no mejora un 20 % o 200 m', () => {
    expect(triarPlan(pv('a', 500, 0), pv('a', 450, 15_000), 15_000).calculatA).toBe(0)
    expect(triarPlan(pv('a', 500, 0), pv('a', 399, 15_000), 15_000).calculatA).toBe(15_000)
    expect(triarPlan(pv('a', 2000, 0), pv('a', 1790, 15_000), 15_000).calculatA).toBe(15_000)
  })
  it(`con ${MAX_VIGENT_MS / 1000} s o mas, el nuevo aunque no mejore`, () => {
    expect(triarPlan(pv('a', 500, 0), pv('a', 600, MAX_VIGENT_MS), MAX_VIGENT_MS).calculatA).toBe(MAX_VIGENT_MS)
  })
  it('sin distancia en alguno, el nuevo', () => {
    expect(triarPlan(pv('a', null, 0), pv('a', 600, 15_000), 15_000).calculatA).toBe(15_000)
  })
})
