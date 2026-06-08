'use client'

/**
 * <BarChart />
 *
 * A single-series categorical bar chart, rendered in HTML/CSS so the
 * text always renders crisp (no SVG aspect-ratio stretching). Bars
 * animate from baseline on mount with a staggered spring; hover any
 * bar to lift it slightly and reveal the value. Y-axis gridlines +
 * labels overlay the chart in the background.
 *
 * Vertical (default) or horizontal. Fills its container width.
 */

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface BarChartDatum {
  label: string
  value: number
  /** Optional per-bar color override. */
  color?: string
}

export interface BarChartProps {
  data: BarChartDatum[]
  /** Vertical (default) puts categories on the X axis. */
  orientation?: 'vertical' | 'horizontal'
  /** Chart height in px. Default 240. */
  height?: number
  /** Default bar color. Default '#A78BFA'. */
  accent?: string
  /** Show horizontal gridlines + Y-axis labels. Default true. */
  showGrid?: boolean
  /** Print the value on top of each bar. Default false. */
  showValues?: boolean
  /** Format the value (for tooltip + labels). */
  formatValue?: (v: number) => string
  /** Optional Y-axis max — if omitted, derived from the data. */
  max?: number
  className?: string
}

const SPRING = { type: 'spring' as const, stiffness: 240, damping: 28 }

export function BarChart({
  data,
  orientation = 'vertical',
  height = 240,
  accent = '#A78BFA',
  showGrid = true,
  showValues = false,
  formatValue = (v) => v.toLocaleString(),
  max,
  className,
}: BarChartProps) {
  const computedMax = max ?? Math.max(...data.map((d) => d.value), 0)
  const niceMax = niceCeil(computedMax) || 1
  const gridLines = [1, 0.75, 0.5, 0.25, 0] // top → bottom (so labels read big → small)
  const [hover, setHover] = React.useState<number | null>(null)

  if (orientation === 'horizontal') {
    return (
      <div
        className={cn(
          'w-full rounded-xl border border-white/[0.08] bg-white/[0.02] p-4',
          className,
        )}
      >
        <div className="space-y-2.5">
          {data.map((d, i) => {
            const pct = d.value / niceMax
            const color = d.color ?? accent
            const isHover = hover === i
            return (
              <div
                key={i}
                className="grid grid-cols-[88px_1fr_auto] items-center gap-3"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <span className="truncate text-[11.5px] font-medium text-white/65">
                  {d.label}
                </span>
                <div className="relative h-5 overflow-hidden rounded-md bg-white/[0.04]">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: pct }}
                    transition={{ ...SPRING, delay: i * 0.05 }}
                    className="absolute inset-0 origin-left rounded-md"
                    style={{
                      background: `linear-gradient(90deg, ${color}aa, ${color})`,
                      boxShadow: isHover ? `0 0 16px ${color}66` : undefined,
                    }}
                  />
                </div>
                <span className="w-14 text-right font-mono text-[11px] tabular-nums text-white/60">
                  {formatValue(d.value)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Vertical
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] p-4',
        className,
      )}
    >
      <div
        className={cn(
          'relative flex w-full items-stretch',
          showGrid ? 'pl-12' : 'pl-2',
        )}
        style={{ height }}
      >
        {/* Y-axis gridlines + labels (positioned absolutely behind bars) */}
        {showGrid && (
          <div className="pointer-events-none absolute inset-0">
            {gridLines.map((t, i) => (
              <div
                key={i}
                className="absolute inset-x-0 flex items-center"
                style={{ top: `${(1 - t) * 100}%`, transform: 'translateY(-50%)' }}
              >
                <span className="w-10 pr-2 text-right font-mono text-[10px] tabular-nums text-white/35">
                  {formatValue(niceMax * t)}
                </span>
                <div className="flex-1 border-t border-white/[0.06]" />
              </div>
            ))}
          </div>
        )}

        {/* Bars row */}
        <div className="relative flex flex-1 items-end gap-2 pr-1">
          {data.map((d, i) => {
            const pct = d.value / niceMax
            const color = d.color ?? accent
            const isHover = hover === i
            return (
              <div
                key={i}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className="group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-end"
              >
                {/* Value-on-top label */}
                {showValues && (
                  <span
                    className={cn(
                      'mb-1 font-mono text-[10.5px] tabular-nums transition-colors',
                      isHover ? 'text-white' : 'text-white/65',
                    )}
                  >
                    {formatValue(d.value)}
                  </span>
                )}

                {/* The bar itself */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${pct * 100}%` }}
                  transition={{ ...SPRING, delay: i * 0.05 }}
                  className="w-full max-w-[64px] rounded-t-md"
                  style={{
                    background: `linear-gradient(180deg, ${color}, ${color}aa)`,
                    boxShadow: isHover
                      ? `0 -2px 14px ${color}66, inset 0 1px 0 ${color}`
                      : undefined,
                    border: isHover ? `1px solid ${color}` : '1px solid transparent',
                    transform: isHover ? 'translateY(-2px)' : undefined,
                    transition: 'box-shadow 0.18s, transform 0.18s, border-color 0.18s',
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Category axis labels — separate row, padded to align with bars */}
      <div className={cn('mt-1.5 flex', showGrid ? 'pl-12' : 'pl-2')}>
        <div className="flex flex-1 gap-2 pr-1">
          {data.map((d, i) => {
            const isHover = hover === i
            return (
              <div
                key={i}
                className={cn(
                  'flex-1 truncate text-center text-[10.5px] transition-colors',
                  isHover ? 'text-white/85' : 'text-white/45',
                )}
              >
                {d.label}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tooltip — inline below the chart so it doesn't overflow */}
      <div className="mt-3 min-h-[24px]">
        {hover !== null && data[hover] && (
          <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px]">
            <span
              aria-hidden
              className="block h-2 w-2 rounded-full"
              style={{ background: data[hover].color ?? accent }}
            />
            <span className="font-medium text-white/85">{data[hover].label}</span>
            <span className="font-mono tabular-nums text-white/55">
              {formatValue(data[hover].value)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function niceCeil(v: number) {
  if (v <= 0) return 1
  const exp = Math.floor(Math.log10(v))
  const f = v / Math.pow(10, exp)
  let nice: number
  if (f <= 1) nice = 1
  else if (f <= 2) nice = 2
  else if (f <= 5) nice = 5
  else nice = 10
  return nice * Math.pow(10, exp)
}
