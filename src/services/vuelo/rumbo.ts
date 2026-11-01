// src/services/vuelo/rumbo.ts
// Del globo al waypoint activo, por circulo maximo (spec 10/10 §6.7).
import type { Punto } from '../nav/tipos'

const R = 6371000
const RAD = Math.PI / 180
/** Por debajo de esto el globo va casi parado y la hora de llegada no dice nada. */
const VEL_MIN_MS = 0.3

export function distanciaM(a: Punto, b: Punto): number {
  const dLat = (b.lat - a.lat) * RAD
  const dLon = (b.lon - a.lon) * RAD
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Rumbo verdadero inicial, de 0 a 360. */
export function rumboDirecto(a: Punto, b: Punto): number {
  const dLon = (b.lon - a.lon) * RAD
  const y = Math.sin(dLon) * Math.cos(b.lat * RAD)
  const x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos(dLon)
  return (Math.atan2(y, x) / RAD + 360) % 360
}

export function horaLlegada(distM: number, velMs: number, ahora: number): number | null {
  return velMs < VEL_MIN_MS ? null : ahora + (distM / velMs) * 1000
}

export function formatDistancia(m: number): string {
  if (m < 995) return `${Math.round(m / 10) * 10} m`
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`
}
