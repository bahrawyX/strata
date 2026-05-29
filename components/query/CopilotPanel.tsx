"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Info,
  Loader2,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { askSqlCopilot } from "@/server/actions/copilot";
import type { CopilotResponse, CopilotUsage } from "@/lib/ai/copilot";

type Draft = CopilotResponse & { cached: boolean };

type Upgrade = {
  tier: "demo" | "free";
  used: number;
  limit: number;
};

type Props = {
  connectionId: string;
  /** Drop the drafted SQL at the end of the current query. */
  onInsert: (sql: string) => void;
  /** Replace the entire editor contents with the drafted SQL. */
  onReplace: (sql: string) => void;
};

export function CopilotPanel({ connectionId, onInsert, onReplace }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [usage, setUsage] = useState<CopilotUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<Upgrade | null>(null);
  const [submitting, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ⌘K / Ctrl+K toggles the panel.
  useEffect(() => {
    function handler(e: globalThis.KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const isCmd = isMac ? e.metaKey : e.ctrlKey;
      if (isCmd && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus textarea when panel opens.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [open]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!question.trim() || submitting) return;
    setError(null);
    setUpgrade(null);
    setDraft(null);
    startTransition(async () => {
      const res = await askSqlCopilot({ connectionId, question });
      if (res.ok) {
        setDraft({ ...res.data, cached: res.cached });
        if (res.usage) setUsage(res.usage);
      } else {
        setError(res.error);
        if (res.upgrade) setUpgrade(res.upgrade);
      }
    });
  }

  function onTextareaKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape" && !submitting) {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="border-b border-border bg-[var(--bg-elevated)]/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-6 py-2.5 text-left text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-muted)]"
        aria-expanded={open}
      >
        <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
        <span className="font-medium">Ask in plain English</span>
        <span className="text-[var(--text-muted)]">
          — describe what you want; the co-pilot drafts the SQL.
        </span>
        <span className="ml-auto flex items-center gap-2">
          {usage && usage.limit !== Number.POSITIVE_INFINITY && (
            <span
              className="rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)]"
              title={`${usage.tier} tier`}
            >
              {usage.used} / {usage.limit} today
            </span>
          )}
          {usage?.tier === "pro" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/40 bg-[var(--accent-muted)] px-2 py-0.5 font-mono text-[10px] text-[var(--accent)]">
              <Zap className="h-3 w-3" />
              Pro
            </span>
          )}
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--text-muted)]">
            <kbd className="rounded border border-border bg-[var(--bg-surface)] px-1 py-0.5">
              ⌘
            </kbd>
            <kbd className="rounded border border-border bg-[var(--bg-surface)] px-1 py-0.5">
              K
            </kbd>
          </span>
        </span>
      </button>

      {open && (
        <form
          onSubmit={submit}
          className="border-t border-border bg-[var(--bg-surface)] px-6 py-3"
        >
          <div className="flex items-start gap-2">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={onTextareaKey}
              placeholder="e.g. Top 10 users by total order value in the last 30 days"
              rows={2}
              disabled={submitting}
              className="flex-1 resize-none rounded-md border border-border bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={!question.trim() || submitting}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Drafting…
                </>
              ) : (
                <>
                  Draft
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={submitting}
              aria-label="Close co-pilot"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
            <kbd className="rounded border border-border bg-[var(--bg-elevated)] px-1 py-0.5 font-mono">
              ⌘
            </kbd>{" "}
            +{" "}
            <kbd className="rounded border border-border bg-[var(--bg-elevated)] px-1 py-0.5 font-mono">
              Enter
            </kbd>{" "}
            to submit ·{" "}
            <kbd className="rounded border border-border bg-[var(--bg-elevated)] px-1 py-0.5 font-mono">
              Esc
            </kbd>{" "}
            to close. The co-pilot sees your full schema, not your data.
          </p>

          {error && !upgrade && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {upgrade && (
            <div className="mt-3 rounded-md border border-[var(--accent)]/40 bg-[var(--accent-muted)] p-4">
              <div className="flex items-start gap-2">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {upgrade.tier === "demo"
                      ? "You've reached today's demo allowance"
                      : "You've hit today's co-pilot cap"}
                  </p>
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                    {upgrade.tier === "demo"
                      ? "Strata is in early access — create a free account for a much higher daily allowance, no card needed."
                      : "The counter resets at midnight UTC. We cap to keep costs sane while we're in early access."}
                  </p>
                </div>
              </div>
              {upgrade.tier === "demo" && (
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href="/signup"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 text-xs font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
                  >
                    Create a free account
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border-default)] bg-transparent px-3 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)]"
                  >
                    Sign in
                  </Link>
                </div>
              )}
            </div>
          )}

          {draft && (
            <div className="mt-3 space-y-2">
              <div className="overflow-hidden rounded-md border border-border bg-[var(--bg-base)]">
                <div className="flex items-center justify-between border-b border-border bg-[var(--bg-elevated)] px-3 py-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  <span>Drafted SQL</span>
                  {draft.cached && (
                    <span
                      className="font-mono text-[var(--accent)]"
                      title="Schema served from prompt cache"
                    >
                      cache hit
                    </span>
                  )}
                </div>
                <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[12px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
                  {draft.sql}
                </pre>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {draft.explanation}
              </p>

              {draft.warnings.length > 0 && (
                <ul className="space-y-1 rounded-md border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-3 py-2">
                  {draft.warnings.map((w, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-[11px] text-[var(--warning)]"
                    >
                      <Info className="mt-px h-3 w-3 shrink-0" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onInsert(draft.sql);
                    setOpen(false);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border-default)] bg-transparent px-3 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)]"
                >
                  Insert into editor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReplace(draft.sql);
                    setOpen(false);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 text-xs font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
                >
                  Replace editor
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  )}
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
