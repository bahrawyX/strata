"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Undo2, X } from "lucide-react";
import { applyUndo } from "@/server/actions/undo";
import { useRouter } from "next/navigation";

const AUTO_HIDE_MS = 30_000;

export type PendingUndo = {
  id: string;
  tableName: string;
  operation: "update" | "delete";
  expiresAt: Date;
};

type Props = {
  undo: PendingUndo | null;
  onDismiss: () => void;
};

/**
 * A small fixed-bottom-right toast with an explicit Undo button, shown
 * for ~30s after a successful row update / delete. Clicking Undo calls
 * applyUndo (which is itself TTL-gated server-side) and then router
 * refresh()es so the DataGrid picks up the restored row.
 *
 * We don't use the bahrawy Toast for this because that surface is
 * description-only — we need a real button with pending + error states.
 */
export function UndoToast({ undo, onDismiss }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Auto-dismiss 30s after each new undo arrives. (The undo itself stays
  // valid server-side for 5 minutes; the toast just gets out of the way.)
  // Key the timer on undo.id so a SECOND row edit fires a fresh 30s timer
  // instead of inheriting the deadline from the first toast.
  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => onDismiss(), AUTO_HIDE_MS);
    return () => window.clearTimeout(t);
  }, [undo?.id, onDismiss]);

  function doUndo() {
    if (!undo) return;
    setError(null);
    startTransition(async () => {
      const res = await applyUndo(undo.id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      onDismiss();
      router.refresh();
    });
  }

  return (
    <AnimatePresence>
      {undo && (
        <motion.div
          key={undo.id}
          className="fixed bottom-6 right-6 z-50 w-[min(360px,calc(100vw-3rem))] overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--accent-muted)]">
              <Undo2 className="h-3.5 w-3.5 text-[var(--accent)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                {undo.operation === "delete"
                  ? "Deleted row"
                  : "Updated row"}{" "}
                in{" "}
                <span className="font-mono text-foreground">
                  {undo.tableName}
                </span>
              </p>
              {error ? (
                <p className="mt-0.5 text-[11px] font-mono text-destructive">
                  {error}
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  You can undo this for 5 minutes.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={doUndo}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-[var(--accent-muted)] disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Undo2 className="h-3 w-3" />
              )}
              Undo
            </button>
            <button
              type="button"
              onClick={onDismiss}
              disabled={pending}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Timer bar — visual hint that the toast will fade. */}
          <motion.div
            key={`bar-${undo.id}`}
            className="h-0.5 bg-[var(--accent)]"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 30, ease: "linear" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
