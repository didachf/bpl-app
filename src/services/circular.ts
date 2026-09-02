// src/services/circular.ts
// Estadistica circular del viento. Puro.
//
// Los rumbos son angulos, no numeros: la media aritmetica de 350 y 10 da 180,
// que apunta justo al lado contrario. Todo lo de aqui trabaja sobre vectores
// unitarios para que eso no pase.
//
// Fuente de las formulas: Farrugia y Micallef, "Comparative analysis of
// estimators for wind direction standard deviation", Meteorological
// Applications 13, 29-41 (2006), doi:10.1017/S1350482705001982, que a su vez
// recoge a Yamartino (1984) y a Mardia (1972). Las ecuaciones citadas abajo
// son las de ese articulo.
import { toSpeedDir, toUV } from './uv'

const RAD = Math.PI / 180
const DEG = 180 / Math.PI

function componentes(dirs: number[]): { C: number; S: number } {
  let C = 0
  let S = 0
  for (const d of dirs) {
    C += Math.cos(d * RAD)
    S += Math.sin(d * RAD)
  }
  return { C: C / dirs.length, S: S / dirs.length }
}

/**
 * Direccion media, ecuacion 3.
 *
 * `atan2` y no `atan`, porque hace falta el cuadrante. Sale en 0 a 360.
 */
export function circularMean(dirs: number[]): number | null {
  if (dirs.length === 0) return null
  const { C, S } = componentes(dirs)
  return ((Math.atan2(S, C) * DEG) + 360) % 360
}

/**
 * Longitud resultante media R, ecuacion 4. Va de 0 a 1.
 *
 * Uno es acuerdo total. Cero es que los rumbos se reparten de tal forma que se
 * cancelan, y entonces no hay direccion media que valga.
 */
export function meanResultantLength(dirs: number[]): number | null {
  if (dirs.length === 0) return null
  const { C, S } = componentes(dirs)
  return Math.min(1, Math.hypot(C, S))
}

/** Varianza circular, 1 menos R por definicion. */
export function circularVariance(dirs: number[]): number | null {
  const R = meanResultantLength(dirs)
  return R === null ? null : 1 - R
}

/**
 * Desviacion angular, estimador Y3 de Yamartino, ecuacion 23.
 *
 * Y3 y no el de Mardia, `sqrt(-2 ln R)`, ecuacion 27: ese **diverge a infinito
 * cuando R tiende a cero**, que es justo el caso de modelos muy dispersos, o
 * sea el caso en el que mas importa no mentir. Tampoco el Y1, que el propio
 * articulo dice que se queda corto por encima de un tercio de pi.
 *
 * Devuelve grados.
 */
export function angularStdDev(dirs: number[]): number {
  const n = dirs.length
  if (n < 2) return 0
  const R = meanResultantLength(dirs) ?? 0
  const e = Math.sqrt(Math.max(0, 1 - R * R))
  const corr = 1 + (2 / Math.sqrt(3) - 1) * Math.pow(e, 3)
  return Math.sqrt(n / (n - 1)) * Math.asin(e) * corr * DEG
}

export interface Arc {
  /** Rumbo donde empieza el abanico, girando en el sentido de las agujas. */
  from: number
  to: number
  spanDeg: number
}

/**
 * El arco MENOR que contiene todos los rumbos.
 *
 * Se busca el hueco mas grande entre rumbos consecutivos: el abanico es todo
 * lo demas. Asi 350 y 10 dan 20 grados y no 340, que es lo que daria una lista
 * ordenada, que es lo que hace hoy `trayectoria_globo.py` y se rompe al cruzar
 * el norte.
 */
export function bearingArc(dirs: number[]): Arc | null {
  if (dirs.length === 0) return null
  const d = [...dirs].map(x => ((x % 360) + 360) % 360).sort((a, b) => a - b)
  if (d.length === 1) return { from: d[0], to: d[0], spanDeg: 0 }

  let huecoMax = -1
  let iMax = 0
  for (let i = 0; i < d.length; i++) {
    const hueco = i === d.length - 1 ? d[0] + 360 - d[i] : d[i + 1] - d[i]
    if (hueco > huecoMax) { huecoMax = hueco; iMax = i }
  }
  return {
    from: d[(iMax + 1) % d.length],
    to: d[iMax],
    spanDeg: Math.round((360 - huecoMax) * 100) / 100,
  }
}

export interface Muestra { speed: number; dir: number }

/**
 * Media ponderada por velocidad, ecuaciones 5 a 7.
 *
 * El rumbo de un modelo que da 2 kt no puede pesar lo mismo que el de uno que
 * da 12. Se promedian las componentes u y v, que es exactamente lo que dicen
 * esas ecuaciones y lo que la Guia CIMO de la OMM llama promediado vectorial.
 *
 * `speed` es la velocidad del VECTOR medio, no la media de las velocidades. Es
 * menor cuando los rumbos discrepan, y eso es informacion: dos vientos
 * opuestos de 5 kt dan cero.
 */
export function speedWeightedMean(muestras: Muestra[]): Muestra | null {
  if (muestras.length === 0) return null
  let u = 0
  let v = 0
  for (const m of muestras) {
    const c = toUV(m.speed, m.dir)
    u += c.u
    v += c.v
  }
  const r = toSpeedDir(u / muestras.length, v / muestras.length)
  return { speed: r.speed, dir: r.dir }
}

export type NivelDesacuerdo = 'un_solo_modelo' | 'juntos' | 'dispersos' | 'dispares'

export interface Spread {
  n: number
  nivel: NivelDesacuerdo
  arco: Arc
  /** Varianza circular, 1 menos R. De 0 a 1. */
  desacuerdo: number
  /** Desviacion angular en grados, estimador Y3. */
  desviacionDeg: number
}

/**
 * Convencion de ESTE PROYECTO, en grados de apertura del abanico.
 *
 * No existe publicado ningun umbral de R ni de apertura que defina "los
 * modelos coinciden". Los cortes estan en la apertura porque es lo unico de
 * aqui que un piloto puede interpretar directamente: 30 grados de abanico es
 * una franja estrecha en el mapa, 90 es un cuadrante entero. La pantalla dice
 * que es convencion nuestra.
 */
export const CORTE_JUNTOS = 30
export const CORTE_DISPERSOS = 90

/**
 * Cuanto se separan los modelos.
 *
 * `CRITICAL:` esto NO es una probabilidad y no lleva porcentajes. Seis modelos
 * operativos son un "poor man's ensemble" sin calibrar, y la fraccion de
 * modelos que coinciden no es la probabilidad de que acierten. Lo que mide
 * esto es DESACUERDO entre modelos, que es una cota INFERIOR de la
 * incertidumbre real, porque no ve el error que los seis comparten.
 */
export function describeSpread(muestras: Muestra[]): Spread | null {
  if (muestras.length === 0) return null
  const dirs = muestras.map(m => m.dir)
  const arco = bearingArc(dirs) as Arc

  let nivel: NivelDesacuerdo
  if (muestras.length === 1) nivel = 'un_solo_modelo'
  else if (arco.spanDeg <= CORTE_JUNTOS) nivel = 'juntos'
  else if (arco.spanDeg <= CORTE_DISPERSOS) nivel = 'dispersos'
  else nivel = 'dispares'

  return {
    n: muestras.length,
    nivel,
    arco,
    desacuerdo: circularVariance(dirs) ?? 0,
    desviacionDeg: angularStdDev(dirs),
  }
}
