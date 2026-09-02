// src/ui/router.ts
// Enrutador de hash, escrito a mano.
//
// Hash y no la API de historia porque GitHub Pages sirve ficheros estaticos:
// recargar en /bpl-app/vuelos pediria un fichero que no existe y daria un 404.
// El hash no llega nunca al servidor, asi que la app instalada en la pantalla
// de inicio sobrevive a un reinicio del telefono en cualquier pantalla.
import { useEffect, useState } from 'preact/hooks'

export type Route =
  | { name: 'inicio' }
  | { name: 'vuelos' }
  | { name: 'detalle'; flightId: string }
  | { name: 'cerrar' }
  | { name: 'planificar' }
  | { name: 'operar' }
  | { name: 'ajustes' }
  | { name: 'ajustesPiloto' }
  | { name: 'ajustesGlobos' }
  | { name: 'ajustesCampos' }
  | { name: 'ajustesPersonas' }
  | { name: 'ajustesCopia' }

const AJUSTES: Record<string, Route> = {
  piloto: { name: 'ajustesPiloto' },
  globos: { name: 'ajustesGlobos' },
  campos: { name: 'ajustesCampos' },
  personas: { name: 'ajustesPersonas' },
  copia: { name: 'ajustesCopia' },
}

/**
 * Del hash a la ruta.
 *
 * Cualquier cosa que no se reconozca cae en Inicio. Una pantalla en blanco por
 * un enlace roto es el peor fallo posible en una app que se usa con el globo
 * ya plegado.
 */
export function parseHash(hash: string): Route {
  const partes = hash.replace(/^#/, '').split('/').filter(p => p !== '')

  if (partes.length === 0) return { name: 'inicio' }

  if (partes[0] === 'vuelos') {
    if (partes.length === 1) return { name: 'vuelos' }
    if (partes.length === 2) return { name: 'detalle', flightId: decodeURIComponent(partes[1]) }
    return { name: 'inicio' }
  }

  if (partes[0] === 'ajustes') {
    if (partes.length === 1) return { name: 'ajustes' }
    if (partes.length === 2) return AJUSTES[partes[1]] ?? { name: 'inicio' }
    return { name: 'inicio' }
  }

  if (partes.length === 1) {
    if (partes[0] === 'cerrar') return { name: 'cerrar' }
    if (partes[0] === 'planificar') return { name: 'planificar' }
    if (partes[0] === 'operar') return { name: 'operar' }
  }

  return { name: 'inicio' }
}

/** De la ruta al hash. Inverso exacto de parseHash, y la prueba lo ata. */
export function hrefOf(r: Route): string {
  switch (r.name) {
    case 'inicio': return '#/'
    case 'vuelos': return '#/vuelos'
    case 'detalle': return `#/vuelos/${encodeURIComponent(r.flightId)}`
    case 'cerrar': return '#/cerrar'
    case 'planificar': return '#/planificar'
    case 'operar': return '#/operar'
    case 'ajustes': return '#/ajustes'
    case 'ajustesPiloto': return '#/ajustes/piloto'
    case 'ajustesGlobos': return '#/ajustes/globos'
    case 'ajustesCampos': return '#/ajustes/campos'
    case 'ajustesPersonas': return '#/ajustes/personas'
    case 'ajustesCopia': return '#/ajustes/copia'
  }
}

export function navigate(r: Route): void {
  location.hash = hrefOf(r)
}

/** Vuelve a Inicio o a la pantalla anterior, lo que el navegador tenga. */
export function goBack(): void {
  if (history.length > 1) history.back()
  else navigate({ name: 'inicio' })
}

/** La ruta actual, y se vuelve a pintar cuando cambia el hash. */
export function useRoute(): Route {
  const [ruta, setRuta] = useState<Route>(() => parseHash(location.hash))
  useEffect(() => {
    const alCambiar = () => setRuta(parseHash(location.hash))
    addEventListener('hashchange', alCambiar)
    return () => removeEventListener('hashchange', alCambiar)
  }, [])
  return ruta
}
