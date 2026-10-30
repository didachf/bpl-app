// src/services/nav/oraculo.ts
// Solo para las pruebas: la fuerza bruta del prototipo (optim2.py) con la
// simulacion directa, sin tablas. Mantener la actual de 0 a 20 min, ir a A,
// mantenerla de 2 a 20, ir a B y mantenerla hasta el horizonte, de 2 en 2 min.
import type { Campo } from './campo'
import { aproximacion, caminoDirecto, type Evaluado, type PlanInterno } from './plan'
import type { AjustesNav } from './tipos'

export function oraculo(c: Campo, f: number, aj: AjustesNav, b0: number, ox: number, oy: number): Evaluado {
  const r: { mejor: Evaluado | null } = { mejor: null }
  const probar = (plan: PlanInterno) => {
    const cam = caminoDirecto(c, f, aj, plan)
    if (cam === null) return
    const a = aproximacion(cam, ox, oy)
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
