import { describe, it, expect } from 'vitest'
import { navegar, trazaEnVuelo, type EntradaNav } from './motor'
import type { Previsiones } from './perfil'
import { parsePrevision } from './perfil'
import { cargar1010, DESPEGUE_1010 } from './prueba-1010'
import { aGeo, aPlano } from './geo'
import { AJUSTES_POR_DEFECTO, type AjustesNav, type Objetivo } from './tipos'
import { margenDe } from './objetivo'
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
  // El objetivo es 1 s en la tablet (spec 2026-10-30 §10), que se mide en la fase 2. Aqui solo se
  // vigila que no se dispare: en el Mac sin carga son unos 180 ms, y con la maquina cargada, el doble.
  it('el mejor de tres, por debajo de 2 s', () => {
    let ms = Infinity
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now()
      navegar(entrada())
      ms = Math.min(ms, performance.now() - t0)
    }
    console.log(`motor entero con el 10/10: ${ms.toFixed(0)} ms`)
    expect(ms).toBeLessThan(2000)
  }, 20000)
})

describe('el umbral de llegada manda sobre la mejora', () => {
  // 1 000 ft al este a 5 m/s, 1 250 ft al este con 1 m/s al norte. Quedarse pasa a 55 m.
  const h0 = Date.parse('2026-10-10T06:00Z')
  const z1 = 1000 * 0.3048
  const z2 = 1250 * 0.3048
  const perfil = [{ altM: 0, u: 5, v: 0 }, { altM: z1, u: 5, v: 0 }, { altM: z2, u: 5, v: 1 }, { altM: 3000, u: 5, v: 1 }]
  const prevS: Previsiones = { elevM: 0, horas: [h0, h0 + 7200000], modelos: ['a'], perfiles: [[perfil, perfil]] }
  const o = { lat0: 41.6, lon0: 1.6 }
  it('un plan que llega no se cambia por quedarse aunque mejore menos de 50 m', () => {
    const r = navegar({
      prevision: prevS, traza: [{ t: h0, lat: 41.6, lon: 1.6, altM: z1 }],
      ajustes: { ...AJUSTES_POR_DEFECTO, altMinM: z1, altMaxM: z2 }, punto: aGeo(o, 6000, 55), ahora: h0,
    })
    expect(r.estado).toBe('llega')
    expect(r.ordenes.some(l => l.startsWith('Cap pla'))).toBe(false)
  })
})

describe('casos limite', () => {
  it('con la posicion vieja no se da por demostrado que no se llega', () => {
    const r = navegar(entrada({
      traza: [{ t: ahora - 3 * 60000, lat: pos.lat, lon: pos.lon, altM }],
      punto: aGeo(despegue, POS[0] - 21000, POS[1] - 21000),
    }))
    expect(r.avisos).toContain('Darrera posició de fa 3 min.')
    expect(r.fueraSeguro).toBe(false)
    expect(r.ordenes.some(l => l.includes("No s'hi arriba"))).toBe(false)
  })
  it('lo de antes del despegue no cuenta para medir', () => {
    const t = [{ t: 0, lat: 0, lon: 0, altM: 0 }, { t: 5000, lat: 0, lon: 0, altM: 0 }, { t: 9000, lat: 0, lon: 0, altM: 0 }]
    expect(trazaEnVuelo(t, 5000).map(p => p.t)).toEqual([5000, 9000])
    expect(trazaEnVuelo(t, undefined)).toHaveLength(3)
  })
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

describe('objetivo de altura con el 10/10', () => {
  const rec = recortar(prev, franjas(aj.altMinM, aj.altMaxM, prev.elevM + 10), ahora, 60)
  const b0 = franjaMasCercana(rec.campo.rejilla, altM)
  const punto = aGeo(despegue, ZA[0], ZA[1])
  const [ox, oy] = aPlano({ lat0: pos.lat, lon0: pos.lon }, punto.lat, punto.lon)
  const casos: [string, Objetivo][] = [['aterrar', { tipo: 'aterrar' }], ['2 500 ft', { tipo: 'altitud', altM: 2500 * 0.3048 }]]

  it('la rejilla empieza por terra', () => { expect(rec.campo.rejilla.etiqueta[0]).toBe('terra') })
  it('sin objetivo, qualsevol', () => { expect(navegar(entrada()).objetivo).toEqual({ tipo: 'qualsevol' }) })

  for (const [nom, obj] of casos) {
    it(`${nom}: no peor que la fuerza bruta con el mismo margen`, () => {
      const r = navegar(entrada({ objetivo: obj }))
      const o = oraculo(rec.campo, rec.campo.nombres.length - 1, aj, b0, ox, oy, margenDe(obj, rec.campo.rejilla)!)
      expect(r.objetivo).toEqual(obj)
      expect(Number.isFinite(o.distM)).toBe(true)
      expect(r.distanciaMinM!).toBeLessThanOrEqual(o.distM + 50)
    })
  }

  it('aterrar: el plan acaba en terra, y si no fas res no baixes', () => {
    const r = navegar(entrada({ objetivo: { tipo: 'aterrar' } }))
    expect(r.plan[r.plan.length - 1].franja).toBe(0)
    expect(r.ordenes.some(l => /^(Arribes a terra a .+ del punt a les \d\d:\d\d\.|El més a prop a terra: .+ a les \d\d:\d\d\.)$/.test(l))).toBe(true)
    expect(r.siNoHaces).toBeNull()
    expect(r.ordenes).toContain('Si no fas res, no baixes a terra.')
  })
  it('2 500 ft: el resumen dice la altura, y si no fas res no hi passes', () => {
    const r = navegar(entrada({ objetivo: { tipo: 'altitud', altM: 2500 * 0.3048 } }))
    expect(r.ordenes.some(l => /^(Passes a .+ del punt a 2 500 ft a les|El més a prop a 2 500 ft:)/.test(l))).toBe(true)
    expect(r.siNoHaces).toBeNull()
    expect(r.ordenes).toContain('Si no fas res, no hi passes a 2 500 ft.')
  })
  it('a la altura actual, si no fas res tiene distancia', () => {
    const r = navegar(entrada({ objetivo: { tipo: 'altitud', altM: 1500 * 0.3048 } }))
    expect(r.siNoHaces).not.toBeNull()
  })
  it('fuera del rango: no inventa plan', () => {
    const r = navegar(entrada({ objetivo: { tipo: 'altitud', altM: 5000 * 0.3048 } }))
    expect(r.estado).toBe('no-llega')
    expect(r.distanciaMinM).toBeNull()
    expect(r.plan).toEqual([])
    expect(r.avisos.some(a => /^5 000 ft queda fora del rang de càlcul \(terra a .+ ft\)\.$/.test(a))).toBe(true)
  })
  it('ningun plan entra en el margen dentro del horizonte', () => {
    const lento: AjustesNav = { ...aj, modos: { puja_lent: 0.05, puja_rapid: 0.05, baixa_lent: 0.05, baixa_rapid: 0.05 } }
    const r = navegar(entrada({ ajustes: lento, objetivo: { tipo: 'altitud', altM: 3750 * 0.3048 } }))
    expect(r.estado).toBe('no-llega')
    expect(r.distanciaMinM).toBeNull()
    expect(r.avisos).toContain("Cap pla hi passa a 3 750 ft dins de l'horitzó.")
  })
  it('aterrar, el mejor de tres por debajo de 2 s', () => {
    let ms = Infinity
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now()
      navegar(entrada({ objetivo: { tipo: 'aterrar' } }))
      ms = Math.min(ms, performance.now() - t0)
    }
    console.log(`motor con aterrar y el 10/10: ${ms.toFixed(0)} ms`)
    expect(ms).toBeLessThan(2000)
  }, 20000)
})
