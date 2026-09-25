import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import './index.scss'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  icon?: string
}

interface Props<T extends string> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  className?: string
  placement?: 'down' | 'up'
  'aria-label'?: string
}

export default function Select<T extends string>({
  value,
  options,
  onChange,
  className = '',
  placement = 'down',
  'aria-label': ariaLabel,
}: Props<T>) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? options[0],
    [options, value],
  )

  useEffect(() => {
    if (!open) return
    const idx = Math.max(
      0,
      options.findIndex((o) => o.value === value),
    )
    setActive(idx)

    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, options, value])

  const pick = (next: T) => {
    onChange(next)
    setOpen(false)
  }

  const onTriggerKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      else setActive((i) => (i + 1) % options.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (open) setActive((i) => (i - 1 + options.length) % options.length)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (open) pick(options[active].value)
      else setOpen(true)
    }
  }

  const onMenuKey = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % options.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + options.length) % options.length)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(options[active].value)
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div
      ref={rootRef}
      className={`select ${open ? 'open' : ''} ${placement === 'up' ? 'up' : ''} ${className}`.trim()}
    >
      <button
        type="button"
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
      >
        <span className="select-value">
          {selected?.icon && (
            <span className="select-icon" aria-hidden="true">
              {selected.icon}
            </span>
          )}
          {selected?.label}
        </span>
        <svg
          className="select-chevron"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          id={id}
          className="select-menu"
          role="listbox"
          tabIndex={-1}
          onKeyDown={onMenuKey}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value
            return (
              <li key={o.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`select-option${isSelected ? ' selected' : ''}${i === active ? ' active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o.value)}
                >
                  {o.icon && (
                    <span className="select-icon" aria-hidden="true">
                      {o.icon}
                    </span>
                  )}
                  <span className="select-option-label">{o.label}</span>
                  {isSelected && (
                    <svg
                      className="select-check"
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5 8.5l3 3 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
