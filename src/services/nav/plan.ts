// src/services/nav/plan.ts
// El plan que pasa mas cerca del punto (spec 2026-10-30 §6.4). Un plan es
// [actual, A, B]: mantener la actual (0 min, o 2 o mas), ir a A, mantenerla 2 min
// o mas, ir a B y mantenerla hasta el horizonte. Busqueda exhaustiva en pasos de
// 2 min sobre acumulados y transitos ya calculados, refinado de 1 min y eleccion.
import { idx, type Campo } from './campo'
import { envolvente } from './geo'
import { fr, modoDe, tr, transito, vale, velocidad, zComprobar, type Tablas } from './vertical'
import { MINUTO_ENTERO, type Frac } from './objetivo'
import type { AjustesNav, Tramo } from './tipos'
import {
  LLEGA_M, MAX_CANDIDATAS, MAX_FRANJAS_TODAS, MEJORA_ABSOLUTA_M, MEJORA_RELATIVA, MIN_MANTENER, TOP_PLANES,
} from './parametros'

/** Leido una vez: con vitest cada lectura de una importacion pasa por un getter, y esta va en un bucle caliente. */
const ENTERO = MINUTO_ENTERO

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

/**
 * Lo mismo con solo la parte `f` del segmento, la de dentro del margen. Va aparte de
 * `avanzar` porque mantener una franja cuenta el minuto entero o nada, y ese es el
 * bucle mas caliente de la busqueda.
 */
function avanzarParte(
  s: Min, ax: number, ay: number, bx: number, by: number, k: number, ox: number, oy: number, f: Frac,
): void {
  if (f === null) return
  if (f === ENTERO) {
    avanzar(s, ax, ay, bx, by, k, ox, oy)
    return
  }
  const ex = bx - ax
  const ey = by - ay
  const pax = ax + f[0] * ex
  const pay = ay + f[0] * ey
  const pbx = ax + f[1] * ex
  const pby = ay + f[1] * ey
  const d = distSegmento(pax, pay, pbx, pby, ox, oy)
  if (d < s.m) {
    s.m = d
    // El minuto en que acaba el trozo, para que el corte de las ordenes incluya el cambio que lleva
    // al punto. Solo si el trozo empieza con el minuto y su inicio es lo mas cerca, el de antes.
    const alInicio = f[0] === 0 && Math.hypot(pax - ox, pay - oy) < Math.hypot(pbx - ox, pby - oy)
    s.mk = alInicio ? k - 1 : k
  }
}

/**
 * La distancia minima de un camino al punto, por segmentos, y el minuto en que pasa.
 * `fr[k]` es la parte del segmento del minuto k al k+1 dentro del margen; sin ella, todo.
 */
export function aproximacion(cam: Camino, ox: number, oy: number, fr?: Frac[]): { distM: number; minuto: number } {
  const s: Min = { m: Infinity, mk: 0 }
  for (let k = 1; k < cam.length; k++) {
    avanzarParte(s, cam[k - 1][0], cam[k - 1][1], cam[k][0], cam[k][1], k, ox, oy, fr === undefined ? MINUTO_ENTERO : fr[k - 1])
  }
  return { distM: s.m, minuto: s.mk }
}

/** La parte de cada minuto del plan dentro del margen de las tablas (spec 2026-11-01 §4.1). */
export function fracciones(t: Tablas, p: PlanInterno): Frac[] {
  const H = t.c.minutos
  const out: Frac[] = []
  for (let i = 0; i < p.franjas.length && out.length < H; i++) {
    const b = p.franjas[i]
    if (i > 0) out.push(...fr(t, p.franjas[i - 1], b, p.clases[i - 1]))
    const fin = i === p.franjas.length - 1 ? H : out.length + p.dur[i]
    const f = t.dentro[b] ? MINUTO_ENTERO : null
    while (out.length < fin) out.push(f)
  }
  return out.slice(0, H)
}

/**
 * El primer minuto en que el plan deja de valer sobre el terreno, H + 1 si vale entero
 * (spec 2026-11-01-relieve §4.3). `cam` es su camino, con las mismas tablas.
 */
export function limite(t: Tablas, p: PlanInterno, cam: Camino): number {
  const H = t.c.minutos
  const z = t.c.rejilla.altM
  let k = 0
  for (let i = 0; i < p.franjas.length; i++) {
    const b = p.franjas[i]
    if (i > 0) {
      const a = p.franjas[i - 1]
      const n = fr(t, a, b, p.clases[i - 1]).length
      for (let j = 0; j < n; j++) {
        if (++k > H) return H + 1
        const zc = zComprobar(t, a, b, p.clases[i - 1], j)
        if (zc === zc && !vale(t, zc, cam[k][0], cam[k][1])) return k
      }
    }
    const fin = i === p.franjas.length - 1 ? H : k + p.dur[i]
    while (k < fin) {
      k++
      if (b !== t.iTerra && !vale(t, z[b], cam[k][0], cam[k][1])) return k
    }
  }
  return H + 1
}

/** La distancia y el minuto de un plan, contando solo hasta donde vale. */
export function evaluar(t: Tablas, p: PlanInterno, cam: Camino, ox: number, oy: number): Evaluado & { limite: number } {
  const lim = limite(t, p, cam)
  const a = aproximacion(cam.slice(0, lim), ox, oy, fracciones(t, p).slice(0, lim - 1))
  return { plan: p, distM: a.distM, minuto: a.minuto, limite: lim }
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
  // Las franjas del margen del objetivo entran siempre (spec 2026-11-01 §4.2).
  if (Number.isFinite(t.margen[0]) || Number.isFinite(t.margen[1])) {
    for (const b of todas) if (t.dentro[b]) set.add(b)
  }
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
  const altM = c.rejilla.altM
  // Terra y lo que queda por encima del suelo mas alto no se comprueban (spec 2026-11-01-relieve §4.3).
  const libre = (b: number) => b === t.iTerra || altM[b] >= t.alturaLibre
  const cand = candidatas(t, b0, ox, oy)
  const top: Evaluado[] = []
  const meter = (plan: PlanInterno, distM: number, minuto: number) => {
    if (top.length >= TOP_PLANES && distM >= top[top.length - 1].distM) return
    top.push({ plan, distM, minuto })
    top.sort((a, b) => a.distM - b.distM)
    if (top.length > TOP_PLANES) top.pop()
  }

  // Mantener la actual: el minimo acumulado sirve a todos los planes que salen de ella.
  // La posicion del minuto 0 la cubre el primer segmento de lo que siga. Una franja
  // mantenida fuera del margen no cuenta nada (spec 2026-11-01 §4.1). Se mantiene hasta la
  // primera posicion que no vale sobre el terreno, y solo se sale antes de ella.
  const minB = new Float64Array(W).fill(Infinity)
  const argB = new Int32Array(W)
  const s0: Min = { m: Infinity, mk: 0 }
  const libre0 = libre(b0)
  let lim0 = H + 1
  for (let k = 1; k <= H; k++) {
    const x = px[b0 * W + k]
    const y = py[b0 * W + k]
    if (!libre0 && !vale(t, altM[b0], x, y)) {
      lim0 = k
      break
    }
    if (t.dentro[b0]) avanzar(s0, px[b0 * W + k - 1], py[b0 * W + k - 1], x, y, k, ox, oy)
    minB[k] = s0.m
    argB[k] = s0.mk
  }
  meter({ franjas: [b0], clases: [], dur: [H] }, minB[lim0 - 1], argB[lim0 - 1])

  for (let d0 = 0; d0 < H && d0 < lim0; d0 += 2) {
    const sx = px[b0 * W + d0]
    const sy = py[b0 * W + d0]
    for (const A of cand) {
      if (A === b0) continue
      const dentroA = t.dentro[A]
      const libreA = libre(A)
      for (let ca = 0; ca < 2; ca++) {
        const ta = tr(t, b0, A, ca, d0)
        if (ta === null) continue
        const ra = fr(t, b0, A, ca)
        const sA: Min = { m: minB[d0], mk: argB[d0] }
        let lx = sx
        let ly = sy
        let okA = true
        for (let j = 0; j < ta.camino.length; j++) {
          const x = sx + ta.camino[j][0]
          const y = sy + ta.camino[j][1]
          const zc = zComprobar(t, b0, A, ca, j)
          if (zc === zc && !vale(t, zc, x, y)) {
            okA = false
            break
          }
          avanzarParte(sA, lx, ly, x, y, d0 + 1 + j, ox, oy, ra[j])
          lx = x
          ly = y
        }
        const kA = d0 + ta.minutos
        if (!okA) {
          meter({ franjas: [b0, A], clases: [ca], dur: [d0, H - kA] }, sA.m, sA.mk)
          continue
        }
        const ax = sx + ta.dx - px[A * W + kA]
        const ay = sy + ta.dy - py[A * W + kA]
        for (let k = kA; k <= H; k++) {
          const x = ax + px[A * W + k]
          const y = ay + py[A * W + k]
          if (k > kA) {
            if (!libreA && !vale(t, altM[A], x, y)) break
            if (dentroA) avanzar(sA, lx, ly, x, y, k, ox, oy)
            lx = x
            ly = y
          }
          const dA = k - kA
          if (dA < MIN_MANTENER || dA % 2 !== 0 || k >= H) continue
          for (const Bf of cand) {
            if (Bf === A) continue
            const libreB = libre(Bf)
            for (let cb = 0; cb < 2; cb++) {
              const tb = tr(t, A, Bf, cb, k)
              if (tb === null) continue
              const rb = fr(t, A, Bf, cb)
              const sB: Min = { m: sA.m, mk: sA.mk }
              let mx = x
              let my = y
              let okB = true
              for (let j = 0; j < tb.camino.length; j++) {
                const nx = x + tb.camino[j][0]
                const ny = y + tb.camino[j][1]
                const zc = zComprobar(t, A, Bf, cb, j)
                if (zc === zc && !vale(t, zc, nx, ny)) {
                  okB = false
                  break
                }
                avanzarParte(sB, mx, my, nx, ny, k + 1 + j, ox, oy, rb[j])
                mx = nx
                my = ny
              }
              const kB = k + tb.minutos
              if (okB && t.dentro[Bf]) {
                const bx = mx - px[Bf * W + kB]
                const by = my - py[Bf * W + kB]
                for (let kk = kB + 1; kk <= H; kk++) {
                  const nx = bx + px[Bf * W + kk]
                  const ny = by + py[Bf * W + kk]
                  if (!libreB && !vale(t, altM[Bf], nx, ny)) break
                  avanzar(sB, mx, my, nx, ny, kk, ox, oy)
                  mx = nx
                  my = ny
                }
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
        const a = evaluar(t, p, cam, ox, oy)
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
