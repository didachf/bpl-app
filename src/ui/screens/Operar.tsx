// src/ui/screens/Operar.tsx
// Las checklists de operacion, y lo que falta por transcribir.
//
// CRITICAL: aqui NO se escribe contenido de checklist. Una checklist de globo
// es un documento de seguridad. Su texto vive en src/ops/checklists.json, es
// el procedimiento que dicta el piloto cruzado con el Manual de Vuelo MV04r30
// de Ultramagic, y cada paso lleva su fuente. El aviso de pendiente de validar
// no se quita hasta que el JSON diga validado, y eso lo decide el piloto.
import { CONTENIDO, porGrupo, progreso } from '../../ops/checklist'
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
          <Notice tone="warn" title="Pendiente de validar">
            Pasos dictados por el piloto el 08/10/2026 y cruzados con el MV04 r30. Cada paso
            lleva su fuente.
          </Notice>
        )}

        {porGrupo(CONTENIDO).map(g => (
          <div key={g.titulo}>
            <div class="cap">{g.titulo}</div>
            <div style="margin-top: 4px;">
              {g.checklists.map(cl => {
                // Los pasos de la lista. Los subpasos cuentan dentro de su paso.
                const { hechas, total } = progreso(cl, marcasGuardadas(cl))
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
