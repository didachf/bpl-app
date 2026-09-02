// src/ui/components/Instalar.tsx
// El aviso de instalar la app en el telefono.
//
// Existe porque la opcion de Chrome vive escondida en el menu de tres puntos y
// se llama distinto segun la version: unas veces "Instalar aplicacion", otras
// "Añadir a la pantalla de inicio". Un boton dentro de la app quita la
// adivinanza.
import { useEffect, useState } from 'preact/hooks'
import { estaInstalada, instalar, vigilarInstalacion } from '../install'
import { Icon } from './Icon'

const CLAVE_DESCARTADO = 'bpl-app:instalar-descartado'

export function AvisoInstalar() {
  const [sePuede, setSePuede] = useState(false)
  const [descartado, setDescartado] = useState(() => {
    try { return localStorage.getItem(CLAVE_DESCARTADO) === '1' } catch { return false }
  })
  const [aMano, setAMano] = useState(false)

  useEffect(() => vigilarInstalacion(setSePuede), [])

  // Instalada ya, o descartado a mano: no se enseña nada.
  if (estaInstalada() || descartado) return null

  // El navegador no ha ofrecido instalar. Puede ser que no sea Chrome, o que
  // Chrome todavia no lo considere. Se enseñan las instrucciones a mano en
  // lugar de un boton muerto.
  if (!sePuede) {
    return (
      <div class="outline">
        <div style="display: flex; align-items: center; gap: 11px;">
          <Icon name="globo" size={17} color="var(--dim)" />
          <div style="flex-grow: 1;">
            <div class="lbl muted">Instalar en el telefono</div>
          </div>
          <button class="linkish" onClick={() => setAMano(!aMano)}>
            {aMano ? 'Ocultar' : 'Como'}
          </button>
        </div>
        {aMano && (
          <div class="lbl dim" style="margin-top: 10px; line-height: 1.55;">
            En Chrome de Android: menu de tres puntos arriba a la derecha,
            {' '}<strong>Anadir a la pantalla de inicio</strong> o{' '}
            <strong>Instalar aplicacion</strong>. Si solo sale la primera, el icono queda
            igual y la app se abre a pantalla completa.
            <div style="margin-top: 8px;">
              Si usas Firefox o Samsung Internet la opcion esta en otro sitio y el icono
              puede quedar como acceso directo. Chrome es el que la instala de verdad.
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div class="card">
      <div style="display: flex; align-items: center; gap: 11px;">
        <Icon name="globo" size={18} color="var(--warn)" />
        <div style="flex-grow: 1; min-width: 0;">
          <div class="lbl" style="font-weight: 500;">Instalar en el telefono</div>
          <div class="lbl dim" style="font-size: 12px;">
            Arranca sin cobertura y sin barra de direcciones.
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 12px;">
        <button
          class="primary"
          style="height: 44px; font-size: 15px;"
          onClick={() => { void instalar() }}
        >
          Instalar
        </button>
        <button
          class="secondary"
          style="height: 44px; width: auto; padding: 0 16px;"
          onClick={() => {
            setDescartado(true)
            try { localStorage.setItem(CLAVE_DESCARTADO, '1') } catch { /* sin localStorage, da igual */ }
          }}
        >
          Ahora no
        </button>
      </div>
    </div>
  )
}
