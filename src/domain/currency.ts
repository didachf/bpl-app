import { groupFromVolume } from './balloon'
import { addDays, addMonths, endOfMonth } from './dates'
import { flightDurationMin, hasConsistentTimes } from './flight'
import type {
  Balloon, BalloonClass, BalloonGroup, Flight, IsoDate, LogbookDoc,
} from './types'

export interface CurrencyItem {
  key: string
  label: string
  current: number
  required: number
  unit: 'minutes' | 'count'
  met: boolean
  /** Ultimo dia en que este contador se sigue cumpliendo. null si ya no se cumple. */
  expiresOn: IsoDate | null
  /** Cierto si algun vuelo candidato esta incompleto o tiene las horas incoherentes. */
  partial: boolean
}

export interface CurrencyReport {
  /**
   * false mientras el piloto no tenga licencia emitida.
   *
   * OJO: los demas campos se calculan igualmente. La interfaz debe mirar este
   * antes que `met`, porque a un alumno la vigencia no le aplica.
   */
  applicable: boolean
  /** La clase para la que se ha preguntado. BFCL.160(a): "in the relevant balloon class". */
  balloonClass: BalloonClass
  viaProficiencyCheck: boolean
  items: CurrencyItem[]
  met: boolean
  /** La mas temprana de las caducidades. null si algo ya no se cumple. */
  currentUntil: IsoDate | null
  /**
   * BFCL.160(d): grupo maximo de globo de aire caliente en el que se pueden
   * ejercer las atribuciones, que es el del vuelo de instruccion o el de la
   * verificacion. null en gas, y null si no hay ninguno de los dos.
   */
  maxGroup: BalloonGroup | null
  /** Requisitos del reglamento que esta funcion NO evalua. Nunca se callan. */
  warnings: string[]
}

function balloonOf(f: Flight, balloons: Balloon[]): Balloon | null {
  return balloons.find(b => b.id === f.balloonId) ?? null
}

/**
 * El tiempo de este vuelo se anota como PIC.
 * Fuente: AMC1 BFCL.050(b)(1).
 *
 * El doble mando NO esta en la lista, a proposito: la coletilla de
 * BFCL.160(a)(1)(i) "as PIC or flying dual or solo under the supervision of an
 * FI(B)" modifica a los 10 despegues y aterrizajes, no a las 6 horas.
 *
 * El solo supervisado solo cuenta si el instructor firmo la anotacion, que es
 * la condicion literal de AMC1 BFCL.050(b)(1)(ii).
 *
 * Un examen practico o una verificacion superados cuentan sea cual sea la
 * funcion anotada, por el mismo apartado: "flight time of successfully
 * completed skill tests and proficiency checks".
 */
function countsAsPic(f: Flight): boolean {
  if (f.check !== null) return f.check.result === 'passed'
  switch (f.pilotFunction) {
    case 'PIC':
    case 'FI_B':
    case 'FE_B':
      return true
    case 'PIC_SOLO_SUPERVISED':
      return f.signatureStatus === 'signed' && f.instructorId !== null
    default:
      return false
  }
}

/**
 * Verificacion de competencia valida para BFCL.160(a)(2).
 * BFCL.160(c) la define: "shall PASS a proficiency check with an FE(B) in a
 * balloon that represents the relevant class". Las tres condiciones cuentan.
 */
function isValidCheck(f: Flight, balloons: Balloon[], forClass: BalloonClass): boolean {
  if (f.check === null) return false
  if (f.check.type !== 'proficiency_check') return false
  if (f.check.result !== 'passed') return false
  if (f.check.examinerId.length === 0) return false
  return balloonOf(f, balloons)?.balloonClass === forClass
}

/**
 * Vuelo de instruccion valido para BFCL.160(a)(1)(ii).
 * AMC1 BFCL.160(a)(1)(ii)(a) exige que siga el contenido del examen practico y
 * se haga uno a uno con un solo instructor. Eso no es inferible, lo marca el
 * piloto en `recencyTrainingFlight`. BFCL.160(e) exige ademas la firma.
 */
function isRecencyTrainingFlight(f: Flight): boolean {
  return f.pilotFunction === 'DUAL'
    && f.recencyTrainingFlight
    && f.instructorId !== null
    && f.signatureStatus === 'signed'
}

/**
 * Ultimo dia en que el contador se sigue cumpliendo si no se vuela mas.
 *
 * Se recorren los vuelos de mas nuevo a mas viejo acumulando. El vuelo en el
 * que se alcanza el umbral es el mas antiguo que hace falta, asi que el
 * contador aguanta hasta la caducidad de ESE vuelo. Si nunca se alcanza,
 * devuelve null.
 */
function rollingExpiry(
  flights: Flight[],
  value: (f: Flight) => number,
  required: number,
  expiryOf: (f: Flight) => IsoDate,
): IsoDate | null {
  const ordenados = [...flights].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  let acc = 0
  for (const f of ordenados) {
    acc += value(f)
    if (acc >= required) return expiryOf(f)
  }
  return null
}

function buildItem(
  key: string,
  label: string,
  required: number,
  unit: 'minutes' | 'count',
  candidatos: Flight[],
  value: (f: Flight) => number,
  expiryOf: (f: Flight) => IsoDate,
): CurrencyItem {
  const current = candidatos.reduce((s, f) => s + value(f), 0)
  return {
    key,
    label,
    current,
    required,
    unit,
    met: current >= required,
    expiresOn: rollingExpiry(candidatos, value, required, expiryOf),
    partial: candidatos.some(f => !f.complete || !hasConsistentTimes(f)),
  }
}

/**
 * Vigencia del BPL para una clase de globo.
 * Fuente: BFCL.160, Reglamento (UE) 2020/357.
 *
 * `asOf` es la fecha de referencia "YYYY-MM-DD". Se pasa como parametro y no
 * se lee del reloj para que la funcion sea pura y comprobable.
 *
 * `forClass` es obligatorio porque BFCL.160(a) exige el cumplimiento "in the
 * relevant balloon class". No existe una vigencia global.
 */
export function currency(
  doc: LogbookDoc,
  asOf: IsoDate,
  forClass: BalloonClass,
): CurrencyReport {
  const applicable = doc.pilot.licenceIssued !== null

  const enClase = doc.flights.filter(
    f => f.date <= asOf && balloonOf(f, doc.balloons)?.balloonClass === forClass,
  )

  // Borde de la ventana EXCLUSIVO. El reglamento dice "within the last 24
  // months" y no resuelve el dia exacto. Ante la duda, la opcion que nunca
  // dice "puedes volar" de mas. Cuesta un dia.
  const desde24 = addMonths(asOf, -24)
  const en24 = enClase.filter(f => f.date > desde24)
  const expiry24 = (f: Flight) => addDays(addMonths(f.date, 24), -1)

  // AMC1 BFCL.160(a)(1)(ii)(e): "The 48-month period should be counted from the
  // last day of the month in which the preceding training flight took place."
  const expiry48 = (f: Flight) => addMonths(endOfMonth(f.date), 48)
  const trainingFlights = enClase.filter(
    f => isRecencyTrainingFlight(f) && expiry48(f) >= asOf,
  )

  const checks = en24.filter(f => isValidCheck(f, doc.balloons, forClass))
  const viaProficiencyCheck = checks.length > 0

  const items: CurrencyItem[] = [
    buildItem('picMinutes', '6 h como PIC en 24 meses', 6 * 60, 'minutes',
      en24.filter(countsAsPic), flightDurationMin, expiry24),
    buildItem('takeoffs', '10 despegues en 24 meses', 10, 'count',
      en24, f => f.takeoffs, expiry24),
    buildItem('landings', '10 aterrizajes en 24 meses', 10, 'count',
      en24, f => f.landings, expiry24),
    buildItem('trainingFlight', 'Vuelo de instruccion con FI(B) en 48 meses', 1, 'count',
      trainingFlights, () => 1, expiry48),
  ]

  // BFCL.160(d): el grupo lo fija el vuelo de instruccion o la verificacion,
  // el mas reciente de los que valen.
  const fijanGrupo = viaProficiencyCheck ? checks : trainingFlights
  const maxGroup = forClass === 'hot_air' ? groupOf(fijanGrupo, doc.balloons) : null

  const warnings: string[] = []
  const clases = new Set(
    doc.flights.map(f => balloonOf(f, doc.balloons)?.balloonClass).filter(c => c !== undefined),
  )
  if (clases.size > 1) {
    warnings.push(
      'Hay vuelos de mas de una clase de globo. BFCL.160(b), que exige 3 h en cada clase '
      + 'adicional en 24 meses, y BFCL.160(f), las equivalencias con el habilitamiento '
      + 'comercial, NO estan implementados. Comprobalos a mano.',
    )
  }

  if (viaProficiencyCheck) {
    const ultimo = [...checks].sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1)!
    return {
      applicable, balloonClass: forClass, viaProficiencyCheck, items,
      met: true, currentUntil: expiry24(ultimo), maxGroup, warnings,
    }
  }

  const met = items.every(i => i.met)
  const fechas = items.map(i => i.expiresOn).filter((d): d is IsoDate => d !== null)
  const currentUntil = met ? (fechas.sort()[0] ?? null) : null

  return {
    applicable, balloonClass: forClass, viaProficiencyCheck, items,
    met, currentUntil, maxGroup, warnings,
  }
}

/** Grupo del globo del vuelo mas reciente de la lista. */
function groupOf(flights: Flight[], balloons: Balloon[]): BalloonGroup | null {
  const ordenados = [...flights].sort((a, b) => (a.date < b.date ? 1 : -1))
  for (const f of ordenados) {
    const b = balloonOf(f, balloons)
    if (b && b.balloonClass === 'hot_air' && b.envelopeVolumeM3 > 0) {
      return groupFromVolume(b.envelopeVolumeM3)
    }
  }
  return null
}
