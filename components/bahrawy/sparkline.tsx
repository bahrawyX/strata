'use client'

/**
 * <Sparkline />
 *
 * A tiny inline SVG line chart that draws itself on mount/in-view. Pass
 * `points` (just y values) and optionally enable an area fill or highlight
 * the last point.
 */

import * as React from 'react'
import { motion, useInView } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface SparklineProps {
  /** Numeric y-values, evenly spaced on the x-axis. */
  points: number[]
  /** SVG width. Default 160. */
  width?: number
  /** SVG height. Default 40. */
  height?: number
  /** Stroke color. Default #FFFFFF. */
  color?: string
  /** Stroke width. Default 1.5. */
  strokeWidth?: number
  /** Fill the area below the line with a soft gradient. Default false. */
  fillArea?: boolean
  /** Draw a small dot at the last point. Default true. */
  showEndDot?: boolean
  /** Draw duration in seconds. Default 0.9. */
  duration?: number
  className?: string
}

export function Sparkline({
  points,
  width = 160,
  height = 40,
  color = '#FFFFFF',
  strokeWidth = 1.5,
  fillArea = false,
  showEndDot = true,
  duration = 0.9,
  className,
}: SparklineProps) {
  const ref = React.useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const gradId = React.useId().replace(/:/g, '')

  if (points.length < 2) {
    return null
  }

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step = width / (points.length - 1)

  const coords = points.map((p, i) => ({
    x: i * step,
    y: height - ((p - min) / range) * height,
  }))

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(' ')

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`

  const last = coords[coords.length - 1]

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('block', className)}
      width={width}
      height={height}
      aria-hidden
    >
      <defs>
        <linearGradient id={`spark-${gradId}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {fillArea && (
        <motion.path
          d={areaPath}
          fill={`url(#spark-${gradId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: inView ? 1 : 0 }}
          transition={{ duration: duration * 0.8, delay: duration * 0.3 }}
        />
      )}

      <motion.path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: inView ? 1 : 0 }}
        transition={{ duration, ease: [0.2, 0, 0, 1] }}
      />

      {showEndDot && (
        <motion.circle
          cx={last.x}
          cy={last.y}
          r={strokeWidth * 1.5}
          fill={color}
          initial={{ opacity: 0, scale: 0 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ type: 'spring', stiffness: 460, damping: 22, delay: duration * 0.9 }}
        />
      )}
    </svg>
  )
}
