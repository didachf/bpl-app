// src/domain/flight.test.ts
import { describe, it, expect } from 'vitest'
import { flightDurationMin } from './flight'
import type { Flight } from './types'

function flight(partial: Partial<Flight>): Flight {
  return {
    id: 'f1',
    date: '2026-08-31',
    picId: 'p1',
    balloonId: 'b1',
    departure: { siteId: 's1', coords: null, timestamp: '2026-08-31T05:00:00Z' },
    arrival: { siteId: null, coords: { lat: 41.7, lon: 1.1 }, timestamp: '2026-08-31T06:30:00Z' },
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
    ...partial,
  }
}

describe('flightDurationMin', () => {
  it('calcula la duracion de las dos marcas de tiempo', () => {
    expect(flightDurationMin(flight({}))).toBe(90)
  })

  it('respeta la anulacion manual cuando la hay', () => {
    expect(flightDurationMin(flight({ durationOverrideMin: 75 }))).toBe(75)
  })

  it('acepta una anulacion de cero minutos sin confundirla con ausencia', () => {
    expect(flightDurationMin(flight({ durationOverrideMin: 0 }))).toBe(0)
  })

  it('funciona con un vuelo que cruza medianoche', () => {
    const f = flight({
      departure: { siteId: 's1', coords: null, timestamp: '2026-08-31T22:30:00Z' },
      arrival: { siteId: 's1', coords: null, timestamp: '2026-09-01T00:15:00Z' },
    })
    expect(flightDurationMin(f)).toBe(105)
  })

  it('no se descuadra en el cambio de hora, porque opera en UTC', () => {
    // 25/10/2026 a las 03:00 CEST pasan a ser las 02:00 CET.
    // En hora local parecen 30 min, en tiempo real son 90.
    const f = flight({
      departure: { siteId: 's1', coords: null, timestamp: '2026-10-25T00:30:00Z' },
      arrival: { siteId: 's1', coords: null, timestamp: '2026-10-25T02:00:00Z' },
    })
    expect(flightDurationMin(f)).toBe(90)
  })

  it('devuelve 0 si la llegada es anterior a la salida, en lugar de un negativo', () => {
    const f = flight({
      arrival: { siteId: 's1', coords: null, timestamp: '2026-08-31T04:00:00Z' },
    })
    expect(flightDurationMin(f)).toBe(0)
  })
})
