import { notFound } from "next/navigation";
import { Database, FileText, HardDrive, Table2 } from "lucide-react";
import { getConnectionById } from "@/server/actions/connections";
import { getDbStats } from "@/server/actions/schema";
import { DbTypeBadge } from "@/components/connections/DbTypeBadge";
import { formatBytes } from "@/lib/utils";

export default async function DbOverviewPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const conn = await getConnectionById(connectionId);
  if ("error" in conn) notFound();

  const statsResult = await getDbStats(connectionId);
  const stats = "error" in statsResult ? null : statsResult.data;
  const error = "error" in statsResult ? statsResult.error : null;

  return (
    <div className="p-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {conn.data.name}
        </h1>
        <DbTypeBadge type={conn.data.dbType} />
      </div>

      {error ? (
        <div className="mt-8 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : stats ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Database"
            value={stats.databaseName}
            icon={<Database className="h-4 w-4" />}
          />
          <StatCard
            label="Postgres"
            value={stats.postgresVersion}
            icon={<FileText className="h-4 w-4" />}
          />
          <StatCard
            label="Total size"
            value={formatBytes(stats.sizeBytes)}
            icon={<HardDrive className="h-4 w-4" />}
          />
          <StatCard
            label="Tables"
            value={stats.tableCount.toString()}
            icon={<Table2 className="h-4 w-4" />}
          />
        </div>
      ) : null}

      <div className="mt-12 rounded-lg border border-border bg-card/30 p-6">
        <h2 className="text-sm font-medium text-foreground">
          Pick a table from the sidebar
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Or open the{" "}
          <a
            href={`/db/${connectionId}/query`}
            className="text-foreground hover:text-primary underline-offset-4 hover:underline"
          >
            SQL editor
          </a>{" "}
          to run an ad-hoc query.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div
        className="mt-3 text-xl font-medium text-foreground truncate"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
