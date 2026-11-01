// src/services/vuelo/mapasDeVuelo.test.ts
import { describe, it, expect } from 'vitest'
import {
  mosaicosOrto, mosaicosRelieve, PATRON_MOSAICOS, RADIO_RELIEVE_M, URL_ORTO, URL_RELIEVE, urlDe,
} from './mapasDeVuelo'
import { aPlano } from '../nav/geo'

const T = { lat: 41.6561, lon: 1.149 }

describe('los mapas del vuelo', () => {
  it('URL de la ortofoto del Mapa base y del relieve de AWS', () => {
    expect(urlDe(URL_ORTO, { z: 12, x: 2066, y: 1526 }))
      .toBe('https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/orto/MON3857NW/12/2066/1526.png')
    expect(urlDe(URL_RELIEVE, { z: 12, x: 2060, y: 1525 }))
      .toBe('https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/2060/1525.png')
  })

  it('ortofoto de §8 en Tarrega: z12 a z15 en 15 km y z16 en 3 km', () => {
    const ms = mosaicosOrto(T.lat, T.lon)
    expect(ms).toHaveLength(1764)
    expect(ms.filter(m => m.z === 16)).toHaveLength(196)
    expect(new Set(ms.map(m => m.z))).toEqual(new Set([12, 13, 14, 15, 16]))
    expect(new Set(ms.map(m => `${m.z}/${m.x}/${m.y}`)).size).toBe(1764)
  })

  it('relieve: 20 km alrededor, 36 mosaicos z12', () => {
    const { caja, mosaicos } = mosaicosRelieve(T.lat, T.lon)
    expect(mosaicos).toHaveLength(36)
    expect(mosaicos.every(m => m.z === 12)).toBe(true)
    expect(aPlano({ lat0: T.lat, lon0: T.lon }, caja.norte, caja.este)[0]).toBeCloseTo(RADIO_RELIEVE_M, 6)
  })

  it('el patron del service worker coge los dos y nada mas', () => {
    expect(PATRON_MOSAICOS.test(urlDe(URL_ORTO, { z: 15, x: 1, y: 2 }))).toBe(true)
    expect(PATRON_MOSAICOS.test(urlDe(URL_RELIEVE, { z: 12, x: 1, y: 2 }))).toBe(true)
    expect(PATRON_MOSAICOS.test('https://api.open-meteo.com/v1/forecast')).toBe(false)
    expect(PATRON_MOSAICOS.test('https://api.github.com/repos/didachf/bpl-logbook/contents/logbook.json')).toBe(false)
    expect(PATRON_MOSAICOS.test('https://geoserveis.icgc.cat/icc_mapesmultibase/noutm/wmts/orto/GRID3857/12/1/2.jpeg')).toBe(false)
  })
})
