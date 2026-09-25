import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './index.scss'

export type DialogKind = 'checkout' | 'confirm' | 'alert'

export interface DialogAction {
  label: string
  onClick: () => void
  tone?: 'primary' | 'cash' | 'card' | 'danger'
  disabled?: boolean
}

interface Props {
  open: boolean
  kind?: DialogKind
  title: string
  description?: ReactNode
  actions: DialogAction[]
  onCancel: () => void
}

export default function Dialog({
  open,
  kind = 'confirm',
  title,
  description,
  actions,
  onCancel,
}: Props) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <div className={`dialog-root kind-${kind}`} onMouseDown={onCancel}>
      <div
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="dialog-close" aria-label="关闭" onClick={onCancel}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <h3 id={titleId}>{title}</h3>
        {description ? <div className="dialog-desc">{description}</div> : null}
        <div className="dialog-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={`dialog-action tone-${action.tone ?? 'primary'}`}
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
