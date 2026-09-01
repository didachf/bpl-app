// src/domain/empty.test.ts
import { describe, it, expect } from 'vitest'
import { emptyDocument, SELF_PERSON_ID, SEEDED_SITES } from './empty'
import { CURRENT_SCHEMA_VERSION } from './schema'

describe('emptyDocument', () => {
  it('arranca en la version de esquema actual', () => {
    expect(emptyDocument().schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('trae los tres campos habituales sembrados', () => {
    const nombres = emptyDocument().sites.map(s => s.name)
    expect(nombres).toEqual(['Igualada', 'Tarrega', 'Agramunt'])
  })

  it('no trae globos ni vuelos', () => {
    const d = emptyDocument()
    expect(d.balloons).toEqual([])
    expect(d.flights).toEqual([])
  })

  it('trae al titular como persona, y enlazado desde pilot', () => {
    const d = emptyDocument()
    expect(d.people).toHaveLength(1)
    expect(d.people[0].id).toBe(SELF_PERSON_ID)
    expect(d.people[0].roles).toEqual(['pilot'])
    expect(d.pilot.personId).toBe(SELF_PERSON_ID)
  })

  it('el titular NO arranca con rol de instructor ni de examinador', () => {
    // Si el usuario se los añade a mano, hasRoleAndIsNotThePilot lo frena.
    // Pero no se los damos nosotros de salida.
    expect(emptyDocument().people[0].roles).not.toContain('instructor')
    expect(emptyDocument().people[0].roles).not.toContain('examiner')
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
