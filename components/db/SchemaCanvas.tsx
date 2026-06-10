"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Info, Maximize2, Minimize2, Pencil } from "lucide-react";
import { Schema, type SchemaTable } from "@/components/bahrawy/schema";
import { cn } from "@/lib/utils";

type Mode = "view" | "edit";

/**
 * Wrapper around the bahrawy <Schema /> with three quality-of-life
 * affordances on top of the raw library:
 *
 *  - SCROLL: the canvas is wider/taller than the viewport so larger
 *    schemas don't get clipped. The wrapping div is `overflow-auto`.
 *  - FULLSCREEN: a toggle that swaps the canvas into a fixed overlay
 *    spanning the whole viewport. Esc closes.
 *  - EDIT MODE: existing — local drag-only repositioning. Hover-jump
 *    that came with the upstream `whileHover={{ y: 0 }}` is fixed in
 *    components/bahrawy/schema.tsx.
 */
export function SchemaCanvas({
  initialTables,
}: {
  initialTables: SchemaTable[];
}) {
  const [mode, setMode] = useState<Mode>("view");
  const [tables, setTables] = useState<SchemaTable[]>(initialTables);
  const [fullscreen, setFullscreen] = useState(false);

  // Compute the inner canvas size. We want it always larger than the
  // current viewport so the parent's overflow-auto produces real scroll.
  const [canvasSize, setCanvasSize] = useState({ width: 1600, height: 1000 });

  const updateSize = useCallback(() => {
    if (typeof window === "undefined") return;
    // Take the larger of (a) the natural extent of the diagram (right-most
    // table x + width buffer; bottom-most y + height buffer) and (b) the
    // viewport. Falls back to a generous default for small schemas.
    const maxX = Math.max(...tables.map((t) => t.x ?? 0), 0);
    const maxY = Math.max(...tables.map((t) => t.y ?? 0), 0);
    const width = Math.max(window.innerWidth, maxX + 360);
    const height = Math.max(window.innerHeight, maxY + 360);
    setCanvasSize({ width, height });
  }, [tables]);

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [updateSize]);

  // Esc closes fullscreen.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  // Lock body scroll while fullscreen so it doesn't leak.
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  const relationshipCount = tables.reduce(
    (n, t) => n + t.columns.filter((c) => Boolean(c.references)).length,
    0
  );

  const toolbar = (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-card/30 px-6 py-3">
      <div className="min-w-0">
        <h1 className="text-base font-medium">Schema</h1>
        <p className="text-xs text-muted-foreground">
          {tables.length} table{tables.length === 1 ? "" : "s"}
          {" · "}
          {relationshipCount} relationship
          {relationshipCount === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex items-center gap-2">
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
        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-[var(--bg-elevated)] hover:text-foreground"
          title={fullscreen ? "Exit fullscreen (Esc)" : "View fullscreen"}
          aria-pressed={fullscreen}
        >
          {fullscreen ? (
            <>
              <Minimize2 className="h-3.5 w-3.5" />
              Exit
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" />
              Fullscreen
            </>
          )}
        </button>
      </div>
    </div>
  );

  const editNotice = mode === "edit" && (
    <div className="flex items-start gap-2 border-b border-border bg-[var(--accent-muted)] px-6 py-2 text-xs text-[var(--accent)]">
      <Info className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>
        Edit mode repositions your diagram only. No database changes are
        made.
      </span>
    </div>
  );

  const diagram = tables.length === 0 ? (
    <div className="grid h-full place-items-center rounded-lg border border-dashed border-border bg-card/30 text-sm text-muted-foreground">
      No tables in this database yet.
    </div>
  ) : mode === "edit" ? (
    <Schema
      tables={tables}
      onTablesChange={setTables}
      width={canvasSize.width}
      height={canvasSize.height}
      showTypes
    />
  ) : (
    <Schema
      tables={tables}
      width={canvasSize.width}
      height={canvasSize.height}
      showTypes
    />
  );

  // ---- Fullscreen overlay
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-background">
        {toolbar}
        {editNotice}
        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
          {diagram}
        </div>
      </div>
    );
  }

  // ---- Inline layout
  return (
    <div className="flex h-full min-h-0 flex-col">
      {toolbar}
      {editNotice}
      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        {diagram}
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
