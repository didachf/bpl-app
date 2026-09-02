import { describe, it, expect } from 'vitest'
import {
  formatHm, formatDateShort, formatDateLong, formatTime, formatCoords,
  labelFunction, labelClass, labelGroup, labelSignature, labelPermit, labelRole,
} from './format'

describe('formatHm', () => {
  it('parte los minutos en horas y minutos con dos cifras', () => {
    expect(formatHm(860)).toBe('14:20')
  })

  it('no pone cero a la izquierda en las horas', () => {
    expect(formatHm(65)).toBe('1:05')
  })

  it('menos de una hora sigue llevando el cero de las horas', () => {
    expect(formatHm(25)).toBe('0:25')
  })

  it('cero es cero, no una cadena vacia', () => {
    expect(formatHm(0)).toBe('0:00')
  })

  it('pasa de las 99 horas sin truncar', () => {
    expect(formatHm(100 * 60 + 7)).toBe('100:07')
  })

  it('un negativo se trata como cero en lugar de pintar un menos', () => {
    expect(formatHm(-30)).toBe('0:00')
  })
})

describe('formatDateShort', () => {
  it('dia, mes abreviado en minuscula y año', () => {
    expect(formatDateShort('2026-08-31')).toBe('31 ago 2026')
  })

  it('el dia lleva cero a la izquierda para que la columna cuadre', () => {
    expect(formatDateShort('2026-08-09')).toBe('09 ago 2026')
  })

  it('septiembre se abrevia sin punto', () => {
    expect(formatDateShort('2026-09-04')).toBe('04 sep 2026')
  })

  it('una fecha vacia no revienta', () => {
    expect(formatDateShort('')).toBe('')
  })
})

describe('formatDateLong', () => {
  it('mes entero', () => {
    expect(formatDateLong('2026-08-31')).toBe('31 agosto 2026')
  })
})

describe('formatTime', () => {
  it('devuelve la hora local de una marca ISO', () => {
    // 05:32 UTC son las 07:32 en Madrid en agosto, que es la maqueta.
    expect(formatTime('2026-08-31T05:32:00Z')).toBe('07:32')
  })

  it('una marca vacia se pinta como raya y no como NaN', () => {
    expect(formatTime('')).toBe('--:--')
  })

  it('una marca ilegible se pinta como raya', () => {
    expect(formatTime('no es una fecha')).toBe('--:--')
  })
})

describe('formatCoords', () => {
  it('tres decimales, coma decimal no, punto, que es lo que se teclea en un GPS', () => {
    expect(formatCoords({ lat: 41.7712, lon: 1.0384 })).toBe('41.771, 1.038')
  })
})

describe('etiquetas', () => {
  it('las cinco funciones del piloto', () => {
    expect(labelFunction('PIC')).toBe('PIC')
    expect(labelFunction('PIC_SOLO_SUPERVISED')).toBe('Solo supervisado')
    expect(labelFunction('DUAL')).toBe('Doble mando')
    expect(labelFunction('FI_B')).toBe('Instructor')
    expect(labelFunction('FE_B')).toBe('Examinador')
  })

  it('las cuatro clases de BFCL.010, no dos', () => {
    expect(labelClass('hot_air')).toBe('Aire caliente')
    expect(labelClass('gas')).toBe('Gas')
    expect(labelClass('mixed')).toBe('Mixto')
    expect(labelClass('hot_air_airship')).toBe('Dirigible de aire caliente')
  })

  it('el grupo lleva el tramo de volumen, que es lo que nadie recuerda', () => {
    expect(labelGroup('A')).toBe('A, hasta 3.400 m³')
    expect(labelGroup('D')).toBe('D, mas de 10.500 m³')
  })

  it('los tres estados de firma', () => {
    expect(labelSignature('not_required')).toBe('No hace falta')
    expect(labelSignature('pending')).toBe('Pendiente')
    expect(labelSignature('signed')).toBe('Firmado')
  })

  it('los cuatro estados de permiso de un campo', () => {
    expect(labelPermit('unknown')).toBe('Sin averiguar')
    expect(labelPermit('granted')).toBe('Concedido')
    expect(labelPermit('denied')).toBe('Denegado')
    expect(labelPermit('not_needed')).toBe('No hace falta')
  })

  it('los cinco roles', () => {
    expect(labelRole('instructor')).toBe('Instructor')
    expect(labelRole('examiner')).toBe('Examinador')
    expect(labelRole('pilot')).toBe('Piloto')
    expect(labelRole('crew')).toBe('Equipo de tierra')
    expect(labelRole('passenger')).toBe('Pasajero')
  })
})
