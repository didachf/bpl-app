// src/ui/aparell.ts
// Cada aparato tiene su modo y su ultimo techo, en su localStorage y no en el
// documento, que es el mismo en los dos aparatos (spec 10/10 §7.4).

export type Aparell = 'tauleta' | 'telefon'

const CLAU_APARELL = 'bpl:aparell'
const CLAU_SOSTRE = 'bpl:sostreM'
const COSTAT_TAULETA_PX = 600

const llegir = (k: string): string | null => {
  try { return localStorage.getItem(k) } catch { return null }
}
const escriure = (k: string, v: string): void => {
  try { localStorage.setItem(k, v) } catch { /* sin almacenamiento, se pierde y ya */ }
}

export function aparellPerDefecte(amplePx: number, altPx: number): Aparell {
  return Math.min(amplePx, altPx) >= COSTAT_TAULETA_PX ? 'tauleta' : 'telefon'
}

export function aparell(amplePx = screen.width, altPx = screen.height): Aparell {
  const v = llegir(CLAU_APARELL)
  return v === 'tauleta' || v === 'telefon' ? v : aparellPerDefecte(amplePx, altPx)
}

export function desarAparell(a: Aparell): void {
  escriure(CLAU_APARELL, a)
}

export function ultimSostre(): number | null {
  const v = Number(llegir(CLAU_SOSTRE))
  return llegir(CLAU_SOSTRE) === null || !Number.isFinite(v) || v <= 0 ? null : v
}

export function desarSostre(m: number): void {
  escriure(CLAU_SOSTRE, String(m))
}
