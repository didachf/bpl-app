import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildBody, parseProfile, fetchWindProfile, keyOf } from './openmeteo'

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
afterEach(() => { vi.unstubAllGlobals() })

/** Respuesta de mentira con dos modelos y dos niveles, y el hueco de ECMWF. */
function respuesta() {
  return {
    latitude: 41.58, longitude: 1.65,
    hourly_units: {
      time: 'iso8601',
      wind_speed_10m_icon_eu: 'm/s',
      wind_direction_10m_icon_eu: '°',
      wind_speed_900hPa_icon_eu: 'm/s',
      wind_direction_900hPa_icon_eu: '°',
      geopotential_height_900hPa_icon_eu: 'm',
      wind_speed_10m_ecmwf_ifs025: 'm/s',
      wind_direction_10m_ecmwf_ifs025: '°',
      // Asi es como la API dice "este modelo no tiene este nivel": no da error.
      wind_speed_900hPa_ecmwf_ifs025: 'undefined',
      wind_direction_900hPa_ecmwf_ifs025: 'undefined',
      geopotential_height_900hPa_ecmwf_ifs025: 'undefined',
    },
    hourly: {
      time: ['2026-09-03T05:00', '2026-09-03T06:00'],
      wind_speed_10m_icon_eu: [2.0, 3.0],
      wind_direction_10m_icon_eu: [220, 230],
      wind_speed_900hPa_icon_eu: [5.0, 6.0],
      wind_direction_900hPa_icon_eu: [240, 250],
      geopotential_height_900hPa_icon_eu: [1086, 1087],
      wind_speed_10m_ecmwf_ifs025: [2.5, null],
      wind_direction_10m_ecmwf_ifs025: [225, null],
      wind_speed_900hPa_ecmwf_ifs025: [null, null],
      wind_direction_900hPa_ecmwf_ifs025: [null, null],
      geopotential_height_900hPa_ecmwf_ifs025: [null, null],
    },
  }
}

describe('buildBody', () => {
  const q = { lat: 41.5842, lon: 1.6528, startHour: '2026-09-03T05:00', endHour: '2026-09-03T09:00' }

  it('pide UN solo punto, porque cada coordenada consume cuota', () => {
    const b = buildBody(q)
    expect(b.latitude).toBe(41.5842)
    expect(Array.isArray(b.latitude)).toBe(false)
  })

  it('pide los seis modelos en UNA llamada, no seis llamadas', () => {
    expect(String(buildBody(q).models).split(',')).toHaveLength(6)
  })

  it('pide los siete niveles, no solo 925 y 900', () => {
    const h = String(buildBody(q).hourly)
    for (const nivel of ['10m', '80m', '120m', '180m', '950hPa', '925hPa', '900hPa']) {
      expect(h).toContain(`wind_speed_${nivel}`)
      expect(h).toContain(`wind_direction_${nivel}`)
    }
  })

  it('pide la altura de geopotencial de los niveles de presion, en vez de suponerla', () => {
    const h = String(buildBody(q).hourly)
    expect(h).toContain('geopotential_height_925hPa')
    expect(h).toContain('geopotential_height_900hPa')
    expect(h).not.toContain('geopotential_height_10m')
  })

  it('velocidad en m/s y hora en UTC, como el script de deriva', () => {
    const b = buildBody(q)
    expect(b.wind_speed_unit).toBe('ms')
    expect(b.timezone).toBe('UTC')
  })
})

describe('parseProfile', () => {
  it('las horas vuelven como ISO con Z, porque la API las manda sin zona', () => {
    // "2026-09-03T05:00" con timezone=UTC es UTC, pero Date.parse de una cadena
    // sin zona la interpreta como LOCAL. Sin la Z el vuelo se desplaza dos horas.
    expect(parseProfile(respuesta()).times[0]).toBe('2026-09-03T05:00Z')
  })

  it('saca velocidad y direccion por modelo y por nivel', () => {
    const p = parseProfile(respuesta())
    expect(p.wind[keyOf('icon_eu', '10m')][0]).toEqual({ speed: 2.0, dir: 220 })
    expect(p.wind[keyOf('icon_eu', '900hPa')][1]).toEqual({ speed: 6.0, dir: 250 })
  })

  it('un nivel que el modelo NO cubre queda marcado, no en silencio', () => {
    const p = parseProfile(respuesta())
    expect(p.noCubiertos.has(keyOf('ecmwf_ifs025', '900hPa'))).toBe(true)
    expect(p.noCubiertos.has(keyOf('icon_eu', '900hPa'))).toBe(false)
  })

  it('un hueco puntual de un modelo que SI cubre el nivel no se marca como no cubierto', () => {
    const p = parseProfile(respuesta())
    expect(p.noCubiertos.has(keyOf('ecmwf_ifs025', '10m'))).toBe(false)
    expect(p.wind[keyOf('ecmwf_ifs025', '10m')][1]).toBe(null)
  })

  it('lee la altura real del nivel de presion', () => {
    expect(parseProfile(respuesta()).height[keyOf('icon_eu', '900hPa')][0]).toBe(1086)
  })
})

describe('fetchWindProfile', () => {
  it('va por POST, porque la peticion es larga', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(respuesta()), { status: 200 }))
    await fetchWindProfile({ lat: 41.58, lon: 1.65, startHour: 'a', endHour: 'b' })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init?.method).toBe('POST')
  })

  it('un 429 sale con un mensaje que explica que es la cuota', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ error: true, reason: 'Minutely API request limit exceeded.' }),
      { status: 429 },
    ))
    await expect(fetchWindProfile({ lat: 1, lon: 1, startHour: 'a', endHour: 'b' }))
      .rejects.toThrow(/cuota/i)
  })

  it('cualquier otro fallo lo dice con su codigo', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 500 }))
    await expect(fetchWindProfile({ lat: 1, lon: 1, startHour: 'a', endHour: 'b' }))
      .rejects.toThrow(/500/)
  })
})
