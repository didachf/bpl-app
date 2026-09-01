// src/domain/dates.test.ts
import { describe, it, expect } from 'vitest'
import { addMonths, toIsoDate } from './dates'

describe('addMonths', () => {
  it('suma meses dentro del mismo año', () => {
    expect(addMonths('2026-03-15', 2)).toBe('2026-05-15')
  })

  it('cruza el fin de año', () => {
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
  })

  it('resta meses', () => {
    expect(addMonths('2026-09-01', -24)).toBe('2024-09-01')
  })

  it('recorta el dia cuando el mes destino es mas corto', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
  })

  it('respeta el 29 de febrero en año bisiesto', () => {
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
  })

  it('mantiene el dia cuando el mes destino es suficientemente largo', () => {
    expect(addMonths('2026-08-31', -24)).toBe('2024-08-31')
  })
})

describe('toIsoDate', () => {
  it('usa las partes locales de la fecha y no UTC', () => {
    // 1 de enero a las 00:30 en Madrid es 31 de diciembre en UTC.
    // La fecha del vuelo debe ser la local.
    const d = new Date(2026, 0, 1, 0, 30, 0)
    expect(toIsoDate(d)).toBe('2026-01-01')
  })

  it('rellena con ceros mes y dia', () => {
    expect(toIsoDate(new Date(2026, 8, 5))).toBe('2026-09-05')
  })
})

describe('orden lexicografico', () => {
  it('sirve para comparar fechas sin parsear', () => {
    expect('2026-09-01' >= '2024-09-01').toBe(true)
    expect('2024-08-31' >= '2024-09-01').toBe(false)
  })
})
