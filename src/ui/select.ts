// src/ui/select.ts
// Consultas de lectura sobre el documento. Puras.
//
// Barrido lineal a proposito: son menos de 100 vuelos y un puñado de globos y
// personas, asi que un indice seria complejidad sin comprador. Ver el spec §2.
import { formatCoords } from './format'
import type {
  Balloon, EndPoint, Flight, LogbookDoc, Person, PilotFunction, Site, Uuid,
} from '../domain/types'

export function balloonById(doc: LogbookDoc, id: Uuid | null): Balloon | null {
  if (id === null) return null
  return doc.balloons.find(b => b.id === id) ?? null
}

export function personById(doc: LogbookDoc, id: Uuid | null): Person | null {
  if (id === null) return null
  return doc.people.find(p => p.id === id) ?? null
}

export function siteById(doc: LogbookDoc, id: Uuid | null): Site | null {
  if (id === null) return null
  return doc.sites.find(s => s.id === id) ?? null
}

/**
 * Nombre de una persona para pantalla.
 *
 * Un identificador que ya no esta en el documento devuelve "Sin asignar" y no
 * el propio identificador: un uuid crudo en la pantalla no le dice nada a
 * nadie. El caso ocurre de verdad al borrar una persona que figuraba en un
 * vuelo antiguo.
 */
export function personName(doc: LogbookDoc, id: Uuid | null): string {
  const p = personById(doc, id)
  if (p === null) return 'Sin asignar'
  return p.name.trim() === '' ? 'Sin nombre' : p.name
}

/** "EC-KMU · M-105". Sin modelo, solo la matricula, sin el separador colgando. */
export function balloonLabel(b: Balloon): string {
  return b.model.trim() === '' ? b.registration : `${b.registration} · ${b.model}`
}

/**
 * Como se llama un punto de despegue o de aterrizaje.
 *
 * El orden importa: primero el catalogo, luego las coordenadas sueltas. Un
 * `siteId` que ya no existe cae a las coordenadas en lugar de mentir con un
 * nombre inventado.
 */
export function endpointLabel(doc: LogbookDoc, ep: EndPoint): string {
  const s = siteById(doc, ep.siteId)
  if (s !== null) return s.name
  if (ep.coords !== null) return formatCoords(ep.coords)
  return 'Sin indicar'
}

/**
 * Titulo del vuelo, el renglon gordo de la tarjeta.
 *
 * Un cautivo no lleva flecha porque no va a ninguna parte, y escribir
 * "Igualada → Igualada" es ruido. Un aterrizaje fuera del catalogo con
 * distancia conocida se resume en "campo a 11 km", que es como se cuenta de
 * viva voz, y sin distancia cae a las coordenadas.
 */
export function flightTitle(doc: LogbookDoc, f: Flight): string {
  const salida = endpointLabel(doc, f.departure)
  if (f.tether === 'tethered') return `${salida}, cautivo`

  const site = siteById(doc, f.arrival.siteId)
  let llegada: string
  if (site !== null) llegada = site.name
  else if (f.arrival.coords !== null && f.distanceKm !== null) {
    llegada = `campo a ${Math.round(f.distanceKm)} km`
  } else if (f.arrival.coords !== null) llegada = formatCoords(f.arrival.coords)
  else llegada = 'Sin indicar'

  return `${salida} → ${llegada}`
}

/**
 * Del mas reciente al mas antiguo.
 *
 * Desempata por la hora de salida, porque en un dia de curso se vuela dos
 * veces y el orden entre esos dos no puede ser el de insercion. Devuelve una
 * copia: ordenar en el sitio mutaria el documento del contexto.
 */
export function sortedFlights(flights: Flight[]): Flight[] {
  return [...flights].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    const ta = Date.parse(a.departure.timestamp)
    const tb = Date.parse(b.departure.timestamp)
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0
    return tb - ta
  })
}

/** Los años que tienen algun vuelo, para las pastillas de filtro. */
export function flightYears(flights: Flight[]): string[] {
  const años = new Set(flights.map(f => f.date.slice(0, 4)).filter(a => a !== ''))
  return [...años].sort().reverse()
}

export interface FlightFilter {
  year?: string
  balloonId?: Uuid
  pilotFunction?: PilotFunction
}

/** Los filtros se acumulan. Un campo ausente no filtra nada. */
export function filterFlights(flights: Flight[], filtro: FlightFilter): Flight[] {
  return flights.filter(f => {
    if (filtro.year !== undefined && f.date.slice(0, 4) !== filtro.year) return false
    if (filtro.balloonId !== undefined && f.balloonId !== filtro.balloonId) return false
    if (filtro.pilotFunction !== undefined && f.pilotFunction !== filtro.pilotFunction) return false
    return true
  })
}
