// src/services/vuelo/calculador.ts
// El motor de navegacion corre en un Web Worker para no parar la pantalla. Solo
// vale el ultimo pedido: si llega uno nuevo, los anteriores se resuelven con
// null y su respuesta se tira (spec 10/10 §10).
import type { EntradaNav } from '../nav/motor'
import type { ResultadoNavegacion } from '../nav/tipos'

export interface Pedido { id: number; entrada: EntradaNav }
export type Respuesta =
  | { id: number; resultado: ResultadoNavegacion; ms: number }
  | { id: number; error: string; ms: number }

/** Lo que hace falta de un Worker, para poder probarlo sin navegador. */
export interface Hilo {
  onmessage: ((e: { data: Respuesta }) => void) | null
  postMessage(p: Pedido): void
  terminate(): void
}

export interface Calculo { resultado: ResultadoNavegacion; ms: number }

export interface Calculador {
  calcular(entrada: EntradaNav): Promise<Calculo | null>
  cerrar(): void
}

export function crearCalculador(hilo: Hilo): Calculador {
  let ultimo = 0
  const pendientes = new Map<number, { ok: (c: Calculo | null) => void; ko: (e: Error) => void }>()
  const soltar = () => {
    for (const p of pendientes.values()) p.ok(null)
    pendientes.clear()
  }
  hilo.onmessage = ({ data }) => {
    const p = pendientes.get(data.id)
    if (p === undefined) return
    pendientes.delete(data.id)
    if ('error' in data) p.ko(new Error(data.error))
    else p.ok({ resultado: data.resultado, ms: data.ms })
  }
  return {
    calcular(entrada) {
      soltar()
      const id = ++ultimo
      return new Promise((ok, ko) => {
        pendientes.set(id, { ok, ko })
        hilo.postMessage({ id, entrada })
      })
    },
    cerrar() {
      soltar()
      hilo.terminate()
    },
  }
}

export function crearCalculadorNavegador(): Calculador {
  const w = new Worker(new URL('./nav.worker.ts', import.meta.url), { type: 'module' })
  return crearCalculador(w as unknown as Hilo)
}
