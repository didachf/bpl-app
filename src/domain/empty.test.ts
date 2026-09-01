// src/domain/empty.test.ts
import { describe, it, expect } from 'vitest'
import { emptyDocument, SEEDED_SITES } from './empty'
import { CURRENT_SCHEMA_VERSION } from './schema'

describe('emptyDocument', () => {
  it('arranca en la version de esquema actual', () => {
    expect(emptyDocument().schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('trae los tres campos habituales sembrados', () => {
    const nombres = emptyDocument().sites.map(s => s.name)
    expect(nombres).toEqual(['Igualada', 'Tarrega', 'Agramunt'])
  })

  it('no trae globos, personas ni vuelos', () => {
    const d = emptyDocument()
    expect(d.balloons).toEqual([])
    expect(d.people).toEqual([])
    expect(d.flights).toEqual([])
  })

  it('deja los datos del piloto en blanco para que los rellene el asistente', () => {
    expect(emptyDocument().pilot.name).toBe('')
    expect(emptyDocument().pilot.licenceIssued).toBe(null)
  })

  it('devuelve un objeto nuevo cada vez, sin estado compartido', () => {
    const a = emptyDocument()
    a.sites.push(SEEDED_SITES[0])
    expect(emptyDocument().sites).toHaveLength(3)
  })
})
