// src/services/vuelo/coordenadas.test.ts
import { describe, it, expect } from 'vitest'
import {
  aUtm, deUtm, formatDecimal, formatDms, formatUtm, llegirDecimal, llegirDms, llegirUtm,
} from './coordenadas'
import { miles } from '../nav/campo'

// [huso, lat, lon, X, Y] de PROJ.
const PROJ: [number, number, number, number, number][] = [
  [31, 41.6561, 1.149, 345878.792, 4613249.538],
  [31, 41.5842, 1.6528, 387703.467, 4604488.446],
  [31, 41.3874, 2.1686, 430488.680, 4582097.035],
  [31, 41.60, 0.20, 266652.938, 4609153.380],
  [31, 42.7019, 0.7956, 319453.182, 4730068.229],
  [30, 41.6561, 1.149, 845489.776, 4619916.573],
  [30, 41.60, 0.20, 766686.248, 4610313.426],
  [30, 42.7019, 0.7956, 810883.004, 4734701.002],
]

describe('UTM en ETRS89', () => {
  it('de grados a UTM, al milimetro de PROJ', () => {
    for (const [h, lat, lon, x, y] of PROJ) {
      const u = aUtm(lat, lon, h)
      expect(Math.abs(u.x - x)).toBeLessThan(0.002)
      expect(Math.abs(u.y - y)).toBeLessThan(0.002)
    }
  })
  it('de UTM a grados, y vuelta', () => {
    for (const [h, lat, lon, x, y] of PROJ) {
      const g = deUtm(h, x, y)
      expect(Math.abs(g.lat - lat)).toBeLessThan(1e-7)
      expect(Math.abs(g.lon - lon)).toBeLessThan(1e-7)
    }
  })
})

describe('leer coordenadas', () => {
  it('decimal con coma, punto, letras o signo', () => {
    expect(llegirDecimal('41,6857', '1,2115')).toEqual({ ok: true, lat: 41.6857, lon: 1.2115 })
    expect(llegirDecimal('41.6857 N', '1.2115 E')).toEqual({ ok: true, lat: 41.6857, lon: 1.2115 })
    expect(llegirDecimal('41,6857', '0,5 W')).toEqual({ ok: true, lat: 41.6857, lon: -0.5 })
    expect(llegirDecimal('41,6857', '0,5 O')).toEqual({ ok: true, lat: 41.6857, lon: -0.5 })
    expect(llegirDecimal('-33,5', '-70,6')).toEqual({ ok: true, lat: -33.5, lon: -70.6 })
  })
  it('lo que se pega de Google Maps, todo en el campo de latitud', () => {
    expect(llegirDecimal('41.6561, 1.1490', '')).toEqual({ ok: true, lat: 41.6561, lon: 1.149 })
    expect(llegirDecimal('41,6561 N 1,1490 E', '')).toEqual({ ok: true, lat: 41.6561, lon: 1.149 })
  })
  it('decimal: dice que campo falla', () => {
    expect(llegirDecimal('91', '1')).toMatchObject({ ok: false, camp: 'lat' })
    expect(llegirDecimal('41', 'abc')).toMatchObject({ ok: false, camp: 'lon' })
    expect(llegirDecimal('41 E', '1')).toMatchObject({ ok: false, camp: 'lat' })
  })
  it('grados, minutos y segundos, con los simbolos del AIP o con espacios', () => {
    const r = llegirDms(`41°41'08,7" N`, `1°12'41,5" E`)
    expect(r.ok && Math.abs(r.lat - (41 + 41 / 60 + 8.7 / 3600))).toBeLessThan(1e-12)
    expect(r.ok && Math.abs(r.lon - (1 + 12 / 60 + 41.5 / 3600))).toBeLessThan(1e-12)
    const s = llegirDms('41 41 8.7', '1 12 41.5 W')
    expect(s.ok && s.lon).toBeCloseTo(-(1 + 12 / 60 + 41.5 / 3600), 12)
    expect(llegirDms(`41°61'00" N`, `1°00'00" E`)).toMatchObject({ ok: false, camp: 'lat' })
  })
  it('UTM con espacios o puntos de miles, y rango', () => {
    const r = llegirUtm(31, '345 878,792', '4.613.249,538')
    expect(r.ok && r.lat).toBeCloseTo(41.6561, 7)
    expect(llegirUtm(31, '345878', '')).toMatchObject({ ok: false, camp: 'y' })
    expect(llegirUtm(31, '50', '4613249')).toMatchObject({ ok: false, camp: 'x' })
  })
})

describe('escribir coordenadas', () => {
  it('como en las maquetas', () => {
    expect(formatDecimal(41.6857, 1.2115)).toBe('41,6857 N 1,2115 E')
    expect(formatDecimal(-33.5, -70.6)).toBe('33,5000 S 70,6000 W')
    expect(formatDms(41 + 41 / 60 + 8.7 / 3600, 1 + 12 / 60 + 41.5 / 3600)).toBe(`41°41'08,7" N 1°12'41,5" E`)
    expect(formatDms(41 + 59 / 60 + 59.97 / 3600, 1)).toBe(`42°00'00,0" N 1°00'00,0" E`)
    expect(formatUtm(41.6561, 1.149)).toBe(`31 ${miles(345879)} · ${miles(4613250)}`)
    expect(formatUtm(41.6561, 1.149, 30)).toBe(`30 ${miles(845490)} · ${miles(4619917)}`)
  })
})
