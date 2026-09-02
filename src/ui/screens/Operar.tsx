// src/ui/screens/Operar.tsx
// Esbozo.
//
// CRITICAL: aqui NO se escribe contenido de checklist. Una checklist de globo
// es un documento de seguridad y su texto se transcribe del Manual de Vuelo
// MV04r30 de Ultramagic en la fase 3, y lo valida el piloto contra el papel.
// Lo que hay aqui es el indice de lo que se va a transcribir, con el numero de
// bloque del manual, y un aviso que no se quita hasta que este transcrito.
import { Notice } from '../components/Notice'
import { Screen } from '../components/Screen'

const DEL_MANUAL: { titulo: string; fuente: string; grave?: boolean }[] = [
  { titulo: 'Chequeo prevuelo', fuente: 'Apendice C, nueve bloques' },
  { titulo: 'Preparacion', fuente: 'Seccion 4.5' },
  { titulo: 'Inflado', fuente: 'Seccion 4.7' },
  { titulo: 'Antes del despegue', fuente: 'Seccion 4.8.1' },
  { titulo: 'Briefing de pasajeros', fuente: 'Seccion 4.8.2' },
  { titulo: 'Despegue', fuente: 'Seccion 4.9' },
  { titulo: 'Control en vuelo', fuente: 'Seccion 4.10' },
  { titulo: 'Aterrizaje', fuente: 'Seccion 4.11' },
  { titulo: 'Emergencias', fuente: 'Seccion 3, lineas electricas y FDS', grave: true },
]

export function Operar() {
  return (
    <Screen title="Operar" tab="operar">
      <div style="padding: 0 20px 24px 20px; display: flex; flex-direction: column; gap: 16px;">
        <Notice tone="warn" title="Sin transcribir. No usar en vuelo.">
          El contenido se copia del Manual de Vuelo MV04r30 y lo validas contra el papel.
          Hasta entonces esto es solo la estructura.
        </Notice>

        <div>
          <div class="cap">Del manual, pendiente de transcribir</div>
          <div style="margin-top: 8px;">
            {DEL_MANUAL.map(c => (
              <div
                key={c.titulo}
                style={`
                  display: flex; align-items: center; gap: 11px; padding: 12px 0;
                  border-bottom: 1px solid ${c.grave === true ? 'var(--danger-border)' : 'var(--border)'};
                `}
              >
                <div style="flex-grow: 1;">
                  <div style="font-size: 15px;">{c.titulo}</div>
                  <div class="num dim" style="font-size: 12px; margin-top: 2px;">{c.fuente}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Screen>
  )
}
