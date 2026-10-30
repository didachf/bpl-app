// src/services/nav/correccion.ts
// Corrige el campo con las medidas (spec 2026-10-30 §5.2). No se modela el
// viento sino el ERROR de la prevision: un proceso gaussiano con nucleo
// exponencial en altitud y tiempo sobre los residuos, como hizo Loon. Una
// medida corrige su franja, las vecinas y un rato hacia delante y hacia atras.
import type { Medida } from './tipos'
import type { Previsiones } from './perfil'
import { idx, vientoFuente, type Campo } from './campo'
import { EDAD_MAX_S, LT_S, LZ_M, MAX_MEDIDAS, S_MS } from './parametros'

export function nucleo(dzM: number, dtS: number): number {
  return S_MS * S_MS * Math.exp(-Math.abs(dzM) / LZ_M - Math.abs(dtS) / LT_S)
}

/** Factor de Cholesky de una matriz simetrica n x n por filas. null si no es definida positiva. */
export function cholesky(a: Float64Array, n: number): Float64Array | null {
  const l = new Float64Array(n * n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = a[i * n + j]
      for (let k = 0; k < j; k++) s -= l[i * n + k] * l[j * n + k]
      if (i === j) {
        if (!(s > 0)) return null
        l[i * n + i] = Math.sqrt(s)
      } else {
        l[i * n + j] = s / l[j * n + j]
      }
    }
  }
  return l
}

/** Resuelve L y = b. */
export function adelante(l: Float64Array, n: number, b: ArrayLike<number>): Float64Array {
  const y = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let s = b[i]
    for (let k = 0; k < i; k++) s -= l[i * n + k] * y[k]
    y[i] = s / l[i * n + i]
  }
  return y
}

/** Resuelve L^T x = y. */
export function atras(l: Float64Array, n: number, y: Float64Array): Float64Array {
  const x = new Float64Array(n)
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i]
    for (let k = i + 1; k < n; k++) s -= l[k * n + i] * x[k]
    x[i] = s / l[i * n + i]
  }
  return x
}

export interface Corregido { campo: Campo; corregido: boolean; usadas: number }

export function corregirCampo(c: Campo, prev: Previsiones, medidas: Medida[], ahora: number): Corregido {
  const usadas = medidas
    .filter(m => m.t <= ahora + 1000 && (ahora - m.t) / 1000 <= EDAD_MAX_S)
    .sort((a, b) => b.t - a.t)
    .slice(0, MAX_MEDIDAS)
  const n = usadas.length
  if (n === 0) return { campo: c, corregido: false, usadas: 0 }

  const k = new Float64Array(n * n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      k[i * n + j] = nucleo(usadas[i].altM - usadas[j].altM, (usadas[i].t - usadas[j].t) / 1000)
    }
    k[i * n + i] += usadas[i].sigma * usadas[i].sigma
  }
  // Si la factorizacion falla, mas ruido en la diagonal. Si sigue fallando, sin correccion.
  let l: Float64Array | null = null
  for (let intento = 0; intento < 3 && l === null; intento++) {
    if (intento > 0) for (let i = 0; i < n; i++) k[i * n + i] += 1e-6 * S_MS * S_MS * 10 ** intento
    l = cholesky(k, n)
  }
  if (l === null) return { campo: c, corregido: false, usadas: 0 }

  // Las medidas son las mismas para todas las fuentes: una factorizacion, una solucion por fuente.
  const nf = c.nombres.length
  const alfaU: Float64Array[] = []
  const alfaV: Float64Array[] = []
  for (let f = 0; f < nf; f++) {
    const ru = new Float64Array(n)
    const rv = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const w = vientoFuente(prev, f, usadas[i].altM, usadas[i].t)
      ru[i] = w === null ? 0 : usadas[i].u - w[0]
      rv[i] = w === null ? 0 : usadas[i].v - w[1]
    }
    alfaU.push(atras(l, n, adelante(l, n, ru)))
    alfaV.push(atras(l, n, adelante(l, n, rv)))
  }

  const u = c.u.map(a => Float64Array.from(a))
  const v = c.v.map(a => Float64Array.from(a))
  const sigma = new Float64Array(c.sigma.length)
  const ks = new Float64Array(n)
  for (let b = 0; b < c.rejilla.altM.length; b++) {
    for (let m = 0; m <= c.minutos; m++) {
      const t = c.t0 + m * 60000
      for (let i = 0; i < n; i++) ks[i] = nucleo(c.rejilla.altM[b] - usadas[i].altM, (t - usadas[i].t) / 1000)
      const ic = idx(c, b, m)
      for (let f = 0; f < nf; f++) {
        let du = 0
        let dv = 0
        for (let i = 0; i < n; i++) {
          du += ks[i] * alfaU[f][i]
          dv += ks[i] * alfaV[f][i]
        }
        u[f][ic] += du
        v[f][ic] += dv
      }
      const y = adelante(l, n, ks)
      let q = 0
      for (let i = 0; i < n; i++) q += y[i] * y[i]
      sigma[ic] = Math.sqrt(Math.max(0, S_MS * S_MS - q))
    }
  }
  return { campo: { ...c, u, v, sigma }, corregido: true, usadas: n }
}
