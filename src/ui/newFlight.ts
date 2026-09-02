// src/ui/newFlight.ts
// Como nace un vuelo desde el cierre rapido.
//
// La regla es no inventar nada. Lo que el cierre rapido no pregunta se queda
// vacio o a cero, y `missingFields` lo reclama despues. Lo unico que se hereda
// es lo que sale del historial del propio piloto, y la pantalla lo enseña
// escrito para que no quede supuesto en silencio.
import { sortedFlights } from './select'
import type { Coords, Flight, LogbookDoc, PilotFunction, Uuid } from '../domain/types'

/**
 * Fecha local y "HH:MM" locales a marca ISO con zona.
 *
 * El piloto teclea la hora del reloj que lleva puesto. Construir la fecha con
 * los componentes locales y dejar que `toISOString` la pase a UTC es la unica
 * forma de que un vuelo del cambio de hora no se desplace una hora.
 *
 * Sin hora devuelve cadena vacia, que es lo que `flightDurationMin` y
 * `hasConsistentTimes` ya tratan como dato ausente.
 */
export function localTimestamp(date: string, hhmm: string): string {
  if (hhmm === '' || date === '') return ''
  const [a, m, d] = date.split('-').map(Number)
  const [h, min] = hhmm.split(':').map(Number)
  if ([a, m, d, h, min].some(n => !Number.isFinite(n))) return ''
  return new Date(a, m - 1, d, h, min, 0, 0).toISOString()
}

export interface Heredado {
  picId: Uuid
  balloonId: Uuid
  pilotFunction: PilotFunction
  instructorId: Uuid | null
}

/**
 * Lo que se copia del vuelo mas reciente.
 *
 * Sin vuelos previos no se hereda globo: dejarlo vacio hace que
 * `missingFields` lo reclame, mientras que elegir "el unico globo del
 * catalogo" seria adivinar, y el dia que haya dos globos la adivinanza pasaria
 * a ser silenciosamente falsa.
 */
export function heredado(doc: LogbookDoc): Heredado {
  const ultimo = sortedFlights(doc.flights)[0]
  if (ultimo === undefined) {
    return {
      picId: doc.pilot.personId ?? '',
      balloonId: '',
      pilotFunction: 'DUAL',
      instructorId: null,
    }
  }
  return {
    picId: doc.pilot.personId ?? ultimo.picId,
    balloonId: ultimo.balloonId,
    pilotFunction: ultimo.pilotFunction,
    instructorId: ultimo.instructorId,
  }
}

export interface CierreRapido {
  date: string
  landingTime: string
  coords: Coords | null
  siteId: Uuid | null
  landings: number
  notes: string
}

/**
 * El vuelo que produce el cierre rapido.
 *
 * `complete: false` y sin hora de despegue a proposito. La consecuencia es que
 * aporta 0 minutos al acumulado y lo marca como parcial, que es exactamente lo
 * que el dominio decidio hacer con un dato ausente: no restar horas, pero
 * tampoco desaparecer en silencio.
 */
export function flightFromQuickClose(
  doc: LogbookDoc, id: Uuid, e: CierreRapido,
): Flight {
  const h = heredado(doc)
  const necesitaFirma = h.pilotFunction === 'DUAL' || h.pilotFunction === 'PIC_SOLO_SUPERVISED'
  return {
    id,
    date: e.date,
    picId: h.picId,
    balloonId: h.balloonId,
    departure: { siteId: null, coords: null, timestamp: '' },
    arrival: {
      siteId: e.siteId,
      coords: e.siteId === null ? e.coords : null,
      timestamp: localTimestamp(e.date, e.landingTime),
    },
    durationOverrideMin: null,
    pilotFunction: h.pilotFunction,
    dayNight: 'day',
    tether: 'free',
    inflations: 0,
    takeoffs: 0,
    landings: e.landings,
    instructorId: h.instructorId,
    // BFCL.160(e) exige firma del FI(B) en dobles mando y supervisados, asi que
    // nacen pendientes. Los demas no tienen firma que pedir.
    signatureStatus: necesitaFirma ? 'pending' : 'not_required',
    // Ni la verificacion de competencia ni la marca de vuelo de instruccion se
    // deducen: son un juicio de otra persona. Nacen en el estado que no
    // concede nada.
    check: null,
    recencyTrainingFlight: false,
    crewIds: [],
    passengerIds: [],
    observedWeather: '',
    maxAltitudeM: null,
    distanceKm: null,
    notes: e.notes,
    trackRef: null,
    complete: false,
  }
}

/**
 * De marca ISO a "HH:MM" local, inverso de `localTimestamp`.
 *
 * Devuelve cadena vacia ante una marca ausente o ilegible, que es lo que un
 * `<input type="time">` entiende como vacio. `formatTime` no sirve aqui porque
 * devuelve "--:--", que el input rechazaria.
 */
export function hhmmFrom(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
