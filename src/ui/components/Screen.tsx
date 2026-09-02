// src/ui/components/Screen.tsx
import type { ComponentChildren } from 'preact'
import { goBack } from '../router'
import { Icon } from './Icon'
import { Tabs, type TabName } from './Tabs'

const MARCO = `
  display: flex; flex-direction: column;
  height: 100dvh; overflow: hidden;
  padding-top: env(safe-area-inset-top);
`

/** Cuerpo con scroll propio. El marco no scrollea nunca, para que las pestañas no se vayan. */
const CUERPO = 'flex-grow: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;'

export interface ScreenProps {
  title: string
  tab: TabName
  /** Lo que va a la derecha del titulo: un estado, un boton pequeño. */
  right?: ComponentChildren
  children: ComponentChildren
}

/**
 * Pantalla de pestaña: titulo grande arriba, barra de pestañas abajo.
 *
 * Con el titulo vacio no se pinta cabecera: Inicio no tiene rotulo, su titulo
 * es la cifra grande del acumulado.
 */
export function Screen({ title, tab, right, children }: ScreenProps) {
  return (
    <div style={MARCO}>
      {title !== '' && (
        <header style="
          display: flex; align-items: baseline; justify-content: space-between;
          padding: 16px 20px 10px 20px; flex-shrink: 0;
        ">
          <h1 style="margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -.02em;">
            {title}
          </h1>
          {right}
        </header>
      )}
      <div style={title === '' ? `${CUERPO} padding-top: 16px;` : CUERPO}>{children}</div>
      <Tabs actual={tab} />
    </div>
  )
}

export interface SheetProps {
  title: string
  /** Renglon pequeño encima del titulo: la fecha del vuelo, por ejemplo. */
  overline?: string
  /** Accion de la derecha de la cabecera. */
  action?: ComponentChildren
  /** Barra fija al pie, fuera del scroll. */
  footer?: ComponentChildren
  children: ComponentChildren
}

/**
 * Pantalla interior: Detalle, Cerrar vuelo, las de Ajustes.
 *
 * Sin pestañas a proposito. Son pantallas de las que se sale por la flecha o
 * guardando, y dejar las pestañas invitaria a irse a medio formulario.
 */
export function Sheet({ title, overline, action, footer, children }: SheetProps) {
  return (
    <div style={MARCO}>
      <header style="
        display: flex; align-items: center; gap: 12px;
        padding: 16px 20px 12px 20px; flex-shrink: 0;
      ">
        <button
          class="linkish" onClick={goBack} aria-label="Atras"
          style="display: flex; align-items: center; color: var(--dim);"
        >
          <Icon name="izquierda" size={20} width={2.4} />
        </button>
        <div style="flex-grow: 1; min-width: 0;">
          {overline !== undefined && (
            <div class="num dim" style="font-size: 13px;">{overline}</div>
          )}
          <div style="font-size: 19px; font-weight: 500;">{title}</div>
        </div>
        {action}
      </header>
      <div style={CUERPO}>{children}</div>
      {footer !== undefined && (
        <div style="
          padding: 14px 20px; flex-shrink: 0; border-top: 1px solid var(--border);
          padding-bottom: calc(14px + env(safe-area-inset-bottom));
        ">
          {footer}
        </div>
      )}
    </div>
  )
}

/** Titulillo de seccion en versalitas. */
export function SectionTitle({ children }: { children: ComponentChildren }) {
  return <div class="cap" style="margin: 22px 20px 8px 20px;">{children}</div>
}
