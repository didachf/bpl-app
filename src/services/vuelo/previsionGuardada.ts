// src/services/vuelo/previsionGuardada.ts
// La ultima prevision de la pantalla de vuelo, en IndexedDB, y cuando se puede
// pedir otra: como mucho cada 30 min, en la posicion de ese momento (spec 10/10
// §5.5). Sin red, la guardada con el error, nunca nada inventado.
import { del, get, set } from 'idb-keyval'
import type { RespuestaOpenMeteo } from '../nav/perfil'
import { aPlano } from '../nav/geo'
import { CuotaAgotada, pedirPrevision } from './prevision'

const CLAVE = 'vol:prevision'
export const REFRESCO_MIN = 30

export interface PrevisionGuardada { respuesta: RespuestaOpenMeteo; lat: number; lon: number; pedidaEn: number }
export interface Obtenida { guardada: PrevisionGuardada | null; nueva: boolean; error: string | null }

export async function leerPrevision(): Promise<PrevisionGuardada | null> {
  try {
    return (await get<PrevisionGuardada>(CLAVE)) ?? null
  } catch {
    return null
  }
}

export async function borrarPrevision(): Promise<void> {
  await del(CLAVE)
}

function puedePedir(p: PrevisionGuardada | null, ahora: number): boolean {
  return p === null || ahora - p.pedidaEn >= REFRESCO_MIN * 60_000
}

/** A cuantos km de aqui se pidio. La pantalla lo dice (spec 10/10 §5.5). */
export function distanciaKm(p: PrevisionGuardada, lat: number, lon: number): number {
  const [x, y] = aPlano({ lat0: p.lat, lon0: p.lon }, lat, lon)
  return Math.hypot(x, y) / 1000
}

export async function obtenerPrevision(
  lat: number, lon: number, ahora: number, pedir = pedirPrevision,
): Promise<Obtenida> {
  const guardada = await leerPrevision()
  if (!puedePedir(guardada, ahora)) return { guardada, nueva: false, error: null }
  try {
    const p: PrevisionGuardada = { respuesta: await pedir(lat, lon, ahora), lat, lon, pedidaEn: ahora }
    await set(CLAVE, p)
    return { guardada: p, nueva: true, error: null }
  } catch (e) {
    const deOpenMeteo = e instanceof CuotaAgotada || (e instanceof Error && e.message.startsWith('open-meteo'))
    return { guardada, nueva: false, error: deOpenMeteo ? (e as Error).message : 'Sense connexió amb open-meteo.' }
  }
}
