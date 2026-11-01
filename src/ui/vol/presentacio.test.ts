// src/ui/vol/presentacio.test.ts
import { describe, it, expect } from 'vitest'
import {
  altFt, colorAltitud, etiquetaObjectiu, graus, horaLocal, kt, marquesCadaCinc, ordreCurta, pasEnCurs,
  tempsVol, textObjectiu, trossosCami, vario,
} from './presentacio'
import { miles } from '../../services/nav/campo'

describe('cifras de la franja', () => {
  it('altitud en ft redondeada a 10', () => {
    expect(altFt(469.4)).toBe(miles(1540))
    expect(altFt(380)).toBe(miles(1250))
  })
  it('vario con signo y coma, menos de verdad', () => {
    expect(vario(0.3)).toBe('+0,3')
    expect(vario(-1.24)).toBe('−1,2')
    expect(vario(0.02)).toBe('0,0')
    expect(vario(null)).toBe('–')
  })
  it('rumbo con tres cifras y velocidad en kt', () => {
    expect(graus(61.4)).toBe('061°')
    expect(graus(359.7)).toBe('000°')
    expect(kt(2.21)).toBe('4,3')
  })
  it('tiempo de vuelo y hora local', () => {
    expect(tempsVol(34 * 60_000 + 59_000)).toBe('0:34')
    expect(tempsVol(75 * 60_000)).toBe('1:15')
    expect(horaLocal(Date.parse('2026-10-10T06:34:00Z'))).toBe('08:34')
  })
})

describe('el plan', () => {
  it('la orden corta de la franja', () => {
    expect(ordreCurta('Ara, puja ràpid (2,5 a 3 m/s) fins a 1 750 ft.')).toBe('Puja ràpid fins a 1 750 ft')
    expect(ordreCurta('Manté 1 750 ft 2 min, cap a 068° a 6 kt (previst).')).toBe('Manté 1 750 ft 2 min')
    expect(ordreCurta('Baixa ràpid (3 a 5 m/s) fins a terra, i hi arribes al punt més proper.')).toBe('Baixa ràpid fins a terra, i hi arribes al punt més proper')
    expect(ordreCurta('Manté terra fins al punt més proper, cap a 011° a 2 kt (previst).')).toBe('Manté terra fins al punt més proper')
  })
  it('el paso en curso por la hora', () => {
    const plan = [
      { tipo: 'cambiar', franja: 1, modo: 'puja_rapid', inicioMin: 0, finMin: 1 },
      { tipo: 'mantener', franja: 1, modo: null, inicioMin: 1, finMin: 3 },
      { tipo: 'cambiar', franja: 0, modo: 'baixa_rapid', inicioMin: 3, finMin: 4 },
    ] as const
    const t0 = Date.parse('2026-10-10T06:34:00Z')
    expect(pasEnCurs([...plan], t0, t0 + 30_000)).toBe(0)
    expect(pasEnCurs([...plan], t0, t0 + 90_000)).toBe(1)
    expect(pasEnCurs([...plan], t0, t0 + 10 * 60_000)).toBe(2)
  })
  it('la etiqueta y el texto del objetivo', () => {
    expect(etiquetaObjectiu({ tipo: 'aterrar' })).toBe('ATERRAR')
    expect(etiquetaObjectiu({ tipo: 'altitud', altM: 762 })).toBe(`A ${miles(2500)} FT`)
    expect(etiquetaObjectiu({ tipo: 'qualsevol' })).toBe(null)
    expect(textObjectiu({ tipo: 'altitud', altM: 762 })).toBe(`a ${miles(2500)} ft`)
  })
})

describe('lo que se pinta en el mapa', () => {
  it('la rampa de la traza: del suelo a 3 750 ft', () => {
    expect(colorAltitud(380, 380, 1143)).toBe('#ffd400')
    expect(colorAltitud(1143, 380, 1143)).toBe('#a77bff')
    expect(colorAltitud(2000, 380, 1143)).toBe('#a77bff')
  })
  it('el camino en trozos a ras y en altura, sin huecos', () => {
    const c = (aRas: boolean, i: number) => ({ lat: i, lon: i, altM: aRas ? 390 : 600, aRas })
    const t = trossosCami([c(false, 0), c(false, 1), c(true, 2), c(true, 3), c(false, 4)])
    expect(t.map(x => [x.aRas, x.punts.length])).toEqual([[false, 2], [true, 3], [false, 2]])
  })
  it('marcas a los 5 y 10 min', () => {
    const cam = Array.from({ length: 12 }, (_, i) => ({ lat: i, lon: i, altM: 500, aRas: false }))
    expect(marquesCadaCinc(cam).map(m => m.min)).toEqual([5, 10])
  })
})
