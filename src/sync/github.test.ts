// src/sync/github.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toBase64, fromBase64, fetchFile, putFile, ConflictError, type GithubConfig } from './github'

const cfg: GithubConfig = {
  owner: 'didachf',
  repo: 'bpl-logbook',
  branch: 'main',
  token: 'ghp_prueba',
}

describe('base64', () => {
  it('ida y vuelta con acentos y caracteres catalanes', () => {
    const s = 'Tàrrega, Òdena, Agramunt. Envoltura 3.400 m³'
    expect(fromBase64(toBase64(s))).toBe(s)
  })

  it('tolera los saltos de linea que mete la API de GitHub', () => {
    const b64 = toBase64('hola')
    const conSaltos = b64.slice(0, 2) + '\n' + b64.slice(2)
    expect(fromBase64(conSaltos)).toBe('hola')
  })
})

describe('fetchFile', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('devuelve contenido y sha cuando el fichero existe', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ content: toBase64('{"a":1}'), sha: 'abc123' }),
      { status: 200 },
    ))
    const r = await fetchFile(cfg, 'logbook.json')
    expect(r).toEqual({ content: '{"a":1}', sha: 'abc123' })
  })

  it('devuelve null cuando el fichero todavia no existe', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"message":"Not Found"}', { status: 404 }))
    expect(await fetchFile(cfg, 'logbook.json')).toBe(null)
  })

  it('lanza con el codigo cuando el token no vale', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"message":"Bad credentials"}', { status: 401 }))
    await expect(fetchFile(cfg, 'logbook.json')).rejects.toThrow(/401/)
  })

  it('manda el token en la cabecera', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 404 }))
    await fetchFile(cfg, 'logbook.json')
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer ghp_prueba')
  })
})

describe('putFile', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('devuelve el sha nuevo tras escribir', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ content: { sha: 'nuevo999' } }), { status: 200 },
    ))
    const r = await putFile(cfg, 'logbook.json', '{"a":1}', 'viejo111', 'mensaje')
    expect(r.sha).toBe('nuevo999')
  })

  it('omite el campo sha cuando el fichero es nuevo', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ content: { sha: 'primero' } }), { status: 201 },
    ))
    await putFile(cfg, 'logbook.json', '{}', null, 'primer commit')
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(init!.body as string)).not.toHaveProperty('sha')
  })

  it('lanza ConflictError con un 409', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"message":"conflict"}', { status: 409 }))
    await expect(putFile(cfg, 'logbook.json', '{}', 'viejo', 'm')).rejects.toBeInstanceOf(ConflictError)
  })

  it('lanza ConflictError con un 422, que es lo que devuelve con un sha caducado', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"message":"does not match"}', { status: 422 }))
    await expect(putFile(cfg, 'logbook.json', '{}', 'viejo', 'm')).rejects.toBeInstanceOf(ConflictError)
  })

  it('un 500 es un error normal y no un conflicto', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('boom', { status: 500 }))
    const p = putFile(cfg, 'logbook.json', '{}', 'viejo', 'm')
    await expect(p).rejects.toThrow(/500/)
    await expect(p).rejects.not.toBeInstanceOf(ConflictError)
  })
})
