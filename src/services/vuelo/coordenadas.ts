// src/services/vuelo/coordenadas.ts
// Coordenadas en los tres formatos de la pantalla (spec 10/10 §6.6): decimal,
// grados minutos y segundos, y UTM en ETRS89 como los mapas del ICGC. UTM con la
// serie de Kruger de orden 6 (Karney 2011), probada contra PROJ al milimetro.
import { miles } from '../nav/campo'

const A = 6378137
const F = 1 / 298.257222101 // GRS80, el elipsoide de ETRS89
const K0 = 0.9996
const E0 = 500000
const N = F / (2 - F)
const E = Math.sqrt(F * (2 - F))
const AA = A / (1 + N) * (1 + N ** 2 / 4 + N ** 4 / 64 + N ** 6 / 256)
const RAD = Math.PI / 180

const ALFA = [
  N / 2 - 2 * N ** 2 / 3 + 5 * N ** 3 / 16 + 41 * N ** 4 / 180 - 127 * N ** 5 / 288 + 7891 * N ** 6 / 37800,
  13 * N ** 2 / 48 - 3 * N ** 3 / 5 + 557 * N ** 4 / 1440 + 281 * N ** 5 / 630 - 1983433 * N ** 6 / 1935360,
  61 * N ** 3 / 240 - 103 * N ** 4 / 140 + 15061 * N ** 5 / 26880 + 167603 * N ** 6 / 181440,
  49561 * N ** 4 / 161280 - 179 * N ** 5 / 168 + 6601661 * N ** 6 / 7257600,
  34729 * N ** 5 / 80640 - 3418889 * N ** 6 / 1995840,
  212378941 * N ** 6 / 319334400,
]
const BETA = [
  N / 2 - 2 * N ** 2 / 3 + 37 * N ** 3 / 96 - N ** 4 / 360 - 81 * N ** 5 / 512 + 96199 * N ** 6 / 604800,
  N ** 2 / 48 + N ** 3 / 15 - 437 * N ** 4 / 1440 + 46 * N ** 5 / 105 - 1118711 * N ** 6 / 3870720,
  17 * N ** 3 / 480 - 37 * N ** 4 / 840 - 209 * N ** 5 / 4480 + 5569 * N ** 6 / 90720,
  4397 * N ** 4 / 161280 - 11 * N ** 5 / 504 - 830251 * N ** 6 / 7257600,
  4583 * N ** 5 / 161280 - 108847 * N ** 6 / 3991680,
  20648693 * N ** 6 / 638668800,
]

const meridiano = (huso: number) => (huso * 6 - 183) * RAD

export function aUtm(lat: number, lon: number, huso = 31): { x: number; y: number } {
  const s = Math.sin(lat * RAD)
  const t = Math.sinh(Math.atanh(s) - E * Math.atanh(E * s))
  const dl = lon * RAD - meridiano(huso)
  const xi1 = Math.atan2(t, Math.cos(dl))
  const eta1 = Math.atanh(Math.sin(dl) / Math.sqrt(1 + t * t))
  let xi = xi1
  let eta = eta1
  for (let j = 1; j <= 6; j++) {
    xi += ALFA[j - 1] * Math.sin(2 * j * xi1) * Math.cosh(2 * j * eta1)
    eta += ALFA[j - 1] * Math.cos(2 * j * xi1) * Math.sinh(2 * j * eta1)
  }
  return { x: E0 + K0 * AA * eta, y: K0 * AA * xi }
}

export function deUtm(huso: number, x: number, y: number): { lat: number; lon: number } {
  const xi = y / (K0 * AA)
  const eta = (x - E0) / (K0 * AA)
  let xi1 = xi
  let eta1 = eta
  for (let j = 1; j <= 6; j++) {
    xi1 -= BETA[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta)
    eta1 -= BETA[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta)
  }
  const tp = Math.sin(xi1) / Math.sqrt(Math.sinh(eta1) ** 2 + Math.cos(xi1) ** 2)
  // tan(lat) desde la tangente conforme, por Newton (Karney 2011, ec. 19 a 21).
  let tau = tp
  for (let i = 0; i < 6; i++) {
    const sigma = Math.sinh(E * Math.atanh(E * tau / Math.sqrt(1 + tau * tau)))
    const tpi = tau * Math.sqrt(1 + sigma * sigma) - sigma * Math.sqrt(1 + tau * tau)
    tau += (tp - tpi) / Math.sqrt(1 + tpi * tpi)
      * (1 + (1 - E * E) * tau * tau) / ((1 - E * E) * Math.sqrt(1 + tau * tau))
  }
  return { lat: Math.atan(tau) / RAD, lon: (meridiano(huso) + Math.atan2(Math.sinh(eta1), Math.cos(xi1))) / RAD }
}

export type Camp = 'lat' | 'lon' | 'x' | 'y'
export type Lectura = { ok: true; lat: number; lon: number } | { ok: false; camp: Camp; error: string }

const fallo = (camp: Camp, error: string): Lectura => ({ ok: false, camp, error })
const numero = (s: string) => Number(s.replace(',', '.'))

/** Un eje en decimal: numero con signo o letra. null si no se entiende o la letra no es de ese eje. */
function ejeDecimal(txt: string, eje: 'lat' | 'lon'): number | null {
  const m = /^\s*([+-])?\s*(\d+(?:[.,]\d+)?)\s*°?\s*([NSEWO])?\s*$/i.exec(txt)
  if (m === null) return null
  return conHemisferio(numero(m[2]), m[1], m[3], eje)
}

function conHemisferio(v: number, signo: string | undefined, letra: string | undefined, eje: 'lat' | 'lon'): number | null {
  const l = letra?.toUpperCase()
  if (l !== undefined && (eje === 'lat') !== (l === 'N' || l === 'S')) return null
  const negativo = signo === '-' || l === 'S' || l === 'W' || l === 'O'
  return negativo ? -Math.abs(v) : v
}

function enRango(lat: number | null, lon: number | null): Lectura {
  if (lat === null || Math.abs(lat) > 90) return fallo('lat', 'La latitud ha de ser un número entre 0 i 90, amb N o S.')
  if (lon === null || Math.abs(lon) > 180) return fallo('lon', 'La longitud ha de ser un número entre 0 i 180, amb E o W.')
  return { ok: true, lat, lon }
}

export function llegirDecimal(latTxt: string, lonTxt: string): Lectura {
  if (lonTxt.trim() === '') {
    // El primer numero es codicioso: «41,6561 N 1,1490 E» no se parte en la primera coma.
    const m = /^\s*([+-]?\s*\d+(?:[.,]\d+)?\s*°?\s*[NS]?)\s*(?:[,;]\s*|\s+)([+-]?\s*\d+(?:[.,]\d+)?\s*°?\s*[EWO]?)\s*$/i.exec(latTxt)
    if (m !== null) {
      const lat = ejeDecimal(m[1], 'lat')
      const lon = ejeDecimal(m[2], 'lon')
      if (lat !== null && lon !== null) return enRango(lat, lon)
    }
  }
  return enRango(ejeDecimal(latTxt, 'lat'), ejeDecimal(lonTxt, 'lon'))
}

function ejeDms(txt: string, eje: 'lat' | 'lon'): number | null {
  const m = /^\s*(\d{1,3})\s*[°º:\s]\s*(\d{1,2})\s*['’′:\s]\s*(\d{1,2}(?:[.,]\d+)?)\s*(?:["”″]|'')?\s*([NSEWO])?\s*$/i.exec(txt)
  if (m === null) return null
  const min = Number(m[2])
  const seg = numero(m[3])
  if (min >= 60 || seg >= 60) return null
  return conHemisferio(Number(m[1]) + min / 60 + seg / 3600, undefined, m[4], eje)
}

export function llegirDms(latTxt: string, lonTxt: string): Lectura {
  return enRango(ejeDms(latTxt, 'lat'), ejeDms(lonTxt, 'lon'))
}

export function llegirUtm(huso: number, xTxt: string, yTxt: string): Lectura {
  const limpio = (s: string) => Number(s.replace(/[\s.  ]/g, '').replace(',', '.'))
  const x = limpio(xTxt)
  const y = limpio(yTxt)
  if (xTxt.trim() === '' || !Number.isFinite(x) || x < 100000 || x > 1000000) {
    return fallo('x', 'La X (est) va de 100 000 a 1 000 000 m.')
  }
  if (yTxt.trim() === '' || !Number.isFinite(y) || y < 0 || y > 10000000) {
    return fallo('y', 'La Y (nord) va de 0 a 10 000 000 m.')
  }
  return { ok: true, ...deUtm(huso, x, y) }
}

const coma = (v: number, dec: number) => v.toFixed(dec).replace('.', ',')

export function formatDecimal(lat: number, lon: number): string {
  return `${coma(Math.abs(lat), 4)} ${lat < 0 ? 'S' : 'N'} ${coma(Math.abs(lon), 4)} ${lon < 0 ? 'W' : 'E'}`
}

function dms(v: number): string {
  const decimas = Math.round(Math.abs(v) * 36000)
  const g = Math.floor(decimas / 36000)
  const m = Math.floor((decimas % 36000) / 600)
  const s = (decimas % 600) / 10
  return `${g}°${String(m).padStart(2, '0')}'${coma(s, 1).padStart(4, '0')}"`
}

export function formatDms(lat: number, lon: number): string {
  return `${dms(lat)} ${lat < 0 ? 'S' : 'N'} ${dms(lon)} ${lon < 0 ? 'W' : 'E'}`
}

export function formatUtm(lat: number, lon: number, huso = 31): string {
  const u = aUtm(lat, lon, huso)
  return `${huso} ${miles(u.x)} · ${miles(u.y)}`
}
