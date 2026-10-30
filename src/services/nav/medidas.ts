// src/services/nav/medidas.ts
// Medidas de viento (spec 2026-10-30 §5.1). Hoy solo la deriva del GPS del
// globo, corregida de su retraso. Las otras fuentes entraran como otra funcion
// que devuelva `Medida[]`, sin tocar el resto del motor.
import type { Medida, PuntoTraza } from './tipos'
import { aPlano, type Plano } from './geo'
import { FRANJA_M, type Rejilla } from './campo'
import { MIN_MUESTRAS, SEPARACION_S, SIGMA_GPS_1S, TAU_S, VENTANA_S } from './parametros'

export function franjaMasCercana(rej: Rejilla, altM: number): number {
  let mejor = 0
  for (let b = 1; b < rej.altM.length; b++) {
    if (Math.abs(rej.altM[b] - altM) < Math.abs(rej.altM[mejor] - altM)) mejor = b
  }
  return mejor
}

interface Vel { t: number; u: number; v: number; z: number }

/**
 * Un globo coge el viento nuevo con retraso, como un sistema de primer orden:
 * dv/dt = (w - v) / tau, asi que w = v + tau * dv/dt. La velocidad media y la
 * pendiente de una regresion sobre la misma ventana se refieren las dos al
 * centro de la ventana, y el sesgo de la ventana se cancela.
 */
export function medidasGps(traza: PuntoTraza[], rej: Rejilla, plano: Plano): Medida[] {
  const pts = traza.map(p => {
    const [x, y] = aPlano(plano, p.lat, p.lon)
    return { t: p.t / 1000, x, y, z: p.altM }
  })
  const vel: Vel[] = []
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const dt = b.t - a.t
    if (dt <= 0) continue
    vel.push({ t: (a.t + b.t) / 2, u: (b.x - a.x) / dt, v: (b.y - a.y) / dt, z: (a.z + b.z) / 2 })
  }

  const porTramo = new Map<string, Medida>()
  let ini = 0
  for (let fin = 0; fin < vel.length; fin++) {
    while (vel[fin].t - vel[ini].t > VENTANA_S) ini++
    const n = fin - ini + 1
    if (n < MIN_MUESTRAS || vel[fin].t - vel[ini].t < 0.9 * VENTANA_S) continue

    let tm = 0
    let um = 0
    let vm = 0
    let zm = 0
    let zmin = Infinity
    let zmax = -Infinity
    for (let i = ini; i <= fin; i++) {
      const s = vel[i]
      tm += s.t
      um += s.u
      vm += s.v
      zm += s.z
      zmin = Math.min(zmin, s.z)
      zmax = Math.max(zmax, s.z)
    }
    tm /= n
    um /= n
    vm /= n
    zm /= n
    // Subiendo o bajando mas de una franja en la ventana se mezclan vientos de capas distintas.
    if (zmax - zmin > FRANJA_M) continue

    let stt = 0
    let stu = 0
    let stv = 0
    for (let i = ini; i <= fin; i++) {
      const dt = vel[i].t - tm
      stt += dt * dt
      stu += dt * (vel[i].u - um)
      stv += dt * (vel[i].v - vm)
    }

    const b = franjaMasCercana(rej, zm)
    if (Math.abs(rej.altM[b] - zm) > FRANJA_M / 2) continue

    const sigma = Math.hypot(SIGMA_GPS_1S / Math.sqrt(n), (TAU_S * SIGMA_GPS_1S) / Math.sqrt(stt))
    porTramo.set(`${b}|${Math.floor(tm / SEPARACION_S)}`, {
      fuente: 'gps', t: tm * 1000, altM: zm,
      u: um + (TAU_S * stu) / stt, v: vm + (TAU_S * stv) / stt, sigma,
    })
  }
  return [...porTramo.values()].sort((a, b) => a.t - b.t)
}
