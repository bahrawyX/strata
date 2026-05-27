import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectionCard } from "@/components/connections/ConnectionCard";
import { EmptyConnections } from "@/components/connections/EmptyConnections";
import { getConnections } from "@/server/actions/connections";

export const metadata = {
  title: "Connections — Strata",
};

export default async function ConnectionsPage() {
  const result = await getConnections();

  if ("error" in result) {
    return (
      <div className="p-8">
        <PageHeader />
        <div className="mt-8 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      </div>
    );
  }

  const connections = result.data;

  return (
    <div className="p-8">
      <PageHeader />
      <div className="mt-8">
        {connections.length === 0 ? (
          <EmptyConnections />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connections.map((c) => (
              <ConnectionCard key={c.id} connection={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All your PostgreSQL databases in one place.
        </p>
      </div>
      <Button asChild>
        <Link href="/connections/new">
          <Plus className="h-4 w-4" />
          Add connection
        </Link>
      </Button>
    </div>
  );
}
