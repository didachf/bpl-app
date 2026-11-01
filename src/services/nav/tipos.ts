// src/services/nav/tipos.ts
// Tipos de entrada y salida del motor de navegacion a un punto. Todo lo que
// entra y sale es serializable a JSON: el motor corre en un Web Worker, en node
// y, mas adelante, como herramienta de Claude.

/** Un punto de la traza GPS. `altM` ya calibrada sobre el mar (spec 10/10 §6.2). */
export interface PuntoTraza { t: number; lat: number; lon: number; altM: number }

export type FuenteMedida = 'gps' | 'caja' | 'pibal' | 'metar'

/**
 * Una medida de viento. `u` y `v` son hacia donde va el aire, este y norte, en
 * m/s. `sigma` es el error tipico de cada componente.
 */
export interface Medida {
  fuente: FuenteMedida
  t: number
  altM: number
  u: number
  v: number
  sigma: number
}

export type Modo = 'puja_lent' | 'puja_rapid' | 'baixa_lent' | 'baixa_rapid'

export interface AjustesNav {
  /** Velocidad de calculo de cada modo en m/s, positiva (spec 10/10 §6.8). */
  modos: Record<Modo, number>
  /** El rango del piloto, solo para el texto de la orden. */
  rangos: Record<Modo, [number, number]>
  altMinM: number
  altMaxM: number
  horizonteMin: number
  /** Minimo sobre el terreno bajo el recorrido, salvo a ras (spec 2026-11-01-relieve §2). */
  minSobreTerrenoM: number
}

export const AJUSTES_POR_DEFECTO: Omit<AjustesNav, 'altMinM' | 'altMaxM'> = {
  modos: { puja_lent: 0.5, puja_rapid: 2.75, baixa_lent: 0.5, baixa_rapid: 4 },
  rangos: { puja_lent: [0, 1], puja_rapid: [2.5, 3], baixa_lent: [0, 1], baixa_rapid: [3, 5] },
  horizonteMin: 60,
  minSobreTerrenoM: 100 * 0.3048,
}

export interface Punto { lat: number; lon: number }

/**
 * Elevacion del suelo en m sobre el mar (spec 2026-11-01-relieve §3). Filas de sur a norte desde
 * lat0, columnas de oeste a este desde lon0, al menos 2 x 2.
 */
export interface Relieve { lat0: number; lon0: number; dLat: number; dLon: number; nLat: number; nLon: number; elevM: number[] }

/**
 * El objetivo de altura en el punto (spec 2026-11-01): aterrar (franja terra),
 * pasar a una altitud sobre el mar, o a cualquier altura.
 */
export type Objetivo = { tipo: 'aterrar' } | { tipo: 'altitud'; altM: number } | { tipo: 'qualsevol' }

export const QUALSEVOL: Objetivo = { tipo: 'qualsevol' }

export interface Tramo {
  tipo: 'mantener' | 'cambiar'
  /** La franja que se mantiene, o a la que se va. */
  franja: number
  modo: Modo | null
  inicioMin: number
  finMin: number
}

export type Estado = 'llega' | 'no-llega' | 'sin-punto' | 'sin-datos'

export interface ResultadoNavegacion {
  estado: Estado
  /** El objetivo con el que se ha calculado. */
  objetivo: Objetivo
  plan: Tramo[]
  distanciaMinM: number | null
  horaMin: string | null
  siNoHaces: { distanciaMinM: number; horaMin: string } | null
  dispersion: { modelo: string; distanciaMinM: number }[]
  fueraSeguro: boolean
  zona: Punto[][]
  ordenes: string[]
  avisos: string[]
  calculadoA: string
  previsionDe: string | null
}
