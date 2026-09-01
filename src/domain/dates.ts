// src/domain/dates.ts
import type { IsoDate } from './types'

/**
 * Suma (o resta, con n negativo) meses de calendario a una fecha "YYYY-MM-DD".
 *
 * Si el mes destino no tiene ese dia, se recorta al ultimo dia del mes. Es el
 * mismo criterio que usa el reglamento al hablar de "en los ultimos 24 meses",
 * y evita que un vuelo del 31 de enero se convierta en uno del 3 de marzo.
 */
export function addMonths(date: IsoDate, n: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number)
  const targetMonthIndex = (m - 1) + n
  const targetYear = y + Math.floor(targetMonthIndex / 12)
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  const day = Math.min(d, lastDay)
  return format(targetYear, targetMonth + 1, day)
}

/** Fecha de calendario local de un instante. Local y no UTC, a proposito. */
export function toIsoDate(d: Date): IsoDate {
  return format(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function format(y: number, m: number, d: number): IsoDate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
