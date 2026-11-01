// src/services/vuelo/previsionGuardada.test.ts
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  borrarPrevision, distanciaKm, leerPrevision, obtenerPrevision, REFRESCO_MIN, type PrevisionGuardada,
} from './previsionGuardada'
import { CuotaAgotada } from './prevision'
import { cargar1010 } from '../nav/prueba-1010'
import type { RespuestaOpenMeteo } from '../nav/perfil'

const T0 = Date.parse('2026-11-02T06:00Z')
const MIN = 60_000

function pedidor() {
  const llamadas: number[] = []
  const pedir = async (_lat: number, _lon: number, ahora: number): Promise<RespuestaOpenMeteo> => {
    llamadas.push(ahora)
    return cargar1010()
  }
  return { llamadas, pedir }
}

describe('la prevision guardada', () => {
  beforeEach(async () => { await borrarPrevision() })

  it('sin nada guardado pide, guarda y la da como nueva', async () => {
    const { llamadas, pedir } = pedidor()
    const o = await obtenerPrevision(41.65, 1.14, T0, pedir)
    expect(llamadas).toEqual([T0])
    expect(o.nueva).toBe(true)
    expect(o.error).toBe(null)
    expect((await leerPrevision())?.pedidaEn).toBe(T0)
  })

  it('antes de 30 min no vuelve a pedir', async () => {
    const { llamadas, pedir } = pedidor()
    await obtenerPrevision(41.65, 1.14, T0, pedir)
    const o = await obtenerPrevision(41.66, 1.15, T0 + (REFRESCO_MIN - 1) * MIN, pedir)
    expect(llamadas).toHaveLength(1)
    expect(o.nueva).toBe(false)
    expect(o.guardada?.pedidaEn).toBe(T0)
  })

  it('a los 30 min pide otra en la posicion de ahora', async () => {
    const { llamadas, pedir } = pedidor()
    await obtenerPrevision(41.65, 1.14, T0, pedir)
    const o = await obtenerPrevision(41.70, 1.20, T0 + REFRESCO_MIN * MIN, pedir)
    expect(llamadas).toHaveLength(2)
    expect(o.guardada?.lat).toBe(41.70)
  })

  it('si falla al refrescar, la guardada y el error de la cuota', async () => {
    const { pedir } = pedidor()
    await obtenerPrevision(41.65, 1.14, T0, pedir)
    const falla = async (): Promise<RespuestaOpenMeteo> => { throw new CuotaAgotada('quota') }
    const o = await obtenerPrevision(41.65, 1.14, T0 + 40 * MIN, falla)
    expect(o.guardada?.pedidaEn).toBe(T0)
    expect(o.nueva).toBe(false)
    expect(o.error).toBe('quota')
  })

  it('sin red y sin nada guardado lo dice', async () => {
    const sinRed = async (): Promise<RespuestaOpenMeteo> => { throw new TypeError('Failed to fetch') }
    const o = await obtenerPrevision(41.65, 1.14, T0, sinRed)
    expect(o.guardada).toBe(null)
    expect(o.error).toBe('Sense connexió amb open-meteo.')
  })

  it('a cuantos km se pidio', () => {
    const p: PrevisionGuardada = { respuesta: cargar1010(), lat: 41.65, lon: 1.14, pedidaEn: T0 }
    expect(distanciaKm(p, 41.65 + 1000 / (6371000 * Math.PI / 180), 1.14)).toBeCloseTo(1, 6)
  })
})
