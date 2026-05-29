import { notFound } from "next/navigation";
import { getConnectionById } from "@/server/actions/connections";
import { listSavedQueries } from "@/server/actions/saved-queries";
import { getQueryHistory } from "@/server/actions/activity";
import { SavedQueriesPanel } from "@/components/query/SavedQueriesPanel";

export const metadata = {
  title: "Queries — Strata",
};

export default async function SavedQueriesPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const conn = await getConnectionById(connectionId);
  if ("error" in conn) notFound();

  // Parallel-fetch both lists. Either may individually fail with a friendly
  // message; we surface a top-level error block only if BOTH fail (i.e. the
  // meta DB is unreachable). Otherwise the panel handles partial data
  // gracefully.
  const [savedResult, historyResult] = await Promise.all([
    listSavedQueries(connectionId),
    getQueryHistory(connectionId, 100),
  ]);

  const savedRows = "data" in savedResult ? savedResult.data : [];
  const historyRows = "data" in historyResult ? historyResult.data : [];
  const bothFailed =
    "error" in savedResult && "error" in historyResult;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-base font-medium">Queries</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Saved + history for{" "}
            <span className="font-mono text-foreground">{conn.data.name}</span>
            . Click any row to load it into the SQL editor.
          </p>
        </div>
      </div>

      {bothFailed ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not load saved queries or history.
        </div>
      ) : (
        <SavedQueriesPanel
          connectionId={connectionId}
          initialRows={savedRows}
          initialHistory={historyRows}
        />
      )}
    </div>
  );
}
