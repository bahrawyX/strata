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

export function inputTypeFor(dataType: string): string {
  const t = dataType.toLowerCase();
  if (t.includes("int") || t === "smallint" || t === "bigint") return "number";
  if (
    t.includes("numeric") ||
    t.includes("decimal") ||
    t.includes("double") ||
    t.includes("real") ||
    t.includes("float")
  )
    return "number";
  if (t.includes("timestamp")) return "datetime-local";
  if (t === "date") return "date";
  if (t === "time" || t.startsWith("time ")) return "time";
  if (t === "boolean" || t === "bool") return "checkbox";
  return "text";
}

export function valueToInputString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 19);
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function parseInputValue(
  raw: string,
  dataType: string,
  nullable: boolean
): unknown {
  if (raw === "" && nullable) return null;
  if (raw === "") return "";
  const t = dataType.toLowerCase();
  if (t === "boolean" || t === "bool") {
    return raw === "true" || raw === "1" || raw === "on";
  }
  if (
    t.includes("int") ||
    t === "smallint" ||
    t === "bigint" ||
    t.includes("numeric") ||
    t.includes("decimal") ||
    t.includes("double") ||
    t.includes("real") ||
    t.includes("float")
  ) {
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  }
  if (
    t === "json" ||
    t === "jsonb" ||
    t.startsWith("json") ||
    t.startsWith("jsonb")
  ) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}
