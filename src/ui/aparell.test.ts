// src/ui/aparell.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { aparell, aparellPerDefecte, desarAparell, desarSostre, ultimSostre } from './aparell'

class Memoria {
  m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
}

describe('el modo del aparato', () => {
  beforeEach(() => { (globalThis as any).localStorage = new Memoria() })

  it('por defecto, tablet si el lado corto mide 600 px o mas', () => {
    expect(aparellPerDefecte(1280, 800)).toBe('tauleta')
    expect(aparellPerDefecte(800, 1280)).toBe('tauleta')
    expect(aparellPerDefecte(390, 844)).toBe('telefon')
  })
  it('lo elegido manda sobre el defecto', () => {
    expect(aparell(1280, 800)).toBe('tauleta')
    desarAparell('telefon')
    expect(aparell(1280, 800)).toBe('telefon')
  })
  it('el ultimo techo, en metros, o null', () => {
    expect(ultimSostre()).toBe(null)
    desarSostre(1200)
    expect(ultimSostre()).toBe(1200)
  })
  it('sin localStorage no revienta', () => {
    (globalThis as any).localStorage = { getItem: () => { throw new Error('bloqueado') }, setItem: () => { throw new Error('bloqueado') } }
    expect(aparell(390, 844)).toBe('telefon')
    expect(ultimSostre()).toBe(null)
    expect(() => desarSostre(1200)).not.toThrow()
  })
})
