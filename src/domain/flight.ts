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
 * Nunca devuelve un negativo, ni por unas marcas de tiempo invertidas ni por
 * una anulacion manual negativa, para que un dato mal metido no reste horas del
 * acumulado. Los contadores lo señalan aparte con hasConsistentTimes.
 */
export function flightDurationMin(f: Flight): number {
  if (f.durationOverrideMin !== null) return Math.max(0, f.durationOverrideMin)
  const from = Date.parse(f.departure.timestamp)
  const to = Date.parse(f.arrival.timestamp)
  if (Number.isNaN(from) || Number.isNaN(to)) return 0
  return Math.max(0, Math.round((to - from) / 60000))
}

/**
 * Las dos marcas de tiempo del vuelo son coherentes entre si.
 *
 * `flightDurationMin` devuelve 0 ante una llegada anterior a la salida, para
 * que un dato mal metido no reste horas del acumulado. Pero ese 0 hace que el
 * vuelo desaparezca del contador sin dejar rastro, asi que los contadores
 * necesitan poder distinguirlo de un vuelo legitimamente corto y avisar.
 */
export function hasConsistentTimes(f: Flight): boolean {
  if (f.durationOverrideMin !== null) return f.durationOverrideMin >= 0
  const from = Date.parse(f.departure.timestamp)
  const to = Date.parse(f.arrival.timestamp)
  // Esta guarda es redundante y se deja por claridad: cualquier comparacion con
  // NaN devuelve false, asi que el return de abajo ya daria false. En
  // flightDurationMin la guarda equivalente SI hace falta, porque alli la
  // aritmetica propagaria el NaN hasta el resultado.
  if (Number.isNaN(from) || Number.isNaN(to)) return false
  return to >= from
}
