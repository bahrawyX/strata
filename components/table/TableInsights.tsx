"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ChevronDown,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import { explainTable } from "@/server/actions/insights";
import type { TableInsights as TableInsightsData } from "@/lib/ai/insights";
import { cn } from "@/lib/utils";

type Props = {
  connectionId: string;
  schema: string;
  tableName: string;
};

/**
 * Collapsed-by-default sparkle panel above the DataGrid. Click to expand;
 * Strata's AI co-pilot generates a summary of what the table tracks plus
 * three useful starter queries. Each suggestion has a "Run in editor"
 * link that opens /db/<id>/query?seed=<...>.
 *
 * Reuses the daily co-pilot quota — a generation counts as one draft.
 */
export function TableInsights({ connectionId, schema, tableName }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<TableInsightsData | null>(null);
  const [usage, setUsage] = useState<{
    used: number;
    limit: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (data || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await explainTable({
        connectionId,
        schema,
        tableName,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setData(res.data);
      if (res.usage) {
        setUsage({ used: res.usage.used, limit: res.usage.limit });
      }
    });
  }

  return (
    <div className="border-b border-border bg-[var(--bg-elevated)]/40">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-6 py-3 text-left text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-muted)]"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent-muted)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
        </div>
        <div className="flex-1 truncate">
          <span className="font-medium text-foreground">
            Explain this table
          </span>
          <span className="ml-2 text-muted-foreground">
            — AI summary + 3 starter queries
          </span>
        </div>
        {usage && (
          <span
            className="rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
            title="Today's AI usage"
          >
            {usage.used} / {usage.limit}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="insights-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-4 pt-1 space-y-3">
              {pending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking…
                </div>
              )}

              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}

              {data && !pending && (
                <>
                  <div className="rounded-md border border-border bg-card/60 px-4 py-3">
                    <p className="text-[13px] leading-relaxed text-foreground">
                      {data.summary}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Starter queries
                    </p>
                    <ul className="space-y-2">
                      {data.suggested.map((q, i) => (
                        <li
                          key={i}
                          className="rounded-md border border-border bg-card/60 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium text-foreground">
                                {q.name}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {q.rationale}
                              </p>
                            </div>
                            <a
                              href={`/db/${connectionId}/query?seed=${encodeURIComponent(
                                q.sql
                              )}`}
                              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium hover:bg-[var(--accent-muted)]"
                              title="Open in SQL editor"
                            >
                              <Zap className="h-3 w-3" />
                              Run
                              <ArrowRight className="h-3 w-3 opacity-70" />
                            </a>
                          </div>
                          <pre className="mt-2 overflow-x-auto rounded border border-border bg-muted/30 p-2 font-mono text-[11px] leading-relaxed text-foreground scrollbar-thin">
                            {q.sql}
                          </pre>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
