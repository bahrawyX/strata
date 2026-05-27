"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { AlertCircle, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { executeQuery, type QueryResult } from "@/server/actions/query";
import { formatCellValue } from "@/components/table/cell-utils";

export function SqlEditor({ connectionId }: { connectionId: string }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, startTransition] = useTransition();

  function runQuery() {
    if (!query.trim() || running) return;
    setError(null);
    startTransition(async () => {
      const res = await executeQuery({ connectionId, query });
      if ("error" in res) {
        setError(res.error);
        setResult(null);
        return;
      }
      setResult(res.data);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      runQuery();
    }
  }

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

      <div className="p-6 border-b border-border">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="-- Write your SQL here..."
          rows={8}
          spellCheck={false}
          className="font-mono text-xs min-h-[200px] resize-y"
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
          {result && (
            <span className="text-xs text-muted-foreground">
              {result.rowCount} row{result.rowCount === 1 ? "" : "s"}{" "}
              {result.command ? `· ${result.command}` : ""} ·{" "}
              {result.executionTimeMs}ms
            </span>
          )}
        </div>
      </div>

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
          <ResultGrid result={result} />
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
