// src/domain/currency.test.ts
import { describe, it, expect } from 'vitest'
import { currency } from './currency'
import { makeDoc, makeFlight, makeFlights, makePilot } from './fixtures'
import type { LogbookDoc } from './types'

const HOY = '2026-09-01'

function conLicencia(flights: LogbookDoc['flights']): LogbookDoc {
  return makeDoc({ pilot: makePilot({ licenceIssued: '2026-01-01' }), flights })
}

function item(doc: LogbookDoc, key: string) {
  const i = currency(doc, HOY).items.find(x => x.key === key)
  if (!i) throw new Error(`No existe el contador ${key}`)
  return i
}

describe('currency', () => {
  it('no aplica mientras no haya licencia emitida', () => {
    const doc = makeDoc({ flights: [makeFlight({})] })
    expect(currency(doc, HOY).applicable).toBe(false)
  })

  it('aplica en cuanto hay fecha de emision', () => {
    expect(currency(conLicencia([]), HOY).applicable).toBe(true)
  })

  it('el doble mando no suma a las horas como PIC', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-06-01', pilotFunction: 'DUAL', durationOverrideMin: 600 }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(0)
  })

  it('PIC, solo supervisado, FI(B) y FE(B) suman a las horas como PIC', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-06-01', pilotFunction: 'PIC', durationOverrideMin: 60 }),
      makeFlight({ date: '2026-06-02', pilotFunction: 'PIC_SOLO_SUPERVISED', durationOverrideMin: 30 }),
      makeFlight({ date: '2026-06-03', pilotFunction: 'FI_B', durationOverrideMin: 45 }),
      makeFlight({ date: '2026-06-04', pilotFunction: 'FE_B', durationOverrideMin: 15 }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(150)
  })

  it('el doble mando si suma a despegues y aterrizajes', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-06-01', pilotFunction: 'DUAL', takeoffs: 4, landings: 4 }),
    ])
    expect(item(doc, 'takeoffs').current).toBe(4)
    expect(item(doc, 'landings').current).toBe(4)
  })

  it('un vuelo justo en el borde de los 24 meses todavia cuenta', () => {
    const doc = conLicencia([
      makeFlight({ date: '2024-09-01', pilotFunction: 'PIC', durationOverrideMin: 400 }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(400)
  })

  it('un vuelo un dia mas antiguo ya no cuenta', () => {
    const doc = conLicencia([
      makeFlight({ date: '2024-08-31', pilotFunction: 'PIC', durationOverrideMin: 400 }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(0)
  })

  it('expiresOn es el ultimo dia en que se sigue cumpliendo', () => {
    // Dos vuelos de 3 h. El mas antiguo, el de mayo de 2025, es el que hace
    // falta para llegar a las 6 h, asi que el contador dura hasta mayo de 2027.
    const doc = conLicencia([
      makeFlight({ date: '2026-07-01', pilotFunction: 'PIC', durationOverrideMin: 180 }),
      makeFlight({ date: '2025-05-10', pilotFunction: 'PIC', durationOverrideMin: 180 }),
    ])
    const i = item(doc, 'picMinutes')
    expect(i.met).toBe(true)
    expect(i.expiresOn).toBe('2027-05-10')
  })

  it('expiresOn es null cuando el contador no se cumple', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-07-01', pilotFunction: 'PIC', durationOverrideMin: 60 }),
    ])
    const i = item(doc, 'picMinutes')
    expect(i.met).toBe(false)
    expect(i.expiresOn).toBe(null)
  })

  it('el vuelo de instruccion con FI(B) mira 48 meses y exige instructor', () => {
    const sinInstructor = conLicencia([
      makeFlight({ date: '2023-01-15', pilotFunction: 'DUAL', instructorId: null }),
    ])
    expect(item(sinInstructor, 'trainingFlight').met).toBe(false)

    const conInstructor = conLicencia([
      makeFlight({ date: '2023-01-15', pilotFunction: 'DUAL', instructorId: 'p2' }),
    ])
    const i = item(conInstructor, 'trainingFlight')
    expect(i.met).toBe(true)
    expect(i.expiresOn).toBe('2027-01-15')
  })

  it('una verificacion de competencia en 24 meses cumple la vigencia entera', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-03-20', pilotFunction: 'PIC', checkType: 'proficiency_check',
        durationOverrideMin: 30 }),
    ])
    const r = currency(doc, HOY)
    expect(r.viaProficiencyCheck).toBe(true)
    expect(r.met).toBe(true)
    expect(r.currentUntil).toBe('2028-03-20')
  })

  it('sin verificacion, met exige los cuatro contadores', () => {
    const casi = conLicencia([
      ...makeFlights(10, { date: '2026-06-01', pilotFunction: 'PIC', durationMin: 40,
        takeoffs: 1, landings: 1 }),
    ])
    // 400 min < 360? no, 400 >= 360. Despegues 10 y aterrizajes 10 cumplen.
    // Falta el vuelo de instruccion con FI(B) de los 48 meses.
    expect(currency(casi, HOY).met).toBe(false)

    casi.flights.push(makeFlight({ date: '2025-02-01', pilotFunction: 'DUAL', instructorId: 'p2' }))
    expect(currency(casi, HOY).met).toBe(true)
  })

  it('currentUntil es la mas temprana de las caducidades', () => {
    const doc = conLicencia([
      ...makeFlights(10, { date: '2026-06-01', pilotFunction: 'PIC', durationMin: 40,
        takeoffs: 1, landings: 1 }),
      makeFlight({ date: '2025-02-01', pilotFunction: 'DUAL', instructorId: 'p2' }),
    ])
    // Los contadores de 24 meses caducan el 2028-06-01, el de 48 el 2029-02-01.
    expect(currency(doc, HOY).currentUntil).toBe('2028-06-01')
  })
})
