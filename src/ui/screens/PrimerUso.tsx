// src/ui/screens/PrimerUso.tsx
import { useState } from 'preact/hooks'
import { Notice } from '../components/Notice'
import { documentoNuevo, useStore } from '../state'

export function PrimerUso() {
  const { cfg, replace, restaurar } = useStore()
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div style="
      padding: calc(24px + env(safe-area-inset-top)) 20px 24px 20px;
      display: flex; flex-direction: column; gap: 18px; min-height: 100dvh;
    ">
      <div>
        <div class="cap">Logbook BPL</div>
        <h1 style="margin: 8px 0 0 0; font-size: 26px; font-weight: 600;">
          No hay ningun cuaderno en este telefono
        </h1>
      </div>

      <p class="muted" style="font-size: 15px; line-height: 1.5;">
        O es la primera vez que abres la app, o el navegador ha borrado el almacenamiento.
        Si ya tienes copia en GitHub, restaurala. Si no, empieza de cero.
      </p>

      {error !== null && <Notice tone="danger" title="No se ha podido restaurar">{error}</Notice>}

      <button
        class="primary"
        disabled={cfg === null || trabajando}
        onClick={() => {
          setError(null)
          setTrabajando(true)
          void restaurar().finally(() => setTrabajando(false))
        }}
      >
        {trabajando ? 'Restaurando...' : 'Restaurar desde GitHub'}
      </button>
      {cfg === null && (
        <div class="lbl dim" style="margin-top: -10px;">
          No hay token guardado en este telefono, asi que no hay de donde restaurar.
        </div>
      )}

      <button class="secondary" disabled={trabajando} onClick={() => replace(documentoNuevo())}>
        Empezar de cero
      </button>
    </div>
  )
}
