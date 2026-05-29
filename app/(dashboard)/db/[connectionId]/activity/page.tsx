import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Database,
  Pencil,
  Plus,
  Sparkles,
  Terminal,
  Trash2,
  Wifi,
  XCircle,
} from "lucide-react";
import { getConnectionById } from "@/server/actions/connections";
import {
  getConnectionActivity,
  type ActivityRow,
} from "@/server/actions/activity";
import { relativeTime } from "@/lib/utils";

export const metadata = {
  title: "Activity — Strata",
};

type ActionMeta = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
};

const ACTIONS: Record<string, ActionMeta> = {
  "connect.test": {
    label: "Tested connection",
    icon: Wifi,
    tint: "text-[var(--accent)]",
  },
  "query.execute": {
    label: "Ran SQL query",
    icon: Terminal,
    tint: "text-[var(--text-primary)]",
  },
  "row.insert": {
    label: "Inserted row",
    icon: Plus,
    tint: "text-[var(--success)]",
  },
  "row.update": {
    label: "Updated row",
    icon: Pencil,
    tint: "text-[var(--warning)]",
  },
  "row.delete": {
    label: "Deleted row",
    icon: Trash2,
    tint: "text-[var(--destructive)]",
  },
  "schema.read": {
    label: "Read schema",
    icon: Database,
    tint: "text-[var(--text-secondary)]",
  },
  "copilot.draft": {
    label: "Co-pilot drafted SQL",
    icon: Sparkles,
    tint: "text-[var(--accent)]",
  },
};

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const conn = await getConnectionById(connectionId);
  if ("error" in conn) notFound();
  const activity = await getConnectionActivity(connectionId, 100);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-base font-medium">Activity</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Audit trail for{" "}
            <span className="font-mono text-foreground">{conn.data.name}</span>
            . We log every connection touch — query, edit, schema read — so
            you can review what happened and when.
          </p>
        </div>
      </div>

      {"error" in activity ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {activity.error}
        </div>
      ) : activity.data.length === 0 ? (
        <EmptyState />
      ) : (
        <ActivityList rows={activity.data} />
      )}
    </div>
  );
}

function ActivityList({ rows }: { rows: ActivityRow[] }) {
  return (
    <ul className="overflow-hidden rounded-lg border border-border bg-card">
      {rows.map((row, i) => {
        const meta = ACTIONS[row.action] ?? {
          label: row.action,
          icon: Clock,
          tint: "text-[var(--text-secondary)]",
        };
        const Icon = meta.icon;
        return (
          <li
            key={row.id}
            className={
              "flex items-center gap-4 px-4 py-3 text-sm " +
              (i > 0 ? "border-t border-border" : "")
            }
          >
            <div
              className={
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md " +
                (row.success
                  ? "bg-[var(--accent-muted)]"
                  : "bg-[var(--destructive)]/15")
              }
            >
              {row.success ? (
                <Icon className={"h-4 w-4 " + meta.tint} />
              ) : (
                <XCircle className="h-4 w-4 text-[var(--destructive)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-foreground">
                  {meta.label}
                </span>
                {!row.success && (
                  <span className="rounded border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-1.5 py-px text-[10px] font-mono uppercase text-[var(--destructive)]">
                    Failed
                  </span>
                )}
                {row.detail && (
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    · {row.detail}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>{relativeTime(row.createdAt)}</span>
                {row.latencyMs !== null && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="font-mono">{row.latencyMs} ms</span>
                  </>
                )}
              </div>
            </div>
            {row.success && (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--success)] opacity-60" />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
      <p className="text-sm font-medium text-foreground">No activity yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Run a query, open a table, or test the connection — anything you
        do here gets logged for review.
      </p>
    </div>
  );
}
