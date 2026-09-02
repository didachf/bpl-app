import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { loadConfig, saveConfig, clearConfig, loadSha, saveSha, CLAVES } from './config'

/** localStorage de mentira, porque las pruebas corren en Node y no hay navegador. */
function fakeStorage() {
  const datos = new Map<string, string>()
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => { datos.set(k, v) },
    removeItem: (k: string) => { datos.delete(k) },
    get size() { return datos.size },
    claves: () => [...datos.keys()],
  }
}

let store: ReturnType<typeof fakeStorage>

beforeEach(() => {
  store = fakeStorage()
  vi.stubGlobal('localStorage', store)
})
afterEach(() => { vi.unstubAllGlobals() })

describe('configuracion de GitHub', () => {
  it('sin nada guardado devuelve null', () => {
    expect(loadConfig()).toBe(null)
  })

  it('ida y vuelta', () => {
    const cfg = { owner: 'didachf', repo: 'bpl-logbook', branch: 'main', token: 'ghp_x' }
    saveConfig(cfg)
    expect(loadConfig()).toEqual(cfg)
  })

  it('las claves llevan prefijo propio', () => {
    saveConfig({ owner: 'a', repo: 'b', branch: 'main', token: 't' })
    saveSha('abc')
    for (const k of store.claves()) expect(k.startsWith('bpl-app:')).toBe(true)
  })

  it('un json corrupto devuelve null en lugar de reventar el arranque', () => {
    localStorage.setItem(CLAVES.config, 'esto no es json')
    expect(loadConfig()).toBe(null)
  })

  it('a un objeto al que le falta el token no se le hace caso', () => {
    localStorage.setItem(CLAVES.config, JSON.stringify({ owner: 'a', repo: 'b', branch: 'main' }))
    expect(loadConfig()).toBe(null)
  })

  it('borrar quita la configuracion y tambien el sha', () => {
    saveConfig({ owner: 'a', repo: 'b', branch: 'main', token: 't' })
    saveSha('abc')
    clearConfig()
    expect(loadConfig()).toBe(null)
    expect(loadSha()).toBe(null)
  })

  it('el sha va y vuelve', () => {
    expect(loadSha()).toBe(null)
    saveSha('abc123')
    expect(loadSha()).toBe('abc123')
  })
})
