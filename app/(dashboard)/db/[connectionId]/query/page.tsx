import { notFound } from "next/navigation";
import { SqlEditor } from "@/components/query/SqlEditor";
import { getConnectionById } from "@/server/actions/connections";
import { listSavedQueries } from "@/server/actions/saved-queries";

export default async function QueryPage({
  params,
  searchParams,
}: {
  params: Promise<{ connectionId: string }>;
  searchParams: Promise<{ load?: string }>;
}) {
  const { connectionId } = await params;
  const { load } = await searchParams;
  const conn = await getConnectionById(connectionId);
  if ("error" in conn) notFound();

  // If ?load=<saved-query-id> is in the URL, look it up and seed the editor
  // with its body. Lookup is scoped to the current user / demo set so we
  // can't leak someone else's query body via a guessed id.
  let initialQuery: string | undefined;
  if (load) {
    const result = await listSavedQueries(connectionId);
    if ("data" in result) {
      initialQuery = result.data.find((r) => r.id === load)?.query;
    }
  }

  return <SqlEditor connectionId={connectionId} initialQuery={initialQuery} />;
}
