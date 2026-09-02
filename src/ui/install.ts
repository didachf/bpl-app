// src/ui/install.ts
// Lo que solo tiene sentido con la app instalada: almacenamiento persistente y
// versiones nuevas del service worker.
import { registerSW } from 'virtual:pwa-register'

/**
 * Pide que el navegador NO desaloje este almacenamiento.
 *
 * En Chrome de Android el desalojo va por presion de almacenamiento, no por
 * tiempo, y un origen persistente queda exento. A una PWA instalada se lo suele
 * conceder sin preguntar, pero **puede decir que no**, asi que se devuelve el
 * resultado y no se da por hecho. Ver el spec §8.
 *
 * Falle lo que falle, no lanza: esto es una mejora, no un requisito. La copia
 * en GitHub sigue siendo la red de seguridad de verdad.
 */
export async function pedirAlmacenamientoPersistente(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted === undefined) return false
    if (await navigator.storage.persisted()) return true
    if (navigator.storage.persist === undefined) return false
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

let aplicar: ((recargar?: boolean) => Promise<void>) | null = null

/**
 * Registra el service worker y avisa cuando hay una version nueva esperando.
 *
 * La version nueva NO se aplica sola. `registerType` es `prompt` justamente
 * para eso: una recarga automatica a media nota de vuelo pierde lo que se
 * estuviera escribiendo.
 */
export function vigilarVersiones(alHaberVersionNueva: () => void): void {
  aplicar = registerSW({
    immediate: true,
    onNeedRefresh: alHaberVersionNueva,
  })
}

/**
 * Aplica la version que estaba esperando y recarga.
 *
 * Quien llama tiene que haber vaciado antes la cola de guardado, porque esto
 * recarga la pagina.
 */
export async function aplicarVersionNueva(): Promise<void> {
  if (aplicar === null) return
  await aplicar(true)
}
