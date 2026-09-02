// src/ui/today.ts
import { toIsoDate } from '../domain/dates'

/**
 * La fecha local de hoy, "YYYY-MM-DD".
 *
 * Unico punto de la app que lee el reloj. El dominio recibe siempre `asOf`
 * como parametro para poder probarse; si alguna funcion de dominio empezara a
 * llamar aqui, dejaria de ser pura y las 174 pruebas dejarian de valer.
 */
export function hoy(): string {
  return toIsoDate(new Date())
}
