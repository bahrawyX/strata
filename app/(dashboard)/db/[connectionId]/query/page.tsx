import { notFound } from "next/navigation";
import { SqlEditor } from "@/components/query/SqlEditor";
import { getConnectionById } from "@/server/actions/connections";

export default async function QueryPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const conn = await getConnectionById(connectionId);
  if ("error" in conn) notFound();
  return <SqlEditor connectionId={connectionId} />;
}
