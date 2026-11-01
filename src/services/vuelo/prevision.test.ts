// src/services/vuelo/prevision.test.ts
import { describe, it, expect } from 'vitest'
import { CuotaAgotada, cuerpoPrevision, pedirPrevision, pesoLlamadas, variablesPrevision } from './prevision'
import { MODELOS_NAV, parsePrevision } from '../nav/perfil'
import { cargar1010 } from '../nav/prueba-1010'

describe('la peticion de la pantalla de vuelo', () => {
  it('pide las 42 variables de §5.1, sin repetir', () => {
    const v = variablesPrevision()
    expect(v).toHaveLength(42)
    expect(new Set(v).size).toBe(42)
    expect(v).toContain('wind_direction_20m')
    expect(v).toContain('geopotential_height_700hPa')
  })

  it('pesa 29,4 llamadas: esta prueba salta si alguien anade variables o modelos', () => {
    expect(pesoLlamadas(variablesPrevision().length, MODELOS_NAV.length)).toBeCloseTo(29.4, 9)
  })

  it('la regla de la cuota: minimo 1 por punto y lineal en los puntos', () => {
    expect(pesoLlamadas(5, 1)).toBe(1)
    expect(pesoLlamadas(42, 7, 91)).toBeCloseTo(2675.4, 6)
  })

  it('una hora antes de ahora y 24 h por delante, en UTC', () => {
    const b = cuerpoPrevision(41.65612, 1.14903, Date.parse('2026-11-02T06:34:10Z'))
    expect(b.start_hour).toBe('2026-11-02T05:00')
    expect(b.end_hour).toBe('2026-11-03T06:00')
    expect(b.models.split(',')).toEqual([...MODELOS_NAV])
    expect(b.timezone).toBe('UTC')
    expect(b.wind_speed_unit).toBe('ms')
    expect(b.latitude).toBe('41.6561')
  })

  it('POST con cuerpo de formulario, y devuelve la respuesta tal cual', async () => {
    let visto: RequestInit | undefined
    const f = (async (_u: string | URL | Request, init?: RequestInit) => {
      visto = init
      return new Response(JSON.stringify(cargar1010()))
    }) as typeof fetch
    const r = await pedirPrevision(41.65, 1.14, Date.parse('2026-11-02T06:00Z'), f)
    expect(visto?.method).toBe('POST')
    expect(new URLSearchParams(visto?.body as string).get('models')).toBe(MODELOS_NAV.join(','))
    expect(parsePrevision(r).modelos).toHaveLength(7)
  })

  it('429 es la cuota, y otro error dice el codigo', async () => {
    const f = (s: number) => (async () => new Response('', { status: s })) as typeof fetch
    await expect(pedirPrevision(41, 1, 0, f(429))).rejects.toBeInstanceOf(CuotaAgotada)
    await expect(pedirPrevision(41, 1, 0, f(500))).rejects.toThrow('500')
  })
})
