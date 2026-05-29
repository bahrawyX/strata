import { AlertTriangle, Lock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Environment } from "@/lib/validations";

type Props = {
  environment: Environment;
  readOnly: boolean;
  connectionName: string;
};

/**
 * Sticky banner shown above the dashboard content when a connection is
 * marked production OR read-only. Helps stop the worst kind of fat-finger
 * mistakes — "I thought I was in staging".
 *
 * Layered priority:
 *   production + read-only   → "Production · read-only" amber/destructive
 *   production               → destructive tint, ShieldAlert
 *   staging                  → amber tint, AlertTriangle
 *   dev + read-only          → muted "Read-only" tint, Lock
 *   dev                      → no banner
 */
export function EnvironmentBanner({
  environment,
  readOnly,
  connectionName,
}: Props) {
  if (environment === "dev" && !readOnly) return null;

  const tone: "destructive" | "amber" | "muted" =
    environment === "production"
      ? "destructive"
      : environment === "staging"
        ? "amber"
        : "muted";

  const Icon =
    environment === "production"
      ? ShieldAlert
      : environment === "staging"
        ? AlertTriangle
        : Lock;

  const headline =
    environment === "production"
      ? "Production"
      : environment === "staging"
        ? "Staging"
        : "Read-only";

  const subline = readOnly
    ? environment === "dev"
      ? "Writes are blocked on this connection."
      : "Writes are blocked. Toggle off in connection settings before mutating."
    : environment === "production"
      ? "Writes are real. Double-check before INSERT / UPDATE / DELETE."
      : environment === "staging"
        ? "Lower-risk than prod, but not a sandbox."
        : "";

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b px-4 py-2 text-xs",
        tone === "destructive" &&
          "border-[var(--destructive)]/40 bg-[var(--destructive)]/8 text-[var(--destructive)]",
        tone === "amber" &&
          "border-[var(--warning)]/40 bg-[var(--warning)]/8 text-[var(--warning)]",
        tone === "muted" && "border-border bg-muted/40 text-muted-foreground"
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="font-medium uppercase tracking-wider">{headline}</span>
      {readOnly && environment !== "dev" && (
        <span className="rounded border border-current/30 px-1.5 py-px font-mono text-[10px] uppercase">
          Read-only
        </span>
      )}
      <span className="truncate font-mono opacity-80">{connectionName}</span>
      {subline && (
        <span className="ml-auto truncate hidden sm:inline opacity-90">
          {subline}
        </span>
      )}
    </div>
  );
}
