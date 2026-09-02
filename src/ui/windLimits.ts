// src/ui/windLimits.ts
// Comparar el viento en superficie con los limites. Puro.
//
// `CRITICAL:` Part-BFCL NO contiene ninguna cifra de viento, ni para pilotos
// con licencia ni para alumnos. BFCL.125 solo exige autorizacion y supervision
// de un FI(B) para el vuelo solo. Nada de aqui se presenta como reglamentario.
//
// El limite de verdad es una limitacion de aeronavegabilidad del Manual de
// Vuelo, y cambia por envolvente, por eso viene del globo y no de una
// constante.
import { msToKt } from '../services/uv'

/**
 * Ultramagic FM04 §2.2, rev. 18: "The surface wind speed at take-off must not
 * exceed 15 kt". Aprobado por EASA y de cumplimiento obligatorio.
 *
 * Solo se usa como SUGERENCIA al dar de alta un globo. El Suplemento 34 baja a
 * 12 kt para la envolvente N-500 y a 10 en cautivo, asi que este numero no
 * vale para cualquier globo y nunca se aplica solo.
 */
export const LIMITE_FM04_KT = 15

/**
 * FAA Balloon Flying Handbook: "Most pilots prefer to launch and fly in winds
 * less than 7 knots". Es practica, no limitacion, y esta muy por debajo del
 * limite del manual. Por eso se enseñan los dos.
 */
export const PRACTICA_FAA_KT = 7

export type Veredicto = 'sin_limite' | 'dentro' | 'sobre_personal' | 'sobre_manual'

export interface JuicioViento {
  veredicto: Veredicto
  vientoKt: number
  manualKt: number | null
  personalKt: number | null
  mensaje: string
}

/**
 * Juzga el viento en superficie contra los dos limites.
 *
 * El orden importa: el del manual manda, porque es una limitacion aprobada. El
 * personal es del piloto y va por debajo.
 *
 * **Nunca dice que se puede volar.** Decir "por debajo de los limites" es una
 * afirmacion sobre dos numeros; decir "puedes volar" seria una decision, y esa
 * es del piloto con el globo delante.
 */
export function juzgarViento(
  vientoMs: number, manualKt: number | null, personalKt: number | null,
): JuicioViento {
  const vientoKt = msToKt(vientoMs)
  const base = { vientoKt, manualKt, personalKt }

  if (manualKt === null && personalKt === null) {
    return {
      ...base,
      veredicto: 'sin_limite',
      mensaje:
        'No hay con que comparar. Pon el viento maximo de despegue del manual de vuelo de '
        + 'tu globo en Ajustes, globos, y tu minimo personal en Ajustes, mis datos.',
    }
  }

  if (manualKt !== null && vientoKt > manualKt) {
    return {
      ...base,
      veredicto: 'sobre_manual',
      mensaje:
        `Por encima del limite del manual de vuelo, ${manualKt} kt. Es una limitacion `
        + 'aprobada, no una recomendacion.',
    }
  }

  if (personalKt !== null && vientoKt > personalKt) {
    return {
      ...base,
      veredicto: 'sobre_personal',
      mensaje: manualKt === null
        ? `Por encima de tu minimo personal, ${personalKt} kt. Ojo: no has puesto el limite `
          + 'del manual de este globo, asi que contra eso no se ha comparado.'
        : `Por encima de tu minimo personal, ${personalKt} kt, aunque por debajo del limite `
          + `del manual, ${manualKt} kt.`,
    }
  }

  return {
    ...base,
    veredicto: 'dentro',
    mensaje: manualKt === null
      ? 'Por debajo de tu minimo personal. No has puesto el limite del manual de este globo.'
      : 'Por debajo de los limites con los que se ha comparado. La decision sigue siendo tuya, '
        + 'y con el globo piloto delante.',
  }
}

/** De donde sale la cifra contra la que se compara. */
export type FuenteLimite = 'globo' | 'fm04'

/**
 * El limite del manual que se aplica de verdad.
 *
 * Didac vuela la serie normal de Ultramagic, cuyo FM04 §2.2 dice 15 kt, y el
 * 2026-09-02 dijo que para el "es 15 kt siempre". Por eso ese valor se aplica
 * solo cuando el globo no trae cifra propia, en vez de quedarse sin comparar y
 * pedirsela cada vez.
 *
 * No se cablea del todo a proposito: sigue ganando la cifra del globo, porque
 * el Suplemento 34 baja a 12 kt para la envolvente N-500. Cuesta cero
 * mantenerlo y evita que el numero viva donde nadie pueda corregirlo, que es
 * justo lo que hace falta si otro piloto clona esta app.
 */
export function limiteManual(
  balloon: { maxSurfaceWindKt: number | null } | null,
): { kt: number; fuente: FuenteLimite } {
  const propio = balloon?.maxSurfaceWindKt
  if (typeof propio === 'number') return { kt: propio, fuente: 'globo' }
  return { kt: LIMITE_FM04_KT, fuente: 'fm04' }
}
