// src/domain/types.ts
// Los tipos del documento del logbook. Sin lógica.
// Campos reglamentarios trazados a AMC1 BFCL.050(a)(2).

/** Marca de tiempo ISO 8601 con zona, por ejemplo "2026-08-31T05:12:00Z". */
export type Iso = string
/** Fecha local sin hora, "YYYY-MM-DD". */
export type IsoDate = string
export type Uuid = string

/**
 * Las cuatro clases de BFCL.010. Solo las dos primeras sirven para el curso de
 * BFCL.130(b), que habla de "hot-air balloons that represent group A of that
 * class, or gas balloons".
 */
export type BalloonClass = 'hot_air' | 'gas' | 'mixed' | 'hot_air_airship'
export type BalloonGroup = 'A' | 'B' | 'C' | 'D'

export interface Pilot {
  name: string
  /** AMC1 BFCL.050(a)(1) exige la dirección del piloto. */
  address: string
  licenceNumber: string | null
  /** Caducidad del reconocimiento médico. */
  medicalExpiry: IsoDate | null
  /** null mientras se es alumno. Activa el panel de vigencia cuando deja de serlo. */
  licenceIssued: IsoDate | null
}

export interface Balloon {
  id: Uuid
  registration: string
  manufacturer: string
  model: string
  balloonClass: BalloonClass
  /** El grupo A a D se deriva de aquí, nunca se guarda. Ver domain/balloon.ts */
  envelopeVolumeM3: number
}

export type PermitStatus = 'unknown' | 'granted' | 'denied' | 'not_needed'

export interface Site {
  id: Uuid
  name: string
  lat: number
  lon: number
  elevationM: number | null
  permitStatus: PermitStatus
  accessNotes: string
}

export type PersonRole = 'instructor' | 'examiner' | 'pilot' | 'crew' | 'passenger'

export interface Person {
  id: Uuid
  name: string
  roles: PersonRole[]
  licenceNumber: string | null
}

/**
 * Función del piloto en el vuelo.
 * PIC_SOLO_SUPERVISED es el vuelo solo bajo supervisión de un FI(B), que
 * BFCL.130(b)(3) exige y que AMC1 BFCL.050(b)(1)(ii) permite anotar como PIC.
 */
export type PilotFunction = 'PIC' | 'PIC_SOLO_SUPERVISED' | 'DUAL' | 'FI_B' | 'FE_B'

export type SignatureStatus = 'not_required' | 'pending' | 'signed'

export type CheckType = 'skill_test' | 'proficiency_check'
export type CheckResult = 'passed' | 'failed'

/**
 * Vuelo de verificacion.
 *
 * BFCL.160(a)(2) permite que una verificacion de competencia en los ultimos 24
 * meses sustituya a todos los demas contadores de vigencia, pero BFCL.160(c)
 * la define como "shall PASS a proficiency check with an FE(B) in a balloon
 * that represents the relevant class". Las tres condiciones importan, asi que
 * las tres se anotan.
 *
 * Es un objeto unico y no tres campos sueltos en Flight, para que no se pueda
 * representar un estado ilegal: ni examinador sin verificacion, ni resultado
 * sin tipo.
 */
export interface CheckRecord {
  type: CheckType
  /** El FE(B) que la paso. Referencia a Person. */
  examinerId: Uuid
  result: CheckResult
}

export interface Coords {
  lat: number
  lon: number
}

/**
 * Punto de despegue o de aterrizaje.
 * En globo se aterriza donde se puede, por eso `coords` puede llevar un punto
 * suelto que no está en el catálogo de sitios.
 */
export interface EndPoint {
  siteId: Uuid | null
  coords: Coords | null
  timestamp: Iso
}

export interface Flight {
  id: Uuid
  /** Fecha local del vuelo. Se guarda aparte de los timestamps para agrupar sin líos de zona. */
  date: IsoDate
  picId: Uuid
  balloonId: Uuid
  departure: EndPoint
  arrival: EndPoint
  /** Si es null, la duración se calcula de los dos timestamps. Ver domain/flight.ts */
  durationOverrideMin: number | null
  pilotFunction: PilotFunction
  dayNight: 'day' | 'night'
  tether: 'free' | 'tethered'
  inflations: number
  takeoffs: number
  landings: number
  /** BFCL.160(e) exige firma del FI(B) en dobles mando y supervisados. */
  instructorId: Uuid | null
  signatureStatus: SignatureStatus
  check: CheckRecord | null
  /**
   * Este vuelo de doble mando cumple AMC1 BFCL.160(a)(1)(ii)(a): sigue el
   * contenido del examen practico y se hace uno a uno entre un piloto y un
   * instructor, sin otro piloto a bordo que se acredite el vuelo.
   *
   * No es inferible de los demas datos, es un juicio del instructor, asi que
   * se marca a mano. Sin el, cualquier doble mando servia para la vigencia de
   * 48 meses, que era un falso positivo.
   */
  recencyTrainingFlight: boolean
  crewIds: Uuid[]
  passengerIds: Uuid[]
  /** Meteo que hubo de verdad, para contrastar con la pronosticada. */
  observedWeather: string
  maxAltitudeM: number | null
  distanceKm: number | null
  notes: string
  /** Identificador del fichero tracks/<id>.json si existe. Fuera del documento. */
  trackRef: string | null
  /** false cuando se ha usado el cierre rápido y faltan campos. */
  complete: boolean
}

export interface LogbookDoc {
  schemaVersion: number
  pilot: Pilot
  balloons: Balloon[]
  sites: Site[]
  people: Person[]
  flights: Flight[]
}
