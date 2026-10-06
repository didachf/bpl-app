// src/ops/checklist.ts
// Checklists de operacion: el contenido y las marcas.
//
// El contenido vive en checklists.json y sale del Manual de Vuelo MV04r30 de
// Ultramagic, nunca de aqui. Este modulo solo sabe validarlo, contar y guardar
// que items estan marcados. Funciones puras: el localStorage lo toca la
// pantalla, y aqui solo entra y sale texto.
import datos from './checklists.json'

export interface Item {
  id: string
  texto: string
  detalle?: string
  /** Apartado del manual. Sin fuente no hay item: es lo que se coteja con el papel. */
  fuente: string
}

export interface Bloque {
  titulo: string
  fuente: string
  nota?: string
  items: Item[]
}

export interface Aviso {
  texto: string
  fuente: string
}

export interface Checklist {
  id: string
  titulo: string
  subtitulo: string
  avisos: Aviso[]
  bloques: Bloque[]
}

/** Un apartado de la pantalla de Operar. Separa la preparacion del check antes de despegar. */
export interface Grupo {
  titulo: string
  checklists: string[]
}

export interface Contenido {
  /** Sello del contenido. Al cambiar cualquier item se sube, y las marcas viejas se descartan. */
  version: number
  fuente: string
  nota: string
  /** Lo pone a true el piloto, cuando lo ha cotejado contra el papel. Nunca yo. */
  validado: boolean
  grupos: Grupo[]
  checklists: Checklist[]
}

export const CONTENIDO: Contenido = datos

/** Los identificadores van en el hash de la URL: nada que haya que codificar. */
const ID = /^[a-z0-9-]+$/

function esTexto(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== ''
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Lo que esta mal en el contenido, en castellano. Vacio si esta bien.
 *
 * No se para en el primer error: si alguien edita el JSON a mano, quiere la
 * lista entera de una vez.
 */
export function validarContenido(input: unknown): string[] {
  const errores: string[] = []
  if (!esObjeto(input)) return ['El contenido no es un objeto']

  if (typeof input.version !== 'number' || !Number.isInteger(input.version) || input.version < 1) {
    errores.push('version tiene que ser un entero desde 1')
  }
  if (!esTexto(input.fuente)) errores.push('falta la fuente')
  if (typeof input.validado !== 'boolean') errores.push('validado tiene que ser true o false')
  if (!Array.isArray(input.checklists) || input.checklists.length === 0) {
    errores.push('no hay checklists')
    return errores
  }

  const idsChecklist = new Set<string>()
  input.checklists.forEach((cl: unknown, i) => {
    const donde = `checklist ${i + 1}`
    if (!esObjeto(cl)) { errores.push(`${donde} no es un objeto`); return }
    if (!esTexto(cl.id) || !ID.test(cl.id)) errores.push(`${donde}: id vacio o con caracteres raros`)
    else if (idsChecklist.has(cl.id)) errores.push(`${donde}: id ${cl.id} repetido`)
    else idsChecklist.add(cl.id)
    if (!esTexto(cl.titulo)) errores.push(`${donde}: falta el titulo`)
    if (!esTexto(cl.subtitulo)) errores.push(`${donde}: falta el subtitulo`)

    if (!Array.isArray(cl.avisos)) errores.push(`${donde}: avisos tiene que ser una lista`)
    else cl.avisos.forEach((a: unknown, k) => {
      if (!esObjeto(a) || !esTexto(a.texto) || !esTexto(a.fuente)) {
        errores.push(`${donde}, aviso ${k + 1}: falta el texto o la fuente`)
      }
    })

    if (!Array.isArray(cl.bloques) || cl.bloques.length === 0) {
      errores.push(`${donde}: no hay bloques`)
      return
    }
    // Unicos dentro de la checklist, no entre checklists: env-tejido esta en
    // las dos y cada una guarda sus marcas aparte.
    const idsItem = new Set<string>()
    cl.bloques.forEach((b: unknown, j) => {
      const dondeB = `${donde}, bloque ${j + 1}`
      if (!esObjeto(b)) { errores.push(`${dondeB} no es un objeto`); return }
      if (!esTexto(b.titulo)) errores.push(`${dondeB}: falta el titulo`)
      if (!esTexto(b.fuente)) errores.push(`${dondeB}: falta la fuente`)
      if (b.nota !== undefined && !esTexto(b.nota)) errores.push(`${dondeB}: nota vacia`)
      if (!Array.isArray(b.items) || b.items.length === 0) {
        errores.push(`${dondeB}: no hay items`)
        return
      }
      b.items.forEach((it: unknown, k) => {
        const dondeI = `${dondeB}, item ${k + 1}`
        if (!esObjeto(it)) { errores.push(`${dondeI} no es un objeto`); return }
        if (!esTexto(it.id) || !ID.test(it.id)) errores.push(`${dondeI}: id vacio o con caracteres raros`)
        else if (idsItem.has(it.id)) errores.push(`${dondeI}: id ${it.id} repetido`)
        else idsItem.add(it.id)
        if (!esTexto(it.texto)) errores.push(`${dondeI}: falta el texto`)
        if (!esTexto(it.fuente)) errores.push(`${dondeI}: falta la fuente`)
        if (it.detalle !== undefined && !esTexto(it.detalle)) errores.push(`${dondeI}: detalle vacio`)
      })
    })
  })

  // Cada checklist en un apartado y solo en uno. Una que no este en ninguno no
  // saldria en la pantalla, y una en dos saldria repetida.
  if (!Array.isArray(input.grupos) || input.grupos.length === 0) {
    errores.push('no hay grupos')
    return errores
  }
  const agrupadas = new Set<string>()
  input.grupos.forEach((g: unknown, i) => {
    const donde = `grupo ${i + 1}`
    if (!esObjeto(g)) { errores.push(`${donde} no es un objeto`); return }
    if (!esTexto(g.titulo)) errores.push(`${donde}: falta el titulo`)
    if (!Array.isArray(g.checklists) || g.checklists.length === 0) {
      errores.push(`${donde}: no tiene checklists`)
      return
    }
    for (const id of g.checklists) {
      if (typeof id !== 'string' || !idsChecklist.has(id)) errores.push(`${donde}: la checklist ${String(id)} no existe`)
      else if (agrupadas.has(id)) errores.push(`${donde}: la checklist ${id} ya esta en otro grupo`)
      else agrupadas.add(id)
    }
  })
  for (const id of idsChecklist) {
    if (!agrupadas.has(id)) errores.push(`la checklist ${id} no esta en ningun grupo`)
  }

  return errores
}

/** Los apartados con sus checklists ya resueltas, en el orden del JSON. */
export function porGrupo(c: Contenido): { titulo: string; checklists: Checklist[] }[] {
  return c.grupos.map(g => ({
    titulo: g.titulo,
    checklists: g.checklists
      .map(id => buscarChecklist(c, id))
      .filter((cl): cl is Checklist => cl !== undefined),
  }))
}

/** En el JSON el Apendice C va como C, que es corto de escribir y no se lee. */
export function fuenteLegible(fuente: string): string {
  return fuente.split(', ').map(t => (t === 'C' ? 'Apéndice C' : t)).join(', ')
}

export function buscarChecklist(c: Contenido, id: string): Checklist | undefined {
  return c.checklists.find(cl => cl.id === id)
}

export function idsDe(cl: Checklist): string[] {
  return cl.bloques.flatMap(b => b.items.map(i => i.id))
}

export interface Progreso {
  hechas: number
  total: number
  /** Una entrada por bloque, en el mismo orden. */
  porBloque: { hechas: number; total: number }[]
}

export function progreso(cl: Checklist, marcadas: ReadonlySet<string>): Progreso {
  const porBloque = cl.bloques.map(b => ({
    hechas: b.items.filter(i => marcadas.has(i.id)).length,
    total: b.items.length,
  }))
  return {
    hechas: porBloque.reduce((s, b) => s + b.hechas, 0),
    total: porBloque.reduce((s, b) => s + b.total, 0),
    porBloque,
  }
}

/** Marca o desmarca. Devuelve un conjunto nuevo: el viejo no se toca. */
export function alternar(marcadas: ReadonlySet<string>, id: string): Set<string> {
  const nuevo = new Set(marcadas)
  if (nuevo.has(id)) nuevo.delete(id)
  else nuevo.add(id)
  return nuevo
}

// --- Marcas guardadas ---------------------------------------------------

/**
 * Las marcas caducan a las 6 h del ultimo cambio.
 *
 * Una checklist es de un vuelo. Si al abrirla por la tarde salen las marcas de
 * la mañana, el chequeo parece hecho sin haberlo hecho, y eso es justo lo que
 * una checklist existe para evitar. Una preparacion no dura 6 h, y entre el
 * vuelo de la mañana y el de la tarde hay mas.
 */
export const CADUCA_MS = 6 * 60 * 60 * 1000

/**
 * Margen para un reloj que va hacia atras.
 *
 * Una marca fechada en el futuro solo sale de un reloj cambiado. No se puede
 * saber cuanto tiempo ha pasado de verdad, asi que se descarta.
 */
const FUTURO_MS = 5 * 60 * 1000

export function claveDe(checklistId: string): string {
  return `checklist:${checklistId}`
}

interface Guardado {
  version: number
  checklistId: string
  marcadas: string[]
  actualizado: number
}

export interface Restaurado {
  marcadas: Set<string>
  /** Habia marcas y se han tirado por viejas. La pantalla lo dice. */
  caducadas: boolean
}

const VACIO = (): Restaurado => ({ marcadas: new Set(), caducadas: false })

/**
 * Del texto guardado a las marcas.
 *
 * Cualquier cosa rara da una checklist vacia, nunca una excepcion: empezar de
 * cero es seguro, y una pantalla que no arranca no.
 */
export function restaurar(raw: string | null, cl: Checklist, version: number, ahora: number): Restaurado {
  if (raw === null) return VACIO()
  let g: unknown
  try {
    g = JSON.parse(raw)
  } catch {
    return VACIO()
  }
  if (!esObjeto(g)) return VACIO()
  if (g.version !== version || g.checklistId !== cl.id) return VACIO()
  if (!Array.isArray(g.marcadas) || !g.marcadas.every(m => typeof m === 'string')) return VACIO()
  if (typeof g.actualizado !== 'number' || !Number.isFinite(g.actualizado)) return VACIO()

  const existentes = new Set(idsDe(cl))
  const marcadas = new Set((g.marcadas as string[]).filter(m => existentes.has(m)))
  if (marcadas.size === 0) return VACIO()

  if (ahora - g.actualizado > CADUCA_MS || g.actualizado - ahora > FUTURO_MS) {
    return { marcadas: new Set(), caducadas: true }
  }
  return { marcadas, caducadas: false }
}

export function serializar(cl: Checklist, version: number, marcadas: ReadonlySet<string>, ahora: number): string {
  const g: Guardado = { version, checklistId: cl.id, marcadas: [...marcadas], actualizado: ahora }
  return JSON.stringify(g)
}
