/**
 * Cell display + input helpers for the Strata data grid and row editor.
 *
 * The pg driver hands us JavaScript-typed values (Date, array, plain object
 * for jsonb, etc). For display we render a compact, truncated string. For
 * editing we round-trip through string form so HTML inputs and textareas
 * stay simple, and we reconstruct the native value before posting back to
 * the server action. The server's parameterized query then turns it back
 * into the right pg type.
 */

export function formatCellValue(value: unknown): {
  display: string;
  isNull: boolean;
  full: string;
} {
  if (value === null || value === undefined) {
    return { display: "NULL", isNull: true, full: "NULL" };
  }
  if (typeof value === "boolean") {
    const s = value ? "true" : "false";
    return { display: s, isNull: false, full: s };
  }
  if (value instanceof Date) {
    const s = value.toISOString();
    return { display: s, isNull: false, full: s };
  }
  if (Array.isArray(value)) {
    // Lightweight display — pg arrays of primitives come back as JS arrays.
    let s: string;
    try {
      s = "[" + value.map((v) => JSON.stringify(v)).join(", ") + "]";
    } catch {
      s = String(value);
    }
    return {
      display: s.length > 80 ? s.slice(0, 80) + "…" : s,
      isNull: false,
      full: s,
    };
  }
  if (typeof value === "object") {
    let s: string;
    try {
      s = JSON.stringify(value);
    } catch {
      s = String(value);
    }
    return {
      display: s.length > 80 ? s.slice(0, 80) + "…" : s,
      isNull: false,
      full: s,
    };
  }
  const s = String(value);
  return {
    display: s.length > 80 ? s.slice(0, 80) + "…" : s,
    isNull: false,
    full: s,
  };
}

// ---------------------------------------------------------------------------
// Type-shape detectors. pg `format_type()` returns canonical names like:
//   "text", "text[]", "integer[]", "jsonb", "jsonb[]", "interval",
//   "timestamp without time zone", "timestamp with time zone"
// We accept the canonical name AND the older internal form ("_text", "_int4")
// just in case it comes back that way.
// ---------------------------------------------------------------------------

export function isArrayType(dataType: string): boolean {
  const t = dataType.toLowerCase().trim();
  return t.endsWith("[]") || t.startsWith("_");
}

export function isJsonType(dataType: string): boolean {
  const t = dataType.toLowerCase().trim();
  return t === "json" || t === "jsonb" || t.startsWith("json") || t.startsWith("jsonb");
}

export function isIntervalType(dataType: string): boolean {
  return dataType.toLowerCase().trim().startsWith("interval");
}

export function isBooleanType(dataType: string): boolean {
  const t = dataType.toLowerCase().trim();
  return t === "boolean" || t === "bool";
}

export function isNumericType(dataType: string): boolean {
  const t = dataType.toLowerCase().trim();
  return (
    t.includes("int") ||
    t === "smallint" ||
    t === "bigint" ||
    t.includes("numeric") ||
    t.includes("decimal") ||
    t.includes("double") ||
    t.includes("real") ||
    t.includes("float")
  );
}

export function isLongTextType(dataType: string): boolean {
  const t = dataType.toLowerCase().trim();
  return t === "text" || isJsonType(t) || isArrayType(t);
}

/**
 * What kind of HTML input the row editor should render for a column. For
 * arrays / json / interval we render a textarea, so this only branches the
 * non-textarea cases.
 */
export function inputTypeFor(dataType: string): string {
  const t = dataType.toLowerCase();
  if (isBooleanType(t)) return "checkbox";
  if (isNumericType(t)) return "number";
  if (t.includes("timestamp")) return "datetime-local";
  if (t === "date") return "date";
  if (t === "time" || t.startsWith("time ")) return "time";
  return "text";
}

export function valueToInputString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 19);
  if (Array.isArray(value)) {
    // Render arrays as one element per line — keeps the editor friendly for
    // text[] of long strings without needing a heavier tag input.
    return value
      .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
      .join("\n");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

export function validateJson(raw: string): { ok: true } | { ok: false; error: string } {
  if (raw.trim() === "") return { ok: true };
  try {
    JSON.parse(raw);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid JSON";
    return { ok: false, error: msg };
  }
}

/**
 * Turn the newline-separated textarea value into a JS array. Empty lines are
 * dropped. Numeric arrays get coerced; everything else stays string-typed.
 * pg's parameterized query path handles the array binding from there.
 */
export function parseArrayInput(raw: string, elementType: string): unknown[] {
  if (raw.trim() === "") return [];
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const t = elementType.toLowerCase();
  if (isNumericType(t)) {
    return lines.map((line) => {
      const n = Number(line);
      return Number.isNaN(n) ? line : n;
    });
  }
  if (isBooleanType(t)) {
    return lines.map((line) => line === "true" || line === "1" || line === "on");
  }
  if (isJsonType(t)) {
    return lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return line;
      }
    });
  }
  return lines;
}

/**
 * Strip `[]` / leading `_` from an array data type so we can recurse on the
 * element type.
 *   "text[]"   → "text"
 *   "integer[]"→ "integer"
 *   "_int4"    → "int4"
 */
export function arrayElementType(dataType: string): string {
  const t = dataType.trim();
  if (t.endsWith("[]")) return t.slice(0, -2).trim();
  if (t.startsWith("_")) return t.slice(1);
  return t;
}

export function parseInputValue(
  raw: string,
  dataType: string,
  nullable: boolean
): unknown {
  if (raw === "" && nullable) return null;
  if (raw === "") return "";
  const t = dataType.toLowerCase();
  if (isBooleanType(t)) {
    return raw === "true" || raw === "1" || raw === "on";
  }
  if (isArrayType(t)) {
    return parseArrayInput(raw, arrayElementType(dataType));
  }
  if (isNumericType(t)) {
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  }
  if (isJsonType(t)) {
    try {
      return JSON.parse(raw);
    } catch {
      // If the user posts invalid JSON we send the raw string anyway —
      // Postgres will reject it and the redacted error will explain.
      return raw;
    }
  }
  return raw;
}
