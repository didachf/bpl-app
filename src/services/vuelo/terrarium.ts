// src/services/vuelo/terrarium.ts
// De los mosaicos Terrarium de AWS Terrain Tiles a la rejilla del motor (spec
// 2026-11-01-relieve §3). Mismas cuentas que relieve.py del prototipo, que
// saco relieve_10-10.json: bilineal entre centros de pixel y 0,1 m.
import type { Relieve } from '../nav/tipos'
import { aMosaico, type Caja, type Mosaico } from './mosaicos'

const R = 6371000
const RAD = Math.PI / 180
const LADO = 256
export const Z_RELIEVE = 12

/** RGBA de un mosaico de 256 x 256 del nivel Z_RELIEVE, o null si no se tiene. */
export type Pixeles = (x: number, y: number) => Uint8ClampedArray | null

export function elevTerrarium(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768
}

export class FaltaMosaico extends Error {
  constructor(readonly mosaico: Mosaico) {
    super(`falta el mosaic de relleu ${mosaico.z}/${mosaico.x}/${mosaico.y}`)
  }
}

/**
 * Rejilla regular en grados con paso pasoM, filas de sur a norte desde el borde
 * sur de la caja. El paso en longitud usa latRef, como el prototipo.
 */
export function rejillaTerrarium(c: Caja, pasoM: number, latRef: number, pixeles: Pixeles): Relieve {
  const dLat = pasoM / (R * RAD)
  const dLon = pasoM / (R * RAD * Math.cos(latRef * RAD))
  const nLat = Math.floor((c.norte - c.sur) / dLat) + 1
  const nLon = Math.floor((c.este - c.oeste) / dLon) + 1

  const leidos = new Map<string, Uint8ClampedArray>()
  const px = (gx: number, gy: number): number => {
    const tx = Math.floor(gx / LADO)
    const ty = Math.floor(gy / LADO)
    const k = `${tx}/${ty}`
    let d = leidos.get(k)
    if (d === undefined) {
      const p = pixeles(tx, ty)
      if (p === null) throw new FaltaMosaico({ z: Z_RELIEVE, x: tx, y: ty })
      d = p
      leidos.set(k, d)
    }
    const i = ((gy - ty * LADO) * LADO + (gx - tx * LADO)) * 4
    return elevTerrarium(d[i], d[i + 1], d[i + 2])
  }

  const elevM: number[] = new Array(nLat * nLon)
  for (let i = 0; i < nLat; i++) {
    for (let j = 0; j < nLon; j++) {
      const [x, y] = aMosaico(c.sur + i * dLat, c.oeste + j * dLon, Z_RELIEVE)
      const gx = x * LADO - 0.5
      const gy = y * LADO - 0.5
      const ix = Math.floor(gx)
      const iy = Math.floor(gy)
      const fx = gx - ix
      const fy = gy - iy
      const e = px(ix, iy) * (1 - fx) * (1 - fy) + px(ix + 1, iy) * fx * (1 - fy)
        + px(ix, iy + 1) * (1 - fx) * fy + px(ix + 1, iy + 1) * fx * fy
      elevM[i * nLon + j] = Math.round(e * 10) / 10
    }
  }
  return { lat0: c.sur, lon0: c.oeste, dLat, dLon, nLat, nLon, elevM }
}
