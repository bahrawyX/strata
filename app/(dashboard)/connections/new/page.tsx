import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewConnectionForm } from "@/components/connections/NewConnectionForm";

export const metadata = {
  title: "Add connection — Strata",
};

export default function NewConnectionPage() {
  return (
    <div className="p-8">
      <Link
        href="/connections"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Connections
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Add a connection
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Provide a PostgreSQL connection string. We&apos;ll test it before
        saving.
      </p>
      <div className="mt-8">
        <NewConnectionForm />
      </div>
    </div>
  );
}
