// src/domain/flight.ts
import type { Flight } from './types'

/**
 * Duracion del vuelo en minutos.
 *
 * La anulacion manual gana cuando existe, porque la hora de despegue real y la
 * de puesta en marcha pueden diferir y a veces el piloto anota el dato del
 * cuaderno del ATO en lugar del reloj.
 *
 * Sin anulacion se restan las dos marcas de tiempo. Al ser ISO con zona, un
 * vuelo que cruza medianoche o un cambio de hora salen bien sin casos
 * especiales.
 *
 * Una llegada anterior a la salida devuelve 0 y no un negativo, para que un
 * dato mal metido no reste horas del acumulado. La interfaz avisa aparte.
 */
export function flightDurationMin(f: Flight): number {
  if (f.durationOverrideMin !== null) return f.durationOverrideMin
  const from = Date.parse(f.departure.timestamp)
  const to = Date.parse(f.arrival.timestamp)
  if (Number.isNaN(from) || Number.isNaN(to)) return 0
  return Math.max(0, Math.round((to - from) / 60000))
}
