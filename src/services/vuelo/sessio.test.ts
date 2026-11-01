// src/services/vuelo/sessio.test.ts
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { afegirPunt, ajustesDeVol, esborrarSessio, llegirSessio, novaSessio, desarSessio, type Sessio } from './sessio'
import type { PuntoGps } from './gps'

const D = { lat: 41.6561, lon: 1.149, elevM: 380 }
const p = (t: number, altElipM: number | null): PuntoGps => ({ t, lat: 41.6561, lon: 1.149, altElipM, precisionM: 5 })

describe('la sesion de vuelo', () => {
  beforeEach(async () => { await esborrarSessio() })

  it('sin calibrar guarda la altitud del GPS tal cual', () => {
    const s = afegirPunt(novaSessio(D, 1200, 0), p(1000, 429))
    expect(s.traza).toEqual([{ t: 1000, lat: 41.6561, lon: 1.149, altM: 429 }])
  })
  it('calibrada, suma la correccion', () => {
    const s = afegirPunt({ ...novaSessio(D, 1200, 0), correccioM: -49 }, p(1000, 429))
    expect(s.traza[0].altM).toBe(380)
  })
  it('sin altitud o con la hora repetida, el punto no entra', () => {
    let s = afegirPunt(novaSessio(D, 1200, 0), p(1000, 429))
    s = afegirPunt(s, p(1000, 430))
    s = afegirPunt(s, p(2000, null))
    expect(s.traza).toHaveLength(1)
  })
  it('el despegue es el primer punto calibrado a 15 m o mas sobre el terreno', () => {
    let s: Sessio = { ...novaSessio(D, 1200, 0), correccioM: -49 }
    s = afegirPunt(s, p(1000, 440))
    expect(s.enlairatA).toBe(null)
    s = afegirPunt(s, p(2000, 444))
    expect(s.enlairatA).toBe(2000)
    s = afegirPunt(s, p(3000, 429))
    expect(s.enlairatA).toBe(2000)
  })
  it('sin calibrar no se detecta el despegue', () => {
    const s = afegirPunt(novaSessio(D, 1200, 0), p(1000, 600))
    expect(s.enlairatA).toBe(null)
  })
  it('el rango: de 250 ft sobre el despegue al techo', () => {
    const a = ajustesDeVol(novaSessio(D, 1200, 0))
    expect(a.altMinM).toBeCloseTo(380 + 250 * 0.3048, 9)
    expect(a.altMaxM).toBe(1200)
  })
  it('se guarda y se lee', async () => {
    const s = afegirPunt(novaSessio(D, 1200, 5), p(1000, 429))
    await desarSessio(s)
    expect(await llegirSessio()).toEqual(s)
  })
})
