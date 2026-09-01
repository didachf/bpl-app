// src/domain/progress.test.ts
import { describe, it, expect } from 'vitest'
import { bplProgress } from './progress'
import { makeDoc, makeFlight, makeFlights } from './fixtures'

function req(doc: ReturnType<typeof makeDoc>, key: string) {
  const r = bplProgress(doc).requirements.find(x => x.key === key)
  if (!r) throw new Error(`No existe el requisito ${key}`)
  return r
}

describe('bplProgress', () => {
  it('con un documento vacio todo esta a cero y nada cumplido', () => {
    const p = bplProgress(makeDoc())
    expect(p.allMet).toBe(false)
    expect(p.requirements.every(r => r.current === 0)).toBe(true)
  })

  it('las horas de instruccion suman doble mando y solo supervisado', () => {
    const doc = makeDoc({
      flights: [
        makeFlight({ pilotFunction: 'DUAL', durationOverrideMin: 120 }),
        makeFlight({ pilotFunction: 'PIC_SOLO_SUPERVISED', durationOverrideMin: 45 }),
      ],
    })
    expect(req(doc, 'instructionMinutes').current).toBe(165)
  })

  it('las horas de doble mando no incluyen el solo supervisado', () => {
    const doc = makeDoc({
      flights: [
        makeFlight({ pilotFunction: 'DUAL', durationOverrideMin: 120 }),
        makeFlight({ pilotFunction: 'PIC_SOLO_SUPERVISED', durationOverrideMin: 45 }),
      ],
    })
    expect(req(doc, 'dualMinutes').current).toBe(120)
  })

  it('los vuelos como PIC no cuentan para la instruccion', () => {
    const doc = makeDoc({
      flights: [makeFlight({ pilotFunction: 'PIC', durationOverrideMin: 300 })],
    })
    expect(req(doc, 'instructionMinutes').current).toBe(0)
  })

  it('cuenta despegues y aterrizajes por separado', () => {
    const doc = makeDoc({
      flights: [makeFlight({ takeoffs: 3, landings: 2 })],
    })
    expect(req(doc, 'takeoffs').current).toBe(3)
    expect(req(doc, 'landings').current).toBe(2)
  })

  it('exige 20 de cada uno y no 20 en total', () => {
    const doc = makeDoc({
      flights: [makeFlight({ takeoffs: 20, landings: 0 })],
    })
    expect(req(doc, 'takeoffs').met).toBe(true)
    expect(req(doc, 'landings').met).toBe(false)
  })

  it('el vuelo solo supervisado necesita 30 minutos o mas', () => {
    const corto = makeDoc({
      flights: [makeFlight({ pilotFunction: 'PIC_SOLO_SUPERVISED', durationOverrideMin: 29 })],
    })
    expect(req(corto, 'soloFlight').met).toBe(false)

    const justo = makeDoc({
      flights: [makeFlight({ pilotFunction: 'PIC_SOLO_SUPERVISED', durationOverrideMin: 30 })],
    })
    expect(req(justo, 'soloFlight').met).toBe(true)
  })

  it('marca como parcial el requisito que se apoya en un vuelo incompleto', () => {
    const doc = makeDoc({
      flights: [makeFlight({ durationOverrideMin: 60, complete: false })],
    })
    expect(req(doc, 'instructionMinutes').partial).toBe(true)
    expect(req(doc, 'soloFlight').partial).toBe(false)
  })

  it('allMet solo es cierto cuando se cumplen los cinco requisitos', () => {
    const doc = makeDoc({
      flights: [
        ...makeFlights(20, {
          date: '2026-08-01',
          pilotFunction: 'DUAL',
          durationMin: 40,
          inflations: 1,
          takeoffs: 1,
          landings: 1,
        }),
        makeFlight({
          pilotFunction: 'PIC_SOLO_SUPERVISED',
          durationOverrideMin: 40,
          inflations: 0,
          takeoffs: 0,
          landings: 0,
        }),
      ],
    })
    const p = bplProgress(doc)
    // 20 x 40 = 800 min de doble mando, mas 40 de solo = 840. Faltan las 16 h.
    expect(p.allMet).toBe(false)

    doc.flights.push(
      ...makeFlights(3, {
        date: '2026-08-02',
        pilotFunction: 'DUAL',
        durationMin: 60,
        inflations: 0,
        takeoffs: 0,
        landings: 0,
      }),
    )
    // 840 + 180 = 1020 min >= 960, y el doble mando 980 >= 720.
    expect(bplProgress(doc).allMet).toBe(true)
  })
})
