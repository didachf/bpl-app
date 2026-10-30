import { describe, it, expect } from 'vitest'
import { distancia, hora, ordenes } from './ordenes'
import { campoSintetico } from './sintetico'
import { AJUSTES_POR_DEFECTO, type AjustesNav, type Tramo } from './tipos'

const KT = 1852 / 3600
const aj: AjustesNav = { ...AJUSTES_POR_DEFECTO, altMinM: 0, altMaxM: 9999 }
const rej = { altM: [457.2, 533.4], etiqueta: ['1 500 ft', '1 750 ft'] }
// 1 500 ft al este a 10 kt, 1 750 ft al norte a 10 kt
const c = campoSintetico(rej, 60, b => (b === 0 ? [10 * KT, 0] : [0, 10 * KT]))

describe('ordenes', () => {
  it('mantener, cambiar y mantener hasta el punto', () => {
    const tramos: Tramo[] = [
      { tipo: 'mantener', franja: 0, modo: null, inicioMin: 0, finMin: 9 },
      { tipo: 'cambiar', franja: 1, modo: 'puja_rapid', inicioMin: 9, finMin: 10 },
      { tipo: 'mantener', franja: 1, modo: null, inicioMin: 10, finMin: 40 },
    ]
    expect(ordenes(c, aj, tramos)).toEqual([
      'Manté 1 500 ft 9 min, cap a 090° a 10 kt (previst).',
      'Puja ràpid (2,5 a 3 m/s) fins a 1 750 ft.',
      'Manté 1 750 ft fins al punt, cap a 000° a 10 kt (previst).',
    ])
  })
  it('el primer cambio, ara', () => {
    const tramos: Tramo[] = [
      { tipo: 'cambiar', franja: 1, modo: 'puja_lent', inicioMin: 0, finMin: 3 },
      { tipo: 'mantener', franja: 1, modo: null, inicioMin: 3, finMin: 20 },
    ]
    expect(ordenes(c, aj, tramos)[0]).toBe('Ara, puja lent (0 a 1 m/s) fins a 1 750 ft.')
  })
  it('si no se llega, hasta el punto mas proximo', () => {
    const tramos: Tramo[] = [{ tipo: 'mantener', franja: 0, modo: null, inicioMin: 0, finMin: 5 }]
    expect(ordenes(c, aj, tramos, false)).toEqual(['Manté 1 500 ft fins al punt més proper, cap a 090° a 10 kt (previst).'])
  })
  it('si se pasa por el punto a mitad de un cambio, lo dice', () => {
    const tramos: Tramo[] = [
      { tipo: 'mantener', franja: 0, modo: null, inicioMin: 0, finMin: 9 },
      { tipo: 'cambiar', franja: 1, modo: 'puja_rapid', inicioMin: 9, finMin: 10 },
    ]
    expect(ordenes(c, aj, tramos)[1]).toBe('Puja ràpid (2,5 a 3 m/s) cap a 1 750 ft, i passes pel punt pujant.')
    expect(ordenes(c, aj, tramos, false)[1]).toBe('Puja ràpid (2,5 a 3 m/s) cap a 1 750 ft, i passes pel punt més proper pujant.')
  })
  it('medido cuando la incertidumbre ha bajado', () => {
    const c2 = { ...c, sigma: new Float64Array(c.sigma.length).fill(0.3) }
    const tramos: Tramo[] = [{ tipo: 'mantener', franja: 0, modo: null, inicioMin: 0, finMin: 5 }]
    expect(ordenes(c2, aj, tramos)[0]).toContain('(mesurat)')
  })
})

describe('formatos', () => {
  it('distancias', () => {
    expect(distancia(45)).toBe('45 m')
    expect(distancia(124)).toBe('120 m')
    expect(distancia(2340)).toBe('2,3 km')
  })
  it('hora local', () => { expect(hora(Date.parse('2026-10-10T06:52Z'))).toBe('08:52') })
})
