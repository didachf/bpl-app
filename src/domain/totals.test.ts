import { describe, it, expect } from 'vitest'
import { logbookTotals } from './totals'
import { makeBalloon, makeDoc, makeFlight, makeFlights } from './fixtures'

const HOY = '2026-09-01'

describe('logbookTotals', () => {
  it('un documento sin vuelos suma cero', () => {
    expect(logbookTotals(makeDoc(), HOY)).toEqual({
      flights: 0, minutes: 0, takeoffs: 0, landings: 0, inflations: 0, partial: false,
    })
  })

  it('suma duracion, despegues, aterrizajes e inflados', () => {
    const doc = makeDoc({
      flights: [
        makeFlight({ durationOverrideMin: 65, takeoffs: 1, landings: 1, inflations: 1 }),
        makeFlight({ durationOverrideMin: 80, takeoffs: 2, landings: 3, inflations: 1 }),
      ],
    })
    expect(logbookTotals(doc, HOY)).toEqual({
      flights: 2, minutes: 145, takeoffs: 3, landings: 4, inflations: 2, partial: false,
    })
  })

  it('cuenta un vuelo con la fecha de hoy', () => {
    const doc = makeDoc({ flights: [makeFlight({ date: HOY, durationOverrideMin: 60 })] })
    expect(logbookTotals(doc, HOY).flights).toBe(1)
  })

  it('no cuenta un vuelo con fecha futura', () => {
    const doc = makeDoc({ flights: [makeFlight({ date: '2099-01-01', durationOverrideMin: 60 })] })
    expect(logbookTotals(doc, HOY)).toMatchObject({ flights: 0, minutes: 0 })
  })
})

describe('logbookTotals es un acumulador, no un juez', () => {
  // La diferencia con currency es deliberada: esto es lo que has volado, no lo
  // que cuenta legalmente. Un vuelo que la vigencia excluye sigue siendo un
  // vuelo, y AMC1 BFCL.050(a)(2) exige llevar el acumulado de TODOS.

  it('cuenta un vuelo cuyo globo no esta en el catalogo', () => {
    const doc = makeDoc({ balloons: [], flights: [makeFlight({ durationOverrideMin: 60 })] })
    expect(logbookTotals(doc, HOY)).toMatchObject({ flights: 1, minutes: 60 })
  })

  it('cuenta un vuelo sin la firma del instructor', () => {
    const doc = makeDoc({
      flights: [makeFlight({ durationOverrideMin: 60, signatureStatus: 'pending' })],
    })
    expect(logbookTotals(doc, HOY)).toMatchObject({ flights: 1, minutes: 60 })
  })

  it('cuenta un vuelo en un globo que no sirve para el BPL', () => {
    const doc = makeDoc({
      balloons: [makeBalloon({ id: 'b1', envelopeVolumeM3: 9000 })],
      flights: [makeFlight({ durationOverrideMin: 60 })],
    })
    expect(logbookTotals(doc, HOY)).toMatchObject({ flights: 1, minutes: 60 })
  })

  it('cuenta un vuelo cautivo', () => {
    const doc = makeDoc({
      flights: [makeFlight({ durationOverrideMin: 25, tether: 'tethered' })],
    })
    expect(logbookTotals(doc, HOY)).toMatchObject({ flights: 1, minutes: 25 })
  })
})

describe('logbookTotals, bandera de parcial', () => {
  it('marca parcial si algun vuelo esta incompleto', () => {
    const doc = makeDoc({
      flights: [
        makeFlight({ durationOverrideMin: 60 }),
        makeFlight({ durationOverrideMin: 60, complete: false }),
      ],
    })
    expect(logbookTotals(doc, HOY).partial).toBe(true)
  })

  it('marca parcial si algun vuelo tiene las horas incoherentes', () => {
    const doc = makeDoc({
      flights: [makeFlight({
        arrival: { siteId: 's1', coords: null, timestamp: '2026-08-31T04:00:00Z' },
      })],
    })
    const t = logbookTotals(doc, HOY)
    expect(t.partial).toBe(true)
    expect(t.minutes).toBe(0)
  })

  it('un vuelo futuro incompleto no ensucia la bandera', () => {
    const doc = makeDoc({
      flights: [makeFlight({ date: '2099-01-01', complete: false })],
    })
    expect(logbookTotals(doc, HOY).partial).toBe(false)
  })

  it('no marca parcial cuando todo esta en regla', () => {
    const doc = makeDoc({ flights: makeFlights(3, {
      date: '2026-06-01', pilotFunction: 'DUAL', durationMin: 60 }) })
    expect(logbookTotals(doc, HOY).partial).toBe(false)
  })
})
