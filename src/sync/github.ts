// src/sync/github.ts
// Cliente minimo de la API de contenidos de GitHub.
// Documentacion: https://docs.github.com/rest/repos/contents

export interface GithubConfig {
  owner: string
  repo: string
  branch: string
  token: string
}

export interface RemoteFile {
  content: string
  sha: string
}

/** El fichero remoto ha cambiado desde la ultima lectura. No se reintenta solo. */
export class ConflictError extends Error {
  constructor(message = 'El fichero remoto ha cambiado desde la ultima lectura') {
    super(message)
    this.name = 'ConflictError'
  }
}

/**
 * Codifica a base64 pasando por UTF-8.
 * `btoa` a secas revienta con cualquier caracter fuera de Latin-1, y el
 * documento lleva "Tarrega" y "Odena" con acento desde el primer arranque.
 */
export function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

/** La API devuelve el base64 partido en lineas. Hay que quitarlas antes. */
export function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''))
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function url(cfg: GithubConfig, path: string): string {
  return `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`
}

function headers(cfg: GithubConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${cfg.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

/** Devuelve null si el fichero no existe todavia. Lanza en cualquier otro fallo. */
export async function fetchFile(cfg: GithubConfig, path: string): Promise<RemoteFile | null> {
  const res = await fetch(`${url(cfg, path)}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: headers(cfg),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub ha respondido ${res.status} al leer ${path}`)

  const body = await res.json() as { content: string; sha: string }
  return { content: fromBase64(body.content), sha: body.sha }
}

/**
 * Escribe el fichero. `sha` debe ser el de la version leida, o null si el
 * fichero es nuevo.
 *
 * Un 409 o un 422 significan que el sha ya no vale, es decir que alguien ha
 * escrito desde otro dispositivo. Se traduce a ConflictError para que la
 * interfaz pregunte en lugar de fusionar por su cuenta.
 */
export async function putFile(
  cfg: GithubConfig,
  path: string,
  content: string,
  sha: string | null,
  message: string,
): Promise<{ sha: string }> {
  const body: Record<string, unknown> = {
    message,
    content: toBase64(content),
    branch: cfg.branch,
  }
  if (sha !== null) body.sha = sha

  const res = await fetch(url(cfg, path), {
    method: 'PUT',
    headers: { ...headers(cfg), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (res.status === 409 || res.status === 422) throw new ConflictError()
  if (!res.ok) throw new Error(`GitHub ha respondido ${res.status} al escribir ${path}`)

  const out = await res.json() as { content: { sha: string } }
  return { sha: out.content.sha }
}
