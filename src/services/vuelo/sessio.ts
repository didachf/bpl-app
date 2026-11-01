// src/services/vuelo/sessio.ts
// La sesion de vuelo en curso: el despegue, la correccion de altitud, el techo
// y la traza, guardada en IndexedDB segun llega para no perderla si la app se
// cierra (spec 10/10 §6.1).
import { del, get, set } from 'idb-keyval'
import { PIE_M } from '../nav/campo'
import { AJUSTES_POR_DEFECTO, type AjustesNav, type PuntoTraza } from '../nav/tipos'
import type { PuntoGps } from './gps'

const CLAVE = 'vol:sessio'
/** Por encima de esto sobre el terreno del despegue, el globo ya vuela. */
const ENLAIRAT_M = 15

export interface Despegue { lat: number; lon: number; elevM: number }

export interface Sessio {
  iniciadaA: number
  despegue: Despegue
  /** Altitud sobre el mar = GPS + correccioM. null sin calibrar. */
  correccioM: number | null
  sostreM: number
  traza: PuntoTraza[]
  enlairatA: number | null
}

export function novaSessio(despegue: Despegue, sostreM: number, ara: number): Sessio {
  return { iniciadaA: ara, despegue, correccioM: null, sostreM, traza: [], enlairatA: null }
}

export function afegirPunt(s: Sessio, p: PuntoGps): Sessio {
  const ultim = s.traza[s.traza.length - 1]
  if (p.altElipM === null || (ultim !== undefined && p.t <= ultim.t)) return s
  const altM = p.altElipM + (s.correccioM ?? 0)
  const enlairatA = s.enlairatA ?? (s.correccioM !== null && altM >= s.despegue.elevM + ENLAIRAT_M ? p.t : null)
  return { ...s, traza: [...s.traza, { t: p.t, lat: p.lat, lon: p.lon, altM }], enlairatA }
}

/** El rango del optimizador: de 250 ft sobre el despegue al techo (spec 10/10 §6.8). */
export function ajustesDeVol(s: Sessio): AjustesNav {
  return { ...AJUSTES_POR_DEFECTO, altMinM: s.despegue.elevM + 250 * PIE_M, altMaxM: s.sostreM }
}

export async function desarSessio(s: Sessio): Promise<void> {
  await set(CLAVE, s)
}

export async function llegirSessio(): Promise<Sessio | null> {
  try {
    return (await get<Sessio>(CLAVE)) ?? null
  } catch {
    return null
  }
}

export async function esborrarSessio(): Promise<void> {
  await del(CLAVE)
}
