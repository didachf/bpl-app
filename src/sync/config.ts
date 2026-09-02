// src/sync/config.ts
// Donde vive el token y el sha del ultimo empuje.
import type { GithubConfig } from './github'

/**
 * Las claves llevan prefijo propio.
 *
 * `WARNING:` el origen de GitHub Pages es la cuenta entera, no la subcarpeta:
 * didachf.github.io, no didachf.github.io/bpl-app. Cualquier otro sitio de
 * Pages de la misma cuenta comparte este localStorage. Hoy no hay ninguno,
 * pero un prefijo cuesta cero y evita que un proyecto futuro pise el token.
 * Ver el spec §7.
 */
export const CLAVES = {
  config: 'bpl-app:github',
  sha: 'bpl-app:logbook-sha',
} as const

/**
 * Devuelve null ante cualquier duda: nada guardado, json corrupto, o un objeto
 * al que le falta un campo. Nunca lanza, porque esto se llama en el arranque y
 * un throw aqui deja la app en blanco.
 */
export function loadConfig(): GithubConfig | null {
  const crudo = localStorage.getItem(CLAVES.config)
  if (crudo === null) return null
  try {
    const o = JSON.parse(crudo) as Record<string, unknown>
    const campos = ['owner', 'repo', 'branch', 'token'] as const
    for (const c of campos) if (typeof o[c] !== 'string' || o[c] === '') return null
    return {
      owner: o.owner as string,
      repo: o.repo as string,
      branch: o.branch as string,
      token: o.token as string,
    }
  } catch {
    return null
  }
}

export function saveConfig(cfg: GithubConfig): void {
  localStorage.setItem(CLAVES.config, JSON.stringify(cfg))
}

/**
 * Borra la configuracion Y el sha.
 *
 * Van juntos a proposito: un sha que sobrevive a un cambio de repositorio
 * apunta a un fichero de otro sitio, y el primer empuje daria un conflicto que
 * no lo es.
 */
export function clearConfig(): void {
  localStorage.removeItem(CLAVES.config)
  localStorage.removeItem(CLAVES.sha)
}

export function loadSha(): string | null {
  return localStorage.getItem(CLAVES.sha)
}

export function saveSha(sha: string): void {
  localStorage.setItem(CLAVES.sha, sha)
}
