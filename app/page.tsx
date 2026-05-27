import Link from "next/link";
import { ArrowRight, Database, Lock, Terminal, Table2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { getOptionalSession } from "@/server/actions/session";

export default async function LandingPage() {
  let isAuthed = false;
  try {
    const session = await getOptionalSession();
    isAuthed = Boolean(session);
  } catch {
    isAuthed = false;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-2">
            {isAuthed ? (
              <Button asChild size="sm">
                <Link href="/connections">
                  Open dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-6 pt-24 pb-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-primary" />
              Postgres, beautifully managed
            </span>
            <h1 className="mt-6 text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
              The control plane for your Postgres databases.
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect Neon, Supabase, or any PostgreSQL instance and browse
              tables, run queries, and edit data — all from one fast,
              keyboard-friendly workspace.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              {isAuthed ? (
                <Button asChild size="lg">
                  <Link href="/connections">
                    Open dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/signup">
                      Start for free
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/login">Sign in</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="px-6 pb-24">
          <div className="mx-auto max-w-5xl grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              icon={<Database className="h-5 w-5" />}
              title="Any Postgres"
              body="Neon, Supabase, RDS, or self-hosted — bring a connection string."
            />
            <Feature
              icon={<Table2 className="h-5 w-5" />}
              title="Visual tables"
              body="Browse, edit, insert, and delete rows with a tight, accessible grid."
            />
            <Feature
              icon={<Terminal className="h-5 w-5" />}
              title="SQL editor"
              body="Run ad-hoc queries with a 30s timeout and clear execution stats."
            />
            <Feature
              icon={<Lock className="h-5 w-5" />}
              title="Encrypted at rest"
              body="Connection strings are encrypted with AES-256-GCM before storage."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Strata</span>
          <span>Built for developers.</span>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
        {body}
      </p>
    </div>
  );
}
