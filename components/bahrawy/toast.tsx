'use client'

/**
 * <ToastProvider /> + useToast()
 *
 * Imperative toasts. Wrap your tree (or just a section) in `<ToastProvider>`,
 * then call `useToast().push(msg)` anywhere inside it. Toasts slide in from
 * the configured corner, stack with a slight offset, and auto-dismiss after
 * `duration` ms.
 *
 * @param position  — Corner: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'. Default 'bottom-right'.
 * @param duration  — Default ms a toast stays. Default 3500.
 * @param max       — Cap on concurrent toasts. Older ones are dropped. Default 5.
 */

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastIntent = 'default' | 'success' | 'error' | 'info'

export interface Toast {
  id: string
  title: string
  description?: string
  intent?: ToastIntent
  duration?: number
}

export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'

interface ToastContextValue {
  push: (toast: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
}

const ToastCtx = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ToastProviderProps {
  children: React.ReactNode
  position?: ToastPosition
  duration?: number
  max?: number
}

const SPRING = { type: 'spring' as const, stiffness: 360, damping: 28, mass: 0.7 }

export function ToastProvider({
  children,
  position = 'bottom-right',
  duration = 3500,
  max = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = React.useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).slice(2, 9)
      const toast: Toast = { id, duration, intent: 'default', ...t }
      setToasts((prev) => [...prev.slice(-max + 1), toast])
      if (toast.duration && toast.duration > 0) {
        window.setTimeout(() => dismiss(id), toast.duration)
      }
      return id
    },
    [dismiss, duration, max],
  )

  // Position styles
  const isTop = position.startsWith('top')
  const isLeft = position.endsWith('left')
  const posClass = cn(
    'fixed z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 p-4',
    isTop ? 'top-0' : 'bottom-0 flex-col-reverse',
    isLeft ? 'left-0 items-start' : 'right-0 items-end',
  )

  return (
    <ToastCtx.Provider value={{ push, dismiss }}>
      {children}

      <div className={posClass} aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastCard
              key={t.id}
              toast={t}
              onDismiss={() => dismiss(t.id)}
              fromLeft={isLeft}
              fromTop={isTop}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

// ---------------------------------------------------------------------------
// Single toast card
// ---------------------------------------------------------------------------

interface ToastCardProps {
  toast: Toast
  onDismiss: () => void
  fromLeft: boolean
  fromTop: boolean
}

const INTENT_ICONS: Record<ToastIntent, LucideIcon> = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
}

const INTENT_COLORS: Record<ToastIntent, string> = {
  default: 'text-white/70',
  info: 'text-sky-400',
  success: 'text-emerald-400',
  error: 'text-rose-400',
}

function ToastCard({ toast, onDismiss, fromLeft, fromTop }: ToastCardProps) {
  const Icon = INTENT_ICONS[toast.intent ?? 'default']
  const offsetX = fromLeft ? -40 : 40
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: offsetX, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{
        opacity: 0,
        x: offsetX,
        scale: 0.95,
        transition: { duration: 0.18 },
      }}
      transition={SPRING}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-white/10 bg-zinc-900/95 p-3.5 shadow-2xl shadow-black/40 backdrop-blur"
      role="status"
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', INTENT_COLORS[toast.intent ?? 'default'])} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs leading-relaxed text-white/60">
            {toast.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}
