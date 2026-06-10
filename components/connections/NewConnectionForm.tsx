"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { newConnectionSchema } from "@/lib/validations";
import {
  createConnection,
  type ConnectionSummary,
} from "@/server/actions/connections";
import type { ActionResult } from "@/lib/server-actions";

type DbType = "neon" | "supabase" | "postgres";

const DB_TYPES: { value: DbType; label: string }[] = [
  { value: "neon", label: "Neon" },
  { value: "supabase", label: "Supabase" },
  { value: "postgres", label: "PostgreSQL" },
];

type NewConnectionInput = {
  name: string;
  connectionString: string;
  dbType: DbType;
};

export type NewConnectionFormProps = {
  /**
   * Override the submission handler. Defaults to the `createConnection`
   * server action. Tests inject a mock to verify the form's loading and
   * error states without touching the real backend.
   */
  onSubmit?: (
    input: NewConnectionInput
  ) => Promise<ActionResult<ConnectionSummary>>;
};

// Default export kept for ergonomic test imports
// (`import NewConnectionForm from '@/components/connections/NewConnectionForm'`).
export default function NewConnectionForm({
  onSubmit: onSubmitProp,
}: NewConnectionFormProps = {}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [connectionString, setConnectionString] = useState("");
  const [dbType, setDbType] = useState<DbType>("neon");
  const [showFullString, setShowFullString] = useState(true);
  const [errors, setErrors] = useState<{
    name?: string;
    connectionString?: string;
    dbType?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, startTransition] = useTransition();

  function validate(field?: "name" | "connectionString" | "dbType") {
    const result = newConnectionSchema.safeParse({
      name,
      connectionString,
      dbType,
    });
    if (result.success) {
      if (field) setErrors((e) => ({ ...e, [field]: undefined }));
      else setErrors({});
      return true;
    }
    if (field) {
      const issue = result.error.issues.find((i) => i.path[0] === field);
      setErrors((e) => ({ ...e, [field]: issue?.message }));
    } else {
      const next: typeof errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof typeof errors;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
    }
    return false;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    startTransition(async () => {
      const submit = onSubmitProp ?? createConnection;
      const result = await submit({
        name,
        connectionString,
        dbType,
      });
      if ("error" in result) {
        setFormError(result.error);
        return;
      }
      router.push(`/db/${result.data.id}`);
      router.refresh();
    });
  }

  const maskedDisplay = showFullString
    ? connectionString
    : connectionString.length > 30
      ? connectionString.slice(0, 30) + "…"
      : connectionString;

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-2xl" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">Connection name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => validate("name")}
          placeholder="Production database"
          aria-invalid={Boolean(errors.name)}
          disabled={submitting}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Database type</Label>
        <div
          role="radiogroup"
          aria-label="Database type"
          className="inline-flex rounded-md border border-border bg-card p-0.5"
        >
          {DB_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={dbType === t.value}
              onClick={() => setDbType(t.value)}
              disabled={submitting}
              className={cn(
                "px-3 py-1.5 text-sm rounded-[5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                dbType === t.value
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="connectionString">Connection string</Label>
          {connectionString.length > 30 && (
            <button
              type="button"
              onClick={() => setShowFullString((s) => !s)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showFullString ? "Mask" : "Reveal"}
            </button>
          )}
        </div>
        <Textarea
          id="connectionString"
          value={showFullString ? connectionString : maskedDisplay}
          onChange={(e) => setConnectionString(e.target.value)}
          onBlur={() => validate("connectionString")}
          placeholder="postgresql://user:password@host:5432/dbname"
          rows={3}
          aria-invalid={Boolean(errors.connectionString)}
          disabled={submitting}
          spellCheck={false}
          className="font-mono text-xs"
          readOnly={!showFullString}
        />
        {errors.connectionString && (
          <p className="text-xs text-destructive">{errors.connectionString}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Your connection string is encrypted with AES-256-GCM before storage.
          We never log or expose it.
        </p>
      </div>

      {formError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing & saving…
            </>
          ) : (
            "Test & save"
          )}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="ghost"
          onClick={() => router.push("/connections")}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Named re-export so existing imports keep working alongside the new default.
export { NewConnectionForm };
