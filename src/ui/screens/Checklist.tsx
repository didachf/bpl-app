// src/ui/screens/Checklist.tsx
// Una checklist del manual, para ir marcando en el campo.
//
// El texto no se escribe aqui: sale de src/ops/checklists.json, que esta
// transcrito del Manual de Vuelo MV04r30. Esta pantalla solo pinta y guarda
// las marcas.
import { useEffect, useRef, useState } from 'preact/hooks'
import {
  CONTENIDO, alternar, buscarChecklist, claveDe, fuenteLegible, progreso, restaurar, serializar,
  type Bloque, type Checklist, type Item,
} from '../../ops/checklist'
import { Icon } from '../components/Icon'
import { Notice } from '../components/Notice'
import { Sheet } from '../components/Screen'
import { hrefOf } from '../router'

// localStorage puede no estar o lanzar (modo privado, almacenamiento lleno).
// Las marcas son una comodidad: si no se guardan, la checklist sigue sirviendo.
function leer(clave: string): string | null {
  try { return localStorage.getItem(clave) } catch { return null }
}

function escribir(clave: string, valor: string): boolean {
  try {
    localStorage.setItem(clave, valor)
    return true
  } catch {
    return false
  }
}

function borrar(clave: string): void {
  try { localStorage.removeItem(clave) } catch { /* nada que borrar */ }
}

/** Las marcas que hay guardadas ahora, para el contador de la lista de Operar. */
export function marcasGuardadas(cl: Checklist): Set<string> {
  return restaurar(leer(claveDe(cl.id)), cl, CONTENIDO.version, Date.now()).marcadas
}

/**
 * Pantalla encendida mientras la checklist esta abierta.
 *
 * Con guantes y el telefono en la mano, que se apague a mitad del montaje es
 * lo normal. Android suelta el bloqueo al ocultar la app, asi que se vuelve a
 * pedir al volver. Si el navegador no lo da, no pasa nada.
 */
function usePantallaEncendida(): void {
  useEffect(() => {
    let bloqueo: WakeLockSentinel | null = null
    let viva = true
    const pedir = async () => {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return
      try {
        const b = await navigator.wakeLock.request('screen')
        if (viva) bloqueo = b
        else void b.release()
      } catch { /* sin bloqueo, la pantalla se apaga como siempre */ }
    }
    const alVolver = () => { if (document.visibilityState === 'visible') void pedir() }
    void pedir()
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      viva = false
      document.removeEventListener('visibilitychange', alVolver)
      if (bloqueo !== null) void bloqueo.release()
    }
  }, [])
}

function Casilla({ marcada }: { marcada: boolean }) {
  return (
    <div style={`
      width: 26px; height: 26px; flex-shrink: 0; border-radius: 6px; margin-top: 1px;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid ${marcada ? 'var(--ok)' : 'var(--dim)'};
      background: ${marcada ? 'var(--ok)' : 'none'};
    `}>
      {marcada && <Icon name="check" size={17} color="#ffffff" width={3} />}
    </div>
  )
}

function Fila({ item, marcada, onToggle }: { item: Item; marcada: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada}
      onClick={onToggle}
      style="
        display: flex; align-items: flex-start; gap: 13px; width: 100%;
        padding: 13px 0; border: none; border-bottom: 1px solid var(--border);
        background: none; color: var(--text); font: inherit; text-align: left; cursor: pointer;
      "
    >
      <Casilla marcada={marcada} />
      <div style="flex-grow: 1; min-width: 0;">
        <div style={`font-size: 15px; line-height: 1.4; color: ${marcada ? 'var(--dim)' : 'var(--text)'};`}>
          {item.texto}
        </div>
        {item.detalle !== undefined && (
          <div class={marcada ? 'dim' : 'muted'} style="font-size: 13px; line-height: 1.45; margin-top: 4px;">
            {item.detalle}
          </div>
        )}
        <div class="num dim" style="font-size: 12px; margin-top: 4px;">{fuenteLegible(item.fuente)}</div>
      </div>
    </button>
  )
}

function CabeceraBloque({ bloque, hechas, total }: { bloque: Bloque; hechas: number; total: number }) {
  const completo = hechas === total
  return (
    <div style="margin: 24px 0 2px 0;">
      <div style="display: flex; align-items: baseline; gap: 10px;">
        <div class="cap" style={`flex-grow: 1; ${completo ? 'color: var(--ok);' : ''}`}>{bloque.titulo}</div>
        <div class="num" style={`font-size: 13px; color: ${completo ? 'var(--ok)' : 'var(--dim)'};`}>
          {hechas}/{total}
        </div>
      </div>
      <div class="num dim" style="font-size: 12px; margin-top: 3px;">{bloque.fuente}</div>
      {bloque.nota !== undefined && (
        <div class="muted" style="font-size: 13px; line-height: 1.45; margin-top: 6px;">{bloque.nota}</div>
      )}
    </div>
  )
}

/**
 * Reiniciar en dos toques, dentro de la pagina.
 *
 * Nada de confirm(): dentro de un marco con sandbox devuelve false sin enseñar
 * nada, y aqui el primer toque solo cambia el rotulo. Si no se confirma en
 * unos segundos, vuelve solo.
 */
function BotonReiniciar({ onReiniciar, desactivado }: { onReiniciar: () => void; desactivado: boolean }) {
  const [armado, setArmado] = useState(false)
  const temporizador = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(temporizador.current), [])

  const alPulsar = () => {
    window.clearTimeout(temporizador.current)
    if (armado) {
      setArmado(false)
      onReiniciar()
      return
    }
    setArmado(true)
    temporizador.current = window.setTimeout(() => setArmado(false), 4000)
  }

  return (
    <button
      type="button"
      class="secondary"
      disabled={desactivado}
      onClick={alPulsar}
      style={`width: auto; padding: 0 18px; ${armado ? 'border-color: var(--danger); color: var(--danger);' : ''}`}
    >
      {armado ? 'Pulsa otra vez para borrar' : 'Reiniciar'}
    </button>
  )
}

function Ejecutar({ cl }: { cl: Checklist }) {
  const clave = claveDe(cl.id)
  const [inicio] = useState(() => restaurar(leer(clave), cl, CONTENIDO.version, Date.now()))
  const [marcadas, setMarcadas] = useState<Set<string>>(inicio.marcadas)
  // Las marcas de verdad viven en la referencia, no en el estado. Dos toques
  // antes de que se repinte leerian el mismo estado viejo y el segundo pisaria
  // al primero. Pasaba: tres toques seguidos guardaban solo el ultimo.
  const actuales = useRef<Set<string>>(inicio.marcadas)
  const [noGuarda, setNoGuarda] = useState(false)
  usePantallaEncendida()

  const p = progreso(cl, marcadas)
  const completa = p.hechas === p.total

  const alternarItem = (id: string) => {
    const nuevas = alternar(actuales.current, id)
    actuales.current = nuevas
    setMarcadas(nuevas)
    setNoGuarda(!escribir(clave, serializar(cl, CONTENIDO.version, nuevas, Date.now())))
  }

  const reiniciar = () => {
    actuales.current = new Set()
    setMarcadas(actuales.current)
    borrar(clave)
  }

  const pie = (
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="flex-grow: 1; display: flex; align-items: center; gap: 8px;">
        {completa && <Icon name="check" size={18} color="var(--ok)" width={2.6} />}
        <span class="num" style={`font-size: 16px; ${completa ? 'color: var(--ok);' : ''}`}>
          {p.hechas} de {p.total}
        </span>
      </div>
      <BotonReiniciar onReiniciar={reiniciar} desactivado={p.hechas === 0} />
    </div>
  )

  return (
    <Sheet title={cl.titulo} overline="Manual de Vuelo MV04 r30" footer={pie}>
      <div style="padding: 0 20px 28px 20px;">
        <div class="muted" style="font-size: 14px; margin-bottom: 14px;">{cl.subtitulo}</div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          {cl.avisos.map(a => (
            <Notice key={a.texto} tone="danger" title={a.texto}>Apartado {a.fuente}</Notice>
          ))}
          {!CONTENIDO.validado && (
            <Notice tone="warn" title="Pendiente de validar contra el papel">
              Transcrito del manual con las frases partidas y la puntuación retocada. Cada ítem
              lleva su apartado para cotejarlo.
            </Notice>
          )}
          {inicio.caducadas && (
            <Notice title="Marcas borradas">
              Eran de hace más de 6 h y se han quitado. Se empieza de cero.
            </Notice>
          )}
          {noGuarda && (
            <Notice tone="warn" title="Las marcas no se están guardando">
              Si la app se cierra, se pierden. La checklist sigue sirviendo.
            </Notice>
          )}
        </div>

        {cl.bloques.map((b, i) => (
          <div key={b.titulo}>
            <CabeceraBloque bloque={b} hechas={p.porBloque[i].hechas} total={p.porBloque[i].total} />
            {b.items.map(it => (
              <Fila
                key={it.id}
                item={it}
                marcada={marcadas.has(it.id)}
                onToggle={() => alternarItem(it.id)}
              />
            ))}
          </div>
        ))}

        <div class="dim" style="font-size: 13px; line-height: 1.45; margin-top: 20px;">
          Las marcas caducan a las 6 h del último cambio. La pantalla no se apaga mientras
          está abierta.
        </div>
      </div>
    </Sheet>
  )
}

export function ChecklistScreen({ id }: { id: string }) {
  const cl = buscarChecklist(CONTENIDO, id)
  if (cl === undefined) {
    return (
      <Sheet title="Checklist">
        <div style="padding: 0 20px;">
          <Notice tone="warn" title="Esta checklist no existe">
            <a href={hrefOf({ name: 'operar' })} style="color: var(--accent);">Volver a Operar</a>
          </Notice>
        </div>
      </Sheet>
    )
  }
  // La clave fuerza un estado nuevo si se navega de una checklist a otra.
  return <Ejecutar key={cl.id} cl={cl} />
}
