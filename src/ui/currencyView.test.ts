import { describe, it, expect } from 'vitest'
import type { CurrencyReport } from '../domain/currency'
import { describeCurrency } from './currencyView'

function report(over: Partial<CurrencyReport> = {}): CurrencyReport {
  return {
    applicable: true,
    balloonClass: 'hot_air',
    viaProficiencyCheck: false,
    items: [],
    met: false,
    currentUntil: null,
    maxGroup: null,
    groupSchedule: [],
    excluded: [],
    warnings: [],
    notModelled: [],
    ...over,
  }
}

describe('trampa 1: applicable manda sobre met', () => {
  it('a un alumno no se le enseña vigencia, aunque met venga en true', () => {
    const v = describeCurrency(report({ applicable: false, met: true }))
    expect(v.kind).toBe('no_aplica')
  })

  it('y el motivo dice por que, no se queda mudo', () => {
    const v = describeCurrency(report({ applicable: false, met: true }))
    if (v.kind !== 'no_aplica') throw new Error('deberia ser no_aplica')
    expect(v.motivo).toMatch(/licencia/i)
  })

  it('la vista de no_aplica no lleva ningun veredicto que se pueda pintar por error', () => {
    const v = describeCurrency(report({ applicable: false, met: true, currentUntil: '2028-01-01' }))
    expect('met' in v).toBe(false)
    expect('currentUntil' in v).toBe(false)
  })
})

describe('trampa 2: el grupo es una escalera, no un par con currentUntil', () => {
  it('la vista NUNCA publica un maxGroup suelto', () => {
    const v = describeCurrency(report({
      applicable: true, met: true, currentUntil: '2028-06-30',
      maxGroup: 'D', groupSchedule: [{ maxGroup: 'D', until: '2027-05-31' }],
    }))
    expect('maxGroup' in v).toBe(false)
  })

  it('los dos tramos salen los dos, no solo el de hoy', () => {
    const v = describeCurrency(report({
      applicable: true, met: true, currentUntil: '2028-06-30', maxGroup: 'D',
      groupSchedule: [
        { maxGroup: 'D', until: '2027-05-31' },
        { maxGroup: 'A', until: '2028-06-30' },
      ],
    }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.grupos).toHaveLength(2)
    expect(v.grupos[0].until).toBe('2027-05-31')
    expect(v.grupos[1].maxGroup).toBe('A')
  })

  it('sin escalera no hay lista de grupos que enseñar', () => {
    const v = describeCurrency(report({ applicable: true, met: true, groupSchedule: [] }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.grupos).toEqual([])
  })
})

describe('trampa 3: nada se descarta en silencio', () => {
  it('los avisos y lo no modelado se copian enteros', () => {
    const v = describeCurrency(report({
      warnings: ['aviso uno', 'aviso dos'],
      notModelled: ['no modelado uno'],
    }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.avisos).toEqual(['aviso uno', 'aviso dos'])
    expect(v.noModelado).toEqual(['no modelado uno'])
  })

  it('los vuelos excluidos se agrupan por motivo y se cuentan', () => {
    const v = describeCurrency(report({
      excluded: [
        { flightId: 'a', reason: 'flight_in_future' },
        { flightId: 'b', reason: 'balloon_unknown' },
        { flightId: 'c', reason: 'balloon_unknown' },
      ],
    }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.excluidos).toHaveLength(2)
    expect(v.excluidos.join(' ')).toMatch(/2 vuelos/)
    expect(v.excluidos.join(' ')).toMatch(/1 vuelo\b/)
  })

  it('sin exclusiones la lista esta vacia, no falta', () => {
    const v = describeCurrency(report())
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.excluidos).toEqual([])
  })
})

describe('los contadores', () => {
  it('los minutos se pintan en h:mm y las cuentas en enteros', () => {
    const v = describeCurrency(report({
      items: [
        {
          key: 'picMinutes', label: '6 h como PIC en 24 meses', current: 270, required: 360,
          unit: 'minutes', met: false, expiresOn: null, partial: false,
        },
        {
          key: 'takeoffs', label: '10 despegues en 24 meses', current: 12, required: 10,
          unit: 'count', met: true, expiresOn: '2027-08-31', partial: true,
        },
      ],
    }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.items[0].valor).toBe('4:30 de 6:00')
    expect(v.items[1].valor).toBe('12 de 10')
    expect(v.items[1].partial).toBe(true)
    expect(v.items[1].expiresOn).toBe('2027-08-31')
  })
})

describe('el titular', () => {
  it('vigente cuando se cumple', () => {
    const v = describeCurrency(report({ met: true, currentUntil: '2028-06-30' }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.titular).toBe('Vigente')
  })

  it('no vigente cuando no', () => {
    const v = describeCurrency(report({ met: false }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.titular).toBe('Sin vigencia')
  })

  it('dice cuando la sostiene una verificacion de competencia y no los contadores', () => {
    const v = describeCurrency(report({ met: true, viaProficiencyCheck: true }))
    if (v.kind !== 'aplica') throw new Error('deberia aplicar')
    expect(v.viaProficiencyCheck).toBe(true)
  })
})
