import { notFound } from "next/navigation";
import { getConnectionById } from "@/server/actions/connections";
import { listSavedQueries } from "@/server/actions/saved-queries";
import { SavedQueriesPanel } from "@/components/query/SavedQueriesPanel";

export const metadata = {
  title: "Saved queries — Strata",
};

export default async function SavedQueriesPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const conn = await getConnectionById(connectionId);
  if ("error" in conn) notFound();
  const result = await listSavedQueries(connectionId);
  const rows = "data" in result ? result.data : [];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-base font-medium">Saved queries</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pinned queries for{" "}
            <span className="font-mono text-foreground">{conn.data.name}</span>
            . Run any of these by clicking the name — it loads into the SQL
            editor. Star to pin to the top.
          </p>
        </div>
      </div>

      {"error" in result ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error}
        </div>
      ) : (
        <SavedQueriesPanel connectionId={connectionId} initialRows={rows} />
      )}
    </div>
  );
}
