// src/domain/progress.ts
import { flightDurationMin } from './flight'
import type { Flight, LogbookDoc, PilotFunction } from './types'

export type RequirementUnit = 'minutes' | 'count'

export interface Requirement {
  key: string
  label: string
  current: number
  required: number
  unit: RequirementUnit
  met: boolean
  /** Cierto si algun vuelo que aporta a este contador esta marcado incompleto. */
  partial: boolean
}

export interface BplProgress {
  requirements: Requirement[]
  allMet: boolean
}

/** Funciones que cuentan como instruccion dentro del curso de BFCL.130. */
const INSTRUCTION: PilotFunction[] = ['DUAL', 'PIC_SOLO_SUPERVISED']

function isInstruction(f: Flight): boolean {
  return INSTRUCTION.includes(f.pilotFunction)
}

function build(
  key: string,
  label: string,
  required: number,
  unit: RequirementUnit,
  contributing: Flight[],
  value: (f: Flight) => number,
): Requirement {
  const aportan = contributing.filter(f => value(f) > 0)
  const current = aportan.reduce((sum, f) => sum + value(f), 0)
  return {
    key,
    label,
    current,
    required,
    unit,
    met: current >= required,
    partial: aportan.some(f => !f.complete),
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
 * lectura conservadora: equivocarse al otro lado significa presentarse sin
 * cumplir.
 */
export function bplProgress(doc: LogbookDoc): BplProgress {
  const instruccion = doc.flights.filter(isInstruction)
  const solos = doc.flights.filter(f => f.pilotFunction === 'PIC_SOLO_SUPERVISED')
  const soloValido = solos.filter(f => flightDurationMin(f) >= 30)

  const requirements: Requirement[] = [
    build('instructionMinutes', 'Instruccion de vuelo', 16 * 60, 'minutes',
      instruccion, flightDurationMin),
    build('dualMinutes', 'De ellas, doble mando', 12 * 60, 'minutes',
      doc.flights.filter(f => f.pilotFunction === 'DUAL'), flightDurationMin),
    build('inflations', 'Inflados', 10, 'count',
      instruccion, f => f.inflations),
    build('takeoffs', 'Despegues', 20, 'count',
      instruccion, f => f.takeoffs),
    build('landings', 'Aterrizajes', 20, 'count',
      instruccion, f => f.landings),
    build('soloFlight', 'Vuelo solo supervisado de 30 min', 1, 'count',
      soloValido, () => 1),
  ]

  return { requirements, allMet: requirements.every(r => r.met) }
}
