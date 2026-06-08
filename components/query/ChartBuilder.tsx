"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { BarChart3, ChevronDown, LineChart as LineIcon, PieChart } from "lucide-react";
import { BarChart, type BarChartDatum } from "@/components/bahrawy/bar-chart";
import { LineChart, type LineChartDatum } from "@/components/bahrawy/line-chart";
import { DonutChart, type DonutChartDatum } from "@/components/bahrawy/donut-chart";
import {
  inferColumnKind,
  inferDefaultSpec,
  toAxisLabel,
  toNumeric,
  type ChartSpec,
  type ChartType,
} from "@/lib/charts";
import { cn } from "@/lib/utils";

type Props = {
  fields: { name: string }[];
  rows: Record<string, unknown>[];
};

const CHART_TYPES: { value: ChartType; label: string; Icon: typeof BarChart3 }[] = [
  { value: "bar", label: "Bar", Icon: BarChart3 },
  { value: "line", label: "Line", Icon: LineIcon },
  { value: "donut", label: "Donut", Icon: PieChart },
];

export function ChartBuilder({ fields, rows }: Props) {
  const initial = useMemo(() => inferDefaultSpec(fields, rows), [fields, rows]);
  const [spec, setSpec] = useState<ChartSpec | null>(initial);

  // Reset the spec whenever a fresh result lands.
  useEffect(() => {
    setSpec(initial);
  }, [initial]);

  // Pre-compute column kinds once so the axis dropdowns can show typed
  // chips ("number", "date", "string") without re-scanning per render.
  const kinds = useMemo(() => {
    const out: Record<string, ReturnType<typeof inferColumnKind>> = {};
    for (const f of fields) {
      out[f.name] = inferColumnKind(rows.map((r) => r[f.name]));
    }
    return out;
  }, [fields, rows]);

  if (!initial || !spec) {
    return (
      <div className="grid h-full place-items-center p-12 text-center text-sm text-muted-foreground">
        <div>
          <p>This result can&apos;t be visualized.</p>
          <p className="mt-1 text-xs">
            Need at least one numeric column to plot. Try selecting an
            aggregate like <span className="font-mono">count(*)</span>.
          </p>
        </div>
      </div>
    );
  }

  const yKey = spec.yKeys[0];
  const chartData = rows.slice(0, 200); // keep the rendered series small

  return (
    <motion.div
      className="flex h-full min-h-0 flex-col"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card/40 px-6 py-3">
        <div className="inline-flex rounded-md border border-border bg-card p-0.5">
          {CHART_TYPES.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSpec({ ...spec, type: value })}
              aria-pressed={spec.type === value}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-[12px] font-medium transition-colors",
                spec.type === value
                  ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                  : "text-muted-foreground hover:bg-[var(--bg-elevated)] hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <AxisPicker
          label={spec.type === "donut" ? "Slice by" : "X axis"}
          value={spec.xKey}
          fields={fields}
          kinds={kinds}
          onChange={(name) => setSpec({ ...spec, xKey: name })}
        />
        <AxisPicker
          label={spec.type === "donut" ? "Value" : "Y axis"}
          value={yKey}
          fields={fields.filter((f) => kinds[f.name] === "number")}
          kinds={kinds}
          onChange={(name) => setSpec({ ...spec, yKeys: [name] })}
          numericOnly
        />

        <span className="ml-auto text-[11px] text-muted-foreground">
          {chartData.length === rows.length
            ? `${rows.length} rows`
            : `Showing first ${chartData.length} of ${rows.length} rows`}
        </span>
      </div>

      {/* Chart area */}
      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin p-6">
        {spec.type === "bar" && (
          <BarChart
            data={chartData.map<BarChartDatum>((r) => ({
              label: toAxisLabel(r[spec.xKey]),
              value: toNumeric(r[yKey]),
            }))}
            accent="var(--accent, #5E5CE6)"
            height={Math.max(280, chartData.length * 24)}
            showValues={chartData.length <= 14}
            orientation={chartData.length > 14 ? "horizontal" : "vertical"}
          />
        )}
        {spec.type === "line" && (
          <LineChart
            data={chartData.map<LineChartDatum>((r) => ({
              label: toAxisLabel(r[spec.xKey]),
              value: toNumeric(r[yKey]),
            }))}
            accent="var(--accent, #5E5CE6)"
            height={320}
            smooth
            fill
            showDots={chartData.length <= 24}
          />
        )}
        {spec.type === "donut" && (
          <div className="flex flex-col items-center">
            <DonutChart
              data={chartData.slice(0, 12).map<DonutChartDatum>((r) => ({
                label: toAxisLabel(r[spec.xKey]),
                value: toNumeric(r[yKey]),
              }))}
              size={280}
              thickness={32}
              showLegend
            />
            {chartData.length > 12 && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                + {chartData.length - 12} more slices hidden — try grouping in
                SQL.
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AxisPicker({
  label,
  value,
  fields,
  kinds,
  onChange,
  numericOnly,
}: {
  label: string;
  value: string;
  fields: { name: string }[];
  kinds: Record<string, ReturnType<typeof inferColumnKind>>;
  onChange: (name: string) => void;
  numericOnly?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
      <span>{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none rounded-md border border-border bg-card px-3 py-1.5 pr-7 text-[12px] font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
        >
          {fields.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name} · {kinds[f.name] ?? "other"}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
      </div>
      {numericOnly && fields.length === 0 && (
        <span className="text-[10px] text-destructive">
          No numeric columns
        </span>
      )}
    </label>
  );
}
