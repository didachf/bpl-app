// src/services/vuelo/preparar.ts
// Lo que se baja al pulsar «Començar vol», antes de despegar (spec 10/10 §8):
// prevision, relieve y ortofoto, de lo mas pequeno a lo mas grande. Lo que falle
// queda en avisos, no para el vuelo.
import type { Relieve } from '../nav/tipos'
import { bajarMosaicos, type Progreso } from './bajarMosaicos'
import { almacenCache, leerDeCache, pixelesDePng } from './navegador'
import { mosaicosOrto, mosaicosRelieve, PASO_RELIEVE_M, URL_ORTO, URL_RELIEVE, urlDe } from './mapasDeVuelo'
import { obtenerPrevision, type Obtenida } from './previsionGuardada'
import { FaltaMosaico, rejillaTerrarium } from './terrarium'

export type Fase = 'previsio' | 'relleu' | 'ortofoto'

export interface Preparado { prevision: Obtenida; relieve: Relieve | null; orto: Progreso; avisos: string[] }

/** El relieve de 20 km alrededor del punto, de la cache y bajando lo que falte. Sin red sirve lo guardado. */
export async function relieveDeZona(
  lat: number, lon: number, alProgreso?: (p: Progreso) => void, senal?: AbortSignal,
): Promise<Relieve> {
  const { caja, mosaicos } = mosaicosRelieve(lat, lon)
  await bajarMosaicos(mosaicos.map(m => urlDe(URL_RELIEVE, m)), await almacenCache(), { alProgreso, senal })
  const pix = new Map<string, Uint8ClampedArray>()
  for (const m of mosaicos) {
    const b = await leerDeCache(urlDe(URL_RELIEVE, m))
    if (b !== null) pix.set(`${m.x}/${m.y}`, await pixelesDePng(b))
  }
  return rejillaTerrarium(caja, PASO_RELIEVE_M, lat, (x, y) => pix.get(`${x}/${y}`) ?? null)
}

export async function prepararVol(
  lat: number, lon: number, ahora: number,
  alProgreso?: (f: Fase, p: Progreso | null) => void, senal?: AbortSignal,
): Promise<Preparado> {
  const avisos: string[] = []
  alProgreso?.('previsio', null)
  const prevision = await obtenerPrevision(lat, lon, ahora)
  if (prevision.error !== null) avisos.push(prevision.error)

  let relieve: Relieve | null = null
  try {
    relieve = await relieveDeZona(lat, lon, p => alProgreso?.('relleu', p), senal)
  } catch (e) {
    if (!(e instanceof FaltaMosaico)) throw e
    avisos.push(`Sense relleu: ${e.message}.`)
  }

  const urls = mosaicosOrto(lat, lon).map(m => urlDe(URL_ORTO, m))
  const orto = await bajarMosaicos(urls, await almacenCache(), { alProgreso: p => alProgreso?.('ortofoto', p), senal })
  if (orto.fallidos > 0) avisos.push(`No s'han pogut baixar ${orto.fallidos} de ${orto.total} trossos de l'ortofoto.`)
  return { prevision, relieve, orto, avisos }
}
