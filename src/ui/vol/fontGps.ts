// src/ui/vol/fontGps.ts
// De donde salen los puntos del GPS. En la tablet, watchPosition con la altitud
// sobre el elipsoide tal cual (spec 10/10 §12.1). En desarrollo, y solo si
// localStorage['bpl:gpsSimulat'] apunta a un JSON de puntos, se reproduce esa
// traza a un punto por segundo: es para comprobar la pantalla en Chromium.
import type { PuntoGps } from '../../services/vuelo/gps'

/** Un punto de la traza simulada: segundos desde el inicio y la altitud sobre el elipsoide. */
export interface PuntSimulat { s: number; lat: number; lon: number; altElipM: number }

const MISSATGES: Record<number, string> = {
  1: 'Sense permís per al GPS. Dona-li permís a Chrome per a aquesta app.',
  2: 'Sense senyal de GPS.',
  3: 'El GPS no respon.',
}

function simulat(): string | null {
  if (!import.meta.env.DEV) return null
  try { return localStorage.getItem('bpl:gpsSimulat') } catch { return null }
}

function reproduir(url: string, cb: (p: PuntoGps) => void, err: (m: string) => void): () => void {
  let parat = false
  let rellotge: ReturnType<typeof setInterval> | undefined
  void fetch(url).then(r => r.json() as Promise<PuntSimulat[]>).then(punts => {
    if (parat) return
    const inici = Date.now()
    let i = 0
    rellotge = setInterval(() => {
      const ara = Date.now()
      while (i < punts.length - 1 && punts[i + 1].s * 1000 <= ara - inici) i++
      const p = punts[i]
      cb({ t: ara, lat: p.lat, lon: p.lon, altElipM: p.altElipM, precisionM: 4 })
    }, 1000)
  }).catch(() => err('No es pot llegir la traça simulada.'))
  return () => { parat = true; clearInterval(rellotge) }
}

export function observarGps(cb: (p: PuntoGps) => void, err: (m: string) => void): () => void {
  const url = simulat()
  if (url !== null) return reproduir(url, cb, err)
  if (!('geolocation' in navigator)) {
    err('Aquest aparell no té GPS.')
    return () => {}
  }
  const id = navigator.geolocation.watchPosition(
    p => cb({
      t: p.timestamp, lat: p.coords.latitude, lon: p.coords.longitude,
      altElipM: p.coords.altitude, precisionM: p.coords.accuracy,
    }),
    e => err(MISSATGES[e.code] ?? 'Error del GPS.'),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
  )
  return () => navigator.geolocation.clearWatch(id)
}
