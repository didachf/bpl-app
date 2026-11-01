// src/services/vuelo/bajarMosaicos.ts
// Baja una lista de mosaicos a un almacen antes de despegar (spec 10/10 §8):
// sin repetir los que ya estan y con pocas peticiones a la vez, lo que pide un
// mapa al moverlo. El almacen es la Cache API en el navegador y un Map en las pruebas.

export interface Almacen {
  tiene(url: string): Promise<boolean>
  guardar(url: string, r: Response): Promise<void>
}

export interface Progreso { total: number; hechos: number; bajados: number; yaEstaban: number; fallidos: number; bytes: number }

export interface OpcionesBajar {
  fetch?: typeof fetch
  alProgreso?: (p: Progreso) => void
  senal?: AbortSignal
  aLaVez?: number
}

export const A_LA_VEZ = 4

export async function bajarMosaicos(urls: string[], almacen: Almacen, o: OpcionesBajar = {}): Promise<Progreso> {
  const f = o.fetch ?? fetch
  const p: Progreso = { total: urls.length, hechos: 0, bajados: 0, yaEstaban: 0, fallidos: 0, bytes: 0 }
  let siguiente = 0

  const uno = async (url: string): Promise<void> => {
    if (await almacen.tiene(url)) {
      p.yaEstaban++
      return
    }
    try {
      const r = await f(url, { signal: o.senal })
      if (!r.ok) {
        p.fallidos++
        return
      }
      const cuerpo = await r.blob()
      await almacen.guardar(url, new Response(cuerpo, { status: r.status, headers: r.headers }))
      p.bajados++
      p.bytes += cuerpo.size
    } catch {
      p.fallidos++
    }
  }

  const hilo = async (): Promise<void> => {
    while (siguiente < urls.length && o.senal?.aborted !== true) {
      await uno(urls[siguiente++])
      p.hechos++
      o.alProgreso?.({ ...p })
    }
  }

  await Promise.all(Array.from({ length: Math.min(o.aLaVez ?? A_LA_VEZ, urls.length) }, hilo))
  return p
}
