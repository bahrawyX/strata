"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Loader2,
  Trash2,
  Wifi,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DbTypeBadge } from "./DbTypeBadge";
import { relativeTime, cn } from "@/lib/utils";
import {
  testConnection,
  deleteConnection,
  type ConnectionSummary,
} from "@/server/actions/connections";

type TestState =
  | { kind: "idle" }
  | { kind: "ok"; latencyMs: number }
  | { kind: "error"; message: string };

export function ConnectionCard({ connection }: { connection: ConnectionSummary }) {
  const router = useRouter();
  const [testing, setTesting] = useState(false);
  const [testState, setTestState] = useState<TestState>({ kind: "idle" });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    setTesting(true);
    setTestState({ kind: "idle" });
    const result = await testConnection(connection.id);
    setTesting(false);
    if ("error" in result) {
      setTestState({ kind: "error", message: result.error });
    } else {
      setTestState({ kind: "ok", latencyMs: result.data.latencyMs });
    }
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteConnection(connection.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="group rounded-lg border border-border bg-card p-4 flex flex-col gap-3 transition-colors hover:border-border/80">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground truncate">
            {connection.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Last connected {relativeTime(connection.lastConnectedAt)}
          </p>
        </div>
        <DbTypeBadge type={connection.dbType} />
      </div>

      {testState.kind === "ok" && (
        <div className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Connected · {testState.latencyMs}ms
        </div>
      )}
      {testState.kind === "error" && (
        <div className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{testState.message}</span>
        </div>
      )}

      {confirmingDelete ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
          <p className="text-foreground">
            Delete this connection? Your database is not affected.
          </p>
          <div className="mt-2 flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wifi className="h-3.5 w-3.5" />
              )}
              Test
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(true)}
              className={cn("text-muted-foreground hover:text-destructive")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button asChild size="sm">
            <Link href={`/db/${connection.id}`}>
              Open
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
