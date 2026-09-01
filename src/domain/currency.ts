// src/domain/currency.ts
import { addMonths } from './dates'
import { flightDurationMin } from './flight'
import type { Flight, IsoDate, LogbookDoc, PilotFunction } from './types'

export interface CurrencyItem {
  key: string
  label: string
  current: number
  required: number
  unit: 'minutes' | 'count'
  met: boolean
  /** Ultimo dia en que este contador se sigue cumpliendo. null si ya no se cumple. */
  expiresOn: IsoDate | null
}

export interface CurrencyReport {
  /** false mientras el piloto no tenga licencia emitida. */
  applicable: boolean
  /** true si una verificacion de competencia reciente sustituye a los contadores. */
  viaProficiencyCheck: boolean
  items: CurrencyItem[]
  met: boolean
  /** La mas temprana de las caducidades. null si algo ya no se cumple. */
  currentUntil: IsoDate | null
}

/**
 * Funciones que se anotan como PIC.
 * Fuente: AMC1 BFCL.050(b)(1). El doble mando no esta, a proposito.
 */
const AS_PIC: PilotFunction[] = ['PIC', 'PIC_SOLO_SUPERVISED', 'FI_B', 'FE_B']

/**
 * Ultimo dia en que el contador se sigue cumpliendo si no se vuela mas.
 *
 * Se recorren los vuelos de mas nuevo a mas viejo acumulando. El vuelo en el
 * que se alcanza el umbral es el mas antiguo que hace falta, asi que el
 * contador aguanta hasta `windowMonths` despues de la fecha de ese vuelo.
 * Si nunca se alcanza el umbral, devuelve null.
 */
function rollingExpiry(
  flights: Flight[],
  value: (f: Flight) => number,
  required: number,
  windowMonths: number,
): IsoDate | null {
  const ordenados = [...flights].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  let acc = 0
  for (const f of ordenados) {
    acc += value(f)
    if (acc >= required) return addMonths(f.date, windowMonths)
  }
  return null
}

function buildItem(
  key: string,
  label: string,
  required: number,
  unit: 'minutes' | 'count',
  windowMonths: number,
  candidatos: Flight[],
  value: (f: Flight) => number,
): CurrencyItem {
  const aportan = candidatos.filter(f => value(f) > 0)
  const current = aportan.reduce((s, f) => s + value(f), 0)
  return {
    key,
    label,
    current,
    required,
    unit,
    met: current >= required,
    expiresOn: rollingExpiry(aportan, value, required, windowMonths),
  }
}

/**
 * Vigencia del BPL.
 * Fuente: BFCL.160(a), Reglamento (UE) 2020/357.
 *
 * `asOf` es la fecha de referencia en formato "YYYY-MM-DD". Se pasa como
 * parametro y no se lee del reloj para que la funcion sea pura y comprobable.
 */
export function currency(doc: LogbookDoc, asOf: IsoDate): CurrencyReport {
  const applicable = doc.pilot.licenceIssued !== null

  const desde24 = addMonths(asOf, -24)
  const desde48 = addMonths(asOf, -48)
  const en24 = doc.flights.filter(f => f.date >= desde24 && f.date <= asOf)
  const en48 = doc.flights.filter(f => f.date >= desde48 && f.date <= asOf)

  // BFCL.160(a)(2): una verificacion de competencia sustituye a todo.
  const checks = en24.filter(f => f.checkType === 'proficiency_check')
  const viaProficiencyCheck = checks.length > 0
  const fechasCheck = checks.map(f => f.date).sort()
  const checkExpiry = fechasCheck.length > 0
    ? addMonths(fechasCheck[fechasCheck.length - 1], 24)
    : null

  const items: CurrencyItem[] = [
    buildItem('picMinutes', '6 h como PIC en 24 meses', 6 * 60, 'minutes', 24,
      en24.filter(f => AS_PIC.includes(f.pilotFunction)), flightDurationMin),
    buildItem('takeoffs', '10 despegues en 24 meses', 10, 'count', 24,
      en24, f => f.takeoffs),
    buildItem('landings', '10 aterrizajes en 24 meses', 10, 'count', 24,
      en24, f => f.landings),
    buildItem('trainingFlight', 'Vuelo de instruccion con FI(B) en 48 meses', 1, 'count', 48,
      en48.filter(f => f.pilotFunction === 'DUAL' && f.instructorId !== null), () => 1),
  ]

  if (viaProficiencyCheck) {
    return { applicable, viaProficiencyCheck, items, met: true, currentUntil: checkExpiry }
  }

  const met = items.every(i => i.met)
  const fechas = items.map(i => i.expiresOn)
  const currentUntil = met ? (fechas.filter((d): d is IsoDate => d !== null).sort()[0] ?? null) : null

  return { applicable, viaProficiencyCheck, items, met, currentUntil }
}
