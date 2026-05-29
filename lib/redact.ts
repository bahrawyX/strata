/**
 * Hardened error-message redactor. Returned to the client; never side-channels
 * paths, internal stack frames, SQL fragments, connection strings, or
 * environment values.
 *
 * Server-side logs still get the full error via `console.error` — only the
 * value that crosses the network is filtered here.
 */

const REDACTED = "[redacted]";
const MAX_LEN = 240;

// Patterns we deliberately strip from any error returned to the client.
// Order matters: more specific / longer matches run first so they're not
// chewed up by less-specific patterns later in the pipeline.
const STRIPPERS: ReadonlyArray<[RegExp, string]> = [
  // node_modules paths — match first so the trailing .js doesn't get
  // independently stripped, leaving a bare "node_modules" behind.
  [/\bnode_modules[\w/\\.-]+/gi, REDACTED],
  // Absolute filesystem paths (POSIX + Windows)
  [/\b\/[\w./-]*\.(?:ts|tsx|js|jsx|mjs|cjs|sql|sh)\b/gi, REDACTED],
  [/\b[a-zA-Z]:\\[\w\\.-]*\.(?:ts|tsx|js|jsx|mjs|cjs|sql)\b/gi, REDACTED],
  // Postgres connection strings (anything that looks like postgresql://...)
  [/postgres(?:ql)?:\/\/[^\s"']+/gi, REDACTED],
  // Things that look like bearer tokens / API keys (long alnum-with-dashes
  // strings) — heuristic, but the false-positive risk is low for error text.
  [/\b(?:sk|sk_test|sk_live|pk|pk_test|pk_live|whsec|rk)_[A-Za-z0-9_-]{16,}/g, REDACTED],
  // Stack-trace "at " frames
  [/\s+at\s+[\w./\\:<>()$-]+(?::\d+:\d+)?/g, ""],
  // Coordinates like "(file.ts:123:45)"
  [/\([\w./\\:-]+:\d+:\d+\)/g, ""],
];

export function redactErrorMessage(input: unknown): string {
  let s: string;
  if (input instanceof Error) {
    s = input.message;
  } else if (typeof input === "string") {
    s = input;
  } else {
    return "An unexpected error occurred.";
  }
  for (const [re, repl] of STRIPPERS) {
    s = s.replace(re, repl);
  }
  s = s.replace(/\s+/g, " ").trim();
  if (s.length === 0) return "An unexpected error occurred.";
  if (s.length > MAX_LEN) s = s.slice(0, MAX_LEN - 1) + "…";
  return s;
}

/**
 * Short, action-specific message safe for the audit log `detail` column.
 * Caller passes a category and an optional raw error; the function returns
 * something like "connect: timeout" — never the raw error body.
 */
export function summarizeForAuditLog(
  category: string,
  err?: unknown
): string | null {
  if (!err) return null;
  const m = redactErrorMessage(err).toLowerCase();
  // Common pg / network failure modes — bucket them.
  if (/timeout|etimedout/.test(m)) return `${category}: timeout`;
  if (/enotfound|getaddrinfo/.test(m)) return `${category}: dns`;
  if (/econnrefused/.test(m)) return `${category}: refused`;
  if (/self.?signed|ssl|tls/.test(m)) return `${category}: tls`;
  if (/permission|denied/.test(m)) return `${category}: permission`;
  if (/authentication|password/.test(m)) return `${category}: auth`;
  if (/syntax/.test(m)) return `${category}: syntax`;
  if (/relation .* does not exist|column .* does not exist/.test(m)) {
    return `${category}: missing`;
  }
  return `${category}: error`;
}
