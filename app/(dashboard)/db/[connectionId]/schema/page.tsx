import { notFound } from "next/navigation";
import { getConnectionById } from "@/server/actions/connections";
import { getSchemaForDiagram } from "@/server/actions/schema";
import { SchemaCanvas } from "@/components/db/SchemaCanvas";

export default async function SchemaPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const conn = await getConnectionById(connectionId);
  if ("error" in conn) notFound();
  const schema = await getSchemaForDiagram(connectionId);

  if ("error" in schema) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {schema.error}
        </div>
      </div>
    );
  }

  return (
    <SchemaCanvas
      connectionId={connectionId}
      initialTables={schema.data}
    />
  );
}
