// src/domain/fixtures.ts
// Constructores para pruebas. No se importa desde la interfaz.
import type { Flight, LogbookDoc, Pilot, PilotFunction } from './types'

export function makePilot(over: Partial<Pilot> = {}): Pilot {
  return {
    name: 'Piloto de prueba',
    address: 'Calle Falsa 123',
    licenceNumber: null,
    medicalExpiry: null,
    licenceIssued: null,
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
    signatureStatus: 'pending',
    checkType: 'none',
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

export function makeDoc(over: Partial<LogbookDoc> = {}): LogbookDoc {
  return {
    schemaVersion: 1,
    pilot: makePilot(),
    balloons: [],
    sites: [],
    people: [],
    flights: [],
    ...over,
  }
}
