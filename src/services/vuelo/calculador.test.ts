// src/services/vuelo/calculador.test.ts
import { describe, it, expect } from 'vitest'
import { crearCalculador, type Hilo, type Pedido, type Respuesta } from './calculador'
import type { EntradaNav } from '../nav/motor'
import type { ResultadoNavegacion } from '../nav/tipos'

function hiloFalso() {
  const enviados: Pedido[] = []
  let terminado = false
  const h: Hilo = {
    onmessage: null,
    postMessage: p => { enviados.push(p) },
    terminate: () => { terminado = true },
  }
  const responder = (r: Respuesta) => h.onmessage?.({ data: r })
  return { h, enviados, responder, terminado: () => terminado }
}

const entrada = {} as EntradaNav
const res = (n: string) => ({ calculadoA: n }) as ResultadoNavegacion

describe('el calculador', () => {
  it('manda el pedido y devuelve el resultado con lo que ha tardado', async () => {
    const { h, enviados, responder } = hiloFalso()
    const c = crearCalculador(h)
    const p = c.calcular(entrada)
    expect(enviados).toEqual([{ id: 1, entrada }])
    responder({ id: 1, resultado: res('a'), ms: 230 })
    expect(await p).toEqual({ resultado: res('a'), ms: 230 })
  })

  it('un pedido nuevo deja el anterior en null y tira su respuesta', async () => {
    const { h, responder } = hiloFalso()
    const c = crearCalculador(h)
    const p1 = c.calcular(entrada)
    const p2 = c.calcular(entrada)
    expect(await p1).toBe(null)
    responder({ id: 1, resultado: res('viejo'), ms: 1 })
    responder({ id: 2, resultado: res('nuevo'), ms: 2 })
    expect((await p2)?.resultado.calculadoA).toBe('nuevo')
  })

  it('un error del motor llega como error', async () => {
    const { h, responder } = hiloFalso()
    const c = crearCalculador(h)
    const p = c.calcular(entrada)
    responder({ id: 1, error: 'peta', ms: 3 })
    await expect(p).rejects.toThrow('peta')
  })

  it('cerrar deja lo pendiente en null y para el hilo', async () => {
    const { h, terminado } = hiloFalso()
    const c = crearCalculador(h)
    const p = c.calcular(entrada)
    c.cerrar()
    expect(await p).toBe(null)
    expect(terminado()).toBe(true)
  })
})
