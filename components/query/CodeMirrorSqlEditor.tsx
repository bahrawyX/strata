"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import CodeMirror, {
  EditorView,
  StateEffect,
  StateField,
  Decoration,
  type DecorationSet,
  keymap,
} from "@uiw/react-codemirror";
import { sql, PostgreSQL, type SQLNamespace } from "@codemirror/lang-sql";
import { format as formatSql } from "sql-formatter";
import { getSchemaForAutocomplete } from "@/server/actions/schema";
import { statementAtCursor } from "@/lib/sql-editor-tools";

type Props = {
  connectionId: string;
  value: string;
  onChange: (v: string) => void;
  /**
   * Called with the SQL the user wants to run. If `chunk` is set, only that
   * substring was the at-cursor statement; pass it through to executeQuery
   * instead of the full buffer.
   */
  onRun: (chunk?: string) => void;
  disabled?: boolean;
  /**
   * 1-based character position of the most recent SQL error. When present,
   * we mark that character with a destructive underline + gutter chip.
   */
  errorPosition?: number | null;
};

// -- Error-marker plumbing ---------------------------------------------------
// A StateField holds a single Decoration that underlines one character
// (a "squiggle"). The setErrorPos effect mutates it.

const setErrorPos = StateEffect.define<number | null>();

const errorMarkField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(set, tr) {
    set = set.map(tr.changes);
    for (const eff of tr.effects) {
      if (eff.is(setErrorPos)) {
        if (eff.value === null || eff.value < 0) {
          set = Decoration.none;
        } else {
          const pos = Math.min(eff.value, tr.state.doc.length);
          const end = Math.min(pos + 1, tr.state.doc.length);
          set = Decoration.set([
            Decoration.mark({
              class: "cm-sql-error-marker",
              attributes: { title: "Postgres flagged an error here." },
            }).range(pos, end),
          ]);
        }
      }
    }
    return set;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/**
 * CodeMirror SQL editor with the power-user kit:
 *   - Schema-aware autocomplete (Step 5).
 *   - Mod+Enter runs the at-cursor statement, or the whole buffer if there
 *     isn't a clean split.
 *   - Mod+Shift+F formats the whole buffer (Postgres dialect) via
 *     sql-formatter. Falls back silently if the parser balks.
 *   - errorPosition prop paints a destructive underline at the offending
 *     character, cleared on next edit.
 */
export function CodeMirrorSqlEditor({
  connectionId,
  value,
  onChange,
  onRun,
  disabled,
  errorPosition,
}: Props) {
  const { resolvedTheme } = useTheme();
  const [schema, setSchema] = useState<SQLNamespace>({});
  const editorRef = useRef<{ view?: EditorView }>(null);

  useEffect(() => {
    let cancelled = false;
    getSchemaForAutocomplete(connectionId)
      .then((result) => {
        if (cancelled) return;
        const ns: SQLNamespace = {};
        for (const t of result.tables) ns[t.name] = t.columns;
        setSchema(ns);
      })
      .catch(() => {
        // Silent fallback to keyword-only.
      });
    return () => {
      cancelled = true;
    };
  }, [connectionId]);

  // Sync errorPosition changes into the editor's state field. Position is
  // 1-based in pg error messages; the StateField uses 0-based offsets.
  useEffect(() => {
    const view = editorRef.current?.view;
    if (!view) return;
    const next = errorPosition != null && errorPosition > 0
      ? errorPosition - 1
      : null;
    view.dispatch({ effects: setErrorPos.of(next) });
  }, [errorPosition]);

  const extensions = useMemo(
    () => [
      sql({
        dialect: PostgreSQL,
        schema,
        upperCaseKeywords: true,
      }),
      errorMarkField,
      keymap.of([
        {
          // Run at cursor when the buffer has multiple statements; whole
          // buffer otherwise.
          key: "Mod-Enter",
          preventDefault: true,
          run: (view) => {
            const buf = view.state.doc.toString();
            const offset = view.state.selection.main.head;
            const stmt = statementAtCursor(buf, offset);
            onRun(stmt?.text.trim() || undefined);
            return true;
          },
        },
        {
          // Format buffer (Postgres dialect). Falls back to a no-op when
          // sql-formatter can't parse — half-finished SQL is normal.
          key: "Mod-Shift-f",
          preventDefault: true,
          run: (view) => {
            const buf = view.state.doc.toString();
            try {
              const formatted = formatSql(buf, {
                language: "postgresql",
                keywordCase: "upper",
                tabWidth: 2,
              });
              if (formatted !== buf) {
                view.dispatch({
                  changes: { from: 0, to: buf.length, insert: formatted },
                });
              }
            } catch {
              // half-typed SQL — leave alone
            }
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
        "&.cm-focused": { outline: "none" },
        ".cm-scroller": { fontFamily: "inherit" },
        ".cm-gutters": {
          backgroundColor: "transparent",
          borderRight: "1px solid var(--border)",
          color: "var(--muted-foreground)",
        },
        ".cm-content": { padding: "12px 0" },
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
        // Destructive underline for the error marker.
        ".cm-sql-error-marker": {
          textDecoration: "underline wavy var(--destructive, #ef4444)",
          background: "color-mix(in srgb, var(--destructive, #ef4444) 12%, transparent)",
          borderRadius: "2px",
        },
      }),
    ],
    [schema, onRun]
  );

  return (
    <div
      className="rounded-md border border-border bg-card/30 overflow-hidden"
      tabIndex={-1}
    >
      <CodeMirror
        ref={editorRef as unknown as React.Ref<{ view?: EditorView }>}
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={resolvedTheme === "light" ? "light" : "dark"}
        editable={!disabled}
        placeholder="-- Write your SQL here…  ⇧⌘F formats it.  ⌘↩ runs the statement at your cursor."
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
