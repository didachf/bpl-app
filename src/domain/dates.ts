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

/**
 * Ultimo dia del mes de una fecha.
 *
 * Hace falta por AMC1 BFCL.160(a)(1)(ii)(e): "The 48-month period should be
 * counted from the last day of the month in which the preceding training
 * flight took place." Contarlo desde la fecha del vuelo pierde hasta 30 dias
 * de vigencia.
 */
export function endOfMonth(date: IsoDate): IsoDate {
  const [y, m] = date.split('-').map(Number)
  return format(y, m, new Date(y, m, 0).getDate())
}

/**
 * Suma (o resta) dias a una fecha.
 *
 * Opera en UTC a proposito. Construir la fecha en horario local y sumarle un
 * dia puede caer dentro de un cambio de hora y devolver el dia anterior a las
 * 23:00, que es un error de un dia dificil de ver.
 */
export function addDays(date: IsoDate, n: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return format(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}
