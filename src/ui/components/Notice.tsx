// src/ui/components/Notice.tsx
import type { ComponentChildren } from 'preact'
import { Icon, type IconName } from './Icon'

export type Tone = 'info' | 'warn' | 'danger'

const TONOS: Record<Tone, { color: string; icon: IconName; borde: string; fondo: string }> = {
  info: { color: 'var(--dim)', icon: 'aviso', borde: 'var(--border)', fondo: 'var(--surface)' },
  warn: { color: 'var(--warn)', icon: 'alerta', borde: 'var(--warn-border)', fondo: 'var(--warn-bg)' },
  danger: { color: 'var(--danger)', icon: 'alerta', borde: 'var(--danger-border)', fondo: 'var(--surface)' },
}

export interface NoticeProps {
  tone?: Tone
  title?: string
  children?: ComponentChildren
}

/**
 * Aviso con icono.
 *
 * El ambar solo pinta el icono, el borde y el titulo, nunca una superficie
 * grande: da 1,79 de contraste sobre fondo claro. Decision ya tomada, no la
 * deshagas rellenando una tarjeta de amarillo.
 */
export function Notice({ tone = 'info', title, children }: NoticeProps) {
  const t = TONOS[tone]
  return (
    <div style={`
      display: flex; gap: 11px; padding: 12px 14px; border-radius: 8px;
      background: ${t.fondo}; border: 1px solid ${t.borde};
    `}>
      <div style="margin-top: 1px;"><Icon name={t.icon} size={17} color={t.color} /></div>
      <div style="flex-grow: 1; min-width: 0;">
        {title !== undefined && (
          <div style={`font-size: 14px; font-weight: 500; color: ${t.color};`}>{title}</div>
        )}
        {children !== undefined && (
          <div class="muted" style="font-size: 13px; line-height: 1.45;">{children}</div>
        )}
      </div>
    </div>
  )
}
