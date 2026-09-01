// src/domain/balloon.test.ts
import { describe, it, expect } from 'vitest'
import { groupFromVolume } from './balloon'

describe('groupFromVolume', () => {
  it('devuelve A hasta 3400 m3 inclusive', () => {
    expect(groupFromVolume(1000)).toBe('A')
    expect(groupFromVolume(3400)).toBe('A')
  })

  it('devuelve B desde 3401 hasta 6000 inclusive', () => {
    expect(groupFromVolume(3401)).toBe('B')
    expect(groupFromVolume(6000)).toBe('B')
  })

  it('devuelve C desde 6001 hasta 10500 inclusive', () => {
    expect(groupFromVolume(6001)).toBe('C')
    expect(groupFromVolume(10500)).toBe('C')
  })

  it('devuelve D por encima de 10500', () => {
    expect(groupFromVolume(10501)).toBe('D')
    expect(groupFromVolume(25000)).toBe('D')
  })

  it('trata los valores no enteros por el mismo criterio', () => {
    expect(groupFromVolume(3400.5)).toBe('B')
  })

  it('rechaza volúmenes no positivos', () => {
    expect(() => groupFromVolume(0)).toThrow()
    expect(() => groupFromVolume(-5)).toThrow()
  })
})
