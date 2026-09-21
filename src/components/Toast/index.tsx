import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import './index.scss'

type ToastKind = 'error' | 'success'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  error: (message: string) => void
  success: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<number, number>())
  const nextId = useRef(1)

  useEffect(() => {
    const store = timers.current
    return () => {
      store.forEach((timer) => window.clearTimeout(timer))
      store.clear()
    }
  }, [])

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const text = message.trim()
      if (!text) return
      const id = nextId.current
      nextId.current += 1
      setToasts((prev) => [...prev.slice(-2), { id, kind, message: text }])
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), 4000),
      )
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      error: (message: string) => push('error', message),
      success: (message: string) => push('success', message),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
          {toasts.map((item) => (
            <div
              key={item.id}
              className={`toast ${item.kind}`}
              role={item.kind === 'error' ? 'alert' : 'status'}
            >
              <span>{item.message}</span>
              <button type="button" className="toast-close" onClick={() => dismiss(item.id)}>
                关闭
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) {
    throw new Error('useToast 必须在 ToastProvider 内使用')
  }
  return value
}

export function toErrorMessage(err: unknown, fallback: string) {
  if (err instanceof TypeError) return '网络连接失败，请稍后重试'
  if (err instanceof Error && err.message.trim()) return err.message
  return fallback
}
