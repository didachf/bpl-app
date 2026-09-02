// src/ui/incomplete.ts
// Que le falta a un vuelo para estar rematado.
//
// Esto NO es reglamento, es interfaz. `domain/` no opina sobre si un vuelo
// esta a medio meter, solo sobre si cuenta. Por eso vive aqui y por eso la
// lista es de etiquetas de pantalla y no de claves.
//
// Cada comprobacion es objetiva: un campo vacio, un identificador que no esta
// en el catalogo, o un contador a cero que ningun vuelo real tiene. Nada de
// mirar `complete`, que es el resultado y no la causa.
import { balloonById, personById } from './select'
import type { EndPoint, Flight, LogbookDoc } from '../domain/types'

function tieneHora(ep: EndPoint): boolean {
  return !Number.isNaN(Date.parse(ep.timestamp))
}

function tieneSitio(doc: LogbookDoc, ep: EndPoint): boolean {
  return ep.coords !== null || doc.sites.some(s => s.id === ep.siteId)
}

/**
 * Los campos que le faltan al vuelo, en el orden en que se rellenan.
 *
 * El orden es el del formulario y no el alfabetico, para que la lista de
 * "faltan 6 campos" se lea de arriba abajo igual que la pantalla.
 */
export function missingFields(doc: LogbookDoc, f: Flight): string[] {
  const faltan: string[] = []

  if (personById(doc, f.picId) === null) faltan.push('Piloto al mando')
  if (balloonById(doc, f.balloonId) === null) faltan.push('Globo')
  if (!tieneHora(f.departure)) faltan.push('Hora de despegue')
  if (!tieneSitio(doc, f.departure)) faltan.push('Campo de despegue')
  if (!tieneHora(f.arrival)) faltan.push('Hora de aterrizaje')
  if (!tieneSitio(doc, f.arrival)) faltan.push('Lugar de aterrizaje')

  // Un vuelo tiene al menos un inflado y un despegue. Un cero es un dato sin
  // meter, no un globo que no llego a hincharse: eso seria un vuelo que no
  // existe y no se anota.
  if (f.inflations === 0) faltan.push('Inflados')
  if (f.takeoffs === 0) faltan.push('Despegues')
  if (f.landings === 0) faltan.push('Aterrizajes')

  // BFCL.160(e) exige firma del FI(B) en los dobles mando y los supervisados,
  // asi que sin instructor asignado el vuelo no esta rematado.
  const necesitaInstructor = f.pilotFunction === 'DUAL' || f.pilotFunction === 'PIC_SOLO_SUPERVISED'
  if (necesitaInstructor && personById(doc, f.instructorId) === null) faltan.push('Instructor')
  if (f.signatureStatus === 'pending') faltan.push('Firma del instructor')

  return faltan
}

/** No queda nada por meter. Es lo que habilita el boton de marcar como completo. */
export function canBeCompleted(doc: LogbookDoc, f: Flight): boolean {
  return missingFields(doc, f).length === 0
}
