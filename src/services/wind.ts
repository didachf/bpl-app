// src/services/wind.ts
// De la respuesta cruda a lo que se pinta. Puro.
import { describeSpread, speedWeightedMean, type Muestra, type Spread } from './circular'
import { LEVELS, MODELS, type Level } from './levels'
import { keyOf, type RawProfile, type Sample } from './openmeteo'

export interface CeldaNivel {
  level: Level
  /** Modelos con dato a esta hora en este nivel. */
  muestras: { model: string; sample: Sample }[]
  /**
   * Modelos que NO cubren este nivel en absoluto, como ECMWF en 900 hPa.
   *
   * Se separa de `sinDato` a proposito: son cosas distintas y la pantalla las
   * dice distinto. Taparlas seria descartar en silencio.
   */
  noCubren: string[]
  /** Modelos que cubren el nivel pero no traen dato a esta hora. */
  sinDato: string[]
  spread: Spread | null
  /** Media ponderada por velocidad. `speed` es la del vector medio. */
  media: Muestra | null
  /** Banda de velocidad en m/s, de la mas floja a la mas fuerte. */
  banda: { min: number; max: number } | null
  /** Altura sobre el mar en m, mediana de los modelos. null en niveles AGL. */
  alturaAmslM: number | null
}

export interface FilaHora {
  timeIso: string
  niveles: CeldaNivel[]
}

function mediana(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

export function buildRows(p: RawProfile): FilaHora[] {
  return p.times.map((t, i) => ({
    timeIso: t,
    niveles: LEVELS.map(level => {
      const muestras: { model: string; sample: Sample }[] = []
      const noCubren: string[] = []
      const sinDato: string[] = []
      const alturas: number[] = []

      for (const model of MODELS) {
        const clave = keyOf(model, level.key)
        if (p.noCubiertos.has(clave)) { noCubren.push(model); continue }
        const s = p.wind[clave]?.[i] ?? null
        if (s === null) { sinDato.push(model); continue }
        muestras.push({ model, sample: s })
        const h = p.height[clave]?.[i]
        if (typeof h === 'number') alturas.push(h)
      }

      const m: Muestra[] = muestras.map(x => x.sample)
      const vel = m.map(x => x.speed)

      return {
        level,
        muestras,
        noCubren,
        sinDato,
        spread: describeSpread(m),
        media: speedWeightedMean(m),
        banda: vel.length === 0 ? null : { min: Math.min(...vel), max: Math.max(...vel) },
        alturaAmslM: level.kind === 'pressure' ? mediana(alturas) : null,
      }
    }),
  }))
}

/** Atajo para las pruebas y para la pantalla. */
export function nivelPorClave(fila: FilaHora, key: string): CeldaNivel {
  const n = fila.niveles.find(x => x.level.key === key)
  if (n === undefined) throw new Error(`Nivel desconocido: ${key}`)
  return n
}
