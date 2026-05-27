"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Info, Pencil } from "lucide-react";
import { Schema, type SchemaTable } from "@/components/bahrawy/schema";
import { cn } from "@/lib/utils";

type Mode = "view" | "edit";

export function SchemaCanvas({
  connectionId,
  initialTables,
}: {
  connectionId: string;
  initialTables: SchemaTable[];
}) {
  // Suppress unused-warning — connectionId is held for future "save layout"
  // mutations even though Edit mode is local-only right now.
  void connectionId;

  const [mode, setMode] = useState<Mode>("view");
  const [tables, setTables] = useState<SchemaTable[]>(initialTables);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [canvasHeight, setCanvasHeight] = useState(600);

  // Resize the canvas to fill remaining viewport height under the toolbar.
  useEffect(() => {
    function measure() {
      if (!wrapRef.current) return;
      const top = wrapRef.current.getBoundingClientRect().top;
      const h = Math.max(360, window.innerHeight - top - 16);
      setCanvasHeight(h);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Keep tables in sync if the server-side initial set changes (e.g. after
  // navigating to a different demo connection or a real one with new tables).
  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar — matches the other DB pages' header style */}
      <div className="flex items-center justify-between gap-4 border-b border-border bg-card/30 px-6 py-3">
        <div className="min-w-0">
          <h1 className="text-base font-medium">Schema</h1>
          <p className="text-xs text-muted-foreground">
            {tables.length} table{tables.length === 1 ? "" : "s"}
            {" · "}
            {tables.reduce(
              (n, t) =>
                n +
                t.columns.filter((c) => Boolean(c.references)).length,
              0
            )}{" "}
            relationship
            {tables.reduce(
              (n, t) =>
                n +
                t.columns.filter((c) => Boolean(c.references)).length,
              0
            ) === 1
              ? ""
              : "s"}
          </p>
        </div>
        <div
          role="group"
          aria-label="Schema mode"
          className="inline-flex rounded-md border border-border bg-card p-0.5 text-sm"
        >
          <ModeButton
            active={mode === "view"}
            onClick={() => setMode("view")}
            icon={<Eye className="h-3.5 w-3.5" />}
          >
            View
          </ModeButton>
          <ModeButton
            active={mode === "edit"}
            onClick={() => setMode("edit")}
            icon={<Pencil className="h-3.5 w-3.5" />}
          >
            Edit
          </ModeButton>
        </div>
      </div>

      {/* Edit-mode notice */}
      {mode === "edit" && (
        <div className="flex items-start gap-2 border-b border-border bg-[var(--accent-muted)] px-6 py-2 text-xs text-[var(--accent)]">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>
            Edit mode repositions your diagram only. No database changes are
            made.
          </span>
        </div>
      )}

      <div ref={wrapRef} className="flex-1 min-h-0 p-4">
        {tables.length === 0 ? (
          <div className="grid h-full place-items-center rounded-lg border border-dashed border-border bg-card/30 text-sm text-muted-foreground">
            No tables in this database yet.
          </div>
        ) : mode === "edit" ? (
          <Schema
            tables={tables}
            onTablesChange={setTables}
            width="100%"
            height={canvasHeight}
            showTypes
          />
        ) : (
          <Schema
            tables={tables}
            width="100%"
            height={canvasHeight}
            showTypes
          />
        )}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-[var(--accent-muted)] text-[var(--accent)]"
          : "text-muted-foreground hover:bg-[var(--bg-elevated)] hover:text-foreground"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
