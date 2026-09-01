import { groupFromVolume } from './balloon'
import { flightDurationMin, hasConsistentTimes } from './flight'
import { hasRoleAndIsNotThePilot } from './people'
import type { Balloon, Flight, IsoDate, LogbookDoc, PilotFunction, Uuid } from './types'

export type RequirementUnit = 'minutes' | 'count'

export interface Requirement {
  key: string
  label: string
  current: number
  required: number
  unit: RequirementUnit
  met: boolean
  /** Cierto si algun vuelo candidato esta incompleto o tiene las horas incoherentes. */
  partial: boolean
}

export type ExclusionReason =
  | 'flight_in_future'
  | 'balloon_unknown'
  | 'balloon_not_eligible'
  | 'not_signed'
  | 'solo_without_supervisor'
  | 'instructor_unknown'

export interface ExcludedFlight {
  flightId: Uuid
  reason: ExclusionReason
}

export interface BplProgress {
  requirements: Requirement[]
  allMet: boolean
  /**
   * Vuelos de instruccion que NO cuentan, y por que.
   *
   * Existe para que ninguna exclusion sea silenciosa. Un vuelo que desaparece
   * del contador sin explicacion es peor que uno que no cuenta y lo dice.
   */
  excluded: ExcludedFlight[]
  /**
   * Requisitos de BFCL.130 que esta funcion NO evalua.
   *
   * Se declaran siempre. Un informe que dice "cumples" callando que no ha
   * mirado si el curso fue en una ATO es un informe que miente por omision.
   */
  notModelled: string[]
}

const NO_MODELADO = [
  'BFCL.130 exige completar el curso en una ATO o una DTO. Esta app no lo comprueba.',
  'BFCL.130(a) exige el conocimiento teorico de BFCL.135(a), los nueve examenes. '
  + 'Esta app no lleva ese registro.',
]

/** Funciones que cuentan como instruccion dentro del curso de BFCL.130. */
const INSTRUCTION: PilotFunction[] = ['DUAL', 'PIC_SOLO_SUPERVISED']

function isInstruction(f: Flight): boolean {
  return INSTRUCTION.includes(f.pilotFunction)
}

/**
 * Por que este vuelo de instruccion no cuenta, o null si cuenta.
 *
 * Tres condiciones, las tres del reglamento:
 *
 * 1. BFCL.130(b): las 16 h son "in either hot-air balloons that represent
 *    group A of that class, or gas balloons". El credito para horas fuera del
 *    grupo A del Articulo 3c.1(b) era transitorio y expiro el 08/04/2021.
 * 2. AMC1 BFCL.050(b)(2): el tiempo de instruccion se anota "if certified by
 *    the appropriately rated or authorised instructor". Y AMC1
 *    BFCL.160(a)(1)(ii)(c) explica por que importa: si el instructor considera
 *    que el alumno no estuvo a la altura "they should not sign the logbook".
 *    Un vuelo sin firmar es el vuelo que el instructor no dio por bueno.
 * 3. BFCL.130(b)(3): "one SUPERVISED solo flight". Sin supervisor identificado
 *    no es un vuelo solo supervisado.
 */
function exclusionReason(f: Flight, doc: LogbookDoc, asOf: IsoDate): ExclusionReason | null {
  if (f.date > asOf) return 'flight_in_future'
  const b: Balloon | undefined = doc.balloons.find(x => x.id === f.balloonId)
  if (!b) return 'balloon_unknown'
  // Solo aire caliente de grupo A y gas. Las otras dos clases de BFCL.010, la
  // mixta y el dirigible de aire caliente, no aparecen en BFCL.130(b).
  if (b.balloonClass === 'hot_air') {
    if (!(b.envelopeVolumeM3 > 0)) return 'balloon_not_eligible'
    if (groupFromVolume(b.envelopeVolumeM3) !== 'A') return 'balloon_not_eligible'
  } else if (b.balloonClass !== 'gas') {
    return 'balloon_not_eligible'
  }
  if (f.signatureStatus !== 'signed') return 'not_signed'
  if (f.pilotFunction === 'PIC_SOLO_SUPERVISED' && f.instructorId === null) {
    return 'solo_without_supervisor'
  }
  // Todo vuelo de instruccion, doble mando incluido, necesita un instructor de
  // carne y hueso que no sea el propio alumno. AMC1 BFCL.050(b)(2): el tiempo
  // de instruccion se anota "if certified by the appropriately rated or
  // authorised instructor from whom it was received". Y BFCL.130(b)(3) pide un
  // vuelo SUPERVISADO, que sin supervisor no lo es.
  if (!hasRoleAndIsNotThePilot(doc, f.instructorId, 'instructor')) {
    return 'instructor_unknown'
  }
  return null
}

function build(
  key: string,
  label: string,
  required: number,
  unit: RequirementUnit,
  candidatos: Flight[],
  value: (f: Flight) => number,
): Requirement {
  const current = candidatos.reduce((sum, f) => sum + value(f), 0)
  return {
    key,
    label,
    current,
    required,
    unit,
    met: current >= required,
    // Sobre TODOS los candidatos, no solo los que aportan un valor positivo.
    // Un vuelo con las horas incoherentes aporta 0, y si se filtrara antes de
    // esta linea desapareceria del contador sin dejar ninguna señal.
    partial: candidatos.some(f => !f.complete || !hasConsistentTimes(f)),
  }
}

/**
 * Progreso hacia los requisitos de experiencia del BPL.
 * Fuente: BFCL.130(b), Reglamento (UE) 2020/357.
 *
 * "Instruccion" agrupa el doble mando y el vuelo solo supervisado, porque
 * ambos forman parte del curso.
 *
 * "20 despegues y aterrizajes" se interpreta como 20 de cada uno. Es la
 * lectura conservadora: en globo todo vuelo libre tiene un despegue y un
 * aterrizaje, asi que la otra lectura daria 10 vuelos, la mitad.
 */
export function bplProgress(doc: LogbookDoc, asOf: IsoDate): BplProgress {
  const excluded: ExcludedFlight[] = []
  const instruccion: Flight[] = []

  for (const f of doc.flights) {
    if (!isInstruction(f)) continue
    const reason = exclusionReason(f, doc, asOf)
    if (reason) excluded.push({ flightId: f.id, reason })
    else instruccion.push(f)
  }

  const solos = instruccion.filter(f => f.pilotFunction === 'PIC_SOLO_SUPERVISED')

  const requirements: Requirement[] = [
    build('instructionMinutes', 'Instruccion de vuelo', 16 * 60, 'minutes',
      instruccion, flightDurationMin),
    build('dualMinutes', 'De ellas, doble mando', 12 * 60, 'minutes',
      instruccion.filter(f => f.pilotFunction === 'DUAL'), flightDurationMin),
    build('inflations', 'Inflados', 10, 'count',
      instruccion, f => f.inflations),
    build('takeoffs', 'Despegues', 20, 'count',
      instruccion, f => f.takeoffs),
    build('landings', 'Aterrizajes', 20, 'count',
      instruccion, f => f.landings),
    build('soloFlight', 'Vuelo solo supervisado de 30 min', 1, 'count',
      solos, f => (flightDurationMin(f) >= 30 ? 1 : 0)),
  ]

  return {
    requirements,
    allMet: requirements.every(r => r.met),
    excluded,
    notModelled: [...NO_MODELADO],
  }
}
