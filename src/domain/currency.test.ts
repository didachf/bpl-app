import { describe, it, expect } from 'vitest'
import { currency } from './currency'
import { makeBalloon, makeDoc, makeFlight, makeFlights, makePilot } from './fixtures'
import type { BalloonClass, Flight, LogbookDoc } from './types'

const HOY = '2026-09-01'

function conLicencia(flights: Flight[], over: Partial<LogbookDoc> = {}): LogbookDoc {
  return makeDoc({ pilot: makePilot({ licenceIssued: '2026-01-01' }), flights, ...over })
}

function item(doc: LogbookDoc, key: string, clase: BalloonClass = 'hot_air') {
  const i = currency(doc, HOY, clase).items.find(x => x.key === key)
  if (!i) throw new Error(`No existe el contador ${key}`)
  return i
}

/** Vuelo de instruccion de recencia valido segun AMC1 BFCL.160(a)(1)(ii)(a). */
function vueloDeRecencia(over: Partial<Flight> = {}): Flight {
  return makeFlight({
    date: '2025-02-01',
    pilotFunction: 'DUAL',
    instructorId: 'p2',
    signatureStatus: 'signed',
    recencyTrainingFlight: true,
    ...over,
  })
}

describe('aplicabilidad', () => {
  it('no aplica mientras no haya licencia emitida', () => {
    expect(currency(makeDoc({ flights: [makeFlight({})] }), HOY, 'hot_air').applicable).toBe(false)
  })

  it('aplica en cuanto hay fecha de emision', () => {
    expect(currency(conLicencia([]), HOY, 'hot_air').applicable).toBe(true)
  })
})

describe('horas como PIC', () => {
  it('el doble mando no suma', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-06-01', pilotFunction: 'DUAL', durationOverrideMin: 600 }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(0)
  })

  it('PIC, solo supervisado, FI(B) y FE(B) suman', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-06-01', pilotFunction: 'PIC', durationOverrideMin: 60 }),
      makeFlight({ date: '2026-06-02', pilotFunction: 'PIC_SOLO_SUPERVISED', durationOverrideMin: 30 }),
      makeFlight({ date: '2026-06-03', pilotFunction: 'FI_B', durationOverrideMin: 45 }),
      makeFlight({ date: '2026-06-04', pilotFunction: 'FE_B', durationOverrideMin: 15 }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(150)
  })

  it('el solo supervisado sin firmar no suma, AMC1 BFCL.050(b)(1)(ii)', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-06-02', pilotFunction: 'PIC_SOLO_SUPERVISED',
        durationOverrideMin: 300, signatureStatus: 'pending' }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(0)
  })

  it('el solo supervisado sin supervisor identificado no suma', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-06-02', pilotFunction: 'PIC_SOLO_SUPERVISED',
        durationOverrideMin: 300, instructorId: null }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(0)
  })

  it('un skill test aprobado suma como PIC aunque se anote en doble mando', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-06-01', pilotFunction: 'DUAL', durationOverrideMin: 90,
        check: { type: 'skill_test', examinerId: 'p3', result: 'passed' } }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(90)
  })

  it('un skill test suspendido no suma', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-06-01', pilotFunction: 'DUAL', durationOverrideMin: 90,
        check: { type: 'skill_test', examinerId: 'p3', result: 'failed' } }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(0)
  })
})

describe('despegues y aterrizajes', () => {
  it('el doble mando si suma, porque el texto lo permite explicitamente', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-06-01', pilotFunction: 'DUAL', takeoffs: 4, landings: 4 }),
    ])
    expect(item(doc, 'takeoffs').current).toBe(4)
    expect(item(doc, 'landings').current).toBe(4)
  })
})

describe('ventana de 24 meses', () => {
  it('un vuelo exactamente en el borde NO cuenta, por prudencia', () => {
    const doc = conLicencia([
      makeFlight({ date: '2024-09-01', pilotFunction: 'PIC', durationOverrideMin: 400 }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(0)
  })

  it('un vuelo un dia dentro del borde si cuenta', () => {
    const doc = conLicencia([
      makeFlight({ date: '2024-09-02', pilotFunction: 'PIC', durationOverrideMin: 400 }),
    ])
    expect(item(doc, 'picMinutes').current).toBe(400)
  })

  it('expiresOn es el ultimo dia en que se sigue cumpliendo', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-07-01', pilotFunction: 'PIC', durationOverrideMin: 180 }),
      makeFlight({ date: '2025-05-10', pilotFunction: 'PIC', durationOverrideMin: 180 }),
    ])
    const i = item(doc, 'picMinutes')
    expect(i.met).toBe(true)
    // El vuelo del 10/05/2025 sale de la ventana el 10/05/2027, asi que el
    // ultimo dia en que aun cuenta es el 09/05/2027.
    expect(i.expiresOn).toBe('2027-05-09')
  })

  it('expiresOn es null cuando el contador no se cumple', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-07-01', pilotFunction: 'PIC', durationOverrideMin: 60 }),
    ])
    const i = item(doc, 'picMinutes')
    expect(i.met).toBe(false)
    expect(i.expiresOn).toBe(null)
  })
})

describe('vuelo de instruccion de los 48 meses', () => {
  it('exige que este marcado como vuelo de instruccion de recencia', () => {
    const doc = conLicencia([vueloDeRecencia({ recencyTrainingFlight: false })])
    expect(item(doc, 'trainingFlight').met).toBe(false)
  })

  it('exige instructor identificado', () => {
    const doc = conLicencia([vueloDeRecencia({ instructorId: null })])
    expect(item(doc, 'trainingFlight').met).toBe(false)
  })

  it('exige firma del instructor, BFCL.160(e)', () => {
    const doc = conLicencia([vueloDeRecencia({ signatureStatus: 'pending' })])
    expect(item(doc, 'trainingFlight').met).toBe(false)
  })

  it('acepta el vuelo bien anotado', () => {
    const doc = conLicencia([vueloDeRecencia()])
    expect(item(doc, 'trainingFlight').met).toBe(true)
  })

  it('cuenta los 48 meses desde el ultimo dia del mes, AMC1 BFCL.160(a)(1)(ii)(e)', () => {
    // Vuelo el 05/09/2022. Desde la fecha del vuelo habria caducado el
    // 05/09/2026, pero la AMC cuenta desde el 30/09/2022, asi que dura hasta
    // el 30/09/2026 y hoy, 01/09/2026, sigue vigente.
    const doc = conLicencia([vueloDeRecencia({ date: '2022-09-05' })])
    const i = item(doc, 'trainingFlight')
    expect(i.met).toBe(true)
    expect(i.expiresOn).toBe('2026-09-30')
  })

  it('un vuelo fuera de los 48 meses no cuenta', () => {
    const doc = conLicencia([vueloDeRecencia({ date: '2022-08-05' })])
    const i = item(doc, 'trainingFlight')
    expect(i.met).toBe(false)
    expect(i.expiresOn).toBe(null)
  })
})

describe('verificacion de competencia, BFCL.160(a)(2) y (c)', () => {
  const check = makeFlight({
    date: '2026-03-20', pilotFunction: 'PIC', durationOverrideMin: 30,
    check: { type: 'proficiency_check', examinerId: 'p3', result: 'passed' },
  })

  it('una verificacion aprobada cumple la vigencia entera', () => {
    const r = currency(conLicencia([check]), HOY, 'hot_air')
    expect(r.viaProficiencyCheck).toBe(true)
    expect(r.met).toBe(true)
    expect(r.currentUntil).toBe('2028-03-19')
  })

  it('una verificacion suspendida NO cumple', () => {
    const suspendida = makeFlight({ ...check,
      check: { type: 'proficiency_check', examinerId: 'p3', result: 'failed' } })
    const r = currency(conLicencia([suspendida]), HOY, 'hot_air')
    expect(r.viaProficiencyCheck).toBe(false)
    expect(r.met).toBe(false)
  })

  it('una verificacion en otra clase de globo NO cumple para esta', () => {
    const doc = conLicencia([check], {
      balloons: [makeBalloon({ id: 'b1', balloonClass: 'gas', envelopeVolumeM3: 1000 })],
    })
    expect(currency(doc, HOY, 'hot_air').viaProficiencyCheck).toBe(false)
    expect(currency(doc, HOY, 'gas').viaProficiencyCheck).toBe(true)
  })
})

describe('la vigencia es por clase de globo, BFCL.160(a)', () => {
  it('los vuelos en globo de gas no dan vigencia en aire caliente', () => {
    const doc = conLicencia(
      makeFlights(10, { date: '2026-06-01', pilotFunction: 'PIC', durationMin: 40,
        takeoffs: 1, landings: 1 }),
      { balloons: [makeBalloon({ id: 'b1', balloonClass: 'gas', envelopeVolumeM3: 1000 })] },
    )
    expect(item(doc, 'picMinutes', 'hot_air').current).toBe(0)
    expect(item(doc, 'picMinutes', 'gas').current).toBe(400)
  })
})

describe('limite de grupo tras recuperar la vigencia, BFCL.160(d)', () => {
  it('devuelve el grupo del globo del vuelo de instruccion', () => {
    const doc = conLicencia(
      [...makeFlights(10, { date: '2026-06-01', pilotFunction: 'PIC', durationMin: 40,
        takeoffs: 1, landings: 1 }), vueloDeRecencia()],
      { balloons: [makeBalloon({ id: 'b1', envelopeVolumeM3: 4500 })] },
    )
    expect(currency(doc, HOY, 'hot_air').maxGroup).toBe('B')
  })

  it('no aplica a la clase de gas', () => {
    const doc = conLicencia([], {
      balloons: [makeBalloon({ id: 'b1', balloonClass: 'gas', envelopeVolumeM3: 1000 })],
    })
    expect(currency(doc, HOY, 'gas').maxGroup).toBe(null)
  })
})

describe('avisos de lo que no se modela', () => {
  it('avisa de BFCL.160(b) cuando hay vuelos de mas de una clase', () => {
    const doc = conLicencia([
      makeFlight({ balloonId: 'b1' }),
      makeFlight({ balloonId: 'b2' }),
    ], {
      balloons: [makeBalloon({ id: 'b1' }), makeBalloon({ id: 'b2', balloonClass: 'gas' })],
    })
    expect(currency(doc, HOY, 'hot_air').warnings.join(' ')).toContain('BFCL.160(b)')
  })

  it('no avisa cuando solo hay una clase', () => {
    const doc = conLicencia([makeFlight({})])
    expect(currency(doc, HOY, 'hot_air').warnings).toEqual([])
  })
})

describe('conjunto', () => {
  it('met exige los cuatro contadores', () => {
    const casi = conLicencia(
      makeFlights(10, { date: '2026-06-01', pilotFunction: 'PIC', durationMin: 40,
        takeoffs: 1, landings: 1 }),
    )
    expect(currency(casi, HOY, 'hot_air').met).toBe(false)

    casi.flights.push(vueloDeRecencia())
    expect(currency(casi, HOY, 'hot_air').met).toBe(true)
  })

  it('currentUntil es la mas temprana de las caducidades', () => {
    const doc = conLicencia([
      ...makeFlights(10, { date: '2026-06-01', pilotFunction: 'PIC', durationMin: 40,
        takeoffs: 1, landings: 1 }),
      vueloDeRecencia(),
    ])
    // Los de 24 meses caducan el 31/05/2028, el de 48 el 28/02/2029.
    expect(currency(doc, HOY, 'hot_air').currentUntil).toBe('2028-05-31')
  })

  it('marca parcial un contador que se apoya en un vuelo incompleto', () => {
    const doc = conLicencia([
      makeFlight({ date: '2026-06-01', pilotFunction: 'PIC', durationOverrideMin: 400,
        complete: false }),
    ])
    expect(item(doc, 'picMinutes').partial).toBe(true)
  })
})
