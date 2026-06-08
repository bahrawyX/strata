"use client";

import { useState, useTransition } from "react";
import { RotateCw } from "lucide-react";
import { StatusPill } from "@/components/bahrawy/status-pill";
import { Sparkline } from "@/components/bahrawy/sparkline";
import { Dialog } from "@/components/bahrawy/dialog";
import { useToast } from "@/components/bahrawy/toast";
import { Button } from "@/components/ui/button";
import { rotateConnectionString } from "@/server/actions/connections";
import { type ConnectionHealth } from "@/server/actions/activity";
import { relativeTime } from "@/lib/utils";

type Props = {
  connectionId: string;
  isDemo: boolean;
  initialHealth: ConnectionHealth;
};

const PILL: Record<
  ConnectionHealth["status"],
  { intent: "online" | "away" | "busy" | "offline"; label: string }
> = {
  ok: { intent: "online", label: "Healthy" },
  slow: { intent: "away", label: "Slow" },
  failed: { intent: "busy", label: "Failing" },
  unknown: { intent: "offline", label: "No data" },
};

export function ConnectionHealth({
  connectionId,
  isDemo,
  initialHealth,
}: Props) {
  const pill = PILL[initialHealth.status];
  // Sparkline expects values in chronological order, but the API returns
  // most-recent-first. Reverse so older points sit on the left.
  const points = [...initialHealth.latencyHistory].reverse();

  const median = (() => {
    if (!initialHealth.latencyHistory.length) return null;
    const sorted = [...initialHealth.latencyHistory].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  })();

  const sparkColor =
    initialHealth.status === "failed"
      ? "#EF4444"
      : initialHealth.status === "slow"
        ? "#F59E0B"
        : "var(--accent, #FFFFFF)";

  return (
    <div className="px-4 py-4 border-b border-border space-y-3">
      <div className="flex items-center justify-between gap-2">
        <StatusPill intent={pill.intent} size="sm" pulse={initialHealth.status === "ok"}>
          {pill.label}
        </StatusPill>
        {!isDemo && (
          <RotateButton connectionId={connectionId} />
        )}
      </div>

      {points.length >= 2 ? (
        <div>
          <Sparkline
            points={points}
            width={208}
            height={32}
            color={sparkColor}
            strokeWidth={1.5}
            fillArea
            showEndDot
          />
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              {median !== null ? (
                <>
                  Median{" "}
                  <span className="font-mono text-foreground">{median}ms</span>
                </>
              ) : (
                "No samples yet"
              )}
            </span>
            <span>
              {initialHealth.lastTestedAt
                ? relativeTime(initialHealth.lastTestedAt)
                : "never"}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          Run “Test connection” to start tracking latency.
        </p>
      )}

      {initialHealth.lastFailureReason && (
        <p className="rounded border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-2 py-1 text-[10px] font-mono text-[var(--destructive)]">
          Last error · {initialHealth.lastFailureReason}
        </p>
      )}
    </div>
  );
}

function RotateButton({ connectionId }: { connectionId: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function submit() {
    setErr(null);
    startTransition(async () => {
      const res = await rotateConnectionString({
        connectionId,
        newConnectionString: value,
      });
      if ("error" in res) {
        setErr(res.error);
        return;
      }
      toast.push({
        title: "Connection string rotated",
        description: "Verified and saved. Existing queries continue.",
        intent: "success",
      });
      setOpen(false);
      setValue("");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        title="Rotate connection string"
      >
        <RotateCw className="h-3 w-3" />
        Rotate
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (pending) return;
          setOpen(v);
          if (!v) {
            setValue("");
            setErr(null);
          }
        }}
        title="Rotate connection string"
        description="Paste the new Postgres connection string. We'll verify it and re-encrypt it before saving."
        width={480}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={pending || !value.trim()}
            >
              {pending ? "Verifying…" : "Verify & save"}
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="postgresql://user:pass@host:5432/dbname"
            rows={3}
            spellCheck={false}
            className="w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 resize-none"
            disabled={pending}
          />
          {err && (
            <p className="text-xs text-[var(--destructive)]">{err}</p>
          )}
          <p className="text-[10px] text-muted-foreground">
            The previous string stays in place until the new one succeeds. We
            don't store it in plaintext anywhere.
          </p>
        </div>
      </Dialog>
    </>
  );
}
