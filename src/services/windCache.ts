// src/services/windCache.ts
// La ultima respuesta de open-meteo, guardada.
//
// Existe por el spec §8: sin red, la pantalla de viento enseña la ultima
// respuesta cacheada CON SU ANTIGUEDAD y marcada como vieja. Un pronostico
// viejo sin fecha es peor que no tener pronostico.
import { get, set } from 'idb-keyval'
import type { RawProfile } from './openmeteo'

const PREFIJO = 'wind:'

/**
 * Clave del punto.
 *
 * Tres decimales son unos 100 m, que es mas fino que la resolucion de
 * cualquiera de los seis modelos (el mejor, ICON-EU, va a unos 7 km). Redondear
 * evita pedir de nuevo por haber movido el dedo dos pixeles.
 */
export function claveDe(lat: number, lon: number, startHour: string): string {
  return `${PREFIJO}${lat.toFixed(3)},${lon.toFixed(3)}@${startHour}`
}

interface Guardado {
  profile: Omit<RawProfile, 'noCubiertos'> & { noCubiertos: string[] }
}

/** `Set` no sobrevive a la serializacion estructurada de forma fiable: se guarda como lista. */
export async function guardar(clave: string, p: RawProfile): Promise<void> {
  const g: Guardado = { profile: { ...p, noCubiertos: [...p.noCubiertos] } }
  await set(clave, g)
}

export async function leer(clave: string): Promise<RawProfile | null> {
  try {
    const g = await get<Guardado>(clave)
    if (g === undefined) return null
    return { ...g.profile, noCubiertos: new Set(g.profile.noCubiertos) }
  } catch {
    return null
  }
}

/**
 * Cuanto hace que se bajo, en minutos.
 *
 * El modelo que mas rapido se refresca de los seis es ICON-EU, cada 3 h; los
 * demas van entre 6 y 12 h. Por debajo de eso, volver a pedir devuelve lo
 * mismo y gasta cuota.
 */
export function antiguedadMin(p: RawProfile, ahora = Date.now()): number {
  return Math.max(0, Math.round((ahora - p.fetchedAt) / 60000))
}

/** Pasadas 6 h la respuesta es de una pasada anterior de casi todos los modelos. */
export const VIEJA_MIN = 6 * 60

export function esVieja(p: RawProfile, ahora = Date.now()): boolean {
  return antiguedadMin(p, ahora) >= VIEJA_MIN
}
