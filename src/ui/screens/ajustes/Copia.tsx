// src/ui/screens/ajustes/Copia.tsx
import { useState } from 'preact/hooks'
import type { GithubConfig } from '../../../sync/github'
import { TextField } from '../../components/Field'
import { Icon } from '../../components/Icon'
import { Notice } from '../../components/Notice'
import { Sheet } from '../../components/Screen'
import { useDoc, useStore } from '../../state'

const VACIA: GithubConfig = { owner: '', repo: 'bpl-logbook', branch: 'main', token: '' }

/**
 * Pantalla de conflicto.
 *
 * Se enseña sola, por encima de todo lo demas, y las dos opciones dicen que se
 * pierde con cada una. Nunca hay una tercera opcion de fusionar: el spec §7 lo
 * prohibe y la razon es que una fusion automatica de un cuaderno de vuelo
 * puede borrar horas voladas sin que nadie se entere.
 */
function Conflicto() {
  const { resolverConflicto } = useStore()
  const doc = useDoc()
  const [trabajando, setTrabajando] = useState(false)

  const hacer = (cual: 'local' | 'remoto') => {
    const texto = cual === 'local'
      ? 'Se subira lo de este telefono y se PERDERA lo que haya en GitHub. Seguro?'
      : 'Se bajara lo de GitHub y se PERDERA lo que haya en este telefono. Seguro?'
    if (!confirm(texto)) return
    setTrabajando(true)
    void resolverConflicto(cual).finally(() => setTrabajando(false))
  }

  return (
    <div style="margin-bottom: 20px;">
      <Notice tone="danger" title="Conflicto: el repositorio ha cambiado por otro lado">
        Alguien ha escrito el cuaderno desde otro dispositivo. La app no fusiona nunca,
        asi que tienes que elegir una de las dos versiones enteras.
      </Notice>
      <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 12px;">
        <button class="secondary" disabled={trabajando} onClick={() => hacer('local')}>
          Quedarme con este telefono, {doc.flights.length} vuelos
        </button>
        <button class="secondary" disabled={trabajando} onClick={() => hacer('remoto')}>
          Quedarme con lo de GitHub
        </button>
      </div>
    </div>
  )
}

export function Copia() {
  const doc = useDoc()
  const { cfg, setCfg, sync, pushNow, restaurar, sinGuardar } = useStore()
  const [borrador, setBorrador] = useState<GithubConfig>(cfg ?? VACIA)
  const [trabajando, setTrabajando] = useState(false)

  const completa = borrador.owner.trim() !== ''
    && borrador.repo.trim() !== ''
    && borrador.branch.trim() !== ''
    && borrador.token.trim() !== ''

  return (
    <Sheet title="Copia de seguridad">
      <div style="padding: 8px 20px 32px 20px;">
        {sync.kind === 'conflicto' && <Conflicto />}

        {sync.kind === 'error' && (
          <div style="margin-bottom: 20px;">
            <Notice tone="warn" title="La ultima subida ha fallado">{sync.mensaje}</Notice>
          </div>
        )}

        <div class="card" style="margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <Icon
              name={sync.kind === 'al_dia' ? 'check' : 'nube'}
              size={17}
              color={sync.kind === 'al_dia' ? 'var(--ok)' : 'var(--dim)'}
              width={2.4}
            />
            <div style="flex-grow: 1; font-size: 15px;">
              {cfg === null ? 'Sin repositorio configurado' : `${cfg.owner}/${cfg.repo}`}
            </div>
          </div>
          <div class="num dim" style="font-size: 13px; margin-top: 7px;">
            {doc.flights.length} vuelos · {sinGuardar === 0 ? 'guardado' : `${sinGuardar} cambios sin guardar`}
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <Notice tone="info" title="El cuaderno funciona entero sin esto">
            La copia en GitHub es para no perder los datos si el telefono se pierde o si
            el navegador borra el almacenamiento. Sin token, la app sigue anotando vuelos.
          </Notice>
        </div>

        <TextField
          label="Cuenta de GitHub"
          value={borrador.owner}
          placeholder="didachf"
          onChange={v => setBorrador({ ...borrador, owner: v.trim() })}
        />
        <TextField
          label="Repositorio privado"
          value={borrador.repo}
          placeholder="bpl-logbook"
          onChange={v => setBorrador({ ...borrador, repo: v.trim() })}
        />
        <TextField
          label="Rama"
          value={borrador.branch}
          placeholder="main"
          onChange={v => setBorrador({ ...borrador, branch: v.trim() })}
        />
        <TextField
          label="Token"
          value={borrador.token}
          placeholder="github_pat_..."
          hint={
            'PAT de grano fino, con permiso de contenido SOLO sobre ese repositorio y '
            + 'caducidad de un año. Se guarda en este telefono, no viaja a ningun otro '
            + 'sitio, y se revoca en un clic desde GitHub.'
          }
          onChange={v => setBorrador({ ...borrador, token: v.trim() })}
        />

        <div style="margin: 6px 0 20px 0;">
          <Notice tone="warn" title="Quien tenga el telefono desbloqueado puede leer el token">
            Por eso el permiso alcanza solo a ese repositorio: robarlo cuesta el cuaderno,
            no la cuenta de GitHub.
          </Notice>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="primary" disabled={!completa} onClick={() => setCfg(borrador)}>
            Guardar la configuracion
          </button>

          <button
            class="secondary"
            disabled={cfg === null || trabajando}
            onClick={() => { setTrabajando(true); void pushNow().finally(() => setTrabajando(false)) }}
          >
            Subir ahora
          </button>

          <button
            class="secondary"
            disabled={cfg === null || trabajando}
            onClick={() => {
              if (!confirm(
                'Se bajara el cuaderno de GitHub y SUSTITUIRA al de este telefono. Seguro?',
              )) return
              setTrabajando(true)
              void restaurar().finally(() => setTrabajando(false))
            }}
          >
            Restaurar desde GitHub
          </button>

          {cfg !== null && (
            <button
              class="linkish"
              style="color: var(--danger); align-self: center; margin-top: 8px;"
              onClick={() => {
                if (!confirm('Se borrara el token de este telefono. El cuaderno local no se toca.')) return
                setCfg(null)
                setBorrador(VACIA)
              }}
            >
              Olvidar el token
            </button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
