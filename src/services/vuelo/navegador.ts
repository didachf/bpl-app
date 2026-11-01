// src/services/vuelo/navegador.ts
// Lo que solo existe en el navegador: la cache de mosaicos y un PNG a pixeles.
// Se comprueba en Chromium (plan 2026-11-01-datos-de-vuelo, tarea 10).
import type { Almacen } from './bajarMosaicos'
import { CACHE_MOSAICOS } from './mapasDeVuelo'

// AWS manda `Vary: Origin`: sin ignoreVary, una peticion sin Origin no encuentra lo guardado.
const SIN_VARY: CacheQueryOptions = { ignoreVary: true }

export async function almacenCache(): Promise<Almacen> {
  const c = await caches.open(CACHE_MOSAICOS)
  return {
    tiene: async url => (await c.match(url, SIN_VARY)) !== undefined,
    guardar: (url, r) => c.put(url, r),
  }
}

export async function leerDeCache(url: string): Promise<Blob | null> {
  const r = await (await caches.open(CACHE_MOSAICOS)).match(url, SIN_VARY)
  return r === undefined ? null : await r.blob()
}

export async function vaciarMosaicos(): Promise<boolean> {
  return caches.delete(CACHE_MOSAICOS)
}

/** RGBA sin gestion de color ni alfa premultiplicado: un pixel Terrarium es un numero, no un color. */
export async function pixelesDePng(b: Blob): Promise<Uint8ClampedArray> {
  const bmp = await createImageBitmap(b, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
  const lienzo = new OffscreenCanvas(bmp.width, bmp.height)
  const ctx = lienzo.getContext('2d', { willReadFrequently: true })
  if (ctx === null) throw new Error('sense context 2d per llegir el relleu')
  ctx.drawImage(bmp, 0, 0)
  bmp.close()
  return ctx.getImageData(0, 0, lienzo.width, lienzo.height).data
}
