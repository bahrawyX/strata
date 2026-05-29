'use client'

/**
 * <StatusPill />
 *
 * Compact status badge with an optional pulsing dot. Five built-in intents
 * (online, away, busy, offline, error) plus 'custom' that lets you pass a
 * color.
 */

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type StatusPillIntent =
  | 'online'
  | 'away'
  | 'busy'
  | 'offline'
  | 'error'
  | 'custom'

export interface StatusPillProps {
  children: React.ReactNode
  intent?: StatusPillIntent
  /** Color used when intent is 'custom'. */
  color?: string
  /** Show the pulsing dot. Default true. */
  dot?: boolean
  /** Pulse the dot. Default true. */
  pulse?: boolean
  /** Size of the pill. */
  size?: 'sm' | 'md'
  className?: string
}

const INTENT_COLORS: Record<Exclude<StatusPillIntent, 'custom'>, string> = {
  online: '#10B981',
  away: '#F59E0B',
  busy: '#EF4444',
  offline: '#6B7280',
  error: '#EF4444',
}

export function StatusPill({
  children,
  intent = 'online',
  color,
  dot = true,
  pulse = true,
  size = 'sm',
  className,
}: StatusPillProps) {
  const finalColor =
    intent === 'custom' ? (color ?? '#FFFFFF') : INTENT_COLORS[intent]

  const padding = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
  const dotSize = size === 'sm' ? 6 : 8

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium tabular-nums',
        padding,
        className,
      )}
      style={{
        background: `${finalColor}22`,
        color: finalColor,
        boxShadow: `inset 0 0 0 1px ${finalColor}33`,
      }}
    >
      {dot && (
        <span
          aria-hidden
          className="relative inline-flex shrink-0"
          style={{ width: dotSize, height: dotSize }}
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: finalColor }}
          />
          {pulse && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{ background: finalColor }}
              animate={{ scale: [1, 2.2, 1], opacity: [0.5, 0, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </span>
      )}
      <span className="leading-none">{children}</span>
    </span>
  )
}
