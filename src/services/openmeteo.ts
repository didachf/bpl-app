// src/services/openmeteo.ts
// La llamada a open-meteo y el parseo de su respuesta.
//
// Restricciones MEDIDAS contra la API en vivo el 2026-09-02, no leidas de la
// documentacion:
//
//  - CORS abierto y sin clave: se llama desde el navegador.
//  - **Cada coordenada consume cuota por separado.** Por eso aqui se pide UN
//    punto. La rejilla de 49 del script de deriva es fase 2 y necesitara su
//    propio presupuesto.
//  - Los seis modelos en UNA llamada cuestan unas 98 unidades; en seis
//    llamadas sueltas, unas 270. Se agrupan.
//  - Con `models=`, las claves de la respuesta llevan sufijo del modelo.
//  - `ecmwf_ifs025` no tiene 900 hPa y **no da error**: devuelve 200, nulos y
//    la unidad "undefined".
import { LEVELS, MODELS, PRESSURE_LEVELS } from './levels'

const URL_API = 'https://api.open-meteo.com/v1/forecast'

export interface Sample { speed: number; dir: number }

export interface WindQuery {
  lat: number
  lon: number
  /** "YYYY-MM-DDTHH:MM" en UTC. */
  startHour: string
  endHour: string
}

/** Clave interna, modelo y nivel. */
export function keyOf(model: string, level: string): string {
  return `${model}|${level}`
}

export interface RawProfile {
  lat: number
  lon: number
  /** ISO CON Z. La API las manda sin zona y eso desplaza el vuelo. */
  times: string[]
  /** `${modelo}|${nivel}` a serie paralela a `times`. null es hueco puntual. */
  wind: Record<string, (Sample | null)[]>
  /** Altura del nivel de presion en m sobre el mar, por hora. */
  height: Record<string, (number | null)[]>
  /** Claves que ese modelo no cubre EN ABSOLUTO. Distinto de un hueco puntual. */
  noCubiertos: Set<string>
  fetchedAt: number
}

export function buildBody(q: WindQuery): Record<string, string | number> {
  const vars: string[] = []
  for (const l of LEVELS) vars.push(`wind_speed_${l.key}`, `wind_direction_${l.key}`)
  for (const l of PRESSURE_LEVELS) vars.push(`geopotential_height_${l.key}`)

  return {
    latitude: q.lat,
    longitude: q.lon,
    hourly: vars.join(','),
    models: MODELS.join(','),
    timezone: 'UTC',
    wind_speed_unit: 'ms',
    start_hour: q.startHour,
    end_hour: q.endHour,
  }
}

interface RespuestaCruda {
  latitude: number
  longitude: number
  hourly_units: Record<string, string>
  hourly: Record<string, (number | null)[] | string[]>
}

/**
 * La unidad "undefined" es como la API dice "este modelo no tiene este nivel".
 *
 * Hay que mirarla ANTES que los valores: si solo se miran los nulos, un modelo
 * que no cubre el nivel se confunde con uno que ese dia no tiene dato, y la
 * pantalla diria "sin dato" en vez de "este modelo no llega ahi".
 */
function cubierto(units: Record<string, string>, clave: string): boolean {
  const u = units[clave]
  return u !== undefined && u !== 'undefined'
}

export function parseProfile(d: RespuestaCruda): RawProfile {
  const h = d.hourly
  // `timezone=UTC` devuelve "2026-09-03T05:00", SIN zona. `Date.parse` de eso
  // lo interpreta como hora local, que en Madrid en verano son dos horas de
  // desfase. Se le pone la Z aqui, una vez, y no en cada sitio que la use.
  const times = (h.time as string[]).map(t => (t.endsWith('Z') ? t : `${t}Z`))

  const wind: Record<string, (Sample | null)[]> = {}
  const height: Record<string, (number | null)[]> = {}
  const noCubiertos = new Set<string>()

  for (const m of MODELS) {
    for (const l of LEVELS) {
      const kS = `wind_speed_${l.key}_${m}`
      const kD = `wind_direction_${l.key}_${m}`
      const clave = keyOf(m, l.key)

      if (!cubierto(d.hourly_units, kS) || !cubierto(d.hourly_units, kD)) {
        noCubiertos.add(clave)
        wind[clave] = times.map(() => null)
        continue
      }
      const ss = (h[kS] ?? []) as (number | null)[]
      const dd = (h[kD] ?? []) as (number | null)[]
      wind[clave] = times.map((_, i) => {
        const s = ss[i]
        const dir = dd[i]
        if (s === null || s === undefined || dir === null || dir === undefined) return null
        return { speed: s, dir }
      })
    }

    for (const l of PRESSURE_LEVELS) {
      const kH = `geopotential_height_${l.key}_${m}`
      const clave = keyOf(m, l.key)
      if (!cubierto(d.hourly_units, kH)) { height[clave] = times.map(() => null); continue }
      const hh = (h[kH] ?? []) as (number | null)[]
      height[clave] = times.map((_, i) => hh[i] ?? null)
    }
  }

  return {
    lat: d.latitude, lon: d.longitude, times, wind, height, noCubiertos,
    fetchedAt: Date.now(),
  }
}

/**
 * POST y no GET: siete niveles por seis modelos son catorce variables mas tres
 * alturas, y con `models=` la URL se pasa de largo. La API acepta POST con el
 * cuerpo en formato de formulario.
 */
export async function fetchWindProfile(q: WindQuery): Promise<RawProfile> {
  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(buildBody(q))) body.set(k, String(v))

  const res = await fetch(URL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (res.status === 429) {
    throw new Error(
      'open-meteo ha rechazado la peticion por cuota. Espera un minuto. '
      + 'Cada punto del mapa consume cuota, asi que no toques muchos seguidos.',
    )
  }
  if (!res.ok) throw new Error(`open-meteo ha respondido ${res.status}`)

  return parseProfile(await res.json() as RespuestaCruda)
}
