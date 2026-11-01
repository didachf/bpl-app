// src/services/vuelo/rumbo.test.ts
import { describe, it, expect } from 'vitest'
import { distanciaM, formatDistancia, horaLlegada, rumboDirecto } from './rumbo'
import { aPlano } from '../nav/geo'

const T = { lat: 41.6561, lon: 1.149 }
const I = { lat: 41.5842, lon: 1.6528 }

describe('rumbo y distancia por circulo maximo', () => {
  it('norte, este, sur y oeste', () => {
    expect(rumboDirecto(T, { lat: 41.7, lon: 1.149 })).toBeCloseTo(0, 6)
    expect(rumboDirecto(T, { lat: 41.6561, lon: 1.2 })).toBeCloseTo(90, 1)
    expect(rumboDirecto(T, { lat: 41.6, lon: 1.149 })).toBeCloseTo(180, 6)
    expect(rumboDirecto(T, { lat: 41.6561, lon: 1.1 })).toBeCloseTo(270, 1)
  })
  it('Tarrega a Igualada, contra el plano del motor', () => {
    const [x, y] = aPlano({ lat0: T.lat, lon0: T.lon }, I.lat, I.lon)
    expect(distanciaM(T, I) / Math.hypot(x, y)).toBeCloseTo(1, 2)
    expect(rumboDirecto(T, I)).toBeGreaterThan(100)
    expect(rumboDirecto(T, I)).toBeLessThan(105)
  })
  it('como en las maquetas', () => {
    expect(formatDistancia(846)).toBe('850 m')
    expect(formatDistancia(2140)).toBe('2,1 km')
    expect(formatDistancia(999)).toBe('1,0 km')
  })
  it('hora de llegada a la velocidad sobre el suelo, y nada si va casi parado', () => {
    expect(horaLlegada(1000, 2, 0)).toBe(500_000)
    expect(horaLlegada(1000, 0.2, 0)).toBe(null)
  })
})
