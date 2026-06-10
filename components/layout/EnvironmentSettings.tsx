"use client";

import { useState, useTransition } from "react";
import { Lock, ShieldAlert, Sparkles, TrafficCone, Unlock } from "lucide-react";
import {
  toggleConnectionReadOnly,
  updateConnectionEnvironment,
  type ConnectionSummary,
} from "@/server/actions/connections";
import type { Environment } from "@/lib/validations";
import { cn } from "@/lib/utils";

type Props = {
  connectionId: string;
  initialEnvironment: Environment;
  initialReadOnly: boolean;
  disabled?: boolean;
};

const ENV_META: Record<
  Environment,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  dev: {
    label: "Dev",
    icon: Sparkles,
    tone: "text-muted-foreground",
  },
  staging: {
    label: "Staging",
    icon: TrafficCone,
    tone: "text-[var(--warning)]",
  },
  production: {
    label: "Production",
    icon: ShieldAlert,
    tone: "text-[var(--destructive)]",
  },
};

/**
 * Inline environment picker + read-only switch. Lives in the SchemaTree
 * sidebar header below the ConnectionHealth pill.
 *
 * For the demo connection, both controls render disabled with a tooltip —
 * the underlying server actions also refuse on the demo id, but we
 * disable in the UI for honesty.
 */
export function EnvironmentSettings({
  connectionId,
  initialEnvironment,
  initialReadOnly,
  disabled,
}: Props) {
  const [environment, setEnvironment] = useState<Environment>(initialEnvironment);
  const [readOnly, setReadOnly] = useState(initialReadOnly);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply(next: ConnectionSummary) {
    setEnvironment(next.environment);
    setReadOnly(next.readOnly);
  }

  function selectEnv(next: Environment) {
    if (next === environment || pending || disabled) return;
    setError(null);
    startTransition(async () => {
      const res = await updateConnectionEnvironment({
        connectionId,
        environment: next,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      apply(res.data);
    });
  }

  function flipReadOnly() {
    if (pending || disabled) return;
    setError(null);
    startTransition(async () => {
      const res = await toggleConnectionReadOnly({
        connectionId,
        readOnly: !readOnly,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      apply(res.data);
    });
  }

  return (
    <div className="px-4 py-4 space-y-3 border-b border-border">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Environment
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {(Object.entries(ENV_META) as [Environment, typeof ENV_META["dev"]][]).map(
          ([env, meta]) => {
            const active = env === environment;
            const Icon = meta.icon;
            return (
              <button
                key={env}
                type="button"
                onClick={() => selectEnv(env)}
                disabled={pending || disabled}
                title={
                  disabled
                    ? "Demo connection — sign up to manage real ones."
                    : `Mark as ${meta.label}`
                }
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[10px] font-medium transition-colors",
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-muted)] text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted/60",
                  (pending || disabled) && "opacity-60 cursor-not-allowed"
                )}
              >
                <Icon className={cn("h-3 w-3", active ? meta.tone : "")} />
                {meta.label}
              </button>
            );
          }
        )}
      </div>

      <button
        type="button"
        onClick={flipReadOnly}
        disabled={pending || disabled}
        role="switch"
        aria-checked={readOnly}
        aria-label="Read-only mode"
        title={
          disabled
            ? "Demo connection is always read-only."
            : readOnly
              ? "Allow writes"
              : "Block writes"
        }
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-[11px] transition-colors",
          readOnly
            ? "border-[var(--accent)]/40 bg-[var(--accent-muted)] text-foreground"
            : "border-border text-muted-foreground hover:bg-muted/60",
          (pending || disabled) && "opacity-60 cursor-not-allowed"
        )}
      >
        <span className="flex items-center gap-1.5">
          {readOnly ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          Read-only
        </span>
        <span
          className={cn(
            "rounded-full px-1.5 py-px font-mono text-[9px] uppercase",
            readOnly
              ? "bg-[var(--accent)] text-[var(--accent-foreground,white)]"
              : "bg-muted text-foreground/80"
          )}
        >
          {readOnly ? "on" : "off"}
        </span>
      </button>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[10px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
