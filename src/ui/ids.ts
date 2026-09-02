// src/ui/ids.ts
/**
 * Identificador de una entidad nueva del documento.
 *
 * Unico sitio de la app que llama a `crypto.randomUUID`, para que el dia que
 * haya que cambiarlo sea un cambio de una linea. Comprobado que existe en Chrome
 * de Android. Exige contexto seguro, y GitHub Pages sirve por https.
 */
export function newId(): string {
  return crypto.randomUUID()
}
