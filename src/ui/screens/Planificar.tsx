// src/ui/screens/Planificar.tsx
// Esbozo. El mapa de Leaflet y las llamadas a open-meteo son fase 1 tardia, y
// la deriva es fase 2. Esta pantalla existe para que la pestaña no lleve a una
// pagina en blanco, y para dejar escrito que el punto de despegue se elige
// libre y no de una lista.
import { Notice } from '../components/Notice'
import { Screen } from '../components/Screen'

const MODELOS = [
  'icon_eu', 'gfs_seamless', 'gem_seamless',
  'ukmo_global_deterministic_10km', 'meteofrance_arpege_europe', 'ecmwf_ifs025',
]

export function Planificar() {
  return (
    <Screen title="Planificar" tab="planificar">
      <div style="padding: 0 20px 24px 20px; display: flex; flex-direction: column; gap: 16px;">
        <Notice tone="warn" title="Sin conectar todavia">
          El mapa y la consulta de viento llegan despues del cuaderno. Esta pantalla es
          hoy solo el sitio donde iran.
        </Notice>

        <div>
          <div class="cap">Que hara</div>
          <p class="muted" style="font-size: 14px; line-height: 1.5;">
            Se toca cualquier punto del mapa, no solo un campo guardado, y devuelve la
            prevision de viento a 925 y 900 hPa hora a hora. El punto de despegue se
            decide cada dia segun el viento, que es justo lo que esta pantalla informa.
          </p>
        </div>

        <div>
          <div class="cap">Los seis modelos</div>
          <div class="num muted" style="font-size: 13px; line-height: 1.7; margin-top: 6px;">
            {MODELOS.map(m => <div key={m}>{m}</div>)}
          </div>
          <p class="muted" style="font-size: 14px; line-height: 1.5;">
            La ultima columna dira cuantos de los seis coinciden. Cuando bajan, el
            pronostico no vale.
          </p>
        </div>

        <Notice tone="info">
          La deriva llega en la fase 2, con el puerto de trayectoria_globo.py. Nada de
          esto sustituye al globo piloto.
        </Notice>
      </div>
    </Screen>
  )
}
