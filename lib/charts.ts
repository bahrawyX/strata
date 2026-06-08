/**
 * Chart spec + auto-pick heuristic shared between the SQL editor's
 * "Visualize" tab and any future saved-chart serializers.
 *
 * The spec is intentionally tiny — just (xKey, yKeys[], chartType). The
 * actual rendering pulls labels + values out of the rows the query
 * returned and feeds them to the bahrawy <BarChart> / <LineChart> /
 * <DonutChart>. We don't store the data itself in the spec.
 */

export type ChartType = "bar" | "line" | "donut";

export type ChartSpec = {
  type: ChartType;
  xKey: string;
  yKeys: string[];
  /** Optional title to render above the chart. */
  title?: string;
};

export type ColumnKind = "number" | "date" | "string" | "boolean" | "other";

const NUMERIC_RE = /^-?\d+(?:[.,]\d+)?$/;
const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Inspect a column's values across the visible rows and infer a coarse
 * "kind". We look at the first non-null value — pg results are uniformly
 * typed within a column, so this is enough.
 */
export function inferColumnKind(values: unknown[]): ColumnKind {
  for (const v of values) {
    if (v === null || v === undefined) continue;
    if (typeof v === "number") return "number";
    if (typeof v === "boolean") return "boolean";
    if (v instanceof Date) return "date";
    if (typeof v === "string") {
      if (NUMERIC_RE.test(v.trim())) return "number";
      if (ISO_DATE_RE.test(v.trim())) return "date";
      return "string";
    }
    return "other";
  }
  return "other";
}

/**
 * Pick a sensible default chart from the available columns:
 *   - one date column + one or more numeric  → line   (time series)
 *   - one string column + exactly one numeric and ≤ 12 rows → donut (parts of a whole)
 *   - one string column + one or more numeric → bar    (categorical compare)
 *   - everything else                         → bar    (fallback)
 *
 * Returns null if we don't have at least one number column to plot.
 */
export function inferDefaultSpec(
  fields: { name: string }[],
  rows: Record<string, unknown>[]
): ChartSpec | null {
  if (fields.length < 2 || rows.length === 0) return null;
  const kinds: Record<string, ColumnKind> = {};
  for (const f of fields) {
    kinds[f.name] = inferColumnKind(rows.map((r) => r[f.name]));
  }
  const numberCols = fields.filter((f) => kinds[f.name] === "number");
  const dateCols = fields.filter((f) => kinds[f.name] === "date");
  const stringCols = fields.filter((f) => kinds[f.name] === "string");

  if (numberCols.length === 0) return null;

  if (dateCols.length > 0) {
    return {
      type: "line",
      xKey: dateCols[0].name,
      yKeys: numberCols.map((c) => c.name),
    };
  }
  if (stringCols.length > 0) {
    const xKey = stringCols[0].name;
    const yKeys = numberCols.map((c) => c.name);
    if (yKeys.length === 1 && rows.length <= 12) {
      return { type: "donut", xKey, yKeys };
    }
    return { type: "bar", xKey, yKeys };
  }
  // No string / date axis → just bar with row index as label.
  return {
    type: "bar",
    xKey: fields[0].name,
    yKeys: numberCols.map((c) => c.name),
  };
}

/**
 * Coerce a cell value into a number for chart aggregation. Strings that
 * look numeric get parsed; everything non-numeric becomes 0.
 */
export function toNumeric(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.trim().replace(/,/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Render a cell value as a short axis label (≤ 24 chars).
 */
export function toAxisLabel(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length > 24 ? s.slice(0, 24) + "…" : s;
}
