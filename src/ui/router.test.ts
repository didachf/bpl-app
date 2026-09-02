import { describe, it, expect } from 'vitest'
import { parseHash, hrefOf } from './router'

describe('parseHash', () => {
  it('el hash vacio es Inicio, que es lo que hay al abrir la app', () => {
    expect(parseHash('')).toEqual({ name: 'inicio' })
    expect(parseHash('#')).toEqual({ name: 'inicio' })
    expect(parseHash('#/')).toEqual({ name: 'inicio' })
  })

  it('las cinco pestañas', () => {
    expect(parseHash('#/vuelos')).toEqual({ name: 'vuelos' })
    expect(parseHash('#/planificar')).toEqual({ name: 'planificar' })
    expect(parseHash('#/operar')).toEqual({ name: 'operar' })
    expect(parseHash('#/ajustes')).toEqual({ name: 'ajustes' })
  })

  it('el detalle lleva el identificador del vuelo', () => {
    expect(parseHash('#/vuelos/f7')).toEqual({ name: 'detalle', flightId: 'f7' })
  })

  it('un identificador con caracteres raros vuelve decodificado', () => {
    expect(parseHash('#/vuelos/a%2Fb')).toEqual({ name: 'detalle', flightId: 'a/b' })
  })

  it('las cinco subpantallas de Ajustes', () => {
    expect(parseHash('#/ajustes/piloto')).toEqual({ name: 'ajustesPiloto' })
    expect(parseHash('#/ajustes/globos')).toEqual({ name: 'ajustesGlobos' })
    expect(parseHash('#/ajustes/campos')).toEqual({ name: 'ajustesCampos' })
    expect(parseHash('#/ajustes/personas')).toEqual({ name: 'ajustesPersonas' })
    expect(parseHash('#/ajustes/copia')).toEqual({ name: 'ajustesCopia' })
  })

  it('cerrar vuelo', () => {
    expect(parseHash('#/cerrar')).toEqual({ name: 'cerrar' })
  })

  it('una ruta que no existe cae en Inicio en lugar de dejar la pantalla en blanco', () => {
    expect(parseHash('#/no-existe')).toEqual({ name: 'inicio' })
    expect(parseHash('#/ajustes/inventado')).toEqual({ name: 'inicio' })
  })

  it('una barra final sobrante no cambia la ruta', () => {
    expect(parseHash('#/vuelos/')).toEqual({ name: 'vuelos' })
  })
})

describe('hrefOf', () => {
  it('ida y vuelta de cada ruta', () => {
    const rutas = [
      { name: 'inicio' }, { name: 'vuelos' }, { name: 'cerrar' },
      { name: 'planificar' }, { name: 'operar' }, { name: 'ajustes' },
      { name: 'ajustesPiloto' }, { name: 'ajustesGlobos' }, { name: 'ajustesCampos' },
      { name: 'ajustesPersonas' }, { name: 'ajustesCopia' },
      { name: 'detalle', flightId: 'f7' },
    ] as const
    for (const r of rutas) expect(parseHash(hrefOf(r))).toEqual(r)
  })

  it('codifica el identificador del vuelo al construir el enlace', () => {
    expect(hrefOf({ name: 'detalle', flightId: 'a/b' })).toBe('#/vuelos/a%2Fb')
  })
})
