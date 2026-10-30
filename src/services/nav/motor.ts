// src/services/nav/motor.ts
// La entrada unica del motor (spec 2026-10-30 §7): de prevision, traza, ajustes
// y punto a ResultadoNavegacion. Sin estado: la pantalla guarda el plan vigente
// y decide con `debeSustituir` si lo cambia.
import type { AjustesNav, Punto, PuntoTraza, ResultadoNavegacion, Tramo } from './tipos'
import type { Previsiones } from './perfil'
import { franjas, recortar } from './campo'
import { aGeo, aPlano, type Plano } from './geo'
import { franjaMasCercana, medidasGps } from './medidas'
import { corregirCampo } from './correccion'
import { construirTablas } from './vertical'
import { calcularZona, fueraSeguro, poligono } from './zona'
import { aTramos, aproximacion, buscarPlan, caminoDirecto, type PlanInterno } from './plan'
import { distancia, hora, ordenes } from './ordenes'
import { LLEGA_M } from './parametros'

export interface EntradaNav {
  prevision: Previsiones
  /** El ultimo punto es la posicion actual. */
  traza: PuntoTraza[]
  ajustes: AjustesNav
  punto: Punto | null
  ahora: number
  /** Incluir la franja «terra» (elevacion mas 10 m) por debajo del rango. */
  incluirTerra?: boolean
  /** Hora del despegue. Lo de antes (inflado, cesta en el suelo) no cuenta para medir viento. */
  despegue?: number
}

/** Los puntos de la traza desde el despegue, si se sabe. */
export function trazaEnVuelo(traza: PuntoTraza[], despegue: number | undefined): PuntoTraza[] {
  return despegue === undefined ? traza : traza.filter(p => p.t >= despegue)
}

const PASO_ZONA_MIN = 5

export function navegar(e: EntradaNav): ResultadoNavegacion {
  const iso = (ms: number) => new Date(ms).toISOString()
  const avisos: string[] = []
  const vacio = (estado: ResultadoNavegacion['estado']): ResultadoNavegacion => ({
    estado, plan: [], distanciaMinM: null, horaMin: null, siNoHaces: null, dispersion: [],
    fueraSeguro: false, zona: [], ordenes: [], avisos, calculadoA: iso(e.ahora),
    previsionDe: e.prevision.horas.length > 0 ? iso(e.prevision.horas[0]) : null,
  })

  const actual = e.traza[e.traza.length - 1]
  if (actual === undefined) {
    avisos.push('Sense posició GPS.')
    return vacio('sin-datos')
  }
  const edadMin = Math.floor((e.ahora - actual.t) / 60000)
  if (edadMin >= 1) avisos.push(`Darrera posició de fa ${edadMin} min.`)

  const plano: Plano = { lat0: actual.lat, lon0: actual.lon }
  const terraM = e.incluirTerra ? e.prevision.elevM + 10 : null
  const r = recortar(e.prevision, franjas(e.ajustes.altMinM, e.ajustes.altMaxM, terraM), e.ahora, e.ajustes.horizonteMin)
  if (r.fuera.length > 0) avisos.push(`Franges sense previsió, fora del càlcul: ${r.fuera.join(', ')}.`)
  if (r.campo.rejilla.altM.length === 0 || r.campo.minutos === 0) {
    avisos.push('Sense previsió per calcular.')
    return vacio('sin-datos')
  }
  if (r.campo.minutos < e.ajustes.horizonteMin) {
    avisos.push(`Horitzó escurçat a ${r.campo.minutos} min: la previsió no arriba més enllà.`)
  }

  const medidas = medidasGps(trazaEnVuelo(e.traza, e.despegue), r.campo.rejilla, plano)
  const corr = corregirCampo(r.campo, e.prevision, medidas, e.ahora)
  if (medidas.length > 0 && !corr.corregido) avisos.push('Vent mesurat no aplicat: el càlcul de la correcció ha fallat.')
  const c = corr.campo
  const fc = c.nombres.length - 1
  const t = construirTablas(c, fc, e.ajustes)
  const b0 = franjaMasCercana(c.rejilla, actual.altM)

  const zonaInt = calcularZona(t, b0)
  const minutosZona: number[] = []
  for (let k = PASO_ZONA_MIN; k < c.minutos; k += PASO_ZONA_MIN) minutosZona.push(k)
  minutosZona.push(c.minutos)
  const zona = minutosZona.map(k => poligono(zonaInt, k).map(([x, y]) => aGeo(plano, x, y)))

  if (e.punto === null) return { ...vacio('sin-punto'), zona }

  const [ox, oy] = aPlano(plano, e.punto.lat, e.punto.lon)
  const quieto: PlanInterno = { franjas: [b0], clases: [], dur: [c.minutos] }
  const aQuieto = aproximacion(caminoDirecto(c, fc, e.ajustes, quieto)!, ox, oy)
  const mejor = buscarPlan(t, b0, ox, oy)
  // Quedarse si el plan mejora menos de 50 m, salvo que el plan llegue y quedarse no.
  const cruzaUmbral = mejor.distM <= LLEGA_M && aQuieto.distM > LLEGA_M
  const sinMejora = mejor.plan.franjas.length === 1 || (!cruzaUmbral && mejor.distM > aQuieto.distM - LLEGA_M)
  const elegido = sinMejora ? { plan: quieto, distM: aQuieto.distM, minuto: aQuieto.minuto } : mejor
  const tramos: Tramo[] = aTramos(t, elegido.plan, Math.max(1, elegido.minuto))

  const dispersion: ResultadoNavegacion['dispersion'] = []
  for (let m = 0; m < fc; m++) {
    const cam = caminoDirecto(c, m, e.ajustes, elegido.plan)
    if (cam === null || cam.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) continue
    dispersion.push({ modelo: c.nombres[m], distanciaMinM: aproximacion(cam, ox, oy).distM })
  }

  // Con la posicion vieja el origen no es donde esta el globo: no se demuestra nada.
  const fuera = edadMin < 1 && fueraSeguro(zonaInt, ox, oy)
  const llega = elegido.distM <= LLEGA_M
  const horaMs = c.t0 + elegido.minuto * 60000
  const resumen: string[] = []
  if (llega) {
    resumen.push(`Passes a ${distancia(elegido.distM)} del punt a les ${hora(horaMs)}.`)
  } else {
    if (fuera) resumen.push("No s'hi arriba amb aquest vent.")
    resumen.push(`El més a prop: ${distancia(elegido.distM)} a les ${hora(horaMs)}.`)
  }
  if (sinMejora) resumen.push("Cap pla s'hi acosta més que quedar-te a aquesta altitud.")
  resumen.push(`Si no fas res: ${distancia(aQuieto.distM)} a les ${hora(c.t0 + aQuieto.minuto * 60000)}.`)
  if (dispersion.length > 1) {
    const ds = dispersion.map(x => x.distanciaMinM)
    const [dmin, dmax] = [distancia(Math.min(...ds)), distancia(Math.max(...ds))]
    resumen.push(dmin === dmax ? `Amb tots els models, ${dmin}.` : `Amb cada model, entre ${dmin} i ${dmax}.`)
  }

  return {
    ...vacio(llega ? 'llega' : 'no-llega'),
    plan: tramos,
    distanciaMinM: elegido.distM,
    horaMin: iso(horaMs),
    siNoHaces: { distanciaMinM: aQuieto.distM, horaMin: iso(c.t0 + aQuieto.minuto * 60000) },
    dispersion,
    fueraSeguro: fuera,
    zona,
    ordenes: [...ordenes(c, e.ajustes, tramos, llega), ...resumen],
  }
}
