// src/services/vuelo/navegacio.ts
// De la sesion de vuelo a la entrada del motor, y que plan se ensena. El motor
// no guarda estado: la pantalla guarda el plan vigente y lo cambia con
// debeSustituir (spec del motor, 30/10), o cuando tiene un minuto.
import type { EntradaNav } from '../nav/motor'
import type { Previsiones } from '../nav/perfil'
import { debeSustituir } from '../nav/plan'
import type { Relieve, ResultadoNavegacion } from '../nav/tipos'
import type { Waypoint } from '../../domain/types'
import { ajustesDeVol, type Sessio } from './sessio'

/** Con esto, la orden no salta en cada recalculo de 15 s y tampoco se queda vieja. */
export const MAX_VIGENT_MS = 60_000
export const RECALCULO_MS = 15_000

export interface PlanVigent { clau: string; calculatA: number; r: ResultadoNavegacion }

/** Waypoint y objetivo: si cambia cualquiera de los dos, el plan anterior ya no vale. */
export function clauDe(w: Waypoint | null): string {
  return w === null ? '' : `${w.id}|${JSON.stringify(w.objectiu)}|${w.lat}|${w.lon}`
}

export function entradaDeVol(
  s: Sessio, prevision: Previsiones, relieve: Relieve | null, w: Waypoint | null, ara: number,
): EntradaNav {
  return {
    prevision,
    traza: s.traza,
    ajustes: ajustesDeVol(s),
    punto: w === null ? null : { lat: w.lat, lon: w.lon },
    ahora: ara,
    incluirTerra: true,
    despegue: s.enlairatA ?? undefined,
    objetivo: w?.objectiu,
    relieve: relieve ?? undefined,
  }
}

export function triarPlan(vigent: PlanVigent | null, nou: PlanVigent, ara: number): PlanVigent {
  if (vigent === null || vigent.clau !== nou.clau) return nou
  if (ara - vigent.calculatA >= MAX_VIGENT_MS) return nou
  const a = vigent.r.distanciaMinM
  const b = nou.r.distanciaMinM
  if (a === null || b === null) return nou
  return debeSustituir(a, b) ? nou : vigent
}
