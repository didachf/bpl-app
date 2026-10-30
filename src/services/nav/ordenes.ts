// src/services/nav/ordenes.ts
// El plan en ordenes cortas en catalan (spec 10/10 §6.8). Pies y nudos solo aqui.
import { idx, type Campo } from './campo'
import { rumbo } from './geo'
import { S_MS } from './parametros'
import type { AjustesNav, Modo, Tramo } from './tipos'

const KT = 1852 / 3600
const NOM_MODO: Record<Modo, string> = {
  puja_lent: 'puja lent', puja_rapid: 'puja ràpid', baixa_lent: 'baixa lent', baixa_rapid: 'baixa ràpid',
}

const FMT_HORA = new Intl.DateTimeFormat('ca-ES', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Madrid',
})

export function hora(ms: number): string {
  return FMT_HORA.format(new Date(ms))
}

export function distancia(m: number): string {
  if (m < 100) return `${Math.round(m)} m`
  if (m < 1000) return `${Math.round(m / 10) * 10} m`
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`
}

function decimal(x: number): string {
  return String(x).replace('.', ',')
}

/** Viento medio de una franja en un intervalo, y si cuenta como medido (spec 2026-10-30 §6.5). */
function vientoTramo(c: Campo, b: number, k0: number, k1: number): { rumbo: number; kt: number; medido: boolean } {
  const f = c.nombres.length - 1
  let su = 0
  let sv = 0
  let ss = 0
  let n = 0
  for (let k = k0; k < Math.max(k1, k0 + 1); k++) {
    const i = idx(c, b, Math.min(k, c.minutos))
    su += c.u[f][i]
    sv += c.v[f][i]
    ss += c.sigma[i]
    n++
  }
  return { rumbo: rumbo(su / n, sv / n), kt: Math.hypot(su / n, sv / n) / KT, medido: ss / n < S_MS / 2 }
}

/** `llega` falso: la ultima orden lleva al punto mas proximo, no al punto. */
export function ordenes(c: Campo, aj: AjustesNav, tramos: Tramo[], llega = true): string[] {
  return tramos.map((t, i) => {
    const alt = c.rejilla.etiqueta[t.franja]
    if (t.tipo === 'cambiar' && t.modo !== null) {
      const [a, b] = aj.rangos[t.modo]
      const base = `${NOM_MODO[t.modo]} (${decimal(a)} a ${decimal(b)} m/s)`
      // Si el plan acaba en un cambio, el punto se pasa a mitad de la subida o la bajada.
      const txt = i === tramos.length - 1
        ? `${base} cap a ${alt}, i passes pel punt${llega ? '' : ' més proper'} ${t.modo.startsWith('puja') ? 'pujant' : 'baixant'}.`
        : `${base} fins a ${alt}.`
      return t.inicioMin === 0 ? `Ara, ${txt}` : txt[0].toUpperCase() + txt.slice(1)
    }
    const w = vientoTramo(c, t.franja, t.inicioMin, t.finMin)
    const cap = `cap a ${String(Math.round(w.rumbo) % 360).padStart(3, '0')}° a ${Math.round(w.kt)} kt (${w.medido ? 'mesurat' : 'previst'})`
    return i === tramos.length - 1
      ? `Manté ${alt} fins al punt${llega ? '' : ' més proper'}, ${cap}.`
      : `Manté ${alt} ${t.finMin - t.inicioMin} min, ${cap}.`
  })
}
