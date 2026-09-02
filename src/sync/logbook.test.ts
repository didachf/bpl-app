import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { emptyDocument } from '../domain/empty'
import { ConflictError, toBase64, type GithubConfig } from './github'
import { LOGBOOK_PATH, serialize, pushDocument, restoreDocument } from './logbook'

const cfg: GithubConfig = { owner: 'didachf', repo: 'bpl-logbook', branch: 'main', token: 't' }

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
afterEach(() => { vi.unstubAllGlobals() })

describe('serialize', () => {
  it('json legible y con salto final, para que el repositorio se pueda leer a mano', () => {
    const s = serialize(emptyDocument())
    expect(s.startsWith('{\n')).toBe(true)
    expect(s.endsWith('\n')).toBe(true)
  })

  it('lo serializado vuelve a ser el mismo documento', () => {
    const d = emptyDocument()
    expect(JSON.parse(serialize(d))).toEqual(d)
  })
})

describe('pushDocument', () => {
  it('escribe en logbook.json y devuelve el sha nuevo', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ content: { sha: 'nuevo' } }), { status: 200 },
    ))
    const r = await pushDocument(cfg, emptyDocument(), 'viejo')
    expect(r.sha).toBe('nuevo')
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain(`/contents/${LOGBOOK_PATH}`)
  })

  it('un 409 sale como ConflictError y no se reintenta', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 409 }))
    await expect(pushDocument(cfg, emptyDocument(), 'viejo')).rejects.toBeInstanceOf(ConflictError)
  })
})

describe('restoreDocument', () => {
  it('devuelve el documento y su sha', async () => {
    const d = emptyDocument()
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ content: toBase64(JSON.stringify(d)), sha: 'abc' }), { status: 200 },
    ))
    const r = await restoreDocument(cfg)
    expect(r).not.toBe(null)
    expect(r?.sha).toBe('abc')
    expect(r?.doc).toEqual(d)
  })

  it('devuelve null cuando el repositorio todavia no tiene el fichero', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 404 }))
    expect(await restoreDocument(cfg)).toBe(null)
  })

  it('un documento remoto que no valida se rechaza, no se carga a medias', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ content: toBase64('{"schemaVersion":1}'), sha: 'abc' }), { status: 200 },
    ))
    await expect(restoreDocument(cfg)).rejects.toThrow(/no valida/)
  })

  it('un json ilegible se rechaza con un mensaje que se entiende', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(
      JSON.stringify({ content: toBase64('no es json'), sha: 'abc' }), { status: 200 },
    ))
    await expect(restoreDocument(cfg)).rejects.toThrow(/no es JSON/)
  })
})
