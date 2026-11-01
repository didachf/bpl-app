// src/services/vuelo/gps.ts
// Lo que sale del GPS de la tablet (spec 10/10 §6.2, §6.3 y §6.5). Chrome en
// Android da la altitud sobre el elipsoide y nunca su precision (§12.1): se
// calibra en tierra contra el terreno del despegue.
import { aGeo, aPlano, rumbo } from '../nav/geo'
import type { Punto, PuntoTraza } from '../nav/tipos'

export interface PuntoGps { t: number; lat: number; lon: number; altElipM: number | null; precisionM: number }

const PRECISION_MAX_M = 30
const MUESTRAS_MIN = 10
export const CALIBRACION_S = 30
const VENTANA_RUMBO_S = 30
const SPAN_RUMBO_MIN_S = 10
const VENTANA_VARIO_S = 10
const SPAN_VARIO_MIN_S = 5

/** Correccion = terreno menos la media del GPS en tierra. Altitud sobre el mar = GPS + correccion. */
export function calibracion(muestras: PuntoGps[], terrenoM: number): { correccionM: number; n: number } | null {
  const alts = muestras.filter(m => m.altElipM !== null && m.precisionM <= PRECISION_MAX_M).map(m => m.altElipM!)
  if (alts.length < MUESTRAS_MIN) return null
  return { correccionM: terrenoM - alts.reduce((s, a) => s + a, 0) / alts.length, n: alts.length }
}

const ventana = (traza: PuntoTraza[], s: number) => {
  const ultimo = traza[traza.length - 1]
  return ultimo === undefined ? [] : traza.filter(p => p.t >= ultimo.t - s * 1000)
}

/** Del primer al ultimo punto de los ultimos 30 s. El campo heading del GPS no sirve con el globo lento. */
export function rumboVelocidad(traza: PuntoTraza[]): { rumbo: number; velMs: number } | null {
  const v = ventana(traza, VENTANA_RUMBO_S)
  if (v.length < 2) return null
  const a = v[0]
  const b = v[v.length - 1]
  const dt = (b.t - a.t) / 1000
  if (dt < SPAN_RUMBO_MIN_S) return null
  const [x, y] = aPlano({ lat0: a.lat, lon0: a.lon }, b.lat, b.lon)
  return { rumbo: rumbo(x, y), velMs: Math.hypot(x, y) / dt }
}

/** Pendiente de la altitud por minimos cuadrados en los ultimos 10 s, en m/s. */
export function vario(traza: PuntoTraza[]): number | null {
  const v = ventana(traza, VENTANA_VARIO_S)
  if (v.length < 3 || (v[v.length - 1].t - v[0].t) / 1000 < SPAN_VARIO_MIN_S) return null
  const ts = v.map(p => (p.t - v[0].t) / 1000)
  const mt = ts.reduce((s, t) => s + t, 0) / ts.length
  const ma = v.reduce((s, p) => s + p.altM, 0) / v.length
  let num = 0
  let den = 0
  v.forEach((p, i) => { num += (ts[i] - mt) * (p.altM - ma); den += (ts[i] - mt) ** 2 })
  return num / den
}

/** Donde estarias si te quedas a esta altura, a los 5, 10, 15 y 20 min (spec 10/10 §6.5). */
export function proyeccion(pos: Punto, rumboDeg: number, velMs: number, minutos = [5, 10, 15, 20]): Punto[] {
  const r = rumboDeg * Math.PI / 180
  return minutos.map(m => aGeo({ lat0: pos.lat, lon0: pos.lon }, Math.sin(r) * velMs * m * 60, Math.cos(r) * velMs * m * 60))
}
