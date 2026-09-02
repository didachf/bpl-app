// src/services/levels.ts
// Los niveles de viento que se piden a open-meteo, y para que sirve cada uno.
//
// La primera version del spec pedia solo 925 y 900 hPa, que son los del script
// de deriva. Sirven para saber a donde te lleva el viento, pero NO para
// dirigir el globo: la tecnica documentada por el FAA Balloon Flying Handbook
// se hace con lecturas de globo piloto a 150, 300 y 450 ft AGL, o sea de 45 a
// 140 m. Sobre Igualada, con 329 m de elevacion, 925 hPa queda a unos 470 m
// AGL, muy por encima de esa banda.
//
// Pedir los niveles bajos no cuesta nada: van en la misma llamada.

export type LevelKind = 'agl' | 'pressure'

export interface Level {
  /** Sufijo de la variable en la API: "10m", "925hPa". */
  key: string
  label: string
  kind: LevelKind
  /** Altura sobre el suelo en metros, solo en los niveles AGL. */
  aglM: number | null
  /** Para que sirve. Sale en pantalla, no es un comentario. */
  para: string
}

export const LEVELS: readonly Level[] = [
  {
    key: '10m', label: '10 m', kind: 'agl', aglM: 10,
    para: 'Viento en superficie. Es contra este contra el que se compara el limite del manual.',
  },
  {
    key: '80m', label: '80 m', kind: 'agl', aglM: 80,
    para: 'Banda de gobierno. Aqui empieza a poder elegirse rumbo.',
  },
  {
    key: '120m', label: '120 m', kind: 'agl', aglM: 120,
    para: 'Banda de gobierno, el tramo medio de la lectura de globo piloto.',
  },
  {
    key: '180m', label: '180 m', kind: 'agl', aglM: 180,
    para: 'Banda de gobierno, el tramo alto.',
  },
  {
    key: '950hPa', label: '950 hPa', kind: 'pressure', aglM: null,
    para: 'Rellena el hueco entre la superficie y 925 hPa.',
  },
  {
    key: '925hPa', label: '925 hPa', kind: 'pressure', aglM: null,
    para: 'Techo de un vuelo de instruccion normal.',
  },
  {
    key: '900hPa', label: '900 hPa', kind: 'pressure', aglM: null,
    para: 'El viento en altura de la V del gobierno.',
  },
]

/** Los que llevan altura de geopotencial, que se lee y no se supone. */
export const PRESSURE_LEVELS = LEVELS.filter(l => l.kind === 'pressure')

/** El nivel contra el que se juzga el limite del manual. */
export const NIVEL_SUPERFICIE = '10m'

/**
 * Los seis modelos, los mismos que `trayectoria_globo.py`.
 *
 * `ecmwf_ifs025` NO tiene 900 hPa: sus niveles saltan de 925 a 850. La API no
 * da error, devuelve 200 con nulos y la unidad "undefined".
 */
export const MODELS: readonly string[] = [
  'icon_eu',
  'gfs_seamless',
  'gem_seamless',
  'ukmo_global_deterministic_10km',
  'meteofrance_arpege_europe',
  'ecmwf_ifs025',
]

export const MODEL_LABELS: Record<string, string> = {
  icon_eu: 'ICON-EU, DWD',
  gfs_seamless: 'GFS, NOAA',
  gem_seamless: 'GEM, Canada',
  ukmo_global_deterministic_10km: 'UKMO, Met Office',
  meteofrance_arpege_europe: 'ARPEGE, Meteo-France',
  ecmwf_ifs025: 'IFS, ECMWF',
}

export function modelLabel(m: string): string {
  return MODEL_LABELS[m] ?? m
}
