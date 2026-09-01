// src/domain/empty.ts
import { CURRENT_SCHEMA_VERSION } from './schema'
import type { LogbookDoc, Site } from './types'

/**
 * Campos de despegue habituales.
 * Fuente: Pilot Globus/trayectoria_globo.py, coordenadas y elevacion ya en uso.
 */
export const SEEDED_SITES: readonly Site[] = [
  { id: 'site-igualada', name: 'Igualada', lat: 41.5842, lon: 1.6528, elevationM: 329,
    permitStatus: 'unknown', accessNotes: '' },
  { id: 'site-tarrega', name: 'Tarrega', lat: 41.6470, lon: 1.1400, elevationM: 383,
    permitStatus: 'unknown', accessNotes: '' },
  { id: 'site-agramunt', name: 'Agramunt', lat: 41.7869, lon: 1.0967, elevationM: 345,
    permitStatus: 'unknown', accessNotes: '' },
]

/** Documento de arranque. Devuelve una copia nueva en cada llamada. */
export function emptyDocument(): LogbookDoc {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    pilot: {
      name: '',
      address: '',
      licenceNumber: null,
      medicalExpiry: null,
      licenceIssued: null,
    },
    balloons: [],
    sites: SEEDED_SITES.map(s => ({ ...s })),
    people: [],
    flights: [],
  }
}
