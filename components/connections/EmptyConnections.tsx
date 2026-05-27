import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyConnections() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/30 px-6 py-16 text-center">
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="14"
          y="20"
          width="44"
          height="6"
          rx="3"
          fill="#1E1E2E"
          stroke="#2A2A3E"
        />
        <ellipse
          cx="36"
          cy="20"
          rx="22"
          ry="6"
          fill="#1E1E2E"
          stroke="#6366F1"
          strokeOpacity="0.4"
        />
        <rect
          x="14"
          y="32"
          width="44"
          height="6"
          rx="3"
          fill="#1E1E2E"
          stroke="#2A2A3E"
        />
        <rect
          x="14"
          y="44"
          width="44"
          height="6"
          rx="3"
          fill="#1E1E2E"
          stroke="#2A2A3E"
        />
        <path
          d="M14 20 L14 50"
          stroke="#2A2A3E"
          strokeWidth="1"
        />
        <path
          d="M58 20 L58 50"
          stroke="#2A2A3E"
          strokeWidth="1"
        />
      </svg>
      <h3 className="mt-5 text-base font-medium text-foreground">
        No connections yet
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">
        Connect your first PostgreSQL database to browse tables, run queries,
        and edit data.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link href="/connections/new">
          Add a connection
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
