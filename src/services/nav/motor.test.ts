import { describe, it, expect } from 'vitest'
import { navegar, trazaEnVuelo, type EntradaNav } from './motor'
import type { Previsiones } from './perfil'
import { parsePrevision } from './perfil'
import { cargar1010, cargarRelieve1010, DESPEGUE_1010 } from './prueba-1010'
import { aGeo, aPlano } from './geo'
import { AJUSTES_POR_DEFECTO, type AjustesNav, type Objetivo } from './tipos'
import { margenDe } from './objetivo'
import { franjas, recortar } from './campo'
import { franjaMasCercana } from './medidas'
import { oraculo } from './oraculo'
import { maximo, sueloGeo, sueloPlano, techoPlano } from './relieve'
import { relieveSintetico } from './sintetico'
import { construirTablas } from './vertical'
import { buscarPlan, caminoTabla, limite } from './plan'

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

describe('aterrar en el suelo del punto (spec 2026-11-01 §3)', () => {
  // Con el 10/10 el suelo de la zona A esta a 440 m y el del despegue a 380 (GLO-90 por open-meteo).
  const ELEV_ZA = 440
  const punto = aGeo(despegue, ZA[0], ZA[1])
  const [ox, oy] = aPlano({ lat0: pos.lat, lon0: pos.lon }, punto.lat, punto.lon)
  it('sin la elevacion del punto, terra al pronostico, y lo dice', () => {
    const r = navegar(entrada({ objetivo: { tipo: 'aterrar' } }))
    expect(r.avisos).toContain("Sense l'elevació del punt: terra a l'elevació del pronòstic.")
  })
  it('con ella, no peor que la fuerza bruta con terra en el suelo del punto', () => {
    const r = navegar(entrada({ objetivo: { tipo: 'aterrar' }, elevPuntoM: ELEV_ZA }))
    expect(r.avisos.some(a => a.startsWith("Sense l'elevació"))).toBe(false)
    const rej = franjas(aj.altMinM, aj.altMaxM, ELEV_ZA + 10, prev.elevM + 10)
    const rec = recortar(prev, rej, ahora, 60)
    expect(rec.campo.rejilla.altM[0]).toBe(ELEV_ZA + 10)
    const b0 = franjaMasCercana(rec.campo.rejilla, altM)
    const o = oraculo(rec.campo, rec.campo.nombres.length - 1, aj, b0, ox, oy, margenDe({ tipo: 'aterrar' }, rec.campo.rejilla)!)
    expect(r.distanciaMinM!).toBeLessThanOrEqual(o.distM + 50)
  })
  it('el viento de terra sigue siendo el de 10 m del pronostico', () => {
    const rej = franjas(aj.altMinM, aj.altMaxM, ELEV_ZA + 10, prev.elevM + 10)
    const a = recortar(prev, rej, ahora, 60).campo
    const b = recortar(prev, franjas(aj.altMinM, aj.altMaxM, prev.elevM + 10), ahora, 60).campo
    expect(a.u[a.nombres.length - 1][0]).toBeCloseTo(b.u[b.nombres.length - 1][0], 9)
  })
  it('si el suelo del punto llega al minimo del rango, no calcula el aterrizaje', () => {
    const r = navegar(entrada({ objetivo: { tipo: 'aterrar' }, elevPuntoM: 450 }))
    expect(r.estado).toBe('no-llega')
    expect(r.distanciaMinM).toBeNull()
    expect(r.avisos).toContain("El terreny del punt (1 476 ft) arriba al mínim del rang (1 500 ft): no es pot calcular l'aterratge.")
  })
  it('la elevacion del punto no cambia nada si no se aterriza', () => {
    const o: Objetivo = { tipo: 'altitud', altM: 2500 * 0.3048 }
    expect(navegar(entrada({ objetivo: o, elevPuntoM: ELEV_ZA })).ordenes).toEqual(navegar(entrada({ objetivo: o })).ordenes)
  })
})

describe('la ultima bajada dura lo que hay hasta el suelo del punto', () => {
  // Pronostico con el suelo a 0 m: calma a ras y 5 m/s al este desde 100 m. Todos los modos a
  // 0,5 m/s. El punto esta a 6 025 m al este y su suelo a 290 m: desde 1 000 ft (304,8 m) quedan
  // 4,8 m hasta terra, un minuto. Con terra al pronostico (10 m) serian 295 m, diez minutos.
  const h0 = Date.parse('2026-10-10T06:00Z')
  const perfil = [{ altM: 0, u: 0, v: 0 }, { altM: 10, u: 0, v: 0 }, { altM: 100, u: 5, v: 0 }, { altM: 3000, u: 5, v: 0 }]
  const prevS: Previsiones = { elevM: 0, horas: [h0, h0 + 7200000], modelos: ['a'], perfiles: [[perfil, perfil]] }
  const o = { lat0: 41.6, lon0: 1.6 }
  const lento: AjustesNav = {
    ...AJUSTES_POR_DEFECTO, altMinM: 1000 * 0.3048, altMaxM: 1250 * 0.3048,
    modos: { puja_lent: 0.5, puja_rapid: 0.5, baixa_lent: 0.5, baixa_rapid: 0.5 },
  }
  const base: EntradaNav = {
    prevision: prevS, traza: [{ t: h0, lat: 41.6, lon: 1.6, altM: 1000 * 0.3048 }], ajustes: lento,
    punto: aGeo(o, 6025, 0), ahora: h0, objetivo: { tipo: 'aterrar' },
  }
  const bajada = (r: ReturnType<typeof navegar>) => {
    const t = r.plan.find(x => x.tipo === 'cambiar' && x.franja === 0)!
    return t.finMin - t.inicioMin
  }
  it('con el suelo del punto, un minuto, y llega', () => {
    const r = navegar({ ...base, elevPuntoM: 290 })
    expect(r.estado).toBe('llega')
    expect(bajada(r)).toBe(1)
  })
  it('sin el, la bajada larga hasta el suelo del pronostico', () => {
    expect(bajada(navegar(base))).toBeGreaterThanOrEqual(9)
  })
})

describe('el motor con el relieve', () => {
  const relieve = cargarRelieve1010()
  const punto = aGeo(despegue, ZA[0], ZA[1])
  it('sin relieve lo dice', () => {
    expect(navegar(entrada()).avisos).toContain('Sense relleu: el pla no sap on és el terreny.')
  })
  for (const obj of [{ tipo: 'qualsevol' }, { tipo: 'aterrar' }, { tipo: 'altitud', altM: 2500 * 0.3048 }] as Objetivo[]) {
    it(`${obj.tipo}: nada del plan, fuera de terra, a menos de 100 ft del suelo, y no peor que la fuerza bruta`, () => {
      const r = navegar(entrada({ objetivo: obj, relieve }))
      expect(r.avisos.some(a => a.startsWith('Sense relleu'))).toBe(false)
      // las mismas franjas que el motor: terra en el suelo de ahora (o del punto), y por encima
      const plano = { lat0: pos.lat, lon0: pos.lon }
      const sueloAhora = sueloPlano(relieve, plano)(0, 0)
      const terraM = (obj.tipo === 'aterrar' ? sueloGeo(relieve, punto.lat, punto.lon) : sueloAhora) + 10
      const rej = franjas(Math.max(terraM, prev.elevM + 10) + 1.5, aj.altMaxM, terraM, prev.elevM + 10)
      const c = recortar(prev, rej, ahora, 60).campo
      const terreno = { techo: techoPlano(relieve, plano), maxM: maximo(relieve) }
      const m = margenDe(obj, c.rejilla)!
      const t = construirTablas(c, c.nombres.length - 1, aj, m, terreno)
      const b0 = franjaMasCercana(c.rejilla, altM)
      const [ox, oy] = aPlano(plano, punto.lat, punto.lon)
      const e = buscarPlan(t, b0, ox, oy)
      expect(limite(t, e.plan, caminoTabla(t, e.plan)!)).toBeGreaterThan(e.minuto)
      const o = oraculo(c, c.nombres.length - 1, aj, b0, ox, oy, m, terreno)
      expect(r.distanciaMinM!).toBeLessThanOrEqual(o.distM + 50)
      // y no mas cerca que el mejor plan que respeta el suelo: si ignorara el relieve, podria
      expect(r.distanciaMinM!).toBeGreaterThanOrEqual(e.distM - 1)
    })
  }
  it('con el relieve, el mejor de tres por debajo de 2 s', () => {
    let ms = Infinity
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now()
      navegar(entrada({ objetivo: { tipo: 'aterrar' }, relieve }))
      ms = Math.min(ms, performance.now() - t0)
    }
    console.log(`motor con relieve y el 10/10: ${ms.toFixed(0)} ms`)
    expect(ms).toBeLessThan(2000)
  }, 20000)
})

describe('si no fas res, contra un cerro', () => {
  // 1 000 ft (304,8 m) al este a 5 m/s sobre suelo a 0 m, y un cerro de 290 m desde x = 3 000. El
  // techo de la celda ya es 290 entre 2 900 y 3 000: en el minuto 10 (3 000 m) deja de valer.
  const h0 = Date.parse('2026-10-10T06:00Z')
  const perfil = [{ altM: 0, u: 5, v: 0 }, { altM: 3000, u: 5, v: 0 }]
  const prevS: Previsiones = { elevM: 0, horas: [h0, h0 + 7200000], modelos: ['a'], perfiles: [[perfil, perfil]] }
  const relieve = relieveSintetico({ lat0: 41.6, lon0: 1.6 }, -2000, -2000, 9000, 2000, 100, x => (x >= 3000 ? 290 : 0))
  it('el aviso dice cuando', () => {
    const r = navegar({
      prevision: prevS, traza: [{ t: h0, lat: 41.6, lon: 1.6, altM: 1000 * 0.3048 }],
      ajustes: { ...AJUSTES_POR_DEFECTO, altMinM: 0, altMaxM: 2000 * 0.3048 }, punto: null, ahora: h0, relieve,
    })
    expect(r.avisos).toContain('Si no fas res, a les 08:10 passes a menys de 100 ft del terreny.')
  })
})

describe('si no fas res sin objetivo, cuando quedarse no vale', () => {
  // El 10/10 con relieve: el globo va a 1 540 ft sobre suelo de 430 m, y la franja de 1 500 ft queda
  // a 27 m del suelo, por debajo del minimo, desde el primer minuto.
  it('lo dice con el terreno, no con terra', () => {
    const r = navegar(entrada({ relieve: cargarRelieve1010() }))
    expect(r.ordenes).toContain('Si no fas res, a les 08:35 passes a menys de 100 ft del terreny.')
    expect(r.ordenes.some(l => l.includes('no hi passes a terra'))).toBe(false)
  })
})
