import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar, type ViewerProp } from "@/components/layout/Topbar";
import { DashboardToastHost } from "@/components/layout/DashboardToastHost";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { getViewer } from "@/lib/viewer";
import { getConnections } from "@/server/actions/connections";
import { getTables } from "@/server/actions/schema";
import { listSavedQueries } from "@/server/actions/saved-queries";
import { DEMO_CONNECTION_ID } from "@/lib/demo-data";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  const topbarViewer: ViewerProp = viewer
    ? viewer.source === "real"
      ? { source: "real", name: viewer.name, email: viewer.email }
      : { source: "demo", name: viewer.name, email: viewer.email }
    : null;

  // Source data for the global Cmd+K palette. Tables + saved queries are
  // scoped to the user's first connection (or demo for anon viewers) so
  // the palette has something useful to suggest even before they click
  // into a specific DB.
  const connectionsResult = await getConnections().catch(() => null);
  const firstConnectionId =
    connectionsResult && "data" in connectionsResult
      ? connectionsResult.data[0]?.id ?? DEMO_CONNECTION_ID
      : DEMO_CONNECTION_ID;

  const [tablesResult, savedResult] = await Promise.all([
    getTables(firstConnectionId).catch(() => null),
    listSavedQueries(firstConnectionId).catch(() => null),
  ]);
  const paletteTables =
    tablesResult && "data" in tablesResult
      ? tablesResult.data.map((t) => ({
          name: t.name,
          connectionId: firstConnectionId,
        }))
      : [];
  const paletteSaved =
    savedResult && "data" in savedResult
      ? savedResult.data.map((q) => ({
          id: q.id,
          name: q.name,
          connectionId: q.connectionId ?? firstConnectionId,
        }))
      : [];

  return (
    <DashboardToastHost>
      <div className="flex flex-col h-screen">
        <Topbar viewer={topbarViewer} />
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-auto scrollbar-thin">
            {children}
          </main>
        </div>
        <CommandPalette tables={paletteTables} savedQueries={paletteSaved} />
      </div>
    </DashboardToastHost>
  );
}
