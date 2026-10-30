// src/services/nav/perfil.ts
// De la respuesta de open-meteo con los siete modelos (spec 10/10 §5.1) a un
// perfil vertical por modelo y por hora: pares (altitud sobre el mar, u, v).
// Mismas reglas que `vent_alt.py` y que el prototipo `viento.py`.

export const MODELOS_NAV = [
  'icon_eu', 'gfs_seamless', 'gem_seamless', 'ukmo_global_deterministic_10km',
  'meteofrance_arpege_europe', 'ecmwf_ifs025', 'meteofrance_arome_france',
] as const

export const ALTURAS_AGL_M = [10, 20, 50, 80, 100, 120, 150, 180, 200]
export const PRESIONES_HPA = [1000, 975, 950, 925, 900, 850, 800, 700]

/** Un nivel de presion por debajo de la elevacion mas esto se descarta (spec 10/10 §5.1). */
const MARGEN_SUELO_M = 10

export interface PuntoPerfil { altM: number; u: number; v: number }

export interface Previsiones {
  elevM: number
  /** Horas en ms desde epoch, UTC. */
  horas: number[]
  modelos: string[]
  /** [modelo][hora], ordenado por altitud. Vacio si el modelo no da nada. */
  perfiles: PuntoPerfil[][][]
}

export interface RespuestaOpenMeteo {
  elevation: number
  hourly_units: Record<string, string>
  hourly: Record<string, (number | null)[] | string[]>
}

const FACTOR_VELOCIDAD: Record<string, number> = {
  'kn': 1852 / 3600,
  'm/s': 1,
  'ms': 1,
  'km/h': 1 / 3.6,
  'mp/h': 0.44704,
}

/** La unidad "undefined" es como la API dice que el modelo no tiene ese nivel. */
function cubierto(units: Record<string, string>, k: string): boolean {
  const u = units[k]
  return u !== undefined && u !== 'undefined'
}

/** Viento meteorologico (de donde viene) a vector hacia donde va. */
export function aVector(velMs: number, dirDe: number): [number, number] {
  const r = (dirDe * Math.PI) / 180
  return [-velMs * Math.sin(r), -velMs * Math.cos(r)]
}

export function parsePrevision(d: RespuestaOpenMeteo): Previsiones {
  const h = d.hourly
  const un = d.hourly_units
  // `timezone=UTC` devuelve las horas sin zona, y `Date.parse` las tomaria como locales.
  const horas = (h.time as string[]).map(t => Date.parse(t.endsWith('Z') ? t : `${t}Z`))
  const elevM = d.elevation

  const serie = (k: string): (number | null)[] => (h[k] ?? []) as (number | null)[]
  const factor = (k: string): number => {
    const f = FACTOR_VELOCIDAD[un[k]]
    if (f === undefined) throw new Error(`Unidad de velocidad desconocida: ${un[k]} en ${k}`)
    return f
  }

  const perfiles = MODELOS_NAV.map(m => horas.map((_, i) => {
    const pts: PuntoPerfil[] = []
    for (const a of ALTURAS_AGL_M) {
      const ks = `wind_speed_${a}m_${m}`
      const kd = `wind_direction_${a}m_${m}`
      if (!cubierto(un, ks) || !cubierto(un, kd)) continue
      const s = serie(ks)[i]
      const dir = serie(kd)[i]
      if (s == null || dir == null) continue
      const [u, v] = aVector(s * factor(ks), dir)
      pts.push({ altM: elevM + a, u, v })
    }
    for (const p of PRESIONES_HPA) {
      const ks = `wind_speed_${p}hPa_${m}`
      const kd = `wind_direction_${p}hPa_${m}`
      const kz = `geopotential_height_${p}hPa_${m}`
      if (!cubierto(un, ks) || !cubierto(un, kd) || !cubierto(un, kz)) continue
      const s = serie(ks)[i]
      const dir = serie(kd)[i]
      const z = serie(kz)[i]
      if (s == null || dir == null || z == null) continue
      // Un nivel bajo tierra puede llegar con valores extrapolados: fuera.
      if (z < elevM + MARGEN_SUELO_M) continue
      const [u, v] = aVector(s * factor(ks), dir)
      pts.push({ altM: z, u, v })
    }
    return pts.sort((a, b) => a.altM - b.altM)
  }))

  return { elevM, horas, modelos: [...MODELOS_NAV], perfiles }
}
