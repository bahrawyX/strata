"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  Star,
  Trash2,
  Wand2,
  X,
  XCircle,
} from "lucide-react";
import {
  deleteSavedQuery,
  toggleSavedQueryStar,
  updateSavedQuery,
  type SavedQueryRow,
} from "@/server/actions/saved-queries";
import type { HistoryRow } from "@/server/actions/activity";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/utils";

type Tab = "saved" | "history";

type Props = {
  connectionId: string;
  initialRows: SavedQueryRow[];
  initialHistory: HistoryRow[];
};

export function SavedQueriesPanel({
  connectionId,
  initialRows,
  initialHistory,
}: Props) {
  const [tab, setTab] = useState<Tab>("saved");
  const [rows, setRows] = useState<SavedQueryRow[]>(initialRows);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function applyRow(updated: SavedQueryRow) {
    setRows((prev) =>
      prev
        .map((r) => (r.id === updated.id ? updated : r))
        .sort((a, b) => {
          if (a.starred !== b.starred) return a.starred ? -1 : 1;
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        })
    );
  }

  function startEdit(row: SavedQueryRow) {
    setEditingId(row.id);
    setEditName(row.name);
    setError(null);
  }

  function commitEdit(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) {
      setError("Name can't be empty.");
      return;
    }
    startTransition(async () => {
      const res = await updateSavedQuery({ id, name: trimmed });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      applyRow(res.data);
      setEditingId(null);
    });
  }

  function toggleStar(id: string) {
    startTransition(async () => {
      const res = await toggleSavedQueryStar(id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      applyRow(res.data);
    });
  }

  function askDelete(id: string) {
    setConfirmingDeleteId(id);
    setError(null);
  }

  function cancelDelete() {
    setConfirmingDeleteId(null);
  }

  function confirmDelete(id: string) {
    startTransition(async () => {
      const res = await deleteSavedQuery(id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      setConfirmingDeleteId(null);
    });
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <TabButton active={tab === "saved"} onClick={() => setTab("saved")}>
          <Star className="h-3.5 w-3.5" />
          Saved
          <span className="rounded bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground">
            {rows.length}
          </span>
        </TabButton>
        <TabButton
          active={tab === "history"}
          onClick={() => setTab("history")}
        >
          <Clock className="h-3.5 w-3.5" />
          History
          <span className="rounded bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground">
            {initialHistory.length}
          </span>
        </TabButton>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {tab === "saved" ? (
        rows.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No saved queries"
            body={
              <>
                Run a query in the editor, then click{" "}
                <span className="font-mono text-foreground">Save</span> to keep
                it handy.
              </>
            }
          />
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border bg-card">
            {rows.map((row, i) => {
              const isEditing = editingId === row.id;
              return (
                <li
                  key={row.id}
                  className={cn(
                    "flex flex-col gap-2 px-4 py-3 text-sm",
                    i > 0 && "border-t border-border"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleStar(row.id)}
                      disabled={pending}
                      className={cn(
                        "rounded p-1 transition-colors",
                        row.starred
                          ? "text-amber-400 hover:bg-amber-400/10"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      aria-label={row.starred ? "Unstar" : "Star"}
                      title={row.starred ? "Unstar" : "Star"}
                    >
                      <Star
                        className="h-3.5 w-3.5"
                        fill={row.starred ? "currentColor" : "none"}
                      />
                    </button>

                    {isEditing ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(row.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        disabled={pending}
                        className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                      />
                    ) : (
                      <Link
                        href={`/db/${connectionId}/query?load=${encodeURIComponent(
                          row.id
                        )}`}
                        className="flex-1 truncate font-medium text-foreground hover:underline"
                        title={row.name}
                      >
                        {row.name}
                      </Link>
                    )}

                    <div className="flex items-center gap-0.5">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => commitEdit(row.id)}
                            disabled={pending}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Save name"
                          >
                            {pending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            disabled={pending}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            disabled={pending}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Rename"
                            title="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {confirmingDeleteId === row.id ? (
                            <div className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-1 py-0.5">
                              <span className="px-1 text-[11px] text-foreground">
                                Delete?
                              </span>
                              <button
                                type="button"
                                onClick={cancelDelete}
                                disabled={pending}
                                className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                No
                              </button>
                              <button
                                type="button"
                                onClick={() => confirmDelete(row.id)}
                                disabled={pending}
                                className="rounded bg-destructive px-1.5 py-0.5 text-[11px] text-white hover:opacity-90 disabled:opacity-60"
                              >
                                {pending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Yes"
                                )}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => askDelete(row.id)}
                              disabled={pending}
                              className="rounded p-1 text-muted-foreground hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]"
                              aria-label="Delete"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <pre className="max-h-20 overflow-hidden rounded border border-border bg-muted/30 p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {row.query.length > 320
                      ? row.query.slice(0, 320) + "…"
                      : row.query}
                  </pre>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Updated {relativeTime(row.updatedAt)}</span>
                    {row.connectionId === null && (
                      <span className="rounded border border-border bg-muted px-1 py-px font-mono uppercase">
                        Any connection
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : initialHistory.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No query history yet"
          body={
            <>
              Every SQL run gets logged here. Run something in the{" "}
              <span className="font-mono text-foreground">SQL editor</span> and
              it&apos;ll appear in this tab.
            </>
          }
        />
      ) : (
        <HistoryList
          connectionId={connectionId}
          rows={initialHistory}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
        active
          ? "border-[var(--accent)] text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function HistoryList({
  connectionId,
  rows,
}: {
  connectionId: string;
  rows: HistoryRow[];
}) {
  return (
    <ul className="overflow-hidden rounded-lg border border-border bg-card">
      {rows.map((row, i) => (
        <li
          key={row.id}
          className={cn(
            "flex flex-col gap-2 px-4 py-3 text-sm",
            i > 0 && "border-t border-border"
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                row.success
                  ? "bg-[var(--accent-muted)]"
                  : "bg-[var(--destructive)]/15"
              )}
              aria-hidden
            >
              {row.success ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-[var(--destructive)]" />
              )}
            </span>
            <Link
              href={`/db/${connectionId}/query?h=${encodeURIComponent(row.id)}`}
              className="flex-1 truncate text-foreground hover:underline"
              title="Load into editor"
            >
              <span className="font-mono text-[12px]">
                {row.queryPreview.length > 80
                  ? row.queryPreview.slice(0, 80) + "…"
                  : row.queryPreview}
              </span>
            </Link>
            {!row.success && row.detail && (
              <span className="rounded border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-1.5 py-px font-mono text-[10px] uppercase text-[var(--destructive)]">
                {row.detail}
              </span>
            )}
            <Link
              href={`/db/${connectionId}/query?h=${encodeURIComponent(row.id)}`}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Load into editor"
              title="Load into editor"
            >
              <Wand2 className="h-3.5 w-3.5" />
            </Link>
          </div>

          <pre className="max-h-16 overflow-hidden rounded border border-border bg-muted/30 p-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {row.queryPreview}
          </pre>

          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>{relativeTime(row.createdAt)}</span>
            {row.latencyMs !== null && (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono">{row.latencyMs} ms</span>
              </>
            )}
            {row.success && row.detail && (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono uppercase">{row.detail}</span>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
      <Icon className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
