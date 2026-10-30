// src/services/nav/prueba-1010.ts
// Solo para las pruebas: la respuesta real de open-meteo del 10/10/2026 sobre
// Tarrega, guardada por el prototipo en docs/prototipos/2026-10-10-vuelo.
import { readFileSync } from 'node:fs'
import type { RespuestaOpenMeteo } from './perfil'

export function cargar1010(): RespuestaOpenMeteo {
  const url = new URL('../../../docs/prototipos/2026-10-10-vuelo/openmeteo_10-10.json', import.meta.url)
  return JSON.parse(readFileSync(url, 'utf8')) as RespuestaOpenMeteo
}

/** Despegue del prototipo, en Tarrega. */
export const DESPEGUE_1010 = { lat: 41.6561, lon: 1.149 }
