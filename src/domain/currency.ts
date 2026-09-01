import { groupFromVolume } from './balloon'
import { addDays, addMonths, endOfMonth } from './dates'
import { flightDurationMin, hasConsistentTimes } from './flight'
import { hasRoleAndIsNotThePilot } from './people'
import type {
  Balloon, BalloonClass, BalloonGroup, Flight, IsoDate, LogbookDoc, Uuid,
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

export type CurrencyExclusionReason = 'flight_in_future' | 'balloon_unknown'

export interface ExcludedFlight {
  flightId: Uuid
  reason: CurrencyExclusionReason
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
  /** La vigencia la sostiene una verificacion de competencia y no los contadores. */
  viaProficiencyCheck: boolean
  items: CurrencyItem[]
  met: boolean
  /** La mas temprana de las caducidades. null si algo ya no se cumple. */
  currentUntil: IsoDate | null
  /**
   * BFCL.160(d): grupo maximo de globo de aire caliente en el que se pueden
   * ejercer las atribuciones.
   *
   * null significa "no hay atribucion de grupo que dar": porque la clase no es
   * aire caliente, porque la vigencia no se cumple, o porque el globo que
   * fijaria el grupo tiene un volumen invalido. En los dos ultimos casos hay
   * un aviso en `warnings` que lo explica.
   */
  maxGroup: BalloonGroup | null
  /**
   * Vuelos descartados por un PROBLEMA del dato: fecha futura o globo que no
   * esta en el catalogo.
   *
   * Los vuelos de otra clase de globo no salen aqui: no son un problema, es
   * que la pregunta era por otra clase.
   */
  excluded: ExcludedFlight[]
  /** Problemas concretos de ESTE documento. */
  warnings: string[]
  /** Requisitos del reglamento que esta funcion NO evalua nunca. */
  notModelled: string[]
}

const NO_MODELADO = [
  'BFCL.160(b) exige 3 h en cada clase adicional de globo en los ultimos 24 meses. '
  + 'Esta app no lo comprueba.',
  'BFCL.160(f) da equivalencias para quien tiene el habilitamiento comercial de '
  + 'BFCL.215. Esta app no modela ese habilitamiento.',
  'BFCL.160(d)(ii), el grupo A por defecto cuando el vuelo de instruccion se hizo en '
  + 'otra clase de globo, no esta implementado.',
  'BFCL.200(d) exige, con habilitacion de vuelo cautivo, al menos un vuelo cautivo en '
  + 'los ultimos 48 meses. Esta app no lleva ese contador.',
  'BFCL.210(a) exige habilitacion de noche para volar de noche en VFR. Esta app no '
  + 'modela las habilitaciones.',
  'BFCL.045 exige llevar a bordo licencia y certificado medico validos. Esta app solo '
  + 'avisa si la fecha del medico ya paso.',
]

/** Orden de los grupos por tamaño de envolvente, para poder quedarse con el mayor. */
const GROUP_ORDER: Record<BalloonGroup, number> = { A: 0, B: 1, C: 2, D: 3 }

function balloonOf(f: Flight, balloons: Balloon[]): Balloon | null {
  return balloons.find(b => b.id === f.balloonId) ?? null
}

/**
 * El tiempo de este vuelo se anota como PIC.
 * Fuente: AMC1 BFCL.050(b)(1).
 *
 * Se decide por la FUNCION primero, no por el examen. Un FE(B) anota como PIC
 * "all flight time during which they acts as an examiner", apartado (iv), sin
 * que dependa de si el candidato aprobo. Igual el FI(B) por (iii) y el PIC por
 * (i). Solo el doble mando necesita un examen superado, por (ii): "flight time
 * of successfully completed skill tests and proficiency checks".
 *
 * El doble mando a secas NO cuenta: la coletilla de BFCL.160(a)(1)(i) "as PIC
 * or flying dual or solo under the supervision of an FI(B)" modifica a los 10
 * despegues y aterrizajes, no a las 6 horas.
 */
function countsAsPic(f: Flight, doc: LogbookDoc): boolean {
  switch (f.pilotFunction) {
    case 'FI_B':
    case 'FE_B':
      // Instruye o examina: el examen no es suyo, asi que su resultado no le
      // quita horas. Apartados (iii) y (iv), que no condicionan al resultado.
      return true
    case 'PIC':
      // Si el vuelo lleva examen, el titular es el candidato, y (ii) solo
      // permite anotar los "successfully completed".
      return f.check === null || f.check.result === 'passed'
    case 'PIC_SOLO_SUPERVISED':
      return f.signatureStatus === 'signed'
        && hasRoleAndIsNotThePilot(doc, f.instructorId, 'instructor')
        && (f.check === null || f.check.result === 'passed')
    case 'DUAL':
      return f.check !== null && f.check.result === 'passed'
  }
}

/**
 * El vuelo aporta despegues y aterrizajes a BFCL.160(a)(1)(i).
 *
 * El texto los admite "as PIC or flying dual or solo under the supervision of
 * an FI(B)", asi que el doble mando SI vale. Pero BFCL.160(e) exige que los
 * dobles mando y los vuelos bajo supervision esten "entered in the logbook of
 * the pilot and signed by the responsible FI(B)", asi que sin firma y sin
 * instructor real no cuentan.
 */
function countsForTakeoffs(f: Flight, doc: LogbookDoc): boolean {
  switch (f.pilotFunction) {
    case 'PIC':
    case 'FI_B':
    case 'FE_B':
      return true
    case 'DUAL':
    case 'PIC_SOLO_SUPERVISED':
      return f.signatureStatus === 'signed'
        && hasRoleAndIsNotThePilot(doc, f.instructorId, 'instructor')
  }
}

/**
 * Verificacion de competencia valida para BFCL.160(a)(2).
 * BFCL.160(c): "shall PASS a proficiency check with an FE(B) in a balloon that
 * represents the relevant class".
 *
 * La clase NO se comprueba aqui: quien llama ya trabaja sobre vuelos filtrados
 * por clase. Comprobarla otra vez seria codigo muerto, y codigo muerto que
 * ademas hace creer que hay una prueba cubriendola.
 */
function isValidCheck(f: Flight, doc: LogbookDoc): boolean {
  if (f.check === null) return false
  if (f.check.type !== 'proficiency_check') return false
  if (f.check.result !== 'passed') return false
  return hasRoleAndIsNotThePilot(doc, f.check.examinerId, 'examiner')
}

/**
 * Vuelo de instruccion valido para BFCL.160(a)(1)(ii).
 * AMC1 BFCL.160(a)(1)(ii)(a) exige que siga el contenido del examen practico y
 * se haga uno a uno con un solo instructor. Eso no es inferible, lo marca el
 * piloto en `recencyTrainingFlight`. BFCL.160(e) exige ademas la firma.
 */
function isRecencyTrainingFlight(f: Flight, doc: LogbookDoc): boolean {
  return f.pilotFunction === 'DUAL'
    && f.recencyTrainingFlight
    && f.signatureStatus === 'signed'
    && hasRoleAndIsNotThePilot(doc, f.instructorId, 'instructor')
}

/**
 * Ultimo dia en que un vuelo sigue dentro de la ventana de 24 meses.
 *
 * No basta con sumar 24 meses y restar un dia. `addMonths` recorta el dia
 * cuando el mes destino es mas corto, y ese recorte no es invertible: un vuelo
 * del 29/02/2024 mas 24 meses da 28/02/2026, y restarle un dia dejaria la
 * caducidad ANTES del ultimo dia en que el vuelo aun cuenta. Asi que se
 * comprueba: si el vuelo sigue dentro de la ventana el propio dia candidato,
 * ese es el ultimo dia.
 */
function expiry24(f: Flight): IsoDate {
  const cand = addMonths(f.date, 24)
  return f.date > addMonths(cand, -24) ? cand : addDays(cand, -1)
}

/**
 * Ultimo dia en que un vuelo de instruccion sigue dentro de la ventana de 48
 * meses.
 *
 * AMC1 BFCL.160(a)(1)(ii)(e): "The 48-month period should be counted from the
 * last day of the month in which the preceding training flight took place."
 * El borde final es exclusivo, igual que el de 24 meses, por coherencia.
 */
function expiry48(f: Flight): IsoDate {
  return addDays(addMonths(endOfMonth(f.date), 48), -1)
}

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
  const excluded: ExcludedFlight[] = []
  const warnings: string[] = []

  const enClase: Flight[] = []
  for (const f of doc.flights) {
    if (f.date > asOf) { excluded.push({ flightId: f.id, reason: 'flight_in_future' }); continue }
    const b = balloonOf(f, doc.balloons)
    if (b === null) { excluded.push({ flightId: f.id, reason: 'balloon_unknown' }); continue }
    if (b.balloonClass === forClass) enClase.push(f)
  }

  // Borde de la ventana EXCLUSIVO. El reglamento dice "within the last 24
  // months" y no resuelve el dia exacto. Ante la duda, la opcion que nunca
  // dice "puedes volar" de mas. Cuesta un dia.
  const desde24 = addMonths(asOf, -24)
  const en24 = enClase.filter(f => f.date > desde24)

  const trainingFlights = enClase.filter(
    f => isRecencyTrainingFlight(f, doc) && expiry48(f) >= asOf,
  )
  const checks = en24.filter(f => isValidCheck(f, doc))

  const items: CurrencyItem[] = [
    buildItem('picMinutes', '6 h como PIC en 24 meses', 6 * 60, 'minutes',
      en24.filter(f => countsAsPic(f, doc)), flightDurationMin, expiry24),
    buildItem('takeoffs', '10 despegues en 24 meses', 10, 'count',
      en24.filter(f => countsForTakeoffs(f, doc)), f => f.takeoffs, expiry24),
    buildItem('landings', '10 aterrizajes en 24 meses', 10, 'count',
      en24.filter(f => countsForTakeoffs(f, doc)), f => f.landings, expiry24),
    buildItem('trainingFlight', 'Vuelo de instruccion con FI(B) en 48 meses', 1, 'count',
      trainingFlights, () => 1, expiry48),
  ]

  // BFCL.160(a) ofrece DOS VIAS ALTERNATIVAS, no una principal y una de
  // rescate: "(1) either: (i) ... and (ii) ...; OR (2) ... a proficiency
  // check". El apartado (c) solo define que es esa verificacion y cuando es
  // obligatoria; no convierte a (a)(2) en subsidiaria.
  //
  // Consecuencia: quien cumple las dos esta cubierto por la que dure mas.
  // Tratarlas como excluyentes hacia que el informe se contradijera consigo
  // mismo, anunciando una caducidad y siguiendo en verde al dia siguiente.
  const metViaA1 = items.every(i => i.met)
  const metViaA2 = checks.length > 0
  const viaProficiencyCheck = metViaA2
  const met = metViaA1 || metViaA2

  const ultimoCheck = mostRecent(checks)
  const ultimoTraining = mostRecent(trainingFlights)

  // BFCL.160(d): el grupo lo fija el vuelo de instruccion de (a)(1)(ii) o la
  // verificacion de (c). Si las dos vias estan cumplidas, valen las dos, y
  // manda la mayor: GM1 BFCL.015(c) dice que las atribuciones del grupo mayor
  // "can be exercised once the recency requirements are complied with in that
  // bigger group".
  let maxGroup: BalloonGroup | null = null
  if (forClass === 'hot_air' && met) {
    const fuentes: (Flight | null)[] = []
    if (metViaA1) fuentes.push(ultimoTraining)
    if (metViaA2) fuentes.push(ultimoCheck)
    let sinGrupo = false
    for (const f of fuentes) {
      if (f === null) continue
      const g = groupOfFlight(f, doc.balloons)
      if (g === null) { sinGrupo = true; continue }
      if (maxGroup === null || GROUP_ORDER[g] > GROUP_ORDER[maxGroup]) maxGroup = g
    }
    if (sinGrupo) {
      warnings.push(
        'No se puede determinar el grupo maximo de BFCL.160(d): el globo del vuelo que lo '
        + 'fija no tiene un volumen de envolvente valido.',
      )
      maxGroup = null
    }
  }

  if (doc.pilot.medicalExpiry !== null && doc.pilot.medicalExpiry < asOf) {
    warnings.push(
      `El reconocimiento medico caduco el ${doc.pilot.medicalExpiry}. BFCL.045(a)(2) exige `
      + 'llevar un certificado medico valido para ejercer las atribuciones.',
    )
  }

  const clases = new Set(
    globosVolados(doc, asOf).map(b => b.balloonClass),
  )
  if (clases.size > 1) {
    warnings.push(
      'Hay vuelos de mas de una clase de globo. Revisa a mano BFCL.160(b), las 3 h por '
      + 'clase adicional.',
    )
  }

  // La caducidad de cada via, y se queda la mas tardia de las cumplidas.
  const caducidades: IsoDate[] = []
  if (metViaA1) {
    const fechas = items.map(i => i.expiresOn).filter((d): d is IsoDate => d !== null).sort()
    if (fechas.length === items.length) caducidades.push(fechas[0])
  }
  if (metViaA2 && ultimoCheck !== null) caducidades.push(expiry24(ultimoCheck))
  caducidades.sort()
  const currentUntil = caducidades.length > 0 ? caducidades[caducidades.length - 1] : null

  return {
    applicable, balloonClass: forClass, viaProficiencyCheck, items, met,
    currentUntil, maxGroup, excluded, warnings, notModelled: [...NO_MODELADO],
  }
}

/**
 * Los globos realmente volados hasta `asOf`.
 *
 * Los del catalogo que no se han volado nunca no cuentan, y los vuelos con
 * fecha futura tampoco: si se excluyen del informe, no pueden a la vez
 * disparar un aviso.
 */
function globosVolados(doc: LogbookDoc, asOf: IsoDate): Balloon[] {
  const ids = new Set(doc.flights.filter(f => f.date <= asOf).map(f => f.balloonId))
  return doc.balloons.filter(b => ids.has(b.id))
}

function mostRecent(flights: Flight[]): Flight | null {
  if (flights.length === 0) return null
  return [...flights].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
}

/**
 * Grupo del globo de un vuelo concreto.
 *
 * Devuelve null ante un volumen invalido. Quien llama NO debe caer entonces a
 * un vuelo mas antiguo: saltarse el dato malo puede acabar concediendo un
 * grupo MAYOR del que corresponde, que es el error caro.
 */
function groupOfFlight(f: Flight, balloons: Balloon[]): BalloonGroup | null {
  const b = balloonOf(f, balloons)
  if (!b || b.balloonClass !== 'hot_air' || !(b.envelopeVolumeM3 > 0)) return null
  return groupFromVolume(b.envelopeVolumeM3)
}
