/**
 * Read-only mode + destructive-SQL detection.
 *
 * Used by all server actions that can mutate a connected database:
 *   - executeQuery (when the SQL is non-SELECT)
 *   - insertRow / updateRow / deleteRow
 *
 * The check is intentionally simple — we look at the leading keyword on
 * the buffer after stripping a leading "--" comment line. This is not a
 * full SQL parser; the goal is to refuse the obvious cases. Anyone
 * trying to bypass via creative comment placement gets the DB's actual
 * error if the connection is also read-only at the pg level (we don't
 * yet enforce a read-only role automatically).
 */

const DESTRUCTIVE_KEYWORDS = new Set([
  "INSERT",
  "UPDATE",
  "DELETE",
  "TRUNCATE",
  "DROP",
  "ALTER",
  "CREATE",
  "RENAME",
  "GRANT",
  "REVOKE",
  "COPY",
  "MERGE",
  "REINDEX",
  "VACUUM",
  "CLUSTER",
  "REFRESH",
  "CALL",
  "DO",
]);

/**
 * Return the first SQL keyword in upper case, ignoring leading whitespace
 * and `-- comment` lines. Empty string for a buffer that has nothing
 * resembling a keyword.
 */
export function firstSqlKeyword(query: string): string {
  const lines = query.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("--")) continue;
    const match = trimmed.match(/^([a-zA-Z_]+)/);
    return match ? match[1].toUpperCase() : "";
  }
  return "";
}

export function isDestructiveSql(query: string): boolean {
  const kw = firstSqlKeyword(query);
  return DESTRUCTIVE_KEYWORDS.has(kw);
}

/**
 * The standardized refusal message — kept consistent so users learn it.
 */
export const READ_ONLY_REFUSAL =
  "Connection is read-only. Toggle it off in the connection settings before running a write.";
