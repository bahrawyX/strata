import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getOptionalSession } from "@/server/actions/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOptionalSession().catch(() => null);
  const userEmail = session?.user.email ?? null;
  const userName = session?.user.name ?? null;

  return (
    <div className="flex flex-col h-screen">
      <Topbar userEmail={userEmail} userName={userName} />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
