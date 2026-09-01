import { describe, it, expect } from 'vitest'
import { hasRole } from './people'
import { makeDoc, makePerson } from './fixtures'

describe('hasRole', () => {
  const doc = makeDoc()

  it('acepta a quien existe y tiene el rol', () => {
    expect(hasRole(doc, 'p2', 'instructor')).toBe(true)
    expect(hasRole(doc, 'p3', 'examiner')).toBe(true)
  })

  it('rechaza a quien existe pero no tiene ese rol', () => {
    expect(hasRole(doc, 'p1', 'instructor')).toBe(false)
    expect(hasRole(doc, 'p1', 'examiner')).toBe(false)
  })

  it('rechaza un identificador que no esta en el documento', () => {
    expect(hasRole(doc, 'inventado', 'instructor')).toBe(false)
  })

  it('rechaza null', () => {
    expect(hasRole(doc, null, 'instructor')).toBe(false)
  })

  it('acepta a quien tiene varios roles', () => {
    const d = makeDoc({ people: [makePerson({ id: 'px', roles: ['pilot', 'instructor'] })] })
    expect(hasRole(d, 'px', 'instructor')).toBe(true)
    expect(hasRole(d, 'px', 'pilot')).toBe(true)
  })
})
