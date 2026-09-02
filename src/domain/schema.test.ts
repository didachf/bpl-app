// src/domain/schema.test.ts
import { describe, it, expect } from 'vitest'
import { CURRENT_SCHEMA_VERSION, migrate, validate, type Migration } from './schema'
import { makeDoc, makeFlight } from './fixtures'
import { emptyDocument } from './empty'

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

describe('migrate, guardas del bucle', () => {
  it('falla si una migracion devuelve la MISMA version, en vez de girar sin fin', () => {
    const quieta: Record<number, Migration> = { 1: (d: any) => ({ ...d, schemaVersion: 1 }) }
    expect(() => migrate(makeDoc({ schemaVersion: 1 }), 2, quieta)).toThrow(/no ha subido/i)
  })

  it('falla si una migracion RETROCEDE la version', () => {
    const atras: Record<number, Migration> = { 1: (d: any) => ({ ...d, schemaVersion: 0 }) }
    expect(() => migrate(makeDoc({ schemaVersion: 1 }), 2, atras)).toThrow(/no ha subido/i)
  })
})

describe('migracion a la version 2, limites de viento', () => {
  const v1 = () => ({
    schemaVersion: 1,
    pilot: {
      personId: 'me', name: 'Didac', address: 'Calle 1',
      licenceNumber: null, medicalExpiry: null, licenceIssued: null,
    },
    balloons: [{
      id: 'b1', registration: 'EC-KMU', manufacturer: 'Ultramagic', model: 'M-105',
      balloonClass: 'hot_air', envelopeVolumeM3: 2900,
    }],
    sites: [], people: [], flights: [],
  })

  it('la version actual es la 2', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2)
  })

  it('un documento de la version 1 llega a la 2 sin perder nada', () => {
    const v2 = migrate(v1() as never)
    expect(v2.schemaVersion).toBe(2)
    expect(v2.balloons[0].registration).toBe('EC-KMU')
    expect(v2.pilot.name).toBe('Didac')
  })

  it('a un globo de la version 1 el limite le queda en null, no en un numero inventado', () => {
    // Poner 15 kt por defecto seria inventar una limitacion de aeronavegabilidad
    // que solo esta en el manual del globo concreto. Null significa "no lo se".
    expect(migrate(v1() as never).balloons[0].maxSurfaceWindKt).toBe(null)
  })

  it('al piloto de la version 1 el minimo personal le queda en null', () => {
    expect(migrate(v1() as never).pilot.personalWindLimitKt).toBe(null)
  })

  it('un documento que ya es version 2 no se toca', () => {
    const v2 = emptyDocument()
    expect(migrate(v2)).toEqual(v2)
  })
})
