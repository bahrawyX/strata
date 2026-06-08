import { notFound } from "next/navigation";
import { SqlEditor } from "@/components/query/SqlEditor";
import { getConnectionById } from "@/server/actions/connections";
import { listSavedQueries } from "@/server/actions/saved-queries";
import { getQueryHistory } from "@/server/actions/activity";

export default async function QueryPage({
  params,
  searchParams,
}: {
  params: Promise<{ connectionId: string }>;
  searchParams: Promise<{ load?: string; h?: string; seed?: string }>;
}) {
  const { connectionId } = await params;
  const { load, h, seed } = await searchParams;
  const conn = await getConnectionById(connectionId);
  if ("error" in conn) notFound();

  // Three seed sources, in priority order:
  //   ?load=<saved-id>  →  load body of a saved query (owned by user / demo)
  //   ?h=<history-id>   →  load redacted preview of a past execution
  //   ?seed=<sql>       →  literal SQL (AI insights "Run in editor"). URL-
  //                        decoded by Next, capped at 10k chars so we don't
  //                        render an unreasonably large buffer.
  let initialQuery: string | undefined;
  if (load) {
    const result = await listSavedQueries(connectionId);
    if ("data" in result) {
      initialQuery = result.data.find((r) => r.id === load)?.query;
    }
  } else if (h) {
    const result = await getQueryHistory(connectionId, 200);
    if ("data" in result) {
      initialQuery = result.data.find((r) => r.id === h)?.queryPreview;
    }
  } else if (seed) {
    initialQuery = seed.length > 10_000 ? seed.slice(0, 10_000) : seed;
  }

  return <SqlEditor connectionId={connectionId} initialQuery={initialQuery} />;
}
