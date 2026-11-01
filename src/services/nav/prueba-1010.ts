// src/services/nav/prueba-1010.ts
// Solo para las pruebas: la respuesta real de open-meteo del 10/10/2026 sobre
// Tarrega, guardada por el prototipo en docs/prototipos/2026-10-10-vuelo.
import { readFileSync } from 'node:fs'
import type { RespuestaOpenMeteo } from './perfil'
import type { Relieve } from './tipos'

export function cargar1010(): RespuestaOpenMeteo {
  const url = new URL('../../../docs/prototipos/2026-10-10-vuelo/openmeteo_10-10.json', import.meta.url)
  return JSON.parse(readFileSync(url, 'utf8')) as RespuestaOpenMeteo
}

/** Despegue del prototipo, en Tarrega. */
export const DESPEGUE_1010 = { lat: 41.6561, lon: 1.149 }

/** El relieve de la zona del 10/10, Terrarium z12 remuestreado a unos 100 m (spec 2026-11-01-relieve §3). */
export function cargarRelieve1010(): Relieve {
  const url = new URL('../../../docs/prototipos/2026-10-10-vuelo/relieve_10-10.json', import.meta.url)
  return JSON.parse(readFileSync(url, 'utf8')) as Relieve
}
