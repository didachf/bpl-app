// src/ui/vol/Vol.tsx
// La pantalla de vuelo de la tablet (spec 10/10 §7): sin vuelo, Començar; con
// vuelo, el mapa y sus paneles.
import { Comencar } from './Comencar'
import { PantallaVol } from './PantallaVol'
import { useVol } from './VolProvider'

export function Vol() {
  const { carregat, sessio } = useVol()
  if (!carregat) return <p class="dim" style="padding: 40px 20px;">Carregant el vol…</p>
  return sessio === null ? <Comencar /> : <PantallaVol />
}
