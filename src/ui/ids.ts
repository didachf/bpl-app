// src/ui/ids.ts
/**
 * Identificador de una entidad nueva del documento.
 *
 * Unico sitio de la app que llama a `crypto.randomUUID`, para que el dia que
 * haya que cambiarlo sea un cambio de una linea. Safari lo tiene desde 15.4,
 * que es muy anterior al iPhone del usuario.
 */
export function newId(): string {
  return crypto.randomUUID()
}
