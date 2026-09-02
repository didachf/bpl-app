import { describe, it, expect } from 'vitest'
import { keyOf, type RawProfile } from './openmeteo'
import { buildRows, nivelPorClave } from './wind'

function perfil(over: Partial<RawProfile> = {}): RawProfile {
  return {
    lat: 41.58,
    lon: 1.65,
    times: ['2026-09-03T05:00Z'],
    wind: {},
    height: {},
    noCubiertos: new Set<string>(),
    fetchedAt: 0,
    ...over,
  }
}

describe('buildRows', () => {
  it('una fila por hora', () => {
    expect(buildRows(perfil({ times: ['a', 'b'] }))).toHaveLength(2)
  })

  it('agrupa los modelos que dan dato en ese nivel', () => {
    const p = perfil()
    p.wind[keyOf('icon_eu', '10m')] = [{ speed: 3, dir: 220 }]
    p.wind[keyOf('gfs_seamless', '10m')] = [{ speed: 4, dir: 230 }]
    const celda = nivelPorClave(buildRows(p)[0], '10m')
    expect(celda.muestras).toHaveLength(2)
    expect(celda.banda).toEqual({ min: 3, max: 4 })
  })

  it('separa el modelo que NO cubre el nivel del que no tiene dato esa hora', () => {
    const p = perfil()
    p.noCubiertos.add(keyOf('ecmwf_ifs025', '900hPa'))
    p.wind[keyOf('ecmwf_ifs025', '900hPa')] = [null]
    p.wind[keyOf('icon_eu', '900hPa')] = [null]
    p.wind[keyOf('gfs_seamless', '900hPa')] = [{ speed: 5, dir: 200 }]
    const celda = nivelPorClave(buildRows(p)[0], '900hPa')
    expect(celda.noCubren).toEqual(['ecmwf_ifs025'])
    expect(celda.sinDato).toContain('icon_eu')
    expect(celda.sinDato).not.toContain('ecmwf_ifs025')
  })

  it('calcula el abanico y la media ponderada', () => {
    const p = perfil()
    p.wind[keyOf('icon_eu', '80m')] = [{ speed: 5, dir: 350 }]
    p.wind[keyOf('gfs_seamless', '80m')] = [{ speed: 5, dir: 10 }]
    const celda = nivelPorClave(buildRows(p)[0], '80m')
    expect(celda.spread!.arco.spanDeg).toBe(20)
    expect(Math.round(celda.media!.dir)).toBe(0)
  })

  it('sin ningun modelo, la celda queda vacia y no revienta', () => {
    const celda = nivelPorClave(buildRows(perfil())[0], '925hPa')
    expect(celda.muestras).toHaveLength(0)
    expect(celda.spread).toBe(null)
    expect(celda.banda).toBe(null)
  })

  it('la altura del nivel de presion sale de los modelos, no de la atmosfera estandar', () => {
    const p = perfil()
    p.wind[keyOf('icon_eu', '925hPa')] = [{ speed: 5, dir: 200 }]
    p.height[keyOf('icon_eu', '925hPa')] = [849]
    p.wind[keyOf('gfs_seamless', '925hPa')] = [{ speed: 5, dir: 200 }]
    p.height[keyOf('gfs_seamless', '925hPa')] = [851]
    expect(nivelPorClave(buildRows(p)[0], '925hPa').alturaAmslM).toBe(850)
  })

  it('los niveles AGL no llevan altura sobre el mar, llevan la suya', () => {
    const celda = nivelPorClave(buildRows(perfil())[0], '10m')
    expect(celda.alturaAmslM).toBe(null)
    expect(celda.level.aglM).toBe(10)
  })

  it('las filas salen en el orden de LEVELS, de abajo arriba', () => {
    const claves = buildRows(perfil())[0].niveles.map(n => n.level.key)
    expect(claves).toEqual(['10m', '80m', '120m', '180m', '950hPa', '925hPa', '900hPa'])
  })
})
