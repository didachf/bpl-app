// src/services/vuelo/mapasDeVuelo.ts
// Que mosaicos se bajan para volar sin cobertura (spec 10/10 §8 y §12.1) y
// donde se guardan. vite.config.ts importa de aqui el nombre y el patron de la
// cache, para que la descarga y el service worker no se separen.
import { cajaAlrededor, mosaicosDeCaja, type Caja, type Mosaico } from './mosaicos'
import { Z_RELIEVE } from './terrarium'

export const URL_ORTO = 'https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/orto/MON3857NW/{z}/{x}/{y}.png'
export const URL_RELIEVE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

export const ATRIBUCION_ORTO = "Ortofoto de Catalunya 1:5.000 de l'Institut Cartogràfic i Geològic de Catalunya (ICGC), sota una llicència CC BY 4.0"
export const ATRIBUCION_RELIEVE = 'Relleu: AWS Terrain Tiles. Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers'

export const CACHE_MOSAICOS = 'mosaicos'
/** Solo los mosaicos del Mapa base y del relieve. La API de GitHub y open-meteo, nunca. */
export const PATRON_MOSAICOS = /^https:\/\/(geoserveis\.icgc\.cat\/servei\/catalunya\/mapa-base\/wmts\/|s3\.amazonaws\.com\/elevation-tiles-prod\/terrarium\/)/

export const RADIO_ORTO_M = 15000
export const RADIO_ORTO_DETALLE_M = 3000
export const RADIO_RELIEVE_M = 20000
export const PASO_RELIEVE_M = 100

export function urlDe(plantilla: string, m: Mosaico): string {
  return plantilla.replace('{z}', String(m.z)).replace('{x}', String(m.x)).replace('{y}', String(m.y))
}

export function mosaicosOrto(lat: number, lon: number): Mosaico[] {
  const lejos = cajaAlrededor(lat, lon, RADIO_ORTO_M)
  const cerca = cajaAlrededor(lat, lon, RADIO_ORTO_DETALLE_M)
  return [12, 13, 14, 15].flatMap(z => mosaicosDeCaja(lejos, z)).concat(mosaicosDeCaja(cerca, 16))
}

export function mosaicosRelieve(lat: number, lon: number): { caja: Caja; mosaicos: Mosaico[] } {
  const caja = cajaAlrededor(lat, lon, RADIO_RELIEVE_M)
  return { caja, mosaicos: mosaicosDeCaja(caja, Z_RELIEVE, 1) }
}
