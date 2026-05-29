"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import CodeMirror, { EditorView, keymap } from "@uiw/react-codemirror";
import { sql, PostgreSQL, type SQLNamespace } from "@codemirror/lang-sql";
import { getSchemaForAutocomplete } from "@/server/actions/schema";

type Props = {
  connectionId: string;
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  disabled?: boolean;
};

/**
 * CodeMirror-based SQL editor with schema-aware autocomplete.
 *
 * The schema is fetched lazily on mount via getSchemaForAutocomplete — when it
 * lands the SQL extension is rebuilt so completions know about the connected
 * DB's tables and columns. Before that lands we fall back to keyword-only
 * Postgres completion, which is still better than the old plain Textarea.
 */
export function CodeMirrorSqlEditor({
  connectionId,
  value,
  onChange,
  onRun,
  disabled,
}: Props) {
  const { resolvedTheme } = useTheme();
  const [schema, setSchema] = useState<SQLNamespace>({});

  useEffect(() => {
    let cancelled = false;
    getSchemaForAutocomplete(connectionId)
      .then((result) => {
        if (cancelled) return;
        // Shape the result for @codemirror/lang-sql: { tableName: [colNames] }
        const ns: SQLNamespace = {};
        for (const t of result.tables) {
          ns[t.name] = t.columns;
        }
        setSchema(ns);
      })
      .catch(() => {
        // Silent fallback — keyword-only completion is the worst case.
      });
    return () => {
      cancelled = true;
    };
  }, [connectionId]);

  // Build the extensions list. Re-derived when schema or onRun change so the
  // keymap closure captures the latest onRun.
  const extensions = useMemo(
    () => [
      sql({
        dialect: PostgreSQL,
        schema,
        upperCaseKeywords: true,
      }),
      keymap.of([
        {
          key: "Mod-Enter",
          preventDefault: true,
          run: () => {
            onRun();
            return true;
          },
        },
      ]),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": {
          fontSize: "12px",
          fontFamily:
            "var(--font-mono, 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace)",
          backgroundColor: "transparent",
        },
        "&.cm-focused": {
          outline: "none",
        },
        ".cm-scroller": {
          fontFamily: "inherit",
        },
        ".cm-gutters": {
          backgroundColor: "transparent",
          borderRight: "1px solid var(--border)",
          color: "var(--muted-foreground)",
        },
        ".cm-content": {
          padding: "12px 0",
        },
        ".cm-tooltip-autocomplete": {
          border: "1px solid var(--border)",
          borderRadius: "6px",
          backgroundColor: "var(--popover, var(--card))",
          boxShadow: "0 4px 20px rgb(0 0 0 / 0.15)",
        },
        ".cm-tooltip-autocomplete ul li[aria-selected]": {
          backgroundColor: "var(--accent-muted, var(--accent))",
          color: "var(--accent-foreground, var(--foreground))",
        },
      }),
    ],
    [schema, onRun]
  );

  return (
    <div
      className="rounded-md border border-border bg-card/30 overflow-hidden"
      // CodeMirror handles focus internally; make the wrapper not focusable
      // so tab key still moves into the editor body.
      tabIndex={-1}
    >
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={resolvedTheme === "light" ? "light" : "dark"}
        editable={!disabled}
        placeholder="-- Write your SQL here…"
        height="220px"
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          highlightSelectionMatches: false,
          autocompletion: true,
          closeBrackets: true,
          bracketMatching: true,
          syntaxHighlighting: true,
        }}
      />
    </div>
  );
}
