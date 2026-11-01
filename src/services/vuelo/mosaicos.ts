// src/services/vuelo/mosaicos.ts
// Cuentas de mosaicos XYZ, fila 0 arriba como en OSM. Es el esquema del Mapa
// base del ICGC y de AWS Terrain Tiles (spec 10/10 §12.1).

const R = 6371000
const RAD = Math.PI / 180

export interface Caja { sur: number; oeste: number; norte: number; este: number }
export interface Mosaico { z: number; x: number; y: number }

/** Posicion continua en mosaicos: la parte entera es el mosaico, la fraccion el sitio dentro. */
export function aMosaico(lat: number, lon: number, z: number): [number, number] {
  const n = 2 ** z
  return [(lon + 180) / 360 * n, (1 - Math.asinh(Math.tan(lat * RAD)) / Math.PI) / 2 * n]
}

/** Caja de radioM alrededor de un punto, con el mismo plano que el motor (nav/geo.ts). */
export function cajaAlrededor(lat: number, lon: number, radioM: number): Caja {
  const dLat = radioM / (R * RAD)
  const dLon = radioM / (R * RAD * Math.cos(lat * RAD))
  return { sur: lat - dLat, oeste: lon - dLon, norte: lat + dLat, este: lon + dLon }
}

/**
 * Los mosaicos que tocan la caja en el nivel z, de norte a sur y de oeste a
 * este. margenPx agranda la caja en pixeles: la bilineal de un borde lee el
 * pixel de al lado, que puede caer en el mosaico vecino.
 */
export function mosaicosDeCaja(c: Caja, z: number, margenPx = 0): Mosaico[] {
  const m = margenPx / 256
  const [x0, y0] = aMosaico(c.norte, c.oeste, z)
  const [x1, y1] = aMosaico(c.sur, c.este, z)
  const out: Mosaico[] = []
  for (let y = Math.floor(y0 - m); y <= Math.floor(y1 + m); y++) {
    for (let x = Math.floor(x0 - m); x <= Math.floor(x1 + m); x++) out.push({ z, x, y })
  }
  return out
}
