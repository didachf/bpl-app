// src/ui/screens/Operar.tsx
// Las checklists del manual, y lo que falta por transcribir.
//
// CRITICAL: aqui NO se escribe contenido de checklist. Una checklist de globo
// es un documento de seguridad y su texto se transcribe del Manual de Vuelo
// MV04r30 de Ultramagic a src/ops/checklists.json, y lo valida el piloto
// contra el papel. El aviso de pendiente de validar no se quita hasta que el
// JSON diga validado.
import { CONTENIDO, idsDe, porGrupo } from '../../ops/checklist'
import { Icon } from '../components/Icon'
import { Notice } from '../components/Notice'
import { Screen } from '../components/Screen'
import { hrefOf } from '../router'
import { marcasGuardadas } from './Checklist'

const PENDIENTE: { titulo: string; fuente: string; grave?: boolean }[] = [
  { titulo: 'Control en vuelo', fuente: 'Seccion 4.10' },
  { titulo: 'Aterrizaje', fuente: 'Seccion 4.11' },
  { titulo: 'Emergencias', fuente: 'Seccion 3, lineas electricas y FDS', grave: true },
]

export function Operar() {
  return (
    <Screen title="Operar" tab="operar">
      <div style="padding: 0 20px 24px 20px; display: flex; flex-direction: column; gap: 16px;">
        {!CONTENIDO.validado && (
          <Notice tone="warn" title="Pendiente de validar contra el papel">
            Transcrito del Manual de Vuelo MV04 r30. Cada ítem lleva su apartado para cotejarlo.
          </Notice>
        )}

        {porGrupo(CONTENIDO).map(g => (
          <div key={g.titulo}>
            <div class="cap">{g.titulo}</div>
            <div style="margin-top: 4px;">
              {g.checklists.map(cl => {
                const hechas = marcasGuardadas(cl).size
                const total = idsDe(cl).length
                return (
                  <a
                    key={cl.id}
                    href={hrefOf({ name: 'checklist', id: cl.id })}
                    style="
                      display: flex; align-items: center; gap: 11px; padding: 14px 0;
                      border-bottom: 1px solid var(--border); color: var(--text); text-decoration: none;
                    "
                  >
                    <Icon name="checklist" size={18} color="var(--dim)" width={2} />
                    <div style="flex-grow: 1; min-width: 0;">
                      <div style="font-size: 16px;">{cl.titulo}</div>
                      <div class="dim" style="font-size: 13px; margin-top: 2px;">{cl.subtitulo}</div>
                    </div>
                    <span class="num dim" style="font-size: 14px;">
                      {hechas > 0 ? `${hechas}/${total}` : String(total)}
                    </span>
                    <Icon name="derecha" size={16} color="var(--dim)" width={2.4} />
                  </a>
                )
              })}
            </div>
          </div>
        ))}

        <div>
          <div class="cap">Del manual, pendiente de transcribir</div>
          <div style="margin-top: 8px;">
            {PENDIENTE.map(c => (
              <div
                key={c.titulo}
                style={`
                  display: flex; align-items: center; gap: 11px; padding: 12px 0;
                  border-bottom: 1px solid ${c.grave === true ? 'var(--danger-border)' : 'var(--border)'};
                `}
              >
                <div style="flex-grow: 1;">
                  <div class="muted" style="font-size: 15px;">{c.titulo}</div>
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
