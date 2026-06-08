/**
 * Pure helpers used by the CodeMirror SQL editor:
 *   - splitStatements(): break a buffer at top-level semicolons, ignoring
 *     semicolons inside `single-quoted'`, "double-quoted" identifiers,
 *     $dollar$ tags, --line and /*block * / comments.
 *   - statementAtCursor(): find the statement covering a 0-based offset,
 *     so Mod+Enter runs only the one the user's caret is in when the
 *     buffer has many.
 *   - parseSqlErrorPosition(): pull a 1-based character offset out of a
 *     pg "ERROR: ... at position N" message (or position the libpq sends
 *     via the parsed redacted form), so the editor can underline the
 *     right token.
 */

export type Statement = {
  start: number;
  end: number;
  text: string;
  isEmpty: boolean; // only whitespace / comments
};

export function splitStatements(buffer: string): Statement[] {
  const out: Statement[] = [];
  let depthParen = 0;
  let i = 0;
  let stmtStart = 0;
  const len = buffer.length;

  while (i < len) {
    const ch = buffer[i];
    const next = buffer[i + 1];

    // --line comment
    if (ch === "-" && next === "-") {
      const nl = buffer.indexOf("\n", i + 2);
      i = nl === -1 ? len : nl + 1;
      continue;
    }
    // /* block comment */ — handles nesting like Postgres does
    if (ch === "/" && next === "*") {
      i += 2;
      let depth = 1;
      while (i < len && depth > 0) {
        if (buffer[i] === "/" && buffer[i + 1] === "*") {
          depth += 1;
          i += 2;
        } else if (buffer[i] === "*" && buffer[i + 1] === "/") {
          depth -= 1;
          i += 2;
        } else {
          i += 1;
        }
      }
      continue;
    }
    // 'single quoted' (with '' escape)
    if (ch === "'") {
      i += 1;
      while (i < len) {
        if (buffer[i] === "'") {
          if (buffer[i + 1] === "'") {
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    // "double quoted" identifier (with "" escape)
    if (ch === '"') {
      i += 1;
      while (i < len) {
        if (buffer[i] === '"') {
          if (buffer[i + 1] === '"') {
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    // $tag$ dollar-quoted string $tag$ (incl. empty-tag $$)
    if (ch === "$") {
      const tagMatch = buffer.slice(i).match(/^\$([a-zA-Z_][a-zA-Z0-9_]*)?\$/);
      if (tagMatch) {
        const tag = tagMatch[0];
        const end = buffer.indexOf(tag, i + tag.length);
        i = end === -1 ? len : end + tag.length;
        continue;
      }
    }
    if (ch === "(") depthParen += 1;
    else if (ch === ")") depthParen = Math.max(0, depthParen - 1);

    // top-level statement terminator
    if (ch === ";" && depthParen === 0) {
      pushStatement(buffer, stmtStart, i + 1, out);
      stmtStart = i + 1;
    }
    i += 1;
  }

  // trailing statement without a terminating semicolon
  if (stmtStart < len) {
    pushStatement(buffer, stmtStart, len, out);
  }
  return out;
}

function pushStatement(
  buf: string,
  start: number,
  end: number,
  out: Statement[]
) {
  const raw = buf.slice(start, end);
  const isEmpty = stripCommentsAndWhitespace(raw).length === 0;
  out.push({ start, end, text: raw, isEmpty });
}

/**
 * Strip --line + /* block * / comments, semicolons, and whitespace so we
 * can tell empty-ish statements apart from real ones for the at-cursor
 * heuristic. A buffer like `  ; ;` looks like one or more statements to
 * the splitter, but the user clearly didn't write code there — we want
 * those flagged empty.
 */
function stripCommentsAndWhitespace(s: string): string {
  return s
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/;/g, "")
    .trim();
}

/**
 * Pick the statement whose [start, end) covers `offset`. Ties (offset
 * sitting exactly on a `;`) go to the statement just before the
 * semicolon, which matches what users expect from Ctrl+Enter at the
 * end of a line.
 *
 * Returns null when the buffer only contains empty/comment statements
 * around the cursor (caller should fall back to running the whole buffer).
 */
export function statementAtCursor(
  buffer: string,
  offset: number
): Statement | null {
  const stmts = splitStatements(buffer);
  const nonEmpty = stmts.filter((s) => !s.isEmpty);
  if (nonEmpty.length === 0) return null;
  // Find the latest non-empty statement that started at or before offset.
  for (let i = nonEmpty.length - 1; i >= 0; i--) {
    if (nonEmpty[i].start <= offset) return nonEmpty[i];
  }
  return nonEmpty[0];
}

/**
 * Pull a 1-based character position out of a Postgres error message.
 * The pg driver surfaces this in two shapes:
 *   "ERROR:  syntax error at or near "..." at character 12"
 *   "syntax error at end of input"     (no position)
 *
 * Returns null when no position is present.
 */
export function parseSqlErrorPosition(message: string): number | null {
  const m = message.match(/at character (\d+)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}
