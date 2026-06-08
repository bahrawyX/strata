'use client'

/**
 * <LineChart />  —  Stripe/Linear-style smooth line chart.
 *
 * A single-series line chart drawn with a Catmull-Rom-to-bezier
 * smoothed SVG path, an accent-colored gradient fill underneath,
 * an animated stroke-length entrance, optional axes + grid + dots,
 * and a hover crosshair with a vibrancy tooltip pinned to the
 * nearest data point.
 *
 * All animation uses Framer Motion's pathLength so we don't have
 * to measure the path manually — Framer handles it.
 *
 * Apple aesthetics: SF-style tooltip with vibrancy backdrop, thin
 * hairline grid, pulsing accent dot on hover, smooth easing.
 */

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface LineChartDatum {
  label: string
  value: number
}

export interface LineChartProps {
  data: LineChartDatum[]
  /** Width of the SVG. The chart is responsive — width is internal viewBox unit. Default 640. */
  width?: number
  /** Height of the SVG (viewBox units). Default 240. */
  height?: number
  /** Accent color for line + fill + dot. Default SF indigo. */
  accent?: string
  /** Draw horizontal gridlines. Default true. */
  showGrid?: boolean
  /** Draw Y-axis labels + X-axis labels. Default true. */
  showAxis?: boolean
  /** Always render a dot at every data point (vs only on hover). Default false. */
  showDots?: boolean
  /** Use smooth bezier interpolation (vs straight polyline). Default true. */
  smooth?: boolean
  /** Render gradient fill under the line. Default true. */
  fill?: boolean
  /** Format a value for tooltip + Y-axis labels. */
  format?: (value: number) => string
  /** Tooltip suffix appended to the formatted value (e.g. " users"). */
  valueSuffix?: string
  /** className applied to the outer wrapper. */
  className?: string
}

// ---- maths ---------------------------------------------------------------

function niceStep(range: number) {
  const exp = Math.floor(Math.log10(Math.max(range, 1e-9)))
  const frac = range / Math.pow(10, exp)
  let n
  if (frac <= 1) n = 1
  else if (frac <= 2) n = 2
  else if (frac <= 5) n = 5
  else n = 10
  return n * Math.pow(10, exp)
}

function niceTicks(min: number, max: number, count = 4) {
  const range = max - min
  if (range === 0) return { ticks: [min], min, max: min + 1, step: 1 }
  const step = niceStep(range / Math.max(1, count - 1))
  const nMin = Math.floor(min / step) * step
  const nMax = Math.ceil(max / step) * step
  const out: number[] = []
  for (let v = nMin; v <= nMax + step / 2; v += step) {
    out.push(Number(v.toFixed(10)))
  }
  return { ticks: out, min: nMin, max: nMax, step }
}

function smoothPath(points: { x: number; y: number }[], tension = 0.5) {
  if (points.length < 2) return ''
  let d = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? points[i + 1]
    const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3
    const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3
    const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3
    const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d
}

function linePath(points: { x: number; y: number }[]) {
  if (!points.length) return ''
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
}

function defaultFmt(v: number) {
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + 'k'
  return Math.round(v).toLocaleString()
}

// ---- component -----------------------------------------------------------

export function LineChart({
  data,
  width = 640,
  height = 240,
  accent = '#5E5CE6',
  showGrid = true,
  showAxis = true,
  showDots = false,
  smooth = true,
  fill = true,
  format = defaultFmt,
  valueSuffix = '',
  className,
}: LineChartProps) {
  const reactId = React.useId().replace(/[^a-zA-Z0-9]/g, '')
  const fillId = `lc-fill-${reactId}`
  const glowId = `lc-glow-${reactId}`

  // Layout: padding for axis labels
  const padL = showAxis ? 44 : 8
  const padR = 12
  const padT = 14
  const padB = showAxis ? 30 : 8
  const plotW = Math.max(10, width - padL - padR)
  const plotH = Math.max(10, height - padT - padB)

  // Y-axis ticks (niced)
  const min = Math.min(...data.map((d) => d.value))
  const max = Math.max(...data.map((d) => d.value))
  const { ticks, min: yMin, max: yMax } = React.useMemo(
    () => niceTicks(min, max, 4),
    [min, max],
  )

  // Plot points (in plot-area coords)
  const points = React.useMemo(() => {
    return data.map((d, i) => {
      const x =
        data.length === 1
          ? plotW / 2
          : (i / (data.length - 1)) * plotW
      const y = plotH - ((d.value - yMin) / Math.max(0.0001, yMax - yMin)) * plotH
      return { x, y }
    })
  }, [data, plotW, plotH, yMin, yMax])

  const path = React.useMemo(
    () => (smooth ? smoothPath(points) : linePath(points)),
    [smooth, points],
  )
  const areaPath = React.useMemo(() => {
    if (!points.length) return ''
    return `${path} L${points[points.length - 1].x},${plotH} L${points[0].x},${plotH} Z`
  }, [path, points, plotH])

  // Hover
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null)

  const onMove = (e: React.PointerEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    // Map client x → SVG viewBox x → plot x
    const ratio = width / rect.width
    const svgX = (e.clientX - rect.left) * ratio
    const plotX = svgX - padL
    if (plotX < -8 || plotX > plotW + 8) {
      setHoverIdx(null)
      return
    }
    // Find nearest point index
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - plotX)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    setHoverIdx(best)
  }
  const onLeave = () => setHoverIdx(null)

  const hover = hoverIdx != null ? points[hoverIdx] : null
  const hoverDatum = hoverIdx != null ? data[hoverIdx] : null

  // Tooltip positioning (in % of width so it stays correct after responsive scale)
  const tooltipLeftPct = hover ? ((padL + hover.x) / width) * 100 : 0
  const tooltipTopPct = hover ? ((padT + hover.y) / height) * 100 : 0

  return (
    <div
      ref={wrapRef}
      className={cn('relative w-full select-none', className)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block w-full"
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.32} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${padL}, ${padT})`}>
          {/* Gridlines + Y-axis labels */}
          {showGrid &&
            ticks.map((tv, i) => {
              const y = plotH - ((tv - yMin) / Math.max(0.0001, yMax - yMin)) * plotH
              return (
                <g key={i}>
                  <line
                    x1={0}
                    x2={plotW}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="2 4"
                    strokeWidth={1}
                  />
                </g>
              )
            })}

          {/* Fill area */}
          {fill && areaPath && (
            <motion.path
              d={areaPath}
              fill={`url(#${fillId})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
          )}

          {/* Line — animated pathLength entrance */}
          {path && (
            <motion.path
              d={path}
              fill="none"
              stroke={accent}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${glowId})`}
              initial={{ pathLength: 0, opacity: 0.6 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
            />
          )}

          {/* Always-on dots */}
          {showDots &&
            points.map((p, i) => (
              <motion.circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3}
                fill={accent}
                stroke="rgba(10,10,12,0.95)"
                strokeWidth={1.5}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.4,
                  delay: 0.4 + i * 0.04,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            ))}

          {/* Hover crosshair + accent dot */}
          {hover && (
            <g>
              <line
                x1={hover.x}
                x2={hover.x}
                y1={0}
                y2={plotH}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle
                cx={hover.x}
                cy={hover.y}
                r={9}
                fill={accent}
                opacity={0.18}
              />
              <circle
                cx={hover.x}
                cy={hover.y}
                r={4.5}
                fill={accent}
                stroke="rgba(10,10,12,0.95)"
                strokeWidth={2}
              />
            </g>
          )}

          {/* X-axis labels */}
          {showAxis &&
            data.map((d, i) => {
              const x =
                data.length === 1
                  ? plotW / 2
                  : (i / (data.length - 1)) * plotW
              return (
                <text
                  key={i}
                  x={x}
                  y={plotH + 18}
                  textAnchor="middle"
                  className="fill-white/40"
                  style={{ font: '500 10.5px/1 ui-sans-serif, system-ui' }}
                >
                  {d.label}
                </text>
              )
            })}
        </g>

        {/* Y-axis labels (left of plot area) */}
        {showAxis &&
          ticks.map((tv, i) => {
            const y = padT + plotH - ((tv - yMin) / Math.max(0.0001, yMax - yMin)) * plotH
            return (
              <text
                key={i}
                x={padL - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-white/40"
                style={{ font: '500 10.5px/1 ui-sans-serif, system-ui' }}
              >
                {format(tv)}
              </text>
            )
          })}
      </svg>

      {/* Tooltip — vibrancy pill */}
      <AnimatePresence>
        {hover && hoverDatum && (
          <motion.div
            key={hoverIdx}
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 480, damping: 32, mass: 0.5 }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-[10px] border border-white/[0.08] px-2.5 py-1.5 text-center backdrop-blur-xl"
            style={{
              left: `${tooltipLeftPct}%`,
              top: `${tooltipTopPct}%`,
              background:
                'linear-gradient(180deg, rgba(36,36,40,0.88) 0%, rgba(22,22,26,0.92) 100%)',
              boxShadow:
                '0 1px 0 rgba(255,255,255,0.08) inset, 0 0 0 0.5px rgba(255,255,255,0.05), 0 10px 24px -10px rgba(0,0,0,0.6)',
            }}
          >
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/45">
              {hoverDatum.label}
            </p>
            <p
              className="mt-0.5 font-display text-[13px] font-semibold tabular-nums tracking-tight"
              style={{ color: accent }}
            >
              {format(hoverDatum.value)}
              {valueSuffix && (
                <span className="ml-0.5 text-white/45">{valueSuffix}</span>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
