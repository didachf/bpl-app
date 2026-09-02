import { describe, it, expect } from 'vitest'
import { makeFlight, makePilot } from '../domain/fixtures'
import { flightDurationMin, hasConsistentTimes } from '../domain/flight'
import type { Balloon, LogbookDoc, Person, Site } from '../domain/types'
import { localTimestamp, heredado, flightFromQuickClose } from './newFlight'

const globo: Balloon = {
  id: 'b1', registration: 'EC-KMU', manufacturer: 'Ultramagic', model: 'M-105',
  balloonClass: 'hot_air', envelopeVolumeM3: 2900,
}
const yo: Person = { id: 'p1', name: 'Didac', roles: ['pilot'], licenceNumber: null }
const alberto: Person = { id: 'p2', name: 'Alberto', roles: ['instructor'], licenceNumber: null }
// El campo 's1' existe porque `makeFlight` lo usa por defecto en las dos puntas.
const campo: Site = {
  id: 's1', name: 'Agramunt', lat: 41.7869, lon: 1.0967, elevationM: 345,
  permitStatus: 'unknown', accessNotes: '',
}

function doc(over: Partial<LogbookDoc> = {}): LogbookDoc {
  return {
    schemaVersion: 1,
    pilot: makePilot({ personId: 'p1' }),
    balloons: [globo],
    sites: [campo],
    people: [yo, alberto],
    flights: [],
    ...over,
  }
}

describe('localTimestamp', () => {
  it('la hora tecleada es hora local, no UTC', () => {
    // 08:37 del 31 de agosto en Madrid son las 06:37 UTC.
    expect(localTimestamp('2026-08-31', '08:37')).toBe('2026-08-31T06:37:00.000Z')
  })

  it('sin hora devuelve cadena vacia, que es lo que el dominio trata como sin dato', () => {
    expect(localTimestamp('2026-08-31', '')).toBe('')
  })
})

describe('heredado', () => {
  it('sin vuelos previos, el piloto es el titular y no hay globo', () => {
    expect(heredado(doc())).toEqual({
      picId: 'p1', balloonId: '', pilotFunction: 'DUAL', instructorId: null,
    })
  })

  it('copia globo, funcion e instructor del vuelo mas reciente', () => {
    const d = doc({
      flights: [
        makeFlight({ date: '2026-08-17', balloonId: 'b9', pilotFunction: 'PIC', instructorId: null }),
        makeFlight({ date: '2026-08-31', balloonId: 'b1', pilotFunction: 'DUAL', instructorId: 'p2' }),
      ],
    })
    expect(heredado(d)).toEqual({
      picId: 'p1', balloonId: 'b1', pilotFunction: 'DUAL', instructorId: 'p2',
    })
  })

  it('no adivina el globo aunque el catalogo solo tenga uno', () => {
    // Elegir "el unico globo" seria correcto hoy y silenciosamente falso el dia
    // que haya dos. Se deja vacio y `missingFields` lo reclama.
    const d = doc({ balloons: [globo] })
    expect(heredado(d).balloonId).toBe('')
  })
})

describe('flightFromQuickClose', () => {
  const entrada = {
    date: '2026-08-31',
    landingTime: '08:37',
    coords: { lat: 41.7712, lon: 1.0384 },
    siteId: null,
    landings: 1,
    notes: 'Aterrizaje en rastrojo',
  }

  it('queda marcado como incompleto', () => {
    expect(flightFromQuickClose(doc(), 'f1', entrada).complete).toBe(false)
  })

  it('no inventa la hora de despegue', () => {
    const f = flightFromQuickClose(doc(), 'f1', entrada)
    expect(f.departure.timestamp).toBe('')
  })

  it('no inventa inflados ni despegues, que se cuentan a mano al rematar', () => {
    const f = flightFromQuickClose(doc(), 'f1', entrada)
    expect(f.inflations).toBe(0)
    expect(f.takeoffs).toBe(0)
  })

  it('la duracion sale cero y el vuelo queda marcado como incoherente hasta rematarlo', () => {
    const f = flightFromQuickClose(doc(), 'f1', entrada)
    expect(flightDurationMin(f)).toBe(0)
    expect(hasConsistentTimes(f)).toBe(false)
  })

  it('guarda la hora y el sitio de aterrizaje, que es lo que se acaba de vivir', () => {
    const f = flightFromQuickClose(doc(), 'f1', entrada)
    expect(f.arrival.timestamp).toBe('2026-08-31T06:37:00.000Z')
    expect(f.arrival.coords).toEqual({ lat: 41.7712, lon: 1.0384 })
    expect(f.landings).toBe(1)
    expect(f.notes).toBe('Aterrizaje en rastrojo')
  })

  it('un aterrizaje en un campo del catalogo no guarda coordenadas sueltas', () => {
    const f = flightFromQuickClose(doc(), 'f1', { ...entrada, siteId: 's1', coords: null })
    expect(f.arrival.siteId).toBe('s1')
    expect(f.arrival.coords).toBe(null)
  })

  it('hereda el globo y la funcion del ultimo vuelo', () => {
    const d = doc({ flights: [makeFlight({ balloonId: 'b1', pilotFunction: 'DUAL', instructorId: 'p2' })] })
    const f = flightFromQuickClose(d, 'f1', entrada)
    expect(f.balloonId).toBe('b1')
    expect(f.pilotFunction).toBe('DUAL')
    expect(f.instructorId).toBe('p2')
  })

  it('un doble mando nace con la firma pendiente, que es lo que exige BFCL.160(e)', () => {
    const d = doc({ flights: [makeFlight({ pilotFunction: 'DUAL' })] })
    expect(flightFromQuickClose(d, 'f1', entrada).signatureStatus).toBe('pending')
  })

  it('un PIC solo nace sin firma que pedir', () => {
    const d = doc({ flights: [makeFlight({ pilotFunction: 'PIC' })] })
    expect(flightFromQuickClose(d, 'f1', entrada).signatureStatus).toBe('not_required')
  })

  it('nunca nace con verificacion de competencia ni marcado para la vigencia', () => {
    const f = flightFromQuickClose(doc(), 'f1', entrada)
    expect(f.check).toBe(null)
    expect(f.recencyTrainingFlight).toBe(false)
  })
})
