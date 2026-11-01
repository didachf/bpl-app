// src/ui/vol/presentacio.ts
// Como se escriben las cifras y el plan en la pantalla de vuelo (maquetas,
// design/pantalla-de-vol/ESPEC_TAULETA.md). Puro, para poder probarlo.
import { miles, PIE_M } from '../../services/nav/campo'
import type { ResultadoNavegacion, Tramo } from '../../services/nav/tipos'
import type { ObjectiuWaypoint } from '../../domain/types'

const MS_KT = 3600 / 1852
const MENYS = '−'

export const altFt = (m: number) => miles(Math.round(m / PIE_M / 10) * 10)

export function vario(v: number | null): string {
  if (v === null) return '–'
  const r = Math.round(v * 10) / 10
  if (r === 0) return '0,0'
  return `${r > 0 ? '+' : MENYS}${Math.abs(r).toFixed(1).replace('.', ',')}`
}

export const graus = (r: number) => `${String(Math.round(r) % 360).padStart(3, '0')}°`
export const kt = (ms: number) => (ms * MS_KT).toFixed(1).replace('.', ',')

export function tempsVol(ms: number): string {
  const min = Math.floor(ms / 60_000)
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
}

export function horaLocal(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** «Ara, puja ràpid (2,5 a 3 m/s) fins a 1 750 ft.» a «Puja ràpid fins a 1 750 ft». */
export function ordreCurta(o: string): string {
  const s = o.replace(/^Ara, /, '').replace(/ \([^)]*m\/s\)/, '').replace(/, cap a \d{3}° a \d+ kt \((previst|mesurat)\)/, '').replace(/\.$/, '')
  return s[0].toUpperCase() + s.slice(1)
}

/** El paso del plan que toca ahora, por la hora del calculo. */
export function pasEnCurs(plan: Tramo[], calculatA: number, ara: number): number {
  const min = (ara - calculatA) / 60_000
  const i = plan.findIndex(t => min < t.finMin)
  return i < 0 ? plan.length - 1 : i
}

export function etiquetaObjectiu(o: ObjectiuWaypoint): string | null {
  if (o.tipo === 'aterrar') return 'ATERRAR'
  if (o.tipo === 'altitud') return `A ${altFt(o.altM)} FT`
  return null
}

export function textObjectiu(o: ObjectiuWaypoint): string {
  if (o.tipo === 'aterrar') return 'aterrar'
  if (o.tipo === 'altitud') return `a ${altFt(o.altM)} ft`
  return 'qualsevol altura'
}

const RAMPA = ['#ffd400', '#ff9f1a', '#ff4fd8', '#a77bff']

/** Color de la traza por altitud, del suelo al tope en cuatro escalones. */
export function colorAltitud(altM: number, sueloM: number, topeM: number): string {
  const f = Math.min(1, Math.max(0, (altM - sueloM) / (topeM - sueloM)))
  return RAMPA[Math.min(RAMPA.length - 1, Math.floor(f * RAMPA.length))]
}

type PuntCami = ResultadoNavegacion['camino'][number]

/** Trozos seguidos a ras o en altura. El ultimo punto de un trozo es el primero del siguiente. */
export function trossosCami(c: PuntCami[]): { aRas: boolean; punts: PuntCami[] }[] {
  const out: { aRas: boolean; punts: PuntCami[] }[] = []
  for (let k = 1; k < c.length; k++) {
    const aRas = c[k].aRas
    const ultim = out[out.length - 1]
    if (ultim !== undefined && ultim.aRas === aRas) ultim.punts.push(c[k])
    else out.push({ aRas, punts: [c[k - 1], c[k]] })
  }
  return out
}

export function marquesCadaCinc(c: PuntCami[]): { min: number; p: PuntCami }[] {
  const out: { min: number; p: PuntCami }[] = []
  for (let m = 5; m < c.length; m += 5) out.push({ min: m, p: c[m] })
  return out
}
