import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t find that page. It may have been moved or never
          existed.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/connections">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
