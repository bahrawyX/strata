import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar, type ViewerProp } from "@/components/layout/Topbar";
import { DashboardToastHost } from "@/components/layout/DashboardToastHost";
import { getViewer } from "@/lib/viewer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  // Strip server-only fields the Topbar doesn't need (e.g. real session id).
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
      </div>
    </DashboardToastHost>
  );
}
