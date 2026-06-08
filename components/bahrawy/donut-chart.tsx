'use client'

/**
 * <DonutChart />  —  refined Apple-style donut chart.
 *
 * Each slice is a full-circumference circle stroke with a fixed
 * dashoffset positioning it at the right angle, and a dasharray
 * that animates from `0 C` to `arc C-arc` so the slice draws in
 * clockwise. On hover, the slice translates outward along its
 * midpoint vector (correctly compensated for the group's -90°
 * rotation) and a vibrancy tooltip pops up.
 *
 * Apple aesthetics: refined SF palette, NO neon glows / SVG blur
 * filters / accent-colored shadows. Minimal hairline strokes on
 * legend rows, vibrancy chrome only — the chart should read as
 * Apple Numbers, not a gaming dashboard.
 */

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface DonutChartDatum {
  label: string
  value: number
  color?: string
}

export interface DonutChartProps {
  data: DonutChartDatum[]
  /** Outer size in px. Default 240. */
  size?: number
  /** Stroke thickness (ring width). Default 28. */
  thickness?: number
  /** Show the per-slice legend grid below. Default true. */
  showLegend?: boolean
  /** Show tooltip on hover. Default true. */
  showTooltip?: boolean
  /** Optional center label (e.g. "$1,000"). */
  centerLabel?: React.ReactNode
  /** Optional second line under center label. */
  centerSubLabel?: React.ReactNode
  /** Format the displayed value (legend + tooltip). */
  format?: (value: number) => string
  className?: string
}

// Refined SF palette — vivid but flat (no glow). Override per-slice.
const SF_PALETTE = [
  '#5E5CE6', // indigo
  '#FF9F0A', // amber
  '#30D158', // green
  '#0A84FF', // blue
  '#FF6FA8', // soft pink
  '#BF5AF2', // purple
  '#FFD60A', // yellow
  '#8E8E93', // neutral gray
]

const EASE = [0.22, 1, 0.36, 1] as const

function defaultFmt(v: number) {
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + 'k'
  return Math.round(v).toLocaleString()
}

export function DonutChart({
  data,
  size = 240,
  thickness = 28,
  showLegend = true,
  showTooltip = true,
  centerLabel,
  centerSubLabel,
  format = defaultFmt,
  className,
}: DonutChartProps) {
  const [hover, setHover] = React.useState<number | null>(null)

  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - thickness / 2
  const C = 2 * Math.PI * radius

  // Pre-compute cumulative + per-slice metrics.
  const slices = React.useMemo(() => {
    let cum = 0
    return data.map((d, i) => {
      const v = Math.max(0, d.value)
      const fraction = v / total
      const cumStart = cum
      cum += fraction
      const arcLen = C * fraction
      const offset = -C * cumStart
      const midFraction = cumStart + fraction / 2
      // In-group angle (no offset needed — the group itself is rotated -90°,
      // so the translation inside the group is already in the rotated frame).
      const angle = midFraction * 2 * Math.PI
      const color = d.color ?? SF_PALETTE[i % SF_PALETTE.length]
      return { ...d, color, fraction, arcLen, offset, angle, percent: fraction * 100 }
    })
  }, [data, C, total])

  const liftPx = 5
  const hoverDatum = hover != null ? slices[hover] : null

  return (
    <div className={cn('inline-flex flex-col items-center gap-5', className)}>
      <div
        className="relative"
        style={{ width: size, height: size }}
        onPointerLeave={() => setHover(null)}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Slices are rendered into a single rotated group. We sort
              so the hovered slice paints LAST → it sits on top of its
              neighbours when we fatten the stroke. */}
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {slices
              .map((s, i) => ({ s, i }))
              .sort((a, b) => (hover === a.i ? 1 : hover === b.i ? -1 : 0))
              .map(({ s, i }) => {
                const lifted = hover === i
                const dx = lifted ? Math.cos(s.angle) * liftPx : 0
                const dy = lifted ? Math.sin(s.angle) * liftPx : 0
                // Fatten the stroke on hover so the slice visibly thickens
                // outward + inward, not just translates.
                const w = lifted ? thickness * 1.18 : thickness
                return (
                  <motion.circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke={s.color}
                    strokeLinecap="butt"
                    strokeDashoffset={s.offset}
                    initial={{ strokeDasharray: `0 ${C}`, strokeWidth: thickness }}
                    animate={{
                      strokeDasharray: `${s.arcLen} ${C - s.arcLen}`,
                      strokeWidth: w,
                      x: dx,
                      y: dy,
                    }}
                    transition={{
                      strokeDasharray: { duration: 0.95, delay: 0.12 + i * 0.09, ease: EASE },
                      strokeWidth: { type: 'spring', stiffness: 460, damping: 32 },
                      x: { type: 'spring', stiffness: 420, damping: 32 },
                      y: { type: 'spring', stiffness: 420, damping: 32 },
                    }}
                    onPointerEnter={() => showTooltip && setHover(i)}
                    style={{ cursor: showTooltip ? 'pointer' : 'default' }}
                  />
                )
              })}
          </g>
        </svg>

        {/* Center label */}
        {(centerLabel || centerSubLabel) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerLabel && (
              <p className="font-display text-[24px] font-semibold tracking-tight text-white">
                {centerLabel}
              </p>
            )}
            {centerSubLabel && (
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">
                {centerSubLabel}
              </p>
            )}
          </div>
        )}

        {/* Tooltip — refined, no neon */}
        <AnimatePresence>
          {showTooltip && hoverDatum && (
            <motion.div
              key={hover}
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 480, damping: 32, mass: 0.5 }}
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-[10px] border border-white/[0.08] px-2.5 py-1.5 text-center backdrop-blur-xl"
              style={{
                top: 0,
                background:
                  'linear-gradient(180deg, rgba(36,36,40,0.88) 0%, rgba(22,22,26,0.92) 100%)',
                boxShadow:
                  '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 20px -8px rgba(0,0,0,0.55)',
              }}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: hoverDatum.color }}
                />
                <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/55">
                  {hoverDatum.label}
                </p>
              </div>
              <p className="mt-0.5 font-display text-[14px] font-semibold tabular-nums tracking-tight text-white">
                {format(hoverDatum.value)}
                <span className="ml-1 font-mono text-[10.5px] font-normal text-white/45">
                  {hoverDatum.percent.toFixed(1)}%
                </span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend — flat color chips, no glow */}
      {showLegend && (
        <ul className="grid w-full max-w-[280px] gap-1">
          {slices.map((s, i) => (
            <li
              key={i}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              className={cn(
                'flex cursor-default items-center justify-between gap-3 rounded-[8px] px-2 py-1.5 transition-colors',
                hover === i ? 'bg-white/[0.04]' : 'hover:bg-white/[0.025]',
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="truncate text-[12px] font-medium tracking-tight text-white/80">
                  {s.label}
                </span>
              </div>
              <div className="flex shrink-0 items-baseline gap-1.5">
                <span className="font-mono text-[12px] font-medium tabular-nums text-white/90">
                  {format(s.value)}
                </span>
                <span className="font-mono text-[10.5px] tabular-nums text-white/45">
                  {s.percent.toFixed(0)}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
