// src/services/nav/motor.ts
// La entrada unica del motor (spec 2026-10-30 §7): de prevision, traza, ajustes
// y punto a ResultadoNavegacion. Sin estado: la pantalla guarda el plan vigente
// y decide con `debeSustituir` si lo cambia.
import {
  QUALSEVOL, type AjustesNav, type Objetivo, type Punto, type PuntoTraza, type Relieve, type ResultadoNavegacion, type Tramo,
} from './tipos'
import type { Previsiones } from './perfil'
import { FRANJA_M, franjas, recortar } from './campo'
import { aGeo, aPlano, type Plano } from './geo'
import { franjaMasCercana, medidasGps } from './medidas'
import { corregirCampo } from './correccion'
import { construirTablas } from './vertical'
import { calcularZona, fueraSeguro, poligono } from './zona'
import {
  aTramos, buscarPlan, caminoConAltura, caminoDirecto, caminoTabla, evaluar, limite, masCercaEnMargen, type PlanInterno,
} from './plan'
import { maximo, sueloGeo, sueloPlano, techoPlano, type Terreno } from './relieve'
import { alturaFt, distancia, hora, ordenes } from './ordenes'
import { margenDe, SIN_MARGEN, tocaRango } from './objetivo'
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
  /** El objetivo de altura en el punto (spec 2026-11-01). Sin el, qualsevol. */
  objetivo?: Objetivo
  /** Elevacion del suelo bajo el punto, m sobre el mar. Con Aterrar, terra va ahi (spec 2026-11-01 §3). */
  elevPuntoM?: number
  /** El relieve de la zona de vuelo (spec 2026-11-01-relieve). Sin el, el motor no sabe del terreno. */
  relieve?: Relieve
}

/** Los puntos de la traza desde el despegue, si se sabe. */
export function trazaEnVuelo(traza: PuntoTraza[], despegue: number | undefined): PuntoTraza[] {
  return despegue === undefined ? traza : traza.filter(p => p.t >= despegue)
}

const PASO_ZONA_MIN = 5
/** Terra es el viento a 10 m de los modelos (spec 10/10 §5.2). */
const TERRA_SOBRE_SUELO_M = 10

export function navegar(e: EntradaNav): ResultadoNavegacion {
  const iso = (ms: number) => new Date(ms).toISOString()
  const avisos: string[] = []
  const obj = e.objetivo ?? QUALSEVOL
  const vacio = (estado: ResultadoNavegacion['estado']): ResultadoNavegacion => ({
    estado, objetivo: obj, plan: [], distanciaMinM: null, horaMin: null, siNoHaces: null, dispersion: [],
    fueraSeguro: false, zona: [], ordenes: [], avisos, calculadoA: iso(e.ahora),
    previsionDe: e.prevision.horas.length > 0 ? iso(e.prevision.horas[0]) : null,
    camino: [], masCerca: null,
  })

  const actual = e.traza[e.traza.length - 1]
  if (actual === undefined) {
    avisos.push('Sense posició GPS.')
    return vacio('sin-datos')
  }
  const edadMin = Math.floor((e.ahora - actual.t) / 60000)
  if (edadMin >= 1) avisos.push(`Darrera posició de fa ${edadMin} min.`)

  const plano: Plano = { lat0: actual.lat, lon0: actual.lon }
  // El suelo (spec 2026-11-01-relieve §4.2). Sin relieve, o con el globo fuera, todo como antes.
  let terreno: Terreno | null = null
  let sueloAhora = NaN
  if (e.relieve === undefined) {
    avisos.push('Sense relleu: el pla no sap on és el terreny.')
  } else {
    sueloAhora = sueloPlano(e.relieve, plano)(0, 0)
    if (Number.isNaN(sueloAhora)) avisos.push('El globus és fora del relleu carregat: el pla no sap on és el terreny.')
    else terreno = { techo: techoPlano(e.relieve, plano), maxM: maximo(e.relieve) }
  }

  // Terra va a la elevacion del pronostico mas 10 m. Al aterrizar en un punto de elevacion conocida,
  // va a la de su suelo, y con relieve, al suelo de ahora. Siempre con el viento a 10 m del
  // pronostico, que es el de ras.
  const terraPronM = e.prevision.elevM + TERRA_SOBRE_SUELO_M
  const elevPunto = obj.tipo === 'aterrar' && e.punto !== null
    ? e.elevPuntoM ?? (e.relieve === undefined ? NaN : sueloGeo(e.relieve, e.punto.lat, e.punto.lon))
    : NaN
  let terraM = e.incluirTerra || obj.tipo === 'aterrar' ? terraPronM : null
  if (!Number.isNaN(elevPunto)) terraM = elevPunto + TERRA_SOBRE_SUELO_M
  else if (terreno !== null && terraM !== null) terraM = sueloAhora + TERRA_SOBRE_SUELO_M
  else if (obj.tipo === 'aterrar' && e.punto !== null) avisos.push("Sense l'elevació del punt: terra a l'elevació del pronòstic.")
  const terraVientoM = terraM !== null && terraM !== terraPronM ? terraPronM : null
  let altMinM = e.ajustes.altMinM
  if (terreno !== null) {
    // Las franjas empiezan justo por encima de terra: el minimo lo pone el terreno, punto por punto.
    altMinM = Math.max(terraM ?? sueloAhora + TERRA_SOBRE_SUELO_M, terraPronM) + 1.5
  } else if (!Number.isNaN(elevPunto)) {
    const minM = Math.ceil(altMinM / FRANJA_M - 1e-9) * FRANJA_M
    if (elevPunto + TERRA_SOBRE_SUELO_M >= minM - 1) {
      avisos.push(`El terreny del punt (${alturaFt(elevPunto)}) arriba al mínim del rang (${alturaFt(minM)}): no es pot calcular l'aterratge.`)
      return vacio('no-llega')
    }
  }
  const r = recortar(e.prevision, franjas(altMinM, e.ajustes.altMaxM, terraM, terraVientoM), e.ahora, e.ajustes.horizonteMin)
  if (r.fuera.length > 0) avisos.push(`Franges sense previsió, fora del càlcul: ${r.fuera.join(', ')}.`)
  if (r.campo.rejilla.altM.length === 0 || r.campo.minutos === 0) {
    avisos.push('Sense previsió per calcular.')
    return vacio('sin-datos')
  }
  if (r.campo.minutos < e.ajustes.horizonteMin) {
    avisos.push(`Horitzó escurçat a ${r.campo.minutos} min: la previsió no arriba més enllà.`)
  }

  // El objetivo es del punto: sin punto, la zona es la de cualquier altura.
  const rej = r.campo.rejilla
  const et = obj.tipo === 'altitud' ? alturaFt(obj.altM) : 'terra'
  const m = e.punto === null ? SIN_MARGEN : margenDe(obj, rej)
  if (m === null) {
    avisos.push("Falta la franja terra: no es pot calcular l'aterratge.")
    return vacio('no-llega')
  }
  if (!tocaRango(m, rej)) {
    avisos.push(`${et} queda fora del rang de càlcul (${rej.etiqueta[0]} a ${rej.etiqueta[rej.etiqueta.length - 1]}).`)
    return vacio('no-llega')
  }

  const medidas = medidasGps(trazaEnVuelo(e.traza, e.despegue), rej, plano)
  const corr = corregirCampo(r.campo, e.prevision, medidas, e.ahora)
  if (medidas.length > 0 && !corr.corregido) avisos.push('Vent mesurat no aplicat: el càlcul de la correcció ha fallat.')
  const c = corr.campo
  const fc = c.nombres.length - 1
  const t = construirTablas(c, fc, e.ajustes, m, terreno)
  const b0 = franjaMasCercana(c.rejilla, actual.altM)

  // Si no fas res, contra el terreno: no depende del punto.
  const quieto: PlanInterno = { franjas: [b0], clases: [], dur: [c.minutos] }
  const camQuieto = caminoDirecto(c, fc, e.ajustes, quieto)!
  const limQuieto = limite(t, quieto, camQuieto)
  if (limQuieto <= c.minutos) {
    avisos.push(`Si no fas res, a les ${hora(c.t0 + limQuieto * 60000)} passes a menys de ${alturaFt(e.ajustes.minSobreTerrenoM)} del terreny.`)
  }

  const zonaInt = calcularZona(t, b0)
  const minutosZona: number[] = []
  for (let k = PASO_ZONA_MIN; k < c.minutos; k += PASO_ZONA_MIN) minutosZona.push(k)
  minutosZona.push(c.minutos)
  const zona = minutosZona
    .map(k => poligono(zonaInt, k).map(([x, y]) => aGeo(plano, x, y)))
    .filter(p => p.length > 0)

  if (e.punto === null) return { ...vacio('sin-punto'), zona }

  const [ox, oy] = aPlano(plano, e.punto.lat, e.punto.lon)
  const aQuieto = evaluar(t, quieto, camQuieto, ox, oy)
  const mejor = buscarPlan(t, b0, ox, oy)
  if (!Number.isFinite(mejor.distM)) {
    avisos.push(`Cap pla hi passa a ${et} dins de l'horitzó.`)
    return { ...vacio('no-llega'), zona }
  }
  // Quedarse si el plan mejora menos de 50 m, salvo que el plan llegue y quedarse no.
  const cruzaUmbral = mejor.distM <= LLEGA_M && aQuieto.distM > LLEGA_M
  const sinMejora = mejor.plan.franjas.length === 1 || (!cruzaUmbral && mejor.distM > aQuieto.distM - LLEGA_M)
  const elegido = sinMejora ? { plan: quieto, distM: aQuieto.distM, minuto: aQuieto.minuto } : mejor
  const tramos: Tramo[] = aTramos(t, elegido.plan, Math.max(1, elegido.minuto))

  const dispersion: ResultadoNavegacion['dispersion'] = []
  for (let mo = 0; mo < fc; mo++) {
    const cam = caminoDirecto(c, mo, e.ajustes, elegido.plan)
    if (cam === null || cam.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) continue
    const dm = evaluar(t, elegido.plan, cam, ox, oy).distM
    if (Number.isFinite(dm)) dispersion.push({ modelo: c.nombres[mo], distanciaMinM: dm })
  }
  if (terreno !== null) {
    const camE = caminoTabla(t, elegido.plan)!
    if (camE.slice(0, elegido.minuto + 1).some(([x, y]) => Number.isNaN(terreno!.techo(x, y)))) {
      avisos.push('Part del pla surt del relleu carregat: allà no es comprova el terreny.')
    }
  }

  // Con la posicion vieja el origen no es donde esta el globo: no se demuestra nada.
  const fuera = edadMin < 1 && fueraSeguro(zonaInt, ox, oy)
  const llega = elegido.distM <= LLEGA_M
  const horaMs = c.t0 + elegido.minuto * 60000
  const d = distancia(elegido.distM)
  const h = hora(horaMs)
  const quietoPasa = Number.isFinite(aQuieto.distM)
  const resumen: string[] = []
  if (llega) {
    if (obj.tipo === 'aterrar') resumen.push(`Arribes a terra a ${d} del punt a les ${h}.`)
    else resumen.push(`Passes a ${d} del punt${obj.tipo === 'altitud' ? ` a ${et}` : ''} a les ${h}.`)
  } else {
    if (fuera) resumen.push("No s'hi arriba amb aquest vent.")
    resumen.push(`El més a prop${obj.tipo === 'qualsevol' ? '' : ` a ${et}`}: ${d} a les ${h}.`)
  }
  if (sinMejora) resumen.push("Cap pla s'hi acosta més que quedar-te a aquesta altitud.")
  if (quietoPasa) resumen.push(`Si no fas res: ${distancia(aQuieto.distM)} a les ${hora(c.t0 + aQuieto.minuto * 60000)}.`)
  else if (obj.tipo === 'aterrar') resumen.push('Si no fas res, no baixes a terra.')
  else if (obj.tipo === 'altitud') resumen.push(`Si no fas res, no hi passes a ${et}.`)
  // Sin objetivo, quedarse solo deja de contar por el terreno: el mismo texto que el aviso.
  else resumen.push(`Si no fas res, a les ${hora(c.t0 + limQuieto * 60000)} passes a menys de ${alturaFt(e.ajustes.minSobreTerrenoM)} del terreny.`)
  if (dispersion.length > 1) {
    const ds = dispersion.map(x => x.distanciaMinM)
    const [dmin, dmax] = [distancia(Math.min(...ds)), distancia(Math.max(...ds))]
    resumen.push(dmin === dmax ? `Amb tots els models, ${dmin}.` : `Amb cada model, entre ${dmin} i ${dmax}.`)
  }

  // Para pintar: el camino hasta el punto mas cercano, y ese punto (spec de la pantalla, O11 y O12).
  const camTabla = caminoTabla(t, elegido.plan)!
  const mc = masCercaEnMargen(t, elegido.plan, camTabla, ox, oy)
  const zTerra = t.iTerra >= 0 ? c.rejilla.altM[t.iTerra] : null
  const camino = (caminoConAltura(t, elegido.plan, e.ajustes) ?? [])
    .slice(0, Math.max(1, Math.ceil(elegido.minuto)) + 1)
    .map(({ x, y, z }) => ({ ...aGeo(plano, x, y), altM: z, aRas: zTerra !== null && Math.abs(z - zTerra) < 1 }))

  return {
    ...vacio(llega ? 'llega' : 'no-llega'),
    camino,
    masCerca: mc === null ? null : aGeo(plano, mc[0], mc[1]),
    plan: tramos,
    distanciaMinM: elegido.distM,
    horaMin: iso(horaMs),
    siNoHaces: quietoPasa ? { distanciaMinM: aQuieto.distM, horaMin: iso(c.t0 + aQuieto.minuto * 60000) } : null,
    dispersion,
    fueraSeguro: fuera,
    zona,
    ordenes: [...ordenes(c, e.ajustes, tramos, llega, obj), ...resumen],
  }
}
