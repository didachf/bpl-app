import { describe, it, expect } from 'vitest'
import { juzgarViento, limiteManual, LIMITE_FM04_KT, PRACTICA_FAA_KT } from './windLimits'
import { ktToMs } from '../services/uv'

describe('juzgarViento', () => {
  it('sin limite del manual y sin minimo personal, no juzga: lo pide', () => {
    const j = juzgarViento(ktToMs(5), null, null)
    expect(j.veredicto).toBe('sin_limite')
    expect(j.mensaje).toMatch(/manual/i)
  })

  it('por debajo de los dos limites, dentro', () => {
    expect(juzgarViento(ktToMs(5), 15, 8).veredicto).toBe('dentro')
  })

  it('por encima del minimo personal pero por debajo del manual', () => {
    const j = juzgarViento(ktToMs(10), 15, 8)
    expect(j.veredicto).toBe('sobre_personal')
    expect(j.mensaje).toMatch(/personal/i)
  })

  it('por encima del manual manda sobre todo lo demas', () => {
    const j = juzgarViento(ktToMs(17), 15, 8)
    expect(j.veredicto).toBe('sobre_manual')
    expect(j.mensaje).toMatch(/manual de vuelo/i)
  })

  it('justo en el limite del manual NO lo supera', () => {
    expect(juzgarViento(ktToMs(15), 15, null).veredicto).toBe('dentro')
  })

  it('con manual pero sin minimo personal, solo juzga contra el manual', () => {
    expect(juzgarViento(ktToMs(10), 15, null).veredicto).toBe('dentro')
  })

  it('con minimo personal pero sin manual, juzga contra el personal y lo dice', () => {
    const j = juzgarViento(ktToMs(10), null, 8)
    expect(j.veredicto).toBe('sobre_personal')
    expect(j.mensaje).toMatch(/no has puesto el limite del manual/i)
  })

  it('convierte a nudos, que es en lo que hablan los manuales', () => {
    expect(Math.round(juzgarViento(ktToMs(12), 15, null).vientoKt)).toBe(12)
  })

  it('NUNCA dice que se puede volar', () => {
    for (const kt of [1, 5, 8, 14]) {
      const j = juzgarViento(ktToMs(kt), 15, 10)
      expect(j.mensaje.toLowerCase()).not.toMatch(/puedes volar|se puede volar|apto para volar/)
    }
  })
})

describe('las cifras de referencia', () => {
  it('el limite del FM04 son 15 kt', () => {
    expect(LIMITE_FM04_KT).toBe(15)
  })

  it('la practica que cita el FAA son menos de 7 kt', () => {
    expect(PRACTICA_FAA_KT).toBe(7)
  })
})

describe('limiteManual', () => {
  const globo = (kt: number | null) => ({
    id: 'b1', registration: 'EC-KMU', manufacturer: 'Ultramagic', model: 'M-105',
    balloonClass: 'hot_air' as const, envelopeVolumeM3: 2900, maxSurfaceWindKt: kt,
  })

  it('sin globo elegido, los 15 kt del FM04', () => {
    expect(limiteManual(null)).toEqual({ kt: 15, fuente: 'fm04' })
  })

  it('un globo sin cifra propia hereda los 15 kt del FM04', () => {
    expect(limiteManual(globo(null))).toEqual({ kt: 15, fuente: 'fm04' })
  })

  it('la cifra del globo manda sobre el valor por defecto', () => {
    // El Suplemento 34 baja a 12 kt para la envolvente N-500. Si algun dia
    // vuela una, el campo de ese globo tiene que ganar.
    expect(limiteManual(globo(12))).toEqual({ kt: 12, fuente: 'globo' })
  })

  it('un cero del globo es un cero, no un hueco', () => {
    expect(limiteManual(globo(0))).toEqual({ kt: 0, fuente: 'globo' })
  })
})
