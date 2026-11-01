// src/domain/waypoints.test.ts
import { describe, it, expect } from 'vitest'
import { activar, afegirWaypoint, canviarNom, canviarObjectiu, esborrarWaypoint, nomNou, waypointActiu } from './waypoints'
import { makeDoc } from './fixtures'
import type { Waypoint } from './types'

const wp = (id: string, nom: string): Waypoint =>
  ({ id, nom, lat: 41.68, lon: 1.21, objectiu: { tipo: 'aterrar' }, nota: '' })

describe('waypoints', () => {
  it('el nombre nuevo es WP y el siguiente numero', () => {
    expect(nomNou(makeDoc())).toBe('WP1')
    expect(nomNou(makeDoc({ waypoints: [wp('a', 'WP1'), wp('b', 'ZONA A'), wp('c', 'WP7')] }))).toBe('WP8')
  })
  it('anadir no activa, salvo que se pida', () => {
    const d = afegirWaypoint(makeDoc(), wp('a', 'WP1'))
    expect(d.waypoints).toHaveLength(1)
    expect(d.waypointActiuId).toBe(null)
    expect(afegirWaypoint(makeDoc(), wp('a', 'WP1'), true).waypointActiuId).toBe('a')
  })
  it('renombrar y cambiar objetivo', () => {
    let d = afegirWaypoint(makeDoc(), wp('a', 'WP1'))
    d = canviarNom(d, 'a', '  Camp de blat ')
    d = canviarObjectiu(d, 'a', { tipo: 'altitud', altM: 762 })
    expect(d.waypoints[0]).toMatchObject({ nom: 'Camp de blat', objectiu: { tipo: 'altitud', altM: 762 } })
  })
  it('los cuatro casos sin activo dan null y no lanzan (§6.9)', () => {
    expect(waypointActiu(makeDoc())).toBe(null)
    const d = afegirWaypoint(makeDoc(), wp('a', 'WP1'))
    expect(waypointActiu(d)).toBe(null)
    const borrado = esborrarWaypoint(activar(d, 'a'), 'a')
    expect(borrado.waypointActiuId).toBe(null)
    expect(waypointActiu(borrado)).toBe(null)
    expect(waypointActiu({ ...d, waypointActiuId: 'ya-no-existe' })).toBe(null)
  })
  it('activar uno desactiva el anterior, y activar null quita el activo', () => {
    let d = afegirWaypoint(afegirWaypoint(makeDoc(), wp('a', 'WP1')), wp('b', 'WP2'))
    d = activar(activar(d, 'a'), 'b')
    expect(waypointActiu(d)?.id).toBe('b')
    expect(activar(d, null).waypointActiuId).toBe(null)
  })
  it('borrar otro que no es el activo deja el activo', () => {
    let d = afegirWaypoint(afegirWaypoint(makeDoc(), wp('a', 'WP1')), wp('b', 'WP2'))
    d = esborrarWaypoint(activar(d, 'a'), 'b')
    expect(waypointActiu(d)?.id).toBe('a')
  })
})
