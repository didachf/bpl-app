import { describe, it, expect } from 'vitest'
import { makeFlight, makePilot } from '../domain/fixtures'
import type { Balloon, LogbookDoc, Person, Site } from '../domain/types'
import { missingFields, canBeCompleted } from './incomplete'

const globo: Balloon = {
  id: 'b1', registration: 'EC-KMU', manufacturer: 'Ultramagic', model: 'M-105',
  balloonClass: 'hot_air', envelopeVolumeM3: 2900, maxSurfaceWindKt: null,
}
const yo: Person = { id: 'p1', name: 'Didac', roles: ['pilot'], licenceNumber: null }
const alberto: Person = { id: 'p2', name: 'Alberto', roles: ['instructor'], licenceNumber: null }
// El campo 's1' existe porque `makeFlight` lo usa por defecto en las dos puntas.
// Sin el, cualquier vuelo de prueba echa en falta el campo de despegue y el
// lugar de aterrizaje, y la prueba mide el fixture en lugar de la funcion.
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

describe('missingFields', () => {
  it('un vuelo completo y firmado no echa nada en falta', () => {
    const f = makeFlight({ picId: 'p1', instructorId: 'p2', signatureStatus: 'signed' })
    expect(missingFields(doc(), f)).toEqual([])
  })

  it('sin hora de despegue lo dice', () => {
    const f = makeFlight({
      picId: 'p1', instructorId: 'p2', signatureStatus: 'signed',
      departure: { siteId: 's1', coords: null, timestamp: '' },
    })
    expect(missingFields(doc(), f)).toContain('Hora de despegue')
  })

  it('sin campo ni coordenadas de despegue lo dice', () => {
    const f = makeFlight({
      picId: 'p1', instructorId: 'p2', signatureStatus: 'signed',
      departure: { siteId: null, coords: null, timestamp: '2026-08-31T05:00:00Z' },
    })
    expect(missingFields(doc(), f)).toContain('Campo de despegue')
  })

  it('unas coordenadas de despegue bastan, no hace falta el catalogo', () => {
    const f = makeFlight({
      picId: 'p1', instructorId: 'p2', signatureStatus: 'signed',
      departure: { siteId: null, coords: { lat: 41.7, lon: 1 }, timestamp: '2026-08-31T05:00:00Z' },
    })
    expect(missingFields(doc(), f)).not.toContain('Campo de despegue')
  })

  it('un globo que no esta en el catalogo se echa en falta', () => {
    const f = makeFlight({ balloonId: '', picId: 'p1', instructorId: 'p2', signatureStatus: 'signed' })
    expect(missingFields(doc(), f)).toContain('Globo')
  })

  it('cero despegues es un dato sin meter, no un vuelo sin despegar', () => {
    const f = makeFlight({ takeoffs: 0, picId: 'p1', instructorId: 'p2', signatureStatus: 'signed' })
    expect(missingFields(doc(), f)).toContain('Despegues')
  })

  it('cero inflados igual', () => {
    const f = makeFlight({ inflations: 0, picId: 'p1', instructorId: 'p2', signatureStatus: 'signed' })
    expect(missingFields(doc(), f)).toContain('Inflados')
  })

  it('un doble mando sin instructor asignado lo dice', () => {
    const f = makeFlight({ pilotFunction: 'DUAL', instructorId: null, picId: 'p1' })
    expect(missingFields(doc(), f)).toContain('Instructor')
  })

  it('un PIC solo no necesita instructor', () => {
    const f = makeFlight({
      pilotFunction: 'PIC', instructorId: null, picId: 'p1', signatureStatus: 'not_required',
    })
    expect(missingFields(doc(), f)).not.toContain('Instructor')
  })

  it('una firma pendiente cuenta como campo que falta', () => {
    const f = makeFlight({ picId: 'p1', instructorId: 'p2', signatureStatus: 'pending' })
    expect(missingFields(doc(), f)).toContain('Firma del instructor')
  })

  it('el vuelo del cierre rapido echa en falta seis campos', () => {
    const f = makeFlight({
      picId: 'p1',
      balloonId: 'b1',
      pilotFunction: 'DUAL',
      instructorId: null,
      signatureStatus: 'pending',
      departure: { siteId: null, coords: null, timestamp: '' },
      arrival: { siteId: null, coords: { lat: 41.77, lon: 1.03 }, timestamp: '2026-08-31T06:37:00Z' },
      takeoffs: 0,
      inflations: 0,
      complete: false,
    })
    expect(missingFields(doc(), f)).toEqual([
      'Hora de despegue',
      'Campo de despegue',
      'Inflados',
      'Despegues',
      'Instructor',
      'Firma del instructor',
    ])
  })
})

describe('canBeCompleted', () => {
  it('cierto cuando ya no falta nada', () => {
    const f = makeFlight({ picId: 'p1', instructorId: 'p2', signatureStatus: 'signed' })
    expect(canBeCompleted(doc(), f)).toBe(true)
  })

  it('falso mientras quede algo', () => {
    const f = makeFlight({ picId: 'p1', instructorId: 'p2', signatureStatus: 'pending' })
    expect(canBeCompleted(doc(), f)).toBe(false)
  })
})
