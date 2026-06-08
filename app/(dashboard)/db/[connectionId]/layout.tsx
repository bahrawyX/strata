import { notFound } from "next/navigation";
import { SchemaTree } from "@/components/layout/SchemaTree";
import { EnvironmentBanner } from "@/components/layout/EnvironmentBanner";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { getConnectionById } from "@/server/actions/connections";
import { getTables } from "@/server/actions/schema";
import { getConnectionHealth } from "@/server/actions/activity";
import { listSavedQueries } from "@/server/actions/saved-queries";
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
  const [tablesResult, health, savedResult] = await Promise.all([
    getTables(connectionId),
    getConnectionHealth(connectionId),
    listSavedQueries(connectionId),
  ]);
  const tables = "error" in tablesResult ? [] : tablesResult.data;
  const savedQueries =
    "error" in savedResult ? [] : savedResult.data;
  const isDemo = isDemoConnectionId(connectionId);

  const paletteTables = tables.map((t) => ({
    name: t.name,
    connectionId,
  }));
  const paletteSaved = savedQueries.map((q) => ({
    id: q.id,
    name: q.name,
    connectionId: q.connectionId ?? connectionId,
  }));

  return (
    <div className="flex h-full min-h-0">
      <SchemaTree
        connectionId={connectionId}
        connectionName={conn.data.name}
        tables={tables}
        health={health}
        isDemo={isDemo}
        environment={conn.data.environment}
        readOnly={conn.data.readOnly}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <EnvironmentBanner
          environment={conn.data.environment}
          readOnly={conn.data.readOnly}
          connectionName={conn.data.name}
        />
        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
          {children}
        </div>
      </div>
      {/*
        Connection-scoped palette. Mounted here so a route change between
        /db/A and /db/B triggers a fresh server-render with the new
        connection's tables + saved queries. Overrides the slim outer
        palette via DOM stacking (last-mounted listener wins on Mod+K).
      */}
      <CommandPalette tables={paletteTables} savedQueries={paletteSaved} />
    </div>
  );
}
