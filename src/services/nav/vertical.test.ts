import { describe, it, expect } from 'vitest'
import { construirTablas, fr, minutosTransito, modoDe, tr, transito, vale, vientoEn, zComprobar, zTr } from './vertical'
import { campoSintetico, rejillaUniforme } from './sintetico'
import { AJUSTES_POR_DEFECTO, type AjustesNav } from './tipos'

const aj: AjustesNav = { ...AJUSTES_POR_DEFECTO, altMinM: 0, altMaxM: 5000 }
const rej = rejillaUniforme(4, 500)
// franja b: b m/s hacia el este
const c = campoSintetico(rej, 60, b => [b, 0])

describe('vientoEn', () => {
  it('lineal entre franjas', () => { expect(vientoEn(c, 1, 500 + 76.2 / 2, 0)[0]).toBeCloseTo(0.5) })
  it('fuera del rango, la franja del borde', () => {
    expect(vientoEn(c, 1, 100, 0)[0]).toBe(0)
    expect(vientoEn(c, 1, 9000, 0)[0]).toBe(3)
  })
})

describe('transito', () => {
  it('subir rapido una franja: tres pasos subiendo y el resto del minuto arriba', () => {
    const t = transito(c, 1, 0, 1, 2.75, 0)
    expect(t.minutos).toBe(1)
    expect(t.dx).toBeCloseTo(40.83, 1)
    expect(t.camino).toEqual([[t.dx, t.dy]])
  })
  it('bajar lento tres franjas: 46 pasos, 8 min', () => {
    expect(minutosTransito(c, 3, 0, 0.5)).toBe(8)
    expect(transito(c, 1, 3, 0, 0.5, 0).minutos).toBe(8)
  })
  it('misma franja, nada', () => { expect(transito(c, 1, 2, 2, 1, 0).minutos).toBe(0) })
  it('modos', () => {
    expect(modoDe(true, 1)).toBe('puja_rapid')
    expect(modoDe(false, 0)).toBe('baixa_lent')
  })
})

describe('construirTablas', () => {
  const t = construirTablas(c, 1, aj)
  it('mantener es una resta de acumulados', () => {
    expect(t.px[2 * 61 + 10]).toBeCloseTo(2 * 60 * 10)
  })
  it('el transito que no cabe en el horizonte es null', () => {
    expect(tr(t, 3, 0, 0, 55)).toBeNull()
    expect(tr(t, 3, 0, 0, 52)).not.toBeNull()
  })
})

describe('tablas con margen', () => {
  const dos: AjustesNav = {
    ...AJUSTES_POR_DEFECTO, altMinM: 0, altMaxM: 9999, modos: { puja_lent: 2, puja_rapid: 2, baixa_lent: 2, baixa_rapid: 2 },
  }
  const c = campoSintetico({ altM: [500, 800], etiqueta: ['a', 'b'] }, 10, () => [1, 0])
  it('sin margen, todo dentro y minutos enteros', () => {
    const t = construirTablas(c, 1, dos)
    expect(t.dentro).toEqual([true, true])
    expect(fr(t, 0, 1, 0)).toEqual([[0, 1], [0, 1], [0, 1]])
  })
  it('con margen, que franjas estan dentro y la parte de cada minuto de cada cambio', () => {
    // 300 m a 2 m/s son 150 s, 3 minutos. Dentro de 25 s a 75 s.
    const t = construirTablas(c, 1, dos, [550, 650])
    expect(t.dentro).toEqual([false, false])
    const f = fr(t, 0, 1, 0)
    expect(f).toHaveLength(3)
    expect(f[0]![0]).toBeCloseTo(25 / 60, 9)
    expect(f[0]![1]).toBe(1)
    expect(f[1]![0]).toBe(0)
    expect(f[1]![1]).toBeCloseTo(15 / 60, 9)
    expect(f[2]).toBeNull()
  })
})

describe('tablas con terreno', () => {
  const dos: AjustesNav = {
    ...AJUSTES_POR_DEFECTO, altMinM: 0, altMaxM: 9999, modos: { puja_lent: 2, puja_rapid: 2, baixa_lent: 2, baixa_rapid: 2 },
  }
  const c = campoSintetico({ altM: [300, 500, 800], etiqueta: ['terra', 'a', 'b'] }, 10, () => [1, 0])
  // suelo a 400 m al oeste y a 700 m al este; minimo 30,48 m
  const t = construirTablas(c, 1, dos, undefined, { techo: x => (x < 0 ? 400 : 700), maxM: 700 })
  it('la altitud de cada minuto de un cambio', () => { expect(zTr(t, 1, 2, 0)).toEqual([620, 740, 800]) })
  it('terra se conoce', () => { expect(t.iTerra).toBe(0) })
  it('por encima del suelo mas alto mas el minimo, siempre vale', () => { expect(vale(t, 800, 5, 0)).toBe(true) })
  it('por debajo, segun el suelo de alli', () => {
    expect(vale(t, 500, -5, 0)).toBe(true)
    expect(vale(t, 500, 5, 0)).toBe(false)
  })
  it('sin terreno, todo vale', () => { expect(vale(construirTablas(c, 1, dos), 0, 5, 0)).toBe(true) })
  it('que se comprueba en cada minuto de un cambio', () => {
    expect(zComprobar(t, 1, 2, 0, 0)).toBe(620)
    expect(zComprobar(t, 0, 2, 0, 0)).toBeNaN()
    expect(zComprobar(t, 0, 2, 0, zTr(t, 0, 2, 0).length - 1)).toBe(800)
    expect(zComprobar(t, 2, 0, 0, zTr(t, 2, 0, 0).length - 1)).toBeNaN()
  })
})
