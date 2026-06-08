import { notFound } from "next/navigation";
import { getTableData } from "@/server/actions/table";
import { DataGrid } from "@/components/table/DataGrid";
import { TableInsights } from "@/components/table/TableInsights";

export default async function TablePage({
  params,
  searchParams,
}: {
  params: Promise<{ connectionId: string; tableName: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const { connectionId, tableName: rawTableName } = await params;
  const sp = await searchParams;
  const tableName = decodeURIComponent(rawTableName);
  const page = Number(sp.page) || 1;
  const pageSize = Number(sp.pageSize) || 50;

  const result = await getTableData({
    connectionId,
    tableName,
    page,
    pageSize,
  });

  if ("error" in result) {
    if (result.error === "Connection not found.") notFound();
    return (
      <div className="p-8">
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TableInsights
        connectionId={connectionId}
        schema="public"
        tableName={tableName}
      />
      <div className="flex-1 min-h-0">
        <DataGrid
          connectionId={connectionId}
          tableName={tableName}
          data={result.data}
        />
      </div>
    </div>
  );
}
