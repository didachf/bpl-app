import type { LogbookDoc, PersonRole, Uuid } from './types'

/**
 * La persona existe en el documento y tiene el rol pedido.
 *
 * El reglamento no dice "un identificador cualquiera", dice quien: BFCL.160(c)
 * "a proficiency check with an FE(B)", BFCL.160(a)(1)(ii) "one training flight
 * with an FI(B)", BFCL.130(b)(3) "one SUPERVISED solo flight".
 *
 * Sin esta comprobacion basta con escribir un identificador inventado, o el del
 * propio piloto, para que el contador de por cumplido un requisito que exige
 * una segunda persona con una habilitacion concreta.
 */
export function hasRole(doc: LogbookDoc, id: Uuid | null, role: PersonRole): boolean {
  if (id === null) return false
  const p = doc.people.find(x => x.id === id)
  return p !== undefined && p.roles.includes(role)
}
