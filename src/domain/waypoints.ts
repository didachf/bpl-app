// src/domain/waypoints.ts
// Los waypoints del documento (spec 10/10 §6.6 y §6.9). El activo es un
// identificador que se resuelve cada vez: si no esta en la lista, no hay activo.
import type { LogbookDoc, ObjectiuWaypoint, Waypoint } from './types'

export function nomNou(doc: LogbookDoc): string {
  const n = doc.waypoints.map(w => /^WP(\d+)$/.exec(w.nom)).filter(m => m !== null).map(m => Number(m![1]))
  return `WP${n.length === 0 ? 1 : Math.max(...n) + 1}`
}

export function waypointActiu(doc: LogbookDoc): Waypoint | null {
  return doc.waypoints.find(w => w.id === doc.waypointActiuId) ?? null
}

export function afegirWaypoint(doc: LogbookDoc, w: Waypoint, activarlo = false): LogbookDoc {
  return { ...doc, waypoints: [...doc.waypoints, w], waypointActiuId: activarlo ? w.id : doc.waypointActiuId }
}

const cambiar = (doc: LogbookDoc, id: string, f: (w: Waypoint) => Waypoint): LogbookDoc =>
  ({ ...doc, waypoints: doc.waypoints.map(w => (w.id === id ? f(w) : w)) })

export function canviarNom(doc: LogbookDoc, id: string, nom: string): LogbookDoc {
  return cambiar(doc, id, w => ({ ...w, nom: nom.trim() }))
}

export function canviarObjectiu(doc: LogbookDoc, id: string, objectiu: ObjectiuWaypoint): LogbookDoc {
  return cambiar(doc, id, w => ({ ...w, objectiu }))
}

/** Borrar el activo lo desactiva en la misma operacion (§6.9). */
export function esborrarWaypoint(doc: LogbookDoc, id: string): LogbookDoc {
  return {
    ...doc,
    waypoints: doc.waypoints.filter(w => w.id !== id),
    waypointActiuId: doc.waypointActiuId === id ? null : doc.waypointActiuId,
  }
}

export function activar(doc: LogbookDoc, id: string | null): LogbookDoc {
  return { ...doc, waypointActiuId: id }
}
