// src/services/vuelo/nav.worker.ts
// El motor de navegacion fuera del hilo de la pantalla. Mide lo que tarda,
// para saber en la tablet si cabe en 1 s (spec 10/10 §12.1).
import { navegar } from '../nav/motor'
import type { Pedido, Respuesta } from './calculador'

const ambito = self as unknown as {
  onmessage: ((e: MessageEvent<Pedido>) => void) | null
  postMessage(r: Respuesta): void
}

ambito.onmessage = ({ data: { id, entrada } }) => {
  const t0 = performance.now()
  try {
    const resultado = navegar(entrada)
    ambito.postMessage({ id, resultado, ms: performance.now() - t0 })
  } catch (e) {
    ambito.postMessage({ id, error: e instanceof Error ? e.message : String(e), ms: performance.now() - t0 })
  }
}
