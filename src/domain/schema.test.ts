// src/domain/schema.test.ts
import { describe, it, expect } from 'vitest'
import { CURRENT_SCHEMA_VERSION, migrate, validate, type Migration } from './schema'
import { makeDoc, makeFlight } from './fixtures'

describe('validate', () => {
  it('acepta un documento bien formado', () => {
    const r = validate(makeDoc({ flights: [makeFlight({})] }))
    expect(r.ok).toBe(true)
  })

  it('rechaza cualquier cosa que no sea un objeto', () => {
    expect(validate(null).ok).toBe(false)
    expect(validate('texto').ok).toBe(false)
    expect(validate([]).ok).toBe(false)
  })

  it('rechaza un documento sin version de esquema', () => {
    const d: any = makeDoc()
    delete d.schemaVersion
    const r = validate(d)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toContain('schemaVersion')
  })

  it('rechaza un documento con una coleccion que no es array', () => {
    const d: any = makeDoc()
    d.flights = {}
    const r = validate(d)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toContain('flights')
  })

  it('rechaza un vuelo sin identificador', () => {
    const d: any = makeDoc({ flights: [makeFlight({})] })
    delete d.flights[0].id
    expect(validate(d).ok).toBe(false)
  })

  it('acumula todos los errores en lugar de parar en el primero', () => {
    const d: any = { schemaVersion: 1 }
    const r = validate(d)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(1)
  })
})

describe('migrate', () => {
  it('devuelve el documento tal cual si ya esta en la version actual', () => {
    const d = makeDoc()
    expect(migrate(d).schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('aplica las migraciones en cadena hasta llegar a la version destino', () => {
    // Mapa sintetico: la clave N migra de la version N a la N+1.
    const migraciones: Record<number, Migration> = {
      1: (d: any) => ({ ...d, schemaVersion: 2, extra: 'de la 1 a la 2' }),
      2: (d: any) => ({ ...d, schemaVersion: 3, extra: d.extra + ', y de la 2 a la 3' }),
    }
    const salida: any = migrate(makeDoc({ schemaVersion: 1 }), 3, migraciones)
    expect(salida.schemaVersion).toBe(3)
    expect(salida.extra).toBe('de la 1 a la 2, y de la 2 a la 3')
  })

  it('falla en lugar de adivinar si falta una migracion de la cadena', () => {
    expect(() => migrate(makeDoc({ schemaVersion: 1 }), 3, {})).toThrow(/migracion/i)
  })

  it('falla si el documento viene de una version mas nueva que la que entendemos', () => {
    expect(() => migrate(makeDoc({ schemaVersion: 9 }), 1, {})).toThrow(/mas nueva/i)
  })
})
