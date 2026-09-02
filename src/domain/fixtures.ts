// src/domain/fixtures.ts
// Constructores para pruebas. No se importa desde la interfaz.
import { CURRENT_SCHEMA_VERSION } from './schema'
import type { Balloon, Flight, LogbookDoc, Person, Pilot, PilotFunction } from './types'

export function makePilot(over: Partial<Pilot> = {}): Pilot {
  return {
    personId: 'p1',
    name: 'Piloto de prueba',
    address: 'Calle Falsa 123',
    licenceNumber: null,
    medicalExpiry: null,
    licenceIssued: null,
      personalWindLimitKt: null,
    ...over,
  }
}

let counter = 0

/**
 * Vuelo de prueba. Por defecto: doble mando, 90 minutos, un inflado,
 * un despegue y un aterrizaje, completo.
 */
export function makeFlight(over: Partial<Flight> = {}): Flight {
  counter += 1
  return {
    id: `f${counter}`,
    date: '2026-08-31',
    picId: 'p1',
    balloonId: 'b1',
    departure: { siteId: 's1', coords: null, timestamp: '2026-08-31T05:00:00Z' },
    arrival: { siteId: 's1', coords: null, timestamp: '2026-08-31T06:30:00Z' },
    durationOverrideMin: null,
    pilotFunction: 'DUAL',
    dayNight: 'day',
    tether: 'free',
    inflations: 1,
    takeoffs: 1,
    landings: 1,
    instructorId: 'p2',
    signatureStatus: 'signed',
    check: null,
    recencyTrainingFlight: false,
    crewIds: [],
    passengerIds: [],
    observedWeather: '',
    maxAltitudeM: null,
    distanceKm: null,
    notes: '',
    trackRef: null,
    complete: true,
    ...over,
  }
}

/**
 * Atajo para generar n vuelos identicos de una funcion y duracion dadas,
 * todos en la misma fecha.
 */
export function makeFlights(
  n: number,
  opts: { date: string; pilotFunction: PilotFunction; durationMin: number } & Partial<Flight>,
): Flight[] {
  const { date, pilotFunction, durationMin, ...rest } = opts
  return Array.from({ length: n }, () =>
    makeFlight({ date, pilotFunction, durationOverrideMin: durationMin, ...rest }),
  )
}

/** Globo de aire caliente de grupo A por defecto, que es el que sirve para el BPL. */
export function makeBalloon(over: Partial<Balloon> = {}): Balloon {
  return {
    id: 'b1',
    registration: 'EC-PRU',
    manufacturer: 'Ultramagic',
    model: 'M-105',
    balloonClass: 'hot_air',
    envelopeVolumeM3: 2900,
    maxSurfaceWindKt: null,
    ...over,
  }
}

export function makePerson(over: Partial<Person> = {}): Person {
  return { id: 'p1', name: 'Persona de prueba', roles: ['pilot'], licenceNumber: null, ...over }
}

/**
 * Documento de prueba.
 *
 * Trae por defecto un globo de grupo A con id 'b1' y las personas 'p1' piloto,
 * 'p2' instructor y 'p3' examinadora, porque son los ids que usa makeFlight.
 * Sin ellos los contadores excluyen todos los vuelos por globo desconocido, y
 * las pruebas medirian otra cosa de la que dicen medir.
 */
export function makeDoc(over: Partial<LogbookDoc> = {}): LogbookDoc {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    pilot: makePilot(),
    balloons: [makeBalloon()],
    sites: [],
    people: [
      makePerson({ id: 'p1', name: 'Didac', roles: ['pilot'] }),
      makePerson({ id: 'p2', name: 'Instructor', roles: ['instructor'] }),
      makePerson({ id: 'p3', name: 'Examinadora', roles: ['examiner'] }),
    ],
    flights: [],
    ...over,
  }
}
