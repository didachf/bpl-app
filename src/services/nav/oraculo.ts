// src/services/nav/oraculo.ts
// Solo para las pruebas: la fuerza bruta del prototipo (optim2.py) con la
// simulacion directa, sin tablas. Mantener la actual de 0 a 20 min, ir a A,
// mantenerla de 2 a 20, ir a B y mantenerla hasta el horizonte, de 2 en 2 min.
// Con un margen (spec 2026-11-01), la distancia solo cuenta dentro, con sus
// fracciones calculadas aqui sin las tablas, para no compartir errores con ellas.
import type { Campo } from './campo'
import { aproximacion, caminoDirecto, type Evaluado, type PlanInterno } from './plan'
import { minutosTransito, velocidad } from './vertical'
import { enMargen, fracMinutos, MINUTO_ENTERO, SIN_MARGEN, type Frac, type Margen } from './objetivo'
import type { AjustesNav } from './tipos'

export function fraccionesDirectas(c: Campo, aj: AjustesNav, p: PlanInterno, m: Margen): Frac[] {
  const H = c.minutos
  const z = c.rejilla.altM
  const out: Frac[] = []
  for (let i = 0; i < p.franjas.length && out.length < H; i++) {
    const b = p.franjas[i]
    if (i > 0) {
      const a = p.franjas[i - 1]
      const vel = velocidad(aj, z[b] > z[a], p.clases[i - 1])
      out.push(...fracMinutos(z[a], z[b], vel, minutosTransito(c, a, b, vel), m))
    }
    const fin = i === p.franjas.length - 1 ? H : out.length + p.dur[i]
    const f = enMargen(z[b], m) ? MINUTO_ENTERO : null
    while (out.length < fin) out.push(f)
  }
  return out.slice(0, H)
}

export function oraculo(
  c: Campo, f: number, aj: AjustesNav, b0: number, ox: number, oy: number, m: Margen = SIN_MARGEN,
): Evaluado {
  const r: { mejor: Evaluado | null } = { mejor: null }
  const probar = (plan: PlanInterno) => {
    const cam = caminoDirecto(c, f, aj, plan)
    if (cam === null) return
    const a = aproximacion(cam, ox, oy, fraccionesDirectas(c, aj, plan, m))
    if (r.mejor === null || a.distM < r.mejor.distM) r.mejor = { plan, distM: a.distM, minuto: a.minuto }
  }
  const B = c.rejilla.altM.length
  probar({ franjas: [b0], clases: [], dur: [c.minutos] })
  for (let h0 = 0; h0 <= 20; h0 += 2) {
    for (let A = 0; A < B; A++) {
      if (A === b0) continue
      for (let ca = 0; ca < 2; ca++) {
        probar({ franjas: [b0, A], clases: [ca], dur: [h0, 0] })
        for (let hA = 2; hA <= 20; hA += 2) {
          for (let Bf = 0; Bf < B; Bf++) {
            if (Bf === A) continue
            for (let cb = 0; cb < 2; cb++) probar({ franjas: [b0, A, Bf], clases: [ca, cb], dur: [h0, hA, 0] })
          }
        }
      }
    }
  }
  if (r.mejor === null) throw new Error('El oraculo no ha encontrado ningun plan')
  return r.mejor
}
