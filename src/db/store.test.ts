// src/db/store.test.ts
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadDocument, saveDocument, clearDocument, makeDebouncedSaver } from './store'
import { makeDoc, makeFlight } from '../domain/fixtures'

describe('store', () => {
  beforeEach(async () => {
    await clearDocument()
  })

  it('devuelve null cuando no hay nada guardado', async () => {
    expect(await loadDocument()).toBe(null)
  })

  it('guarda y recupera el documento entero', async () => {
    const doc = makeDoc({ flights: [makeFlight({ notes: 'con acentos: Tarrega y Odena' })] })
    await saveDocument(doc)
    const leido = await loadDocument()
    expect(leido).toEqual(doc)
  })

  it('sobrescribe el documento anterior en lugar de acumular', async () => {
    await saveDocument(makeDoc({ flights: [makeFlight({})] }))
    await saveDocument(makeDoc({ flights: [] }))
    const leido = await loadDocument()
    expect(leido?.flights).toHaveLength(0)
  })

  it('devuelve null y no revienta si lo guardado no valida', async () => {
    // Se escribe basura por debajo, simulando un documento corrupto.
    const { set } = await import('idb-keyval')
    await set('logbook', { esto: 'no es un documento' })
    expect(await loadDocument()).toBe(null)
  })
})

describe('makeDebouncedSaver', () => {
  it('agrupa varias llamadas seguidas en un solo guardado', async () => {
    vi.useFakeTimers()
    const guardar = vi.fn().mockResolvedValue(undefined)
    const saver = makeDebouncedSaver(guardar, 500)

    saver(makeDoc({ flights: [] }))
    saver(makeDoc({ flights: [makeFlight({})] }))
    saver(makeDoc({ flights: [makeFlight({}), makeFlight({})] }))

    expect(guardar).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(500)

    expect(guardar).toHaveBeenCalledTimes(1)
    // Se guarda el ultimo estado, no el primero.
    expect(guardar.mock.calls[0][0].flights).toHaveLength(2)
    vi.useRealTimers()
  })

  it('flush guarda de inmediato lo que este pendiente', async () => {
    vi.useFakeTimers()
    const guardar = vi.fn().mockResolvedValue(undefined)
    const saver = makeDebouncedSaver(guardar, 500)

    saver(makeDoc({ flights: [] }))
    await saver.flush()

    expect(guardar).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
