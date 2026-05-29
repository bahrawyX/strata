import { notFound } from "next/navigation";
import { SchemaTree } from "@/components/layout/SchemaTree";
import { getConnectionById } from "@/server/actions/connections";
import { getTables } from "@/server/actions/schema";
import { getConnectionHealth } from "@/server/actions/activity";
import { isDemoConnectionId } from "@/lib/demo-data";

export default async function DbLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const conn = await getConnectionById(connectionId);
  if ("error" in conn) {
    notFound();
  }
  const [tablesResult, health] = await Promise.all([
    getTables(connectionId),
    getConnectionHealth(connectionId),
  ]);
  const tables = "error" in tablesResult ? [] : tablesResult.data;
  const isDemo = isDemoConnectionId(connectionId);

  return (
    <div className="flex h-full min-h-0">
      <SchemaTree
        connectionId={connectionId}
        connectionName={conn.data.name}
        tables={tables}
        health={health}
        isDemo={isDemo}
      />
      <div className="flex-1 min-w-0 overflow-auto scrollbar-thin">
        {children}
      </div>
    </div>
  );
}
