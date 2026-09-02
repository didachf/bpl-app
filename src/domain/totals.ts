import { flightDurationMin, hasConsistentTimes } from './flight'
import type { IsoDate, LogbookDoc } from './types'

export interface LogbookTotals {
  flights: number
  /** Tiempo total de vuelo en minutos. Formatear a horas es cosa de la interfaz. */
  minutes: number
  takeoffs: number
  landings: number
  inflations: number
  /** Algun vuelo contribuyente esta incompleto o tiene las horas incoherentes. */
  partial: boolean
}

/**
 * Acumulado del cuaderno hasta `asOf`.
 *
 * AMC1 BFCL.050(a)(2) exige anotar, por cada vuelo, "total time of flight" y
 * "accumulated total time of flight". Esto es lo segundo.
 *
 * **Es un acumulador, no un juez.** A diferencia de `currency`, aqui no se
 * filtra por clase de globo, ni por grupo, ni por firma, ni por quien
 * supervisaba. Un vuelo que la vigencia excluye sigue siendo un vuelo volado, y
 * el acumulado del cuaderno los cuenta todos. La distincion es deliberada:
 * `logbookTotals` responde "cuanto has volado", `currency` responde "que cuenta
 * legalmente hoy".
 *
 * Lo unico que se descarta son los vuelos con fecha futura, que no son un
 * criterio reglamentario sino un dato mal metido.
 */
export function logbookTotals(doc: LogbookDoc, asOf: IsoDate): LogbookTotals {
  const vuelos = doc.flights.filter(f => f.date <= asOf)
  return {
    flights: vuelos.length,
    minutes: vuelos.reduce((s, f) => s + flightDurationMin(f), 0),
    takeoffs: vuelos.reduce((s, f) => s + f.takeoffs, 0),
    landings: vuelos.reduce((s, f) => s + f.landings, 0),
    inflations: vuelos.reduce((s, f) => s + f.inflations, 0),
    partial: vuelos.some(f => !f.complete || !hasConsistentTimes(f)),
  }
}
