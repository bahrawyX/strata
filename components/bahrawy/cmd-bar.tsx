'use client'

/**
 * <CmdBar />  (Raycast-style command palette — Apple Design System polish)
 *
 * A two-column layout with a filterable list on the left and a live
 * preview pane on the right. Apple-y polish: vibrancy `backdrop-blur-2xl`
 * panel, 24px corner radius, multi-layer shadow, SF indigo accent,
 * Apple spring physics for layout transitions, pill kbd hints,
 * tap-scale on items.
 *
 * Open / close, search input, ↑↓ navigation, Enter to fire the
 * item's onSelect, Esc to close. Portal-mounted so it overlays
 * everything.
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CmdBarItem {
  id: string
  /** Shown in the left list. */
  label: React.ReactNode
  /** Optional secondary label (e.g. category, path) shown beside it. */
  hint?: React.ReactNode
  /** Optional icon for the left list. */
  icon?: React.ReactNode
  /** Body shown in the preview pane when this item is highlighted. */
  preview?: React.ReactNode
  /** Optional metadata pairs in the preview footer. */
  meta?: { label: string; value: React.ReactNode }[]
  /** Keywords for filtering (in addition to label + hint). */
  keywords?: string[]
  /** Fires on Enter or click. */
  onSelect?: () => void
}

export interface CmdBarGroup {
  label?: string
  items: CmdBarItem[]
}

export interface CmdBarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: CmdBarGroup[]
  /** Placeholder text in the search input. */
  placeholder?: string
  /** Empty-state copy. */
  emptyMessage?: React.ReactNode
  /** Accent color for the highlighted-row pill + Enter chip. Default SF indigo. */
  accent?: string
}

// Apple-y spring (snappy panel transitions)
const APPLE_SPRING = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.6 }
const APPLE_LAYOUT_SPRING = { type: 'spring' as const, stiffness: 480, damping: 36 }

function strFromNode(n: React.ReactNode): string {
  if (n == null || typeof n === 'boolean') return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n)
  if (Array.isArray(n)) return n.map(strFromNode).join(' ')
  if (typeof n === 'object' && 'props' in (n as { props?: unknown })) {
    return strFromNode((n as { props: { children?: React.ReactNode } }).props.children)
  }
  return ''
}

export function CmdBar({
  open,
  onOpenChange,
  groups,
  placeholder = 'Search commands…',
  emptyMessage = 'No matches.',
  accent = '#5E5CE6',
}: CmdBarProps) {
  const [query, setQuery] = React.useState('')
  const [activeIdx, setActiveIdx] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      const t = window.setTimeout(() => inputRef.current?.focus(), 30)
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        window.clearTimeout(t)
        document.body.style.overflow = original
      }
    }
  }, [open])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return groups
      .map((g) => ({
        label: g.label,
        items: g.items.filter((it) => {
          if (!q) return true
          const hay = [
            strFromNode(it.label),
            strFromNode(it.hint),
            ...(it.keywords ?? []),
          ]
            .join(' ')
            .toLowerCase()
          return hay.includes(q)
        }),
      }))
      .filter((g) => g.items.length > 0)
  }, [groups, query])

  const flat = React.useMemo(() => filtered.flatMap((g) => g.items), [filtered])

  React.useEffect(() => {
    setActiveIdx((i) => Math.max(0, Math.min(i, Math.max(0, flat.length - 1))))
  }, [flat.length])

  React.useEffect(() => {
    if (!open) return
    const el = document.getElementById(`cmd-bar-item-${activeIdx}`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIdx, open])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % Math.max(1, flat.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(
        (i) => (i - 1 + Math.max(1, flat.length)) % Math.max(1, flat.length),
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const pick = flat[activeIdx]
      if (pick) {
        pick.onSelect?.()
        onOpenChange(false)
      }
    }
  }

  if (typeof document === 'undefined') return null
  const current = flat[activeIdx]
  let runningIdx = 0

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="cmdbar-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[150] flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]"
        >
          {/* Vibrancy scrim — heavy blur like iOS notification shade */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 backdrop-blur-2xl"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.78) 100%)',
            }}
          />

          <motion.div
            key="cmdbar-panel"
            role="dialog"
            aria-modal="true"
            initial={{ y: -16, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.97 }}
            transition={APPLE_SPRING}
            className="relative isolate grid w-full max-w-3xl grid-cols-[1fr_300px] overflow-hidden rounded-[24px] border border-white/[0.08]"
            style={{
              height: 460,
              // Vibrancy panel
              background:
                'linear-gradient(180deg, rgba(36,36,40,0.82) 0%, rgba(22,22,26,0.88) 100%)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              // Multi-layer shadow with accent glow
              boxShadow: `
                0 1px 0 rgba(255,255,255,0.08) inset,
                0 0 0 0.5px rgba(255,255,255,0.06),
                0 24px 60px -12px rgba(0,0,0,0.6),
                0 48px 96px -24px rgba(0,0,0,0.4),
                0 0 120px -20px ${accent}44
              `,
            }}
          >
            {/* Left column — search + list */}
            <div className="flex min-h-0 flex-col border-r border-white/[0.06]">
              {/* Search */}
              <div className="flex items-center gap-3 border-b border-white/[0.06] px-5">
                <Search className="h-4 w-4 shrink-0 text-white/50" strokeWidth={2.25} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onInputKey}
                  placeholder={placeholder}
                  className="h-14 w-full bg-transparent text-[15px] tracking-tight text-white placeholder:text-white/40 focus:outline-none"
                />
                {query && (
                  <motion.button
                    type="button"
                    onClick={() => setQuery('')}
                    whileTap={{ scale: 0.88 }}
                    transition={APPLE_SPRING}
                    aria-label="Clear"
                    className="rounded-full border border-white/[0.08] bg-white/[0.04] p-1 text-white/55 backdrop-blur transition-colors hover:bg-white/[0.1] hover:text-white"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </motion.button>
                )}
              </div>

              {/* List */}
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto px-2 py-2"
                data-lenis-prevent
              >
                {flat.length === 0 ? (
                  <p className="px-3 py-12 text-center text-[13px] tracking-tight text-white/45">
                    {emptyMessage}
                  </p>
                ) : (
                  filtered.map((group, gi) => (
                    <div key={gi} className="mb-2 last:mb-0">
                      {group.label && (
                        <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                          {group.label}
                        </p>
                      )}
                      <ul>
                        {group.items.map((item) => {
                          const idx = runningIdx++
                          const active = idx === activeIdx
                          return (
                            <li key={item.id}>
                              <motion.button
                                id={`cmd-bar-item-${idx}`}
                                type="button"
                                onMouseEnter={() => setActiveIdx(idx)}
                                onClick={() => {
                                  item.onSelect?.()
                                  onOpenChange(false)
                                }}
                                whileTap={{ scale: 0.985 }}
                                transition={APPLE_SPRING}
                                className={cn(
                                  'group relative flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[13px] tracking-tight transition-colors',
                                  active
                                    ? 'text-white'
                                    : 'text-white/75 hover:text-white',
                                )}
                              >
                                {active && (
                                  <motion.span
                                    layoutId="cmd-bar-active"
                                    className="absolute inset-0 rounded-[10px]"
                                    style={{
                                      background: `linear-gradient(180deg, ${accent}33 0%, ${accent}22 100%)`,
                                      border: `0.5px solid ${accent}55`,
                                      boxShadow: `0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 12px -4px ${accent}55`,
                                    }}
                                    transition={APPLE_LAYOUT_SPRING}
                                  />
                                )}
                                {item.icon && (
                                  <span
                                    className={cn(
                                      'relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md [&>svg]:h-3.5 [&>svg]:w-3.5',
                                      active ? 'text-white' : 'text-white/70',
                                    )}
                                  >
                                    {item.icon}
                                  </span>
                                )}
                                <span className="relative min-w-0 flex-1 truncate font-medium">
                                  {item.label}
                                </span>
                                {item.hint && (
                                  <span className="relative shrink-0 text-[11.5px] tracking-tight text-white/40">
                                    {item.hint}
                                  </span>
                                )}
                                {active && (
                                  <motion.span
                                    initial={{ opacity: 0, x: -4 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={APPLE_SPRING}
                                    className="relative ml-1"
                                  >
                                    <Kbd>
                                      <CornerDownLeft className="h-2.5 w-2.5" strokeWidth={2.5} />
                                    </Kbd>
                                  </motion.span>
                                )}
                              </motion.button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-2.5 text-[10.5px] tracking-tight text-white/45 backdrop-blur"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 100%)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Kbd>↑↓</Kbd>
                    navigate
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Kbd>
                      <CornerDownLeft className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </Kbd>
                    select
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Kbd>esc</Kbd>
                    close
                  </span>
                </div>
                <span className="font-medium tabular-nums text-white/55">
                  {flat.length}
                </span>
              </div>
            </div>

            {/* Right column — preview pane (vibrancy inner well) */}
            <div
              className="relative flex min-h-0 flex-col"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.018) 0%, rgba(255,255,255,0.005) 100%)',
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {current ? (
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, x: 8, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -6, filter: 'blur(4px)' }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="flex h-full flex-col p-4"
                  >
                    <div className="flex items-center gap-2.5">
                      {current.icon && (
                        <span
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-white [&>svg]:h-4 [&>svg]:w-4"
                          style={{
                            background: `linear-gradient(180deg, ${accent}33 0%, ${accent}22 100%)`,
                            border: `0.5px solid ${accent}55`,
                            boxShadow: `0 1px 0 rgba(255,255,255,0.1) inset, 0 4px 12px -4px ${accent}66`,
                          }}
                        >
                          {current.icon}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[13px] font-semibold tracking-tight text-white">
                          {current.label}
                        </p>
                        {current.hint && (
                          <p className="truncate text-[11px] tracking-tight text-white/45">
                            {current.hint}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Preview body — vibrancy well */}
                    <div
                      className="mt-3 min-h-0 flex-1 overflow-auto rounded-[14px] border border-white/[0.06] p-3.5 backdrop-blur"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
                      }}
                    >
                      {current.preview ?? (
                        <p className="text-[12px] leading-relaxed tracking-tight text-white/55">
                          No additional preview for this action.
                        </p>
                      )}
                    </div>

                    {/* Meta footer */}
                    {current.meta && current.meta.length > 0 && (
                      <ul
                        className="mt-3 divide-y divide-white/[0.05] overflow-hidden rounded-[12px] border border-white/[0.06] backdrop-blur"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
                        }}
                      >
                        {current.meta.map((m, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between gap-3 px-3 py-2 text-[11px] tracking-tight"
                          >
                            <span className="text-white/45">{m.label}</span>
                            <span className="truncate font-mono text-white/80">
                              {m.value}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                ) : (
                  <div
                    key="empty"
                    className="flex h-full items-center justify-center p-6 text-center text-[12px] tracking-tight text-white/40"
                  >
                    Highlight a command to preview it.
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex h-[18px] min-w-[18px] items-center justify-center gap-0.5 rounded-[5px] border border-white/[0.1] px-1 font-mono text-[9.5px] font-medium text-white/70"
      style={{
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 1px 1px rgba(0,0,0,0.3)',
      }}
    >
      {children}
    </kbd>
  )
}
