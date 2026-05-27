import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { getOptionalSession } from "@/server/actions/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOptionalSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col h-screen">
      <Topbar
        userEmail={session.user.email}
        userName={session.user.name}
      />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
