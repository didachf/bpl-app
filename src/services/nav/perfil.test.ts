import { describe, it, expect } from 'vitest'
import { aVector, parsePrevision, type RespuestaOpenMeteo } from './perfil'
import { cargar1010 } from './prueba-1010'

describe('aVector', () => {
  it('viento del oeste va hacia el este', () => {
    const [u, v] = aVector(10, 270)
    expect(u).toBeCloseTo(10)
    expect(v).toBeCloseTo(0)
  })
  it('viento del sur va hacia el norte', () => {
    const [u, v] = aVector(4, 180)
    expect(u).toBeCloseTo(0)
    expect(v).toBeCloseTo(4)
  })
})

function respuesta(): RespuestaOpenMeteo {
  return {
    elevation: 300,
    hourly_units: {
      time: 'iso8601',
      wind_speed_10m_icon_eu: 'kn', wind_direction_10m_icon_eu: '°',
      wind_speed_975hPa_icon_eu: 'kn', wind_direction_975hPa_icon_eu: '°', geopotential_height_975hPa_icon_eu: 'm',
      wind_speed_925hPa_icon_eu: 'kn', wind_direction_925hPa_icon_eu: '°', geopotential_height_925hPa_icon_eu: 'm',
      wind_speed_10m_ecmwf_ifs025: 'undefined', wind_direction_10m_ecmwf_ifs025: 'undefined',
    },
    hourly: {
      time: ['2026-10-10T06:00'],
      wind_speed_10m_icon_eu: [2], wind_direction_10m_icon_eu: [180],
      wind_speed_975hPa_icon_eu: [9], wind_direction_975hPa_icon_eu: [90], geopotential_height_975hPa_icon_eu: [290],
      wind_speed_925hPa_icon_eu: [10], wind_direction_925hPa_icon_eu: [270], geopotential_height_925hPa_icon_eu: [800],
      wind_speed_10m_ecmwf_ifs025: [null], wind_direction_10m_ecmwf_ifs025: [null],
    },
  }
}

describe('parsePrevision', () => {
  it('pone la Z a las horas', () => {
    expect(parsePrevision(respuesta()).horas).toEqual([Date.parse('2026-10-10T06:00Z')])
  })
  it('pasa nudos a m/s y la direccion a vector', () => {
    const p = parsePrevision(respuesta()).perfiles[0][0]
    expect(p[0].altM).toBe(310)
    expect(p[0].u).toBeCloseTo(0)
    expect(p[0].v).toBeCloseTo((2 * 1852) / 3600)
  })
  it('descarta el nivel de presion bajo tierra', () => {
    const p = parsePrevision(respuesta()).perfiles[0][0]
    expect(p.map(x => x.altM)).toEqual([310, 800])
  })
  it('un modelo sin el nivel queda vacio', () => {
    const r = parsePrevision(respuesta())
    expect(r.perfiles[r.modelos.indexOf('ecmwf_ifs025')][0]).toEqual([])
  })
  it('una unidad desconocida lanza', () => {
    const r = respuesta()
    r.hourly_units.wind_speed_10m_icon_eu = 'furlongs'
    expect(() => parsePrevision(r)).toThrow(/Unidad/)
  })
  it('con el 10/10, los puntos por modelo que dio el prototipo', () => {
    const r = parsePrevision(cargar1010())
    expect(r.elevM).toBe(380)
    expect(r.perfiles.map(m => m[0].length)).toEqual([12, 10, 9, 7, 15, 5, 15])
    for (const m of r.perfiles) {
      for (const h of m) {
        for (let i = 1; i < h.length; i++) expect(h[i].altM).toBeGreaterThanOrEqual(h[i - 1].altM)
      }
    }
  })
})
