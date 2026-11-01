// Las cifras de las maquetas de la fase 2 (01/11/2026): zona, plan y ordenes del motor con el viento
// real del 10/10 sobre Tarrega, en pixeles de la ortofoto de las maquetas (orto_tarrega.jpg: 10 m por
// pixel, despegue en el pixel 400, 850). Escribe maquetas.json junto a este fichero.
import { it, expect } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { navegar, type EntradaNav } from '../../../src/services/nav/motor'
import { parsePrevision } from '../../../src/services/nav/perfil'
import { cargar1010, cargarRelieve1010, DESPEGUE_1010 } from '../../../src/services/nav/prueba-1010'
import { maximo, sueloGeo, sueloPlano, techoPlano } from '../../../src/services/nav/relieve'
import { aGeo, aPlano } from '../../../src/services/nav/geo'
import { AJUSTES_POR_DEFECTO, type Objetivo } from '../../../src/services/nav/tipos'
import { franjas, recortar } from '../../../src/services/nav/campo'
import { franjaMasCercana } from '../../../src/services/nav/medidas'
import { construirTablas, minutosTransito, velocidad } from '../../../src/services/nav/vertical'
import { margenDe } from '../../../src/services/nav/objetivo'
import { buscarPlan, caminoDirecto, caminoTabla, evaluar, fracciones, type PlanInterno } from '../../../src/services/nav/plan'
import { LLEGA_M } from '../../../src/services/nav/parametros'

const prev = parsePrevision(cargar1010())
const despegue = { lat0: DESPEGUE_1010.lat, lon0: DESPEGUE_1010.lon }
const POS: [number, number] = [3460.8, 2190.8]
const ZA: [number, number] = [3964.2, 2880.1]
const ahora = Date.parse('2026-10-10T06:34Z')
const pos = aGeo(despegue, POS[0], POS[1])
const altM = 1540 * 0.3048
const aj = { ...AJUSTES_POR_DEFECTO, altMinM: 1500 * 0.3048, altMaxM: 3750 * 0.3048 }
// El relieve real de la zona (spec 2026-11-01-relieve), en el plano del globo como el motor.
const relieve = cargarRelieve1010()
const planoGlobo = { lat0: pos.lat, lon0: pos.lon }

const px = (x: number, y: number): [number, number] => [+(400 + x / 10).toFixed(1), +(850 - y / 10).toFixed(1)]
const geoPx = (lat: number, lon: number) => px(...aPlano(despegue, lat, lon))

function entrada(punto: [number, number], objetivo: Objetivo, elevPuntoM?: number): EntradaNav {
  return {
    prevision: prev, traza: [{ t: ahora, lat: pos.lat, lon: pos.lon, altM }], ajustes: aj,
    punto: aGeo(despegue, punto[0], punto[1]), ahora, incluirTerra: true, objetivo, elevPuntoM, relieve,
  }
}

/** El camino del plan que elige el motor, con la altitud de cada minuto, para pintarlo. */
function camino(punto: [number, number], objetivo: Objetivo, elevPuntoM?: number) {
  // Las mismas franjas que el motor con relieve: terra en el suelo de ahora o del punto, y por encima.
  const g = aGeo(despegue, punto[0], punto[1])
  const elevP = objetivo.tipo === 'aterrar' ? elevPuntoM ?? sueloGeo(relieve, g.lat, g.lon) : NaN
  const terraM = (Number.isNaN(elevP) ? sueloPlano(relieve, planoGlobo)(0, 0) : elevP) + 10
  const rej = franjas(Math.max(terraM, prev.elevM + 10) + 1.5, aj.altMaxM, terraM, prev.elevM + 10)
  const c = recortar(prev, rej, ahora, 60).campo
  const m = margenDe(objetivo, c.rejilla)!
  const t = construirTablas(c, c.nombres.length - 1, aj, m, { techo: techoPlano(relieve, planoGlobo), maxM: maximo(relieve) })
  const b0 = franjaMasCercana(c.rejilla, altM)
  const [ox, oy] = [punto[0] - POS[0], punto[1] - POS[1]]
  const quieto: PlanInterno = { franjas: [b0], clases: [], dur: [c.minutos] }
  const aQ = evaluar(t, quieto, caminoDirecto(c, c.nombres.length - 1, aj, quieto)!, ox, oy)
  const mejor = buscarPlan(t, b0, ox, oy)
  const cruza = mejor.distM <= LLEGA_M && aQ.distM > LLEGA_M
  const sinMejora = mejor.plan.franjas.length === 1 || (!cruza && mejor.distM > aQ.distM - LLEGA_M)
  const e = sinMejora ? { plan: quieto, distM: aQ.distM, minuto: aQ.minuto } : mejor
  const cam = caminoTabla(t, e.plan)!
  // altitud al final de cada minuto
  const z: number[] = [c.rejilla.altM[b0]]
  for (let i = 0; i < e.plan.franjas.length; i++) {
    const b = e.plan.franjas[i]
    if (i > 0) {
      const a = e.plan.franjas[i - 1]
      const vel = velocidad(aj, c.rejilla.altM[b] > c.rejilla.altM[a], e.plan.clases[i - 1])
      const n = minutosTransito(c, a, b, vel)
      for (let j = 1; j <= n; j++) {
        const dz = Math.min(Math.abs(c.rejilla.altM[b] - c.rejilla.altM[a]), vel * 60 * j)
        z.push(c.rejilla.altM[a] + Math.sign(c.rejilla.altM[b] - c.rejilla.altM[a]) * dz)
      }
    }
    const fin = i === e.plan.franjas.length - 1 ? c.minutos : z.length - 1 + e.plan.dur[i]
    while (z.length - 1 < fin) z.push(c.rejilla.altM[b])
  }
  // el punto mas cercano dentro del margen, sobre el trozo de cada minuto
  const fr = fracciones(t, e.plan)
  let mejorP: [number, number] = [NaN, NaN]
  let dmin = Infinity
  for (let k = 0; k < fr.length; k++) {
    const f = fr[k]
    if (f === null) continue
    for (let s = f[0]; s <= f[1] + 1e-9; s += (f[1] - f[0]) / 200 || 1) {
      const x = cam[k][0] + s * (cam[k + 1][0] - cam[k][0])
      const y = cam[k][1] + s * (cam[k + 1][1] - cam[k][1])
      const d = Math.hypot(x - ox, y - oy)
      if (d < dmin) { dmin = d; mejorP = [x, y] }
    }
  }
  return {
    distM: e.distM, minuto: e.minuto, rejilla: c.rejilla,
    camino: cam.map(([x, y], k) => [...px(POS[0] + x, POS[1] + y), +z[k].toFixed(1)]),
    masCerca: px(POS[0] + mejorP[0], POS[1] + mejorP[1]), dmuestreo: dmin,
  }
}

function escenario(punto: [number, number], objetivo: Objetivo, elevPuntoM?: number) {
  const r = navegar(entrada(punto, objetivo, elevPuntoM))
  const k = camino(punto, objetivo, elevPuntoM)
  // El motor proyecta en un plano centrado en el globo y aqui en el del despegue: unos cm de diferencia.
  if (r.distanciaMinM !== null) expect(Math.abs(k.distM - r.distanciaMinM)).toBeLessThan(1)
  return {
    objetivo, elevPuntoM, estado: r.estado, distanciaMinM: r.distanciaMinM, horaMin: r.horaMin, tramos: r.plan,
    fueraSeguro: r.fueraSeguro, ordenes: r.ordenes, avisos: r.avisos, siNoHaces: r.siNoHaces,
    dispersion: r.dispersion, punto: px(...punto), puntoGeo: aGeo(despegue, punto[0], punto[1]),
    zona: r.zona.map(p => p.map(q => geoPx(q.lat, q.lon))), ...k,
  }
}

it('maquetas', () => {
  const ELEV_ZA = 440
  const salida: Record<string, unknown> = {
    fuente: 'motor de src/services/nav con el viento del 10/10 (openmeteo_10-10.json), 01/11/2026',
    posicion: px(...POS), zonaA: px(...ZA),
    aterrar: escenario(ZA, { tipo: 'aterrar' }, ELEV_ZA),
    passar2500: escenario(ZA, { tipo: 'altitud', altM: 2500 * 0.3048 }),
    qualsevol: escenario(ZA, { tipo: 'qualsevol' }),
    // WP2: un campo al sudeste, elegido de los candidatos de abajo mirando la ortofoto. Suelo 431 m.
    noLlega: escenario([5500, 500], { tipo: 'aterrar' }, 431),
  }
  // Puntos al este del globo donde no se puede aterrizar y se sabe, con el suelo de cada uno
  // (elevacion_rejilla.json), y lo cerca que se pasaria a cualquier altura. Los que tienen el suelo
  // a la altura del minimo del rango no se pueden calcular y se cuentan aparte.
  const rejillaElev = JSON.parse(readFileSync(new URL('./elevacion_rejilla.json', import.meta.url), 'utf8'))
    .puntos as { x: number; y: number; elevM: number }[]
  const candidatos: { p: [number, number]; elevM: number; d: number; enAltura: number | null }[] = []
  let sinCalculo = 0
  for (const { x, y, elevM } of rejillaElev) {
    const a = navegar(entrada([x, y], { tipo: 'aterrar' }, elevM))
    if (a.avisos.some(t => t.startsWith('El terreny del punt'))) { sinCalculo++; continue }
    if (a.estado !== 'no-llega' || !a.fueraSeguro || a.distanciaMinM === null) continue
    candidatos.push({ p: [x, y], elevM, d: a.distanciaMinM, enAltura: navegar(entrada([x, y], { tipo: 'qualsevol' })).distanciaMinM })
  }
  candidatos.sort((u, v) => (v.d - (v.enAltura ?? v.d)) - (u.d - (u.enAltura ?? u.d)))
  salida.sinCalculoPorTerreno = sinCalculo
  salida.candidatosNoLlega = candidatos.map(c => ({ ...c, px: px(...c.p), geo: aGeo(despegue, c.p[0], c.p[1]) }))
  writeFileSync(new URL('./maquetas.json', import.meta.url), JSON.stringify(salida, null, 1))
  console.log(`candidatos: ${candidatos.length}`)
}, 600000)
