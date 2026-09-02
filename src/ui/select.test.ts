import { describe, it, expect } from 'vitest'
import { makeFlight, makePilot } from '../domain/fixtures'
import type { Balloon, LogbookDoc, Person, Site } from '../domain/types'
import {
  balloonById, personById, siteById, personName, balloonLabel,
  endpointLabel, flightTitle, sortedFlights, flightYears, filterFlights,
} from './select'

const globo: Balloon = {
  id: 'b1', registration: 'EC-KMU', manufacturer: 'Ultramagic', model: 'M-105',
  balloonClass: 'hot_air', envelopeVolumeM3: 2900,
}
const campo: Site = {
  id: 's1', name: 'Agramunt', lat: 41.7869, lon: 1.0967, elevationM: 345,
  permitStatus: 'unknown', accessNotes: '',
}
const otroCampo: Site = { ...campo, id: 's2', name: 'Odena' }
const alberto: Person = { id: 'p2', name: 'Alberto Ruiz', roles: ['instructor'], licenceNumber: null }

function doc(over: Partial<LogbookDoc> = {}): LogbookDoc {
  return {
    schemaVersion: 1,
    pilot: makePilot(),
    balloons: [globo],
    sites: [campo, otroCampo],
    people: [alberto],
    flights: [],
    ...over,
  }
}

describe('busquedas por identificador', () => {
  it('encuentra el globo', () => {
    expect(balloonById(doc(), 'b1')).toBe(globo)
  })

  it('devuelve null y no undefined cuando no esta', () => {
    expect(balloonById(doc(), 'nada')).toBe(null)
    expect(personById(doc(), 'nada')).toBe(null)
    expect(siteById(doc(), 'nada')).toBe(null)
  })

  it('un identificador null no revienta', () => {
    expect(personById(doc(), null)).toBe(null)
  })
})

describe('personName', () => {
  it('el nombre cuando la persona existe', () => {
    expect(personName(doc(), 'p2')).toBe('Alberto Ruiz')
  })

  it('un id que no esta en el documento se dice, no se calla', () => {
    expect(personName(doc(), 'fantasma')).toBe('Sin asignar')
  })

  it('una persona sin nombre se muestra como sin nombre', () => {
    const d = doc({ people: [{ id: 'p9', name: '', roles: [], licenceNumber: null }] })
    expect(personName(d, 'p9')).toBe('Sin nombre')
  })
})

describe('balloonLabel', () => {
  it('matricula y modelo', () => {
    expect(balloonLabel(globo)).toBe('EC-KMU · M-105')
  })

  it('sin modelo, solo la matricula', () => {
    expect(balloonLabel({ ...globo, model: '' })).toBe('EC-KMU')
  })
})

describe('endpointLabel', () => {
  it('el nombre del campo cuando el punto esta en el catalogo', () => {
    expect(endpointLabel(doc(), { siteId: 's1', coords: null, timestamp: '' })).toBe('Agramunt')
  })

  it('las coordenadas cuando se aterrizo fuera del catalogo', () => {
    const ep = { siteId: null, coords: { lat: 41.7712, lon: 1.0384 }, timestamp: '' }
    expect(endpointLabel(doc(), ep)).toBe('41.771, 1.038')
  })

  it('sin campo y sin coordenadas lo dice', () => {
    expect(endpointLabel(doc(), { siteId: null, coords: null, timestamp: '' })).toBe('Sin indicar')
  })

  it('un siteId que ya no existe cae a las coordenadas si las hay', () => {
    const ep = { siteId: 'borrado', coords: { lat: 41.7, lon: 1.0 }, timestamp: '' }
    expect(endpointLabel(doc(), ep)).toBe('41.700, 1.000')
  })
})

describe('flightTitle', () => {
  it('salida y llegada del catalogo', () => {
    const f = makeFlight({
      departure: { siteId: 's1', coords: null, timestamp: '' },
      arrival: { siteId: 's2', coords: null, timestamp: '' },
    })
    expect(flightTitle(doc(), f)).toBe('Agramunt → Odena')
  })

  it('aterrizaje en campo abierto con distancia conocida', () => {
    const f = makeFlight({
      departure: { siteId: 's1', coords: null, timestamp: '' },
      arrival: { siteId: null, coords: { lat: 41.77, lon: 1.03 }, timestamp: '' },
      distanceKm: 11.4,
    })
    expect(flightTitle(doc(), f)).toBe('Agramunt → campo a 11 km')
  })

  it('aterrizaje en campo abierto sin distancia, las coordenadas', () => {
    const f = makeFlight({
      departure: { siteId: 's1', coords: null, timestamp: '' },
      arrival: { siteId: null, coords: { lat: 41.77, lon: 1.03 }, timestamp: '' },
      distanceKm: null,
    })
    expect(flightTitle(doc(), f)).toBe('Agramunt → 41.770, 1.030')
  })

  it('un vuelo cautivo no tiene flecha, se queda en el sitio', () => {
    const f = makeFlight({
      tether: 'tethered',
      departure: { siteId: 's1', coords: null, timestamp: '' },
      arrival: { siteId: 's1', coords: null, timestamp: '' },
    })
    expect(flightTitle(doc(), f)).toBe('Agramunt, cautivo')
  })
})

describe('sortedFlights', () => {
  it('la fecha mas reciente primero', () => {
    const a = makeFlight({ id: 'a', date: '2026-08-17' })
    const b = makeFlight({ id: 'b', date: '2026-08-31' })
    const c = makeFlight({ id: 'c', date: '2026-08-24' })
    expect(sortedFlights([a, b, c]).map(f => f.id)).toEqual(['b', 'c', 'a'])
  })

  it('dos vuelos del mismo dia se desempatan por la hora de salida, el ultimo arriba', () => {
    const manana = makeFlight({
      id: 'manana', date: '2026-08-31',
      departure: { siteId: 's1', coords: null, timestamp: '2026-08-31T05:00:00Z' },
    })
    const tarde = makeFlight({
      id: 'tarde', date: '2026-08-31',
      departure: { siteId: 's1', coords: null, timestamp: '2026-08-31T17:00:00Z' },
    })
    expect(sortedFlights([manana, tarde]).map(f => f.id)).toEqual(['tarde', 'manana'])
  })

  it('no muta la lista que recibe', () => {
    const lista = [makeFlight({ id: 'a', date: '2026-01-01' }), makeFlight({ id: 'b', date: '2026-06-01' })]
    sortedFlights(lista)
    expect(lista.map(f => f.id)).toEqual(['a', 'b'])
  })
})

describe('flightYears', () => {
  it('los años distintos, del mas reciente al mas antiguo', () => {
    const fs = [
      makeFlight({ date: '2025-03-01' }),
      makeFlight({ date: '2026-08-31' }),
      makeFlight({ date: '2026-01-04' }),
    ]
    expect(flightYears(fs)).toEqual(['2026', '2025'])
  })

  it('sin vuelos, lista vacia', () => {
    expect(flightYears([])).toEqual([])
  })
})

describe('filterFlights', () => {
  const fs = [
    makeFlight({ id: 'a', date: '2026-08-31', balloonId: 'b1', pilotFunction: 'DUAL' }),
    makeFlight({ id: 'b', date: '2025-08-31', balloonId: 'b1', pilotFunction: 'PIC' }),
    makeFlight({ id: 'c', date: '2026-02-01', balloonId: 'b2', pilotFunction: 'PIC' }),
  ]

  it('sin filtros los devuelve todos', () => {
    expect(filterFlights(fs, {}).map(f => f.id)).toEqual(['a', 'b', 'c'])
  })

  it('filtra por año', () => {
    expect(filterFlights(fs, { year: '2026' }).map(f => f.id)).toEqual(['a', 'c'])
  })

  it('filtra por globo', () => {
    expect(filterFlights(fs, { balloonId: 'b2' }).map(f => f.id)).toEqual(['c'])
  })

  it('filtra por funcion', () => {
    expect(filterFlights(fs, { pilotFunction: 'PIC' }).map(f => f.id)).toEqual(['b', 'c'])
  })

  it('los filtros se acumulan, no se sustituyen', () => {
    expect(filterFlights(fs, { year: '2026', pilotFunction: 'PIC' }).map(f => f.id)).toEqual(['c'])
  })
})
