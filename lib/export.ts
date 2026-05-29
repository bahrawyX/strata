/**
 * Result-set serializers for the Step 11 download buttons.
 *
 * Both formats render the exact value the pg driver hands us:
 *   - null  → empty cell (CSV) / null (JSON)
 *   - Date  → ISO 8601 (toISOString)
 *   - object / array → JSON string (CSV) / native value (JSON)
 *   - boolean → "true"/"false" / native value
 *
 * Done in plain JS, no streaming. Caller is expected to keep the row count
 * in the rough single-MB range — the export server action enforces that
 * upstream by capping the SQL `LIMIT` it applies on a re-run.
 */

export type ExportField = { name: string };
export type ExportRow = Record<string, unknown>;

// ---------------------------------------------------------------------------
// CSV — RFC 4180. Cells get quoted iff they contain a delimiter, quote, or
// newline; embedded quotes are doubled. Line terminator is CRLF. No BOM by
// default (Excel users can paste-import or open via Data → From Text).
// ---------------------------------------------------------------------------

const CRLF = "\r\n";

function cellToCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (value instanceof Date) {
    s = value.toISOString();
  } else if (typeof value === "boolean") {
    s = value ? "true" : "false";
  } else if (typeof value === "object") {
    try {
      s = JSON.stringify(value);
    } catch {
      s = String(value);
    }
  } else {
    s = String(value);
  }
  // Quote iff the cell contains a delimiter / quote / line break.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(fields: ExportField[], rows: ExportRow[]): string {
  const lines: string[] = [];
  lines.push(fields.map((f) => cellToCsv(f.name)).join(","));
  for (const row of rows) {
    lines.push(fields.map((f) => cellToCsv(row[f.name])).join(","));
  }
  return lines.join(CRLF) + CRLF;
}

// ---------------------------------------------------------------------------
// JSON — array of objects. Dates → ISO strings. Everything else passes
// through unchanged so the consumer can re-parse jsonb objects + arrays
// without a second pass.
// ---------------------------------------------------------------------------

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function toJson(fields: ExportField[], rows: ExportRow[]): string {
  // Project rows to the column order — keeps the JSON output deterministic
  // and matches what the user saw in the grid.
  const ordered = rows.map((r) => {
    const out: ExportRow = {};
    for (const f of fields) {
      out[f.name] = r[f.name];
    }
    return out;
  });
  return JSON.stringify(ordered, jsonReplacer, 2);
}

// ---------------------------------------------------------------------------
// MIME + filename helpers used by the export server action and the client
// download button.
// ---------------------------------------------------------------------------

export type ExportFormat = "csv" | "json";

export function mimeFor(format: ExportFormat): string {
  return format === "csv" ? "text/csv; charset=utf-8" : "application/json";
}

export function exportFilename(
  base: string,
  format: ExportFormat,
  timestamp: Date = new Date()
): string {
  const safe = base
    .replace(/[^a-zA-Z0-9_.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    || "export";
  const stamp = timestamp.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${safe}-${stamp}.${format}`;
}
