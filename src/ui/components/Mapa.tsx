// src/ui/components/Mapa.tsx
// Mapa de Leaflet con teselas de OpenStreetMap.
//
// Punto LIBRE y no solo campos guardados: el sitio de despegue se decide cada
// dia segun el viento, que es justo lo que informa esta pantalla. Ver spec §6.
//
// Solo online en fase 1. Descargar teselas en bloque viola la politica de uso
// de OSM; la solucion prevista para volar sin cobertura es un extracto PMTiles
// de Catalunya, y eso es fase 2.
import { useEffect, useRef } from 'preact/hooks'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Site } from '../../domain/types'

export interface Punto { lat: number; lon: number }

export function Mapa(
  { punto, sitios, onElegir, alturaPx = 240 }: {
    punto: Punto | null
    sitios: Site[]
    onElegir: (p: Punto) => void
    alturaPx?: number
  },
) {
  const nodo = useRef<HTMLDivElement | null>(null)
  const mapa = useRef<L.Map | null>(null)
  const marca = useRef<L.CircleMarker | null>(null)
  // El callback vive en una ref para no tener que recrear el mapa cada vez que
  // la pantalla se repinta: `L.Map` es caro y recrearlo pierde el zoom.
  const onElegirRef = useRef(onElegir)
  onElegirRef.current = onElegir

  useEffect(() => {
    if (nodo.current === null || mapa.current !== null) return

    const m = L.map(nodo.current, { attributionControl: true, zoomControl: true })
      .setView([punto?.lat ?? 41.62, punto?.lon ?? 1.30], 10)

    // Atribucion de OSM: es obligatoria por su licencia, no es decorativa.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '&copy; colaboradores de OpenStreetMap',
    }).addTo(m)

    m.on('click', e => onElegirRef.current({ lat: e.latlng.lat, lon: e.latlng.lng }))
    mapa.current = m

    return () => { m.remove(); mapa.current = null }
  }, [])

  // Los campos guardados, como circulos. Circulos y no el marcador por defecto
  // de Leaflet: ese carga dos PNG del paquete que Vite no resuelve solo, y el
  // resultado clasico es un mapa con iconos rotos.
  useEffect(() => {
    const m = mapa.current
    if (m === null) return
    const capas = sitios.map(s => L.circleMarker([s.lat, s.lon], {
      radius: 6, color: '#0ca30c', weight: 2, fillOpacity: 0.35,
    }).addTo(m).bindTooltip(s.name === '' ? 'Campo sin nombre' : s.name))
    return () => { for (const c of capas) c.remove() }
  }, [sitios])

  useEffect(() => {
    const m = mapa.current
    if (m === null) return
    marca.current?.remove()
    if (punto === null) { marca.current = null; return }
    marca.current = L.circleMarker([punto.lat, punto.lon], {
      radius: 8, color: '#2a78d6', weight: 3, fillOpacity: 0.5,
    }).addTo(m)
  }, [punto?.lat, punto?.lon])

  return (
    <div
      ref={nodo}
      style={`height: ${alturaPx}px; width: 100%; background: var(--surface);`}
      aria-label="Mapa para elegir el punto de despegue"
    />
  )
}
