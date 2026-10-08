import { describe, it, expect } from 'vitest'
import datos from './checklists.json'
import {
  CADUCA_MS, CONTENIDO, alternar, alternarEn, buscarChecklist, claveDe, fuenteLegible, idsDe, porGrupo,
  progreso, puedeMarcar, restaurar, serializar, subprogreso, validarContenido, type Checklist, type Item,
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

/** Un paso que se despliega en dos subpasos, como el test del quemador. */
const CON_SUB: Checklist = {
  id: 'sub',
  titulo: 'Con subpasos',
  subtitulo: 'De prueba',
  avisos: [],
  bloques: [{
    titulo: 'Uno',
    fuente: '4.5.3',
    items: [
      {
        id: 'test', texto: 'Test', fuente: '4.5.3',
        subpasos: [{ id: 's1', texto: 'S1', fuente: '4.5.3' }, { id: 's2', texto: 'S2', fuente: 'Piloto' }],
      },
      { id: 'x', texto: 'X', fuente: '4.5' },
    ],
  }],
}

function pasos(id: string): Item[] {
  return buscarChecklist(CONTENIDO, id)?.bloques.flatMap(b => b.items) ?? []
}

describe('el contenido revisado con el piloto el 08/10/2026', () => {
  it('valida sin un solo error', () => {
    expect(validarContenido(datos)).toEqual([])
  })

  it('trae tres checklists: montaje, inflado y el ultimo chequeo antes de despegar', () => {
    expect(CONTENIDO.checklists.map(c => c.id)).toEqual(['montaje', 'inflado', 'pre-despegue'])
  })

  it('la preparacion y el montaje van separados del check antes de despegar', () => {
    expect(porGrupo(CONTENIDO).map(g => [g.titulo, g.checklists.map(c => c.id)])).toEqual([
      ['Preparación y montaje', ['montaje', 'inflado']],
      ['Check antes de despegar', ['pre-despegue']],
    ])
  })

  it('cada paso y cada subpaso cita su fuente: el manual, el Apendice C, una norma o el piloto', () => {
    const token = /^(C|\d+(\.\d+)*|Piloto|BOP\.BAS\.050|BFCL\.045)$/
    for (const cl of CONTENIDO.checklists) {
      for (const p of cl.bloques.flatMap(b => b.items)) {
        for (const q of [p, ...(p.subpasos ?? [])]) {
          for (const t of q.fuente.split(', ')) expect(t, `${cl.id}/${q.id}`).toMatch(token)
        }
      }
    }
  })

  it('el test del quemador es un paso que se despliega en diez subpasos', () => {
    const test = pasos('montaje').find(p => p.id === 'test-quemador')
    expect(test?.subpasos).toHaveLength(10)
  })

  it('las pertenencias llevan la radio, que el piloto echo en falta', () => {
    const cosas = pasos('inflado').find(p => p.id === 'pertenencias')
    expect(cosas?.subpasos?.map(s => s.id)).toContain('radio')
  })

  it('ni un paso de vapor: las bombonas son solo de liquido', () => {
    expect(textos(datos).filter(t => /vapor/i.test(t))).toEqual([])
  })

  it('ni punto y coma ni rayas en ningun texto', () => {
    // Raya y guion medio por su codigo, para que el propio test no las lleve.
    const malos = textos(datos).filter(t => /[;\u2014\u2013]/.test(t))
    expect(malos).toEqual([])
  })
})

describe('validarContenido', () => {
  const base = () => JSON.parse(JSON.stringify({
    version: 1, fuente: 'MV04', nota: '', validado: false,
    grupos: [{ titulo: 'Grupo', checklists: ['mini'] }], checklists: [MINI],
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
    c.grupos[0].checklists.push('otra')
    expect(validarContenido(c)).toEqual([])
  })

  it('una checklist que no esta en ningun grupo es un error, porque no saldria en pantalla', () => {
    const c = base()
    const otra = JSON.parse(JSON.stringify(MINI))
    otra.id = 'otra'
    c.checklists.push(otra)
    expect(validarContenido(c)).toEqual(['la checklist otra no esta en ningun grupo'])
  })

  it('una checklist en dos grupos es un error, porque saldria repetida', () => {
    const c = base()
    c.grupos.push({ titulo: 'Otro', checklists: ['mini'] })
    expect(validarContenido(c).join(' ')).toMatch(/ya esta en otro grupo/)
  })

  it('un grupo que nombra una checklist que no existe es un error', () => {
    const c = base()
    c.grupos[0].checklists.push('fantasma')
    expect(validarContenido(c).join(' ')).toMatch(/fantasma no existe/)
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

  it('un subpaso sin fuente es un error', () => {
    const c = base()
    c.checklists[0].bloques[0].items[0].subpasos = [{ id: 's1', texto: 'S1' }]
    expect(validarContenido(c).join(' ')).toMatch(/subpaso 1: falta la fuente/)
  })

  it('un subpaso con el id de otro paso de la checklist es un error, porque las marcas se pisarian', () => {
    const c = base()
    c.checklists[0].bloques[0].items[0].subpasos = [{ id: 'c', texto: 'S1', fuente: '4.5' }]
    expect(validarContenido(c).join(' ')).toMatch(/repetido/)
  })

  it('una lista de subpasos vacia es un error', () => {
    const c = base()
    c.checklists[0].bloques[0].items[0].subpasos = []
    expect(validarContenido(c).join(' ')).toMatch(/subpasos/)
  })

  it('un subpaso con sus propios subpasos es un error: solo hay un nivel', () => {
    const c = base()
    c.checklists[0].bloques[0].items[0].subpasos = [
      { id: 's1', texto: 'S1', fuente: '4.5', subpasos: [{ id: 's2', texto: 'S2', fuente: '4.5' }] },
    ]
    expect(validarContenido(c).join(' ')).toMatch(/un solo nivel/)
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

describe('pasos que se despliegan', () => {
  const test = CON_SUB.bloques[0].items[0]

  it('idsDe incluye los subpasos, para que sus marcas se guarden', () => {
    expect(idsDe(CON_SUB)).toEqual(['test', 's1', 's2', 'x'])
  })

  it('el paso no se puede marcar hasta tener todos sus subpasos', () => {
    expect(puedeMarcar(test, new Set())).toBe(false)
    expect(puedeMarcar(test, new Set(['s1']))).toBe(false)
    expect(puedeMarcar(test, new Set(['s1', 's2']))).toBe(true)
  })

  it('un paso sin subpasos se puede marcar siempre', () => {
    expect(puedeMarcar(CON_SUB.bloques[0].items[1], new Set())).toBe(true)
  })

  it('marcar el paso con subpasos pendientes no hace nada', () => {
    expect(alternarEn(CON_SUB, new Set(['s1']), 'test')).toEqual(new Set(['s1']))
  })

  it('con todos los subpasos hechos, el paso se marca', () => {
    expect(alternarEn(CON_SUB, new Set(['s1', 's2']), 'test')).toEqual(new Set(['s1', 's2', 'test']))
  })

  it('marcar el ultimo subpaso no marca el paso solo: lo marca el piloto', () => {
    expect(alternarEn(CON_SUB, new Set(['s1']), 's2')).toEqual(new Set(['s1', 's2']))
  })

  it('desmarcar un subpaso desmarca el paso, que ya no esta completo', () => {
    expect(alternarEn(CON_SUB, new Set(['s1', 's2', 'test']), 's1')).toEqual(new Set(['s2']))
  })

  it('desmarcar el paso deja los subpasos como estaban', () => {
    expect(alternarEn(CON_SUB, new Set(['s1', 's2', 'test']), 'test')).toEqual(new Set(['s1', 's2']))
  })

  it('no toca el conjunto original', () => {
    const antes = new Set(['s1', 's2'])
    alternarEn(CON_SUB, antes, 'test')
    expect(antes).toEqual(new Set(['s1', 's2']))
  })

  it('el progreso cuenta los pasos de la lista, no los subpasos', () => {
    expect(progreso(CON_SUB, new Set(['s1', 's2'])).hechas).toBe(0)
    expect(progreso(CON_SUB, new Set(['s1', 's2', 'test', 'x']))).toEqual({
      hechas: 2, total: 2, porBloque: [{ hechas: 2, total: 2 }],
    })
  })

  it('subprogreso cuenta los subpasos de un paso', () => {
    expect(subprogreso(test, new Set(['s2']))).toEqual({ hechas: 1, total: 2 })
  })

  it('al restaurar se conservan las marcas de los subpasos', () => {
    const raw = serializar(CON_SUB, 1, new Set(['s1']), T0)
    expect(restaurar(raw, CON_SUB, 1, T0).marcadas).toEqual(new Set(['s1']))
  })

  it('al restaurar se tira un paso marcado con subpasos pendientes, que no puede pasar', () => {
    const raw = JSON.stringify({ version: 1, checklistId: 'sub', marcadas: ['test', 's1', 'x'], actualizado: T0 })
    expect(restaurar(raw, CON_SUB, 1, T0).marcadas).toEqual(new Set(['s1', 'x']))
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
