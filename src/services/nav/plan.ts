// src/services/nav/plan.ts
// El plan que pasa mas cerca del punto (spec 2026-10-30 §6.4). Un plan es
// [actual, A, B]: mantener la actual (0 min, o 2 o mas), ir a A, mantenerla 2 min
// o mas, ir a B y mantenerla hasta el horizonte. Busqueda exhaustiva en pasos de
// 2 min sobre acumulados y transitos ya calculados, refinado de 1 min y eleccion.
import { idx, type Campo } from './campo'
import { envolvente } from './geo'
import { modoDe, tr, transito, velocidad, type Tablas } from './vertical'
import type { AjustesNav, Tramo } from './tipos'
import {
  LLEGA_M, MAX_CANDIDATAS, MAX_FRANJAS_TODAS, MEJORA_ABSOLUTA_M, MEJORA_RELATIVA, MIN_MANTENER, TOP_PLANES,
} from './parametros'

/** franjas[0] es la actual. dur[i] es lo que se mantiene franjas[i]. La ultima va hasta el horizonte. */
export interface PlanInterno { franjas: number[]; clases: number[]; dur: number[] }
export interface Evaluado { plan: PlanInterno; distM: number; minuto: number }
/** Posicion al final de cada minuto, de 0 al horizonte, relativa a la posicion actual. */
export type Camino = [number, number][]

export function distSegmento(ax: number, ay: number, bx: number, by: number, ox: number, oy: number): number {
  const ex = bx - ax
  const ey = by - ay
  const l2 = ex * ex + ey * ey
  const s = l2 > 0 ? Math.max(0, Math.min(1, ((ox - ax) * ex + (oy - ay) * ey) / l2)) : 0
  return Math.hypot(ax + s * ex - ox, ay + s * ey - oy)
}

interface Min { m: number; mk: number }

function avanzar(s: Min, ax: number, ay: number, bx: number, by: number, k: number, ox: number, oy: number): void {
  const d = distSegmento(ax, ay, bx, by, ox, oy)
  if (d < s.m) {
    s.m = d
    s.mk = Math.hypot(ax - ox, ay - oy) < Math.hypot(bx - ox, by - oy) ? k - 1 : k
  }
}

/** La distancia minima de un camino al punto, por segmentos, y el minuto en que pasa. */
export function aproximacion(cam: Camino, ox: number, oy: number): { distM: number; minuto: number } {
  const s: Min = { m: Math.hypot(cam[0][0] - ox, cam[0][1] - oy), mk: 0 }
  for (let k = 1; k < cam.length; k++) avanzar(s, cam[k - 1][0], cam[k - 1][1], cam[k][0], cam[k][1], k, ox, oy)
  return { distM: s.m, minuto: s.mk }
}

/** Simulacion directa, sin tablas: para la dispersion entre modelos y como oraculo. */
export function caminoDirecto(c: Campo, f: number, aj: AjustesNav, p: PlanInterno): Camino | null {
  const H = c.minutos
  const out: Camino = [[0, 0]]
  let x = 0
  let y = 0
  let k = 0
  for (let i = 0; i < p.franjas.length; i++) {
    const b = p.franjas[i]
    if (i > 0) {
      const a = p.franjas[i - 1]
      const t = transito(c, f, a, b, velocidad(aj, c.rejilla.altM[b] > c.rejilla.altM[a], p.clases[i - 1]), k)
      if (k + t.minutos > H) return null
      for (const [dx, dy] of t.camino) out.push([x + dx, y + dy])
      x += t.dx
      y += t.dy
      k += t.minutos
    }
    const fin = i === p.franjas.length - 1 ? H : k + p.dur[i]
    if (fin > H) return null
    for (; k < fin; k++) {
      const j = idx(c, b, k)
      x += c.u[f][j] * 60
      y += c.v[f][j] * 60
      out.push([x, y])
    }
  }
  return out
}

/** Lo mismo con las tablas: restas de acumulados y transitos ya calculados. */
export function caminoTabla(t: Tablas, p: PlanInterno): Camino | null {
  const c = t.c
  const H = c.minutos
  const out: Camino = [[0, 0]]
  let x = 0
  let y = 0
  let k = 0
  for (let i = 0; i < p.franjas.length; i++) {
    const b = p.franjas[i]
    if (i > 0) {
      const tt = tr(t, p.franjas[i - 1], b, p.clases[i - 1], k)
      if (tt === null) return null
      for (const [dx, dy] of tt.camino) out.push([x + dx, y + dy])
      x += tt.dx
      y += tt.dy
      k += tt.minutos
    }
    const fin = i === p.franjas.length - 1 ? H : k + p.dur[i]
    if (fin > H) return null
    const i0 = idx(c, b, k)
    for (let kk = k + 1; kk <= fin; kk++) {
      const j = idx(c, b, kk)
      out.push([x + t.px[j] - t.px[i0], y + t.py[j] - t.py[i0]])
    }
    x += t.px[idx(c, b, fin)] - t.px[i0]
    y += t.py[idx(c, b, fin)] - t.py[i0]
    k = fin
  }
  return out
}

/**
 * Si alguno llega (50 m o menos), de los que llegan el que llega antes y despues el de menos
 * cambios. Si ninguno llega, el mas cercano: un plan que no llega nunca gana a uno que llega.
 */
export function elegir(es: Evaluado[]): Evaluado {
  const dmin = Math.min(...es.map(e => e.distM))
  if (dmin > LLEGA_M) {
    return [...es].sort((a, b) => a.distM - b.distM || a.plan.franjas.length - b.plan.franjas.length)[0]
  }
  return es
    .filter(e => e.distM <= LLEGA_M)
    .sort((a, b) => a.minuto - b.minuto || a.plan.franjas.length - b.plan.franjas.length || a.distM - b.distM)[0]
}

/** Las franjas que se prueban como A y B. Todas salvo en vuelos altos con muchas franjas. */
export function candidatas(t: Tablas, b0: number, ox: number, oy: number): number[] {
  const c = t.c
  const B = c.rejilla.altM.length
  const todas = Array.from({ length: B }, (_, i) => i)
  if (B <= MAX_FRANJAS_TODAS) return todas
  const H = c.minutos
  const medio: [number, number][] = todas.map(b => [t.px[idx(c, b, H)], t.py[idx(c, b, H)]])
  const set = new Set<number>([b0])
  for (let d = -3; d <= 3; d++) if (b0 + d >= 0 && b0 + d < B) set.add(b0 + d)
  for (const b of envolvente(medio)) set.add(b)
  const r = Math.hypot(ox, oy) || 1
  const alineadas = [...todas].sort((a, b) =>
    (medio[b][0] * ox + medio[b][1] * oy) / r - (medio[a][0] * ox + medio[a][1] * oy) / r)
  for (const b of alineadas) {
    if (set.size >= MAX_CANDIDATAS) break
    set.add(b)
  }
  return [...set]
}

export function buscarPlan(t: Tablas, b0: number, ox: number, oy: number): Evaluado {
  const c = t.c
  const H = c.minutos
  const W = H + 1
  const px = t.px
  const py = t.py
  const cand = candidatas(t, b0, ox, oy)
  const top: Evaluado[] = []
  const meter = (plan: PlanInterno, distM: number, minuto: number) => {
    if (top.length >= TOP_PLANES && distM >= top[top.length - 1].distM) return
    top.push({ plan, distM, minuto })
    top.sort((a, b) => a.distM - b.distM)
    if (top.length > TOP_PLANES) top.pop()
  }

  // Mantener la actual: el minimo acumulado sirve a todos los planes que salen de ella.
  const minB = new Float64Array(W)
  const argB = new Int32Array(W)
  const s0: Min = { m: Math.hypot(ox, oy), mk: 0 }
  minB[0] = s0.m
  for (let k = 1; k <= H; k++) {
    avanzar(s0, px[b0 * W + k - 1], py[b0 * W + k - 1], px[b0 * W + k], py[b0 * W + k], k, ox, oy)
    minB[k] = s0.m
    argB[k] = s0.mk
  }
  meter({ franjas: [b0], clases: [], dur: [H] }, minB[H], argB[H])

  for (let d0 = 0; d0 < H; d0 += 2) {
    const sx = px[b0 * W + d0]
    const sy = py[b0 * W + d0]
    for (const A of cand) {
      if (A === b0) continue
      for (let ca = 0; ca < 2; ca++) {
        const ta = tr(t, b0, A, ca, d0)
        if (ta === null) continue
        const sA: Min = { m: minB[d0], mk: argB[d0] }
        let lx = sx
        let ly = sy
        for (let j = 0; j < ta.camino.length; j++) {
          const x = sx + ta.camino[j][0]
          const y = sy + ta.camino[j][1]
          avanzar(sA, lx, ly, x, y, d0 + 1 + j, ox, oy)
          lx = x
          ly = y
        }
        const kA = d0 + ta.minutos
        const ax = sx + ta.dx - px[A * W + kA]
        const ay = sy + ta.dy - py[A * W + kA]
        for (let k = kA; k <= H; k++) {
          const x = ax + px[A * W + k]
          const y = ay + py[A * W + k]
          if (k > kA) {
            avanzar(sA, lx, ly, x, y, k, ox, oy)
            lx = x
            ly = y
          }
          const dA = k - kA
          if (dA < MIN_MANTENER || dA % 2 !== 0 || k >= H) continue
          for (const Bf of cand) {
            if (Bf === A) continue
            for (let cb = 0; cb < 2; cb++) {
              const tb = tr(t, A, Bf, cb, k)
              if (tb === null) continue
              const sB: Min = { m: sA.m, mk: sA.mk }
              let mx = x
              let my = y
              for (let j = 0; j < tb.camino.length; j++) {
                const nx = x + tb.camino[j][0]
                const ny = y + tb.camino[j][1]
                avanzar(sB, mx, my, nx, ny, k + 1 + j, ox, oy)
                mx = nx
                my = ny
              }
              const kB = k + tb.minutos
              const bx = mx - px[Bf * W + kB]
              const by = my - py[Bf * W + kB]
              for (let kk = kB + 1; kk <= H; kk++) {
                const nx = bx + px[Bf * W + kk]
                const ny = by + py[Bf * W + kk]
                avanzar(sB, mx, my, nx, ny, kk, ox, oy)
                mx = nx
                my = ny
              }
              meter({ franjas: [b0, A, Bf], clases: [ca, cb], dur: [d0, dA, H - kB] }, sB.m, sB.mk)
            }
          }
        }
        meter({ franjas: [b0, A], clases: [ca], dur: [d0, H - kA] }, sA.m, sA.mk)
      }
    }
  }

  // Refinado: cada duracion un minuto arriba y abajo.
  const vistos = new Set<string>()
  for (const e of [...top]) {
    for (let i = 0; i < e.plan.dur.length - 1; i++) {
      for (const s of [-1, 1]) {
        const dur = [...e.plan.dur]
        dur[i] += s
        const valido = i === 0 ? dur[0] === 0 || dur[0] >= MIN_MANTENER : dur[i] >= MIN_MANTENER
        if (!valido) continue
        const p: PlanInterno = { ...e.plan, dur }
        const clave = `${p.franjas}|${p.clases}|${dur.slice(0, -1)}`
        if (vistos.has(clave)) continue
        vistos.add(clave)
        const cam = caminoTabla(t, p)
        if (cam === null) continue
        const a = aproximacion(cam, ox, oy)
        meter(p, a.distM, a.minuto)
      }
    }
  }
  return elegir(top)
}

/** El plan en tramos con minutos, cortado en el minuto en que pasa mas cerca. */
export function aTramos(t: Tablas, p: PlanInterno, hasta: number): Tramo[] {
  const altM = t.c.rejilla.altM
  const out: Tramo[] = []
  let k = 0
  for (let i = 0; i < p.franjas.length; i++) {
    const b = p.franjas[i]
    if (i > 0) {
      const a = p.franjas[i - 1]
      const tt = tr(t, a, b, p.clases[i - 1], k)
      if (tt === null) break
      out.push({ tipo: 'cambiar', franja: b, modo: modoDe(altM[b] > altM[a], p.clases[i - 1]), inicioMin: k, finMin: k + tt.minutos })
      k += tt.minutos
      if (k >= hasta) break
    }
    const fin = i === p.franjas.length - 1 ? t.c.minutos : k + p.dur[i]
    if (fin > k && hasta > k) out.push({ tipo: 'mantener', franja: b, modo: null, inicioMin: k, finMin: Math.min(fin, hasta) })
    k = fin
    if (k >= hasta) break
  }
  return out
}

/** El plan vigente solo se sustituye si el nuevo pasa un 20 % o 200 m mas cerca (spec 10/10 §6.8). */
export function debeSustituir(anteriorM: number, nuevoM: number): boolean {
  return nuevoM <= anteriorM * MEJORA_RELATIVA || nuevoM <= anteriorM - MEJORA_ABSOLUTA_M
}
