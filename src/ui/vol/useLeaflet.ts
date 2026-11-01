// src/ui/vol/useLeaflet.ts
// Un mapa de Leaflet con la ortofoto del Mapa base del ICGC. Los mosaicos se
// piden con CORS para que el service worker los guarde y los sirva sin red
// (plan 2026-11-01-datos-de-vuelo). La atribucion la pinta cada pantalla con el
// estilo de las maquetas, no el control de Leaflet.
import { useEffect, useState } from 'preact/hooks'
import type { RefObject } from 'preact'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { URL_ORTO } from '../../services/vuelo/mapasDeVuelo'
import type { Punto } from '../../services/nav/tipos'

export function useLeaflet(nodo: RefObject<HTMLDivElement>, centre: Punto | null, zoom: number): L.Map | null {
  const [mapa, setMapa] = useState<L.Map | null>(null)
  const llest = centre !== null
  useEffect(() => {
    if (nodo.current === null || centre === null) return
    const m = L.map(nodo.current, { zoomControl: false, attributionControl: false, zoomSnap: 0.5 })
      .setView([centre.lat, centre.lon], zoom)
    L.tileLayer(URL_ORTO, { crossOrigin: true, maxZoom: 18 }).addTo(m)
    setMapa(m)
    return () => { m.remove(); setMapa(null) }
  }, [llest])
  return mapa
}
