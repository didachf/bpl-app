// src/services/vuelo/bajarMosaicos.test.ts
import { describe, it, expect } from 'vitest'
import { A_LA_VEZ, bajarMosaicos, type Almacen } from './bajarMosaicos'

function almacenEnMemoria(ya: string[] = []) {
  const guardados = new Map<string, string>(ya.map(u => [u, 'antes']))
  const a: Almacen = {
    tiene: async u => guardados.has(u),
    guardar: async (u, r) => { guardados.set(u, await r.text()) },
  }
  return { a, guardados }
}

const urls = (n: number) => Array.from({ length: n }, (_, i) => `https://x/${i}.png`)
const ok = (async (u: string | URL | Request) => new Response(`cuerpo ${String(u)}`)) as typeof fetch

describe('bajar mosaicos', () => {
  it('baja todos, los guarda y suma los bytes', async () => {
    const { a, guardados } = almacenEnMemoria()
    const p = await bajarMosaicos(urls(10), a, { fetch: ok })
    expect(p).toMatchObject({ total: 10, hechos: 10, bajados: 10, yaEstaban: 0, fallidos: 0 })
    expect(guardados.get('https://x/3.png')).toBe('cuerpo https://x/3.png')
    expect(p.bytes).toBe(urls(10).reduce((s, u) => s + `cuerpo ${u}`.length, 0))
  })

  it('no vuelve a pedir lo que ya esta', async () => {
    const { a } = almacenEnMemoria(['https://x/1.png', 'https://x/2.png'])
    const pedidos: string[] = []
    const f = (async (u: string | URL | Request) => { pedidos.push(String(u)); return new Response('x') }) as typeof fetch
    const p = await bajarMosaicos(urls(4), a, { fetch: f })
    expect(pedidos).toEqual(['https://x/0.png', 'https://x/3.png'])
    expect(p).toMatchObject({ bajados: 2, yaEstaban: 2, hechos: 4 })
  })

  it('un 404 o un fallo de red cuentan como fallidos y no se guardan', async () => {
    const { a, guardados } = almacenEnMemoria()
    const f = (async (u: string | URL | Request) => {
      if (String(u).endsWith('1.png')) return new Response('', { status: 404 })
      if (String(u).endsWith('2.png')) throw new TypeError('Failed to fetch')
      return new Response('x')
    }) as typeof fetch
    const p = await bajarMosaicos(urls(4), a, { fetch: f })
    expect(p).toMatchObject({ bajados: 2, fallidos: 2, hechos: 4 })
    expect(guardados.has('https://x/1.png')).toBe(false)
  })

  it(`nunca mas de ${A_LA_VEZ} a la vez`, async () => {
    const { a } = almacenEnMemoria()
    let enCurso = 0
    let maximo = 0
    const f = (async () => {
      enCurso++
      maximo = Math.max(maximo, enCurso)
      await new Promise(r => setTimeout(r, 2))
      enCurso--
      return new Response('x')
    }) as typeof fetch
    await bajarMosaicos(urls(30), a, { fetch: f })
    expect(maximo).toBe(A_LA_VEZ)
  })

  it('al cancelar no pide mas', async () => {
    const { a } = almacenEnMemoria()
    const ctl = new AbortController()
    const pedidos: string[] = []
    const f = (async (u: string | URL | Request) => {
      pedidos.push(String(u))
      if (pedidos.length === 5) ctl.abort()
      return new Response('x')
    }) as typeof fetch
    await bajarMosaicos(urls(100), a, { fetch: f, senal: ctl.signal })
    expect(pedidos.length).toBeLessThanOrEqual(5 + A_LA_VEZ)
  })

  it('avisa del progreso hasta el total', async () => {
    const { a } = almacenEnMemoria()
    const vistos: number[] = []
    await bajarMosaicos(urls(6), a, { fetch: ok, alProgreso: p => vistos.push(p.hechos) })
    expect(vistos).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('una peticion que no contesta', () => {
  it('cuenta como fallida al pasar el limite, y las demas siguen', async () => {
    const { a } = almacenEnMemoria()
    // La primera no contesta nunca, salvo que la corten.
    const f = ((u: string | URL | Request, init?: RequestInit) => String(u).endsWith('0.png')
      ? new Promise<Response>((_, ko) => init?.signal?.addEventListener('abort', () => ko(new DOMException('corta', 'AbortError'))))
      : Promise.resolve(new Response('x'))) as typeof fetch
    const p = await bajarMosaicos(urls(3), a, { fetch: f, limitMs: 30 })
    expect(p).toMatchObject({ hechos: 3, bajados: 2, fallidos: 1 })
  })
})
