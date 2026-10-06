import { describe, it, expect } from 'vitest'
import datos from './checklists.json'
import {
  CADUCA_MS, CONTENIDO, alternar, buscarChecklist, claveDe, fuenteLegible, idsDe, progreso,
  restaurar, serializar, validarContenido, type Checklist,
} from './checklist'

/** Todos los textos del contenido, recorriendo el JSON entero. */
function textos(v: unknown): string[] {
  if (typeof v === 'string') return [v]
  if (Array.isArray(v)) return v.flatMap(textos)
  if (typeof v === 'object' && v !== null) return Object.values(v).flatMap(textos)
  return []
}

const MINI: Checklist = {
  id: 'mini',
  titulo: 'Mini',
  subtitulo: 'De prueba',
  avisos: [],
  bloques: [
    { titulo: 'Uno', fuente: '4.5', items: [{ id: 'a', texto: 'A', fuente: '4.5' }, { id: 'b', texto: 'B', fuente: '4.5' }] },
    { titulo: 'Dos', fuente: 'C', items: [{ id: 'c', texto: 'C', fuente: 'C' }] },
  ],
}

const T0 = Date.UTC(2026, 9, 7, 6, 30)

describe('el contenido del manual', () => {
  it('valida sin un solo error', () => {
    expect(validarContenido(datos)).toEqual([])
  })

  it('trae las dos checklists, montaje y pre-despegue', () => {
    expect(CONTENIDO.checklists.map(c => c.id)).toEqual(['montaje', 'pre-despegue'])
  })

  it('cada item cita un apartado del manual o el Apendice C', () => {
    const apartado = /^(C|\d+(\.\d+)*)(, (C|\d+(\.\d+)*))*$/
    for (const cl of CONTENIDO.checklists) {
      for (const id of idsDe(cl)) {
        const item = cl.bloques.flatMap(b => b.items).find(i => i.id === id)
        expect(item?.fuente, `${cl.id}/${id}`).toMatch(apartado)
      }
    }
  })

  it('ni punto y coma ni rayas en ningun texto', () => {
    // Raya y guion medio por su codigo, para que el propio test no las lleve.
    const malos = textos(datos).filter(t => /[;\u2014\u2013]/.test(t))
    expect(malos).toEqual([])
  })

  it('el aviso de no despegar si falla un chequeo va en el pre-despegue', () => {
    const pre = buscarChecklist(CONTENIDO, 'pre-despegue')
    expect(pre?.avisos.map(a => a.fuente)).toContain('2.3')
  })
})

describe('validarContenido', () => {
  const base = () => JSON.parse(JSON.stringify({
    version: 1, fuente: 'MV04', nota: '', validado: false, checklists: [MINI],
  })) as Record<string, any>

  it('acepta un contenido minimo bien formado', () => {
    expect(validarContenido(base())).toEqual([])
  })

  it('rechaza lo que no es un objeto', () => {
    expect(validarContenido(null)).toHaveLength(1)
    expect(validarContenido([])).toHaveLength(1)
  })

  it('un id de item repetido dentro de la checklist es un error', () => {
    const c = base()
    c.checklists[0].bloques[1].items[0].id = 'a'
    expect(validarContenido(c).join(' ')).toMatch(/repetido/)
  })

  it('el mismo id en dos checklists distintas no es un error', () => {
    const c = base()
    const otra = JSON.parse(JSON.stringify(MINI))
    otra.id = 'otra'
    c.checklists.push(otra)
    expect(validarContenido(c)).toEqual([])
  })

  it('un item sin fuente es un error, que es lo que se coteja con el papel', () => {
    const c = base()
    delete c.checklists[0].bloques[0].items[0].fuente
    expect(validarContenido(c).join(' ')).toMatch(/fuente/)
  })

  it('un id con caracteres que habria que codificar en la URL es un error', () => {
    const c = base()
    c.checklists[0].id = 'pre despegue'
    expect(validarContenido(c).join(' ')).toMatch(/caracteres raros/)
  })

  it('un bloque sin items es un error', () => {
    const c = base()
    c.checklists[0].bloques[0].items = []
    expect(validarContenido(c).join(' ')).toMatch(/no hay items/)
  })

  it('devuelve todos los errores de una vez, no solo el primero', () => {
    const c = base()
    delete c.checklists[0].bloques[0].items[0].texto
    delete c.checklists[0].bloques[1].items[0].fuente
    expect(validarContenido(c)).toHaveLength(2)
  })
})

describe('fuenteLegible', () => {
  it('escribe el Apendice C entero y deja los apartados como estan', () => {
    expect(fuenteLegible('C')).toBe('Apéndice C')
    expect(fuenteLegible('C, 4.8.1')).toBe('Apéndice C, 4.8.1')
    expect(fuenteLegible('4.5.1.2')).toBe('4.5.1.2')
  })
})

describe('progreso y alternar', () => {
  it('cuenta por bloque y en total', () => {
    const p = progreso(MINI, new Set(['a', 'c']))
    expect(p).toEqual({ hechas: 2, total: 3, porBloque: [{ hechas: 1, total: 2 }, { hechas: 1, total: 1 }] })
  })

  it('una marca que no es de la checklist no cuenta', () => {
    expect(progreso(MINI, new Set(['zz'])).hechas).toBe(0)
  })

  it('alternar marca, desmarca y no toca el conjunto original', () => {
    const vacio = new Set<string>()
    const una = alternar(vacio, 'a')
    expect([...una]).toEqual(['a'])
    expect(vacio.size).toBe(0)
    expect(alternar(una, 'a').size).toBe(0)
  })
})

describe('restaurar las marcas', () => {
  const guardado = (marcadas: string[], actualizado = T0, version = 1, id = 'mini') =>
    JSON.stringify({ version, checklistId: id, marcadas, actualizado })

  it('sin nada guardado, vacia y sin aviso', () => {
    expect(restaurar(null, MINI, 1, T0)).toEqual({ marcadas: new Set(), caducadas: false })
  })

  it('ida y vuelta con serializar', () => {
    const raw = serializar(MINI, 1, new Set(['a', 'c']), T0)
    expect(restaurar(raw, MINI, 1, T0 + 60_000).marcadas).toEqual(new Set(['a', 'c']))
  })

  it('con el contenido cambiado de version, se tiran sin restaurar nada', () => {
    expect(restaurar(guardado(['a'], T0, 1), MINI, 2, T0).marcadas.size).toBe(0)
  })

  it('las marcas de otra checklist no se cuelan', () => {
    expect(restaurar(guardado(['a'], T0, 1, 'otra'), MINI, 1, T0).marcadas.size).toBe(0)
  })

  it('un JSON roto da una checklist vacia, no una excepcion', () => {
    expect(restaurar('{no es json', MINI, 1, T0).marcadas.size).toBe(0)
    expect(restaurar('"texto"', MINI, 1, T0).marcadas.size).toBe(0)
    expect(restaurar('null', MINI, 1, T0).marcadas.size).toBe(0)
  })

  it('una forma vieja o corrupta da una checklist vacia', () => {
    const marcadasObjeto = JSON.stringify({ version: 1, checklistId: 'mini', marcadas: { a: true }, actualizado: T0 })
    const sinFecha = JSON.stringify({ version: 1, checklistId: 'mini', marcadas: ['a'] })
    const conNumeros = JSON.stringify({ version: 1, checklistId: 'mini', marcadas: [1, 2], actualizado: T0 })
    for (const raw of [marcadasObjeto, sinFecha, conNumeros]) {
      expect(restaurar(raw, MINI, 1, T0).marcadas.size).toBe(0)
    }
  })

  it('se quedan solo las marcas de items que siguen existiendo', () => {
    expect(restaurar(guardado(['a', 'borrado']), MINI, 1, T0).marcadas).toEqual(new Set(['a']))
  })

  it('a las 6 h justas siguen valiendo', () => {
    expect(restaurar(guardado(['a']), MINI, 1, T0 + CADUCA_MS).marcadas.size).toBe(1)
  })

  it('pasadas las 6 h se tiran y se avisa', () => {
    expect(restaurar(guardado(['a']), MINI, 1, T0 + CADUCA_MS + 1)).toEqual({ marcadas: new Set(), caducadas: true })
  })

  it('una marca fechada en el futuro es un reloj cambiado, y se tira', () => {
    expect(restaurar(guardado(['a'], T0 + 10 * 60_000), MINI, 1, T0)).toEqual({ marcadas: new Set(), caducadas: true })
  })

  it('caducadas solo cuando habia algo que tirar', () => {
    expect(restaurar(guardado([], T0), MINI, 1, T0 + CADUCA_MS * 2).caducadas).toBe(false)
  })

  it('cada checklist tiene su clave', () => {
    expect(claveDe('montaje')).not.toBe(claveDe('pre-despegue'))
  })
})
