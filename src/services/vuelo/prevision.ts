// src/services/vuelo/prevision.ts
// La peticion de open-meteo de la pantalla de vuelo (spec 10/10 §5.1 y §12.1):
// siete modelos, 42 variables y el dia entero de una vez, porque por debajo de
// 14 dias el tiempo no cuenta en la cuota.
import { ALTURAS_AGL_M, MODELOS_NAV, PRESIONES_HPA, type RespuestaOpenMeteo } from '../nav/perfil'

const URL_API = 'https://api.open-meteo.com/v1/forecast'
export const HORAS_ADELANTE = 24

export function variablesPrevision(): string[] {
  const v: string[] = []
  for (const a of ALTURAS_AGL_M) v.push(`wind_speed_${a}m`, `wind_direction_${a}m`)
  for (const p of PRESIONES_HPA) v.push(`wind_speed_${p}hPa`, `wind_direction_${p}hPa`, `geopotential_height_${p}hPa`)
  return v
}

/** Peso en llamadas, formula del servidor de open-meteo (spec 10/10 §12.1), por debajo de 14 dias. */
export function pesoLlamadas(variables: number, modelos: number, puntos = 1): number {
  return puntos * Math.max(1, variables * modelos / 10)
}

function horaUtc(ms: number): string {
  return `${new Date(ms).toISOString().slice(0, 13)}:00`
}

export function cuerpoPrevision(lat: number, lon: number, ahora: number): Record<string, string> {
  return {
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: variablesPrevision().join(','),
    models: MODELOS_NAV.join(','),
    timezone: 'UTC',
    wind_speed_unit: 'ms',
    start_hour: horaUtc(ahora - 3_600_000),
    end_hour: horaUtc(ahora + HORAS_ADELANTE * 3_600_000),
  }
}

export class CuotaAgotada extends Error {}

/** POST y no GET: 42 variables por siete modelos no caben en una URL. */
export async function pedirPrevision(
  lat: number, lon: number, ahora: number, f: typeof fetch = fetch, limitMs = 20_000,
): Promise<RespuestaOpenMeteo> {
  // Con poca cobertura una peticion puede no contestar nunca: se corta y se dice.
  const res = await f(URL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(cuerpoPrevision(lat, lon, ahora)).toString(),
    signal: AbortSignal.timeout(limitMs),
  }).catch((e: unknown) => {
    if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
      throw new Error(`open-meteo no contesta en ${Math.round(limitMs / 1000)} s.`)
    }
    throw e
  })
  if (res.status === 429) throw new CuotaAgotada("open-meteo ha rebutjat la petició per quota. Torna-ho a provar d'aquí a un minut.")
  if (!res.ok) throw new Error(`open-meteo ha respost ${res.status}`)
  return await res.json() as RespuestaOpenMeteo
}
