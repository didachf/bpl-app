// src/domain/balloon.ts
import type { BalloonGroup } from './types'

/**
 * Grupo de globo de aire caliente según el volumen de envolvente.
 * Fuente: EASA Easy Access Rules for Balloons, definición de grupos.
 *   A: hasta 3400 m3
 *   B: 3401 a 6000 m3
 *   C: 6001 a 10500 m3
 *   D: mas de 10500 m3
 * Los limites del reglamento son enteros, asi que cualquier valor por encima
 * de 3400 y por debajo de 3401 cae en el grupo superior.
 */
export function groupFromVolume(m3: number): BalloonGroup {
  if (!(m3 > 0)) throw new Error(`Volumen de envolvente invalido: ${m3}`)
  if (m3 <= 3400) return 'A'
  if (m3 <= 6000) return 'B'
  if (m3 <= 10500) return 'C'
  return 'D'
}
