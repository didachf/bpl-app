import { describe, it, expect } from 'vitest'
import { navegar, type EntradaNav } from './motor'
import { parsePrevision } from './perfil'
import { cargar1010, DESPEGUE_1010 } from './prueba-1010'
import { aGeo, aPlano } from './geo'
import { AJUSTES_POR_DEFECTO, type AjustesNav } from './tipos'
import { franjas, recortar } from './campo'
import { franjaMasCercana } from './medidas'
import { oraculo } from './oraculo'

const prev = parsePrevision(cargar1010())
const despegue = { lat0: DESPEGUE_1010.lat, lon0: DESPEGUE_1010.lon }
const POS: [number, number] = [3460.8, 2190.8]
const ZA: [number, number] = [3964.2, 2880.1]
const ahora = Date.parse('2026-10-10T06:34Z')
const pos = aGeo(despegue, POS[0], POS[1])
const altM = 1540 * 0.3048
const aj: AjustesNav = { ...AJUSTES_POR_DEFECTO, altMinM: 1500 * 0.3048, altMaxM: 3750 * 0.3048 }

function entrada(over: Partial<EntradaNav> = {}): EntradaNav {
  return {
    prevision: prev,
    traza: [{ t: ahora, lat: pos.lat, lon: pos.lon, altM }],
    ajustes: aj,
    punto: aGeo(despegue, ZA[0], ZA[1]),
    ahora,
    incluirTerra: true,
    ...over,
  }
}

describe('navegar con el 10/10', () => {
  const r = navegar(entrada())
  it('calcula un plan, la zona y las ordenes', () => {
    expect(['llega', 'no-llega']).toContain(r.estado)
    expect(r.zona.length).toBeGreaterThan(0)
    expect(r.distanciaMinM).not.toBeNull()
    expect(r.siNoHaces).not.toBeNull()
    expect(r.ordenes.some(l => l.startsWith('Si no fas res'))).toBe(true)
  })
  it('no peor que la fuerza bruta del prototipo en mas de 50 m', () => {
    const rec = recortar(prev, franjas(aj.altMinM, aj.altMaxM, prev.elevM + 10), ahora, 60)
    const b0 = franjaMasCercana(rec.campo.rejilla, altM)
    const punto = aGeo(despegue, ZA[0], ZA[1])
    const [ox, oy] = aPlano({ lat0: pos.lat, lon0: pos.lon }, punto.lat, punto.lon)
    const o = oraculo(rec.campo, rec.campo.nombres.length - 1, aj, b0, ox, oy)
    expect(r.distanciaMinM!).toBeLessThanOrEqual(o.distM + 50)
  })
  it('un punto alcanzable no sale como fuera seguro', () => { expect(r.fueraSeguro).toBe(false) })
  it('dispersion con los siete modelos', () => { expect(r.dispersion.length).toBeGreaterThan(1) })
  it('en menos de 1 s', () => {
    const t0 = performance.now()
    navegar(entrada())
    const ms = performance.now() - t0
    console.log(`motor entero con el 10/10: ${ms.toFixed(0)} ms`)
    expect(ms).toBeLessThan(1000)
  })
})

describe('casos limite', () => {
  it('sin punto: zona sin plan', () => {
    const r = navegar(entrada({ punto: null }))
    expect(r.estado).toBe('sin-punto')
    expect(r.plan).toEqual([])
    expect(r.zona.length).toBeGreaterThan(0)
  })
  it('sin traza: sin datos', () => { expect(navegar(entrada({ traza: [] })).estado).toBe('sin-datos') })
  it('un punto a 30 km contra el viento no se alcanza, y se sabe', () => {
    const r = navegar(entrada({ punto: aGeo(despegue, POS[0] - 21000, POS[1] - 21000) }))
    expect(r.estado).toBe('no-llega')
    expect(r.fueraSeguro).toBe(true)
    expect(r.ordenes.some(l => l.includes("No s'hi arriba"))).toBe(true)
    expect(r.ordenes.some(l => l.includes('fins al punt més proper'))).toBe(true)
    expect(r.ordenes.some(l => /entre (\S+ \S+) i \1\./.test(l))).toBe(false)
  })
  it('horizonte acortado al final de la prevision', () => {
    const t = Date.parse('2026-10-10T08:30Z')
    const r = navegar(entrada({ ahora: t, traza: [{ t, lat: pos.lat, lon: pos.lon, altM }] }))
    expect(r.avisos.some(a => a.startsWith('Horitzó escurçat a 30 min'))).toBe(true)
  })
})
