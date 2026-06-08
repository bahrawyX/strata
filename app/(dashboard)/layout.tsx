import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar, type ViewerProp } from "@/components/layout/Topbar";
import { DashboardToastHost } from "@/components/layout/DashboardToastHost";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { getViewer } from "@/lib/viewer";

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
        {/*
          Slim, route-only palette for non-connection screens
          (/connections, /settings/*). The per-connection layout in
          db/[connectionId]/layout.tsx overlays its own richer palette
          when the user is actually inside a DB. React unifies them at
          the keymap level — only one is mounted at a time per the
          layout tree.
        */}
        <CommandPalette tables={[]} savedQueries={[]} />
      </div>
    </DashboardToastHost>
  );
}
