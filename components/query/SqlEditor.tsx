"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  BarChart3,
  Loader2,
  Play,
  Save,
  Table,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { executeQuery, type QueryResult } from "@/server/actions/query";
import { formatCellValue } from "@/components/table/cell-utils";
import { CopilotPanel } from "./CopilotPanel";
import { CodeMirrorSqlEditor } from "./CodeMirrorSqlEditor";
import { SaveQueryDialog } from "./SaveQueryDialog";
import { ExportButton } from "./ExportButton";
import { ChartBuilder } from "./ChartBuilder";

export function SqlEditor({
  connectionId,
  initialQuery,
}: {
  connectionId: string;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, startTransition] = useTransition();
  const [saveOpen, setSaveOpen] = useState(false);
  const [resultView, setResultView] = useState<"grid" | "chart">("grid");

  // Hold the latest query in a ref so the editor's onRun (which captures the
  // closure at mount) sees the up-to-date value when Ctrl/Cmd+Enter fires.
  const queryRef = useRef(query);
  queryRef.current = query;
  const runningRef = useRef(running);
  runningRef.current = running;

  const runQuery = useCallback(() => {
    const q = queryRef.current;
    if (!q.trim() || runningRef.current) return;
    setError(null);
    startTransition(async () => {
      const res = await executeQuery({ connectionId, query: q });
      if ("error" in res) {
        setError(res.error);
        setResult(null);
        return;
      }
      setResult(res.data);
    });
  }, [connectionId]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-base font-medium">SQL editor</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Press{" "}
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono">
            Ctrl
          </kbd>
          {" + "}
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono">
            Enter
          </kbd>{" "}
          to run. Queries time out after 30 seconds.
        </p>
      </div>

      <CopilotPanel
        connectionId={connectionId}
        onInsert={(sql) =>
          setQuery((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${sql}` : sql))
        }
        onReplace={(sql) => setQuery(sql)}
      />

      <div className="p-6 border-b border-border">
        <CodeMirrorSqlEditor
          connectionId={connectionId}
          value={query}
          onChange={setQuery}
          onRun={runQuery}
          disabled={running}
        />
        <div className="mt-3 flex items-center gap-3">
          <Button size="sm" onClick={runQuery} disabled={running || !query.trim()}>
            {running ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Running…
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Run query
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSaveOpen(true)}
            disabled={!query.trim() || running}
            title="Save this query to the sidebar"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
          {result && (
            <span className="text-xs text-muted-foreground">
              {result.rowCount} row{result.rowCount === 1 ? "" : "s"}{" "}
              {result.command ? `· ${result.command}` : ""} ·{" "}
              {result.executionTimeMs}ms
            </span>
          )}
          {result && result.fields.length > 0 && result.rows.length > 0 && (
            <div className="ml-auto">
              <ExportButton
                source={{
                  kind: "local",
                  baseName: "query-result",
                  fields: result.fields.map((f) => ({ name: f.name })),
                  rows: result.rows,
                }}
              />
            </div>
          )}
        </div>
      </div>

      <SaveQueryDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        connectionId={connectionId}
        query={query}
      />

      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        {error && (
          <div className="m-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-destructive">
                  Query error
                </h3>
                <p className="mt-1 text-xs text-destructive/90 font-mono">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {result && !error && (
          <div className="flex h-full min-h-0 flex-col">
            {result.fields.length > 0 && result.rows.length > 0 && (
              <div className="flex items-center gap-1 border-b border-border bg-card/40 px-6 py-2">
                <ResultTabButton
                  active={resultView === "grid"}
                  onClick={() => setResultView("grid")}
                  icon={<Table className="h-3.5 w-3.5" />}
                  label="Table"
                />
                <ResultTabButton
                  active={resultView === "chart"}
                  onClick={() => setResultView("chart")}
                  icon={<BarChart3 className="h-3.5 w-3.5" />}
                  label="Visualize"
                />
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
              {resultView === "grid" ? (
                <ResultGrid result={result} />
              ) : (
                <ChartBuilder
                  fields={result.fields.map((f) => ({ name: f.name }))}
                  rows={result.rows}
                />
              )}
            </div>
          </div>
        )}

        {!result && !error && (
          <div className="flex h-full items-center justify-center px-6 text-xs text-muted-foreground">
            Run a query to see results.
          </div>
        )}
      </div>
    </div>
  );
}

function ResultTabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
        active
          ? "bg-[var(--accent-muted)] text-foreground"
          : "text-muted-foreground hover:bg-[var(--bg-elevated)] hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ResultGrid({ result }: { result: QueryResult }) {
  if (result.fields.length === 0) {
    return (
      <div className="m-6 rounded-lg border border-border bg-card p-4 text-sm">
        <p className="text-foreground">
          {result.command ?? "Statement"} succeeded.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {result.rowCount} row{result.rowCount === 1 ? "" : "s"} affected · {" "}
          {result.executionTimeMs}ms
        </p>
      </div>
    );
  }

  return (
    <table className="min-w-full text-xs">
      <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
        <tr className="border-b border-border">
          {result.fields.map((f) => (
            <th
              key={f.name}
              className={cn(
                "text-left px-3 py-2 font-mono font-medium whitespace-nowrap"
              )}
            >
              {f.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {result.rows.length === 0 ? (
          <tr>
            <td
              colSpan={result.fields.length}
              className="px-3 py-12 text-center text-muted-foreground"
            >
              No rows.
            </td>
          </tr>
        ) : (
          result.rows.map((row, i) => (
            <tr key={i} className="border-b border-border hover:bg-muted/30">
              {result.fields.map((f) => {
                const cell = formatCellValue(row[f.name]);
                return (
                  <td
                    key={f.name}
                    className="px-3 py-2 font-mono whitespace-nowrap align-top"
                    title={cell.full}
                  >
                    {cell.isNull ? (
                      <span className="inline-flex items-center rounded bg-muted px-1 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        NULL
                      </span>
                    ) : (
                      <span className="text-foreground">{cell.display}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
