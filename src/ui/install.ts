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

/**
 * El evento que Chrome dispara cuando la app cumple los criterios de
 * instalacion. No esta en lib.dom, asi que se declara aqui.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let promptGuardado: BeforeInstallPromptEvent | null = null
const suscriptores = new Set<(sePuede: boolean) => void>()

function avisar(sePuede: boolean): void {
  for (const f of suscriptores) f(sePuede)
}

// El listener se registra al cargar el modulo, NO dentro de un efecto de
// Preact. `beforeinstallprompt` se dispara muy pronto y solo una vez: si para
// entonces no hay nadie escuchando, el evento se pierde y el boton de instalar
// no aparece nunca.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    // Sin esto Chrome enseña su propia barra, que compite con la nuestra.
    e.preventDefault()
    promptGuardado = e as BeforeInstallPromptEvent
    avisar(true)
  })
  window.addEventListener('appinstalled', () => {
    promptGuardado = null
    avisar(false)
  })
}

/** La app se esta ejecutando instalada y no en una pestaña. */
export function estaInstalada(): boolean {
  try {
    return matchMedia('(display-mode: standalone)').matches
      || matchMedia('(display-mode: fullscreen)').matches
      || matchMedia('(display-mode: minimal-ui)').matches
  } catch {
    return false
  }
}

/**
 * Avisa cuando se puede instalar, y desde ya si el evento llego antes de que
 * la interfaz estuviera montada.
 */
export function vigilarInstalacion(alCambiar: (sePuede: boolean) => void): () => void {
  suscriptores.add(alCambiar)
  if (promptGuardado !== null) alCambiar(true)
  return () => { suscriptores.delete(alCambiar) }
}

export type ResultadoInstalacion = 'aceptada' | 'rechazada' | 'sin_prompt'

/**
 * Lanza el dialogo de instalacion de Chrome.
 *
 * `sin_prompt` significa que el navegador nunca ofrecio instalar: o no cumple
 * los criterios, o no es Chrome. La interfaz enseña entonces las instrucciones
 * a mano en lugar de dejar al usuario mirando un boton que no hace nada.
 */
export async function instalar(): Promise<ResultadoInstalacion> {
  if (promptGuardado === null) return 'sin_prompt'
  const p = promptGuardado
  promptGuardado = null
  await p.prompt()
  const { outcome } = await p.userChoice
  if (outcome === 'accepted') return 'aceptada'
  avisar(true)
  promptGuardado = p
  return 'rechazada'
}
