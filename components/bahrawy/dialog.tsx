'use client'

/**
 * <Dialog />  —  Apple-style centered modal.
 *
 * Portal-mounted, vibrancy backdrop with blur, Apple spring entrance
 * (scale 0.94 → 1, soft Y rise), focus trap (focuses the first
 * focusable inside on open, restores the previously-active element
 * on close), ESC + backdrop click to dismiss (configurable), body
 * scroll lock, role="dialog" + aria-modal.
 *
 * Slots: optional `title`, `description`, body children, optional
 * `footer`. Intent variants: 'default' | 'destructive' (changes
 * the title color to SF red for confirmation modals).
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: React.ReactNode
  description?: React.ReactNode
  /** Right-aligned footer area, usually action buttons. */
  footer?: React.ReactNode
  /** Visual intent — destructive bumps the title to SF red. */
  intent?: 'default' | 'destructive'
  /** Width in px. Default 440. */
  width?: number
  /** Show the small × close button. Default true. */
  showCloseButton?: boolean
  /** Click on backdrop dismisses. Default true. */
  closeOnBackdropClick?: boolean
  /** Esc dismisses. Default true. */
  closeOnEsc?: boolean
  className?: string
  children?: React.ReactNode
}

const APPLE_SPRING = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.6 }

// Selectors for focus-trap candidates inside the dialog.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  intent = 'default',
  width = 440,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  className,
  children,
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const previouslyFocused = React.useRef<HTMLElement | null>(null)

  // Focus trap + restore.
  React.useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null

    const t = window.setTimeout(() => {
      const first =
        panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? panelRef.current
      first?.focus()
    }, 30)

    return () => {
      window.clearTimeout(t)
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  // ESC + Tab cycling.
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc) {
        e.preventDefault()
        onOpenChange(false)
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeOnEsc, onOpenChange])

  // Body scroll lock.
  React.useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (typeof document === 'undefined') return null

  const titleId = 'dialog-title'
  const descId = 'dialog-desc'

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-[10vh]"
        >
          {/* Vibrancy backdrop */}
          <button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            onClick={closeOnBackdropClick ? () => onOpenChange(false) : undefined}
            className="absolute inset-0 backdrop-blur-2xl"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.82) 100%)',
            }}
          />

          <motion.div
            key="dialog-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            initial={{ y: 16, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.96 }}
            transition={APPLE_SPRING}
            tabIndex={-1}
            className={cn(
              'relative isolate flex max-h-[80vh] w-full flex-col overflow-hidden rounded-[20px] border border-white/[0.08] outline-none',
              className,
            )}
            style={{
              maxWidth: width,
              background:
                'linear-gradient(180deg, rgba(36,36,40,0.92) 0%, rgba(22,22,26,0.96) 100%)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              boxShadow: `
                0 1px 0 rgba(255,255,255,0.08) inset,
                0 0 0 0.5px rgba(255,255,255,0.06),
                0 24px 60px -12px rgba(0,0,0,0.6),
                0 48px 96px -24px rgba(0,0,0,0.4)
              `,
            }}
          >
            {/* Close button (always rendered for keyboard users; visible per prop) */}
            {showCloseButton && (
              <motion.button
                type="button"
                onClick={() => onOpenChange(false)}
                whileTap={{ scale: 0.9 }}
                transition={APPLE_SPRING}
                aria-label="Close"
                className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/65 backdrop-blur transition-colors hover:bg-white/[0.1] hover:text-white"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </motion.button>
            )}

            {/* Header */}
            {(title || description) && (
              <header className="shrink-0 px-6 pb-3 pt-6">
                {title && (
                  <h2
                    id={titleId}
                    className={cn(
                      'font-display text-[17px] font-semibold tracking-tight',
                      intent === 'destructive' ? 'text-[#FF453A]' : 'text-white',
                    )}
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    id={descId}
                    className="mt-1.5 text-[13px] leading-[1.5] tracking-tight text-white/65"
                  >
                    {description}
                  </p>
                )}
              </header>
            )}

            {/* Body */}
            {children && (
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3" data-lenis-prevent>
                {children}
              </div>
            )}

            {/* Footer */}
            {footer && (
              <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-white/[0.06] px-6 py-4">
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
