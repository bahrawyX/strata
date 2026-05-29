"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  exportFilename,
  toCsv,
  toJson,
  type ExportFormat,
  type ExportField,
  type ExportRow,
} from "@/lib/export";
import { exportTableData } from "@/server/actions/export";

type LocalSource = {
  kind: "local";
  baseName: string;
  fields: ExportField[];
  rows: ExportRow[];
};

type TableSource = {
  kind: "table";
  connectionId: string;
  tableName: string;
  schema?: string;
};

export type ExportSource = LocalSource | TableSource;

type Props = {
  source: ExportSource;
  disabled?: boolean;
  size?: "sm" | "icon-sm";
};

/**
 * Dropdown button that exports either:
 *   - LOCAL data already in the client (query results) — serialized
 *     in-browser, no server roundtrip.
 *   - TABLE data — calls the export server action which re-runs the
 *     scan up to EXPORT_ROW_CAP rows and returns the serialized payload.
 *
 * Either path ends with the same browser-side Blob → <a download> trick.
 */
export function ExportButton({ source, disabled, size = "sm" }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Click-outside + Esc to close.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function triggerDownload(
    contents: string,
    filename: string,
    mime: string
  ) {
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function pickLocal(format: ExportFormat) {
    if (source.kind !== "local") return;
    setError(null);
    const contents =
      format === "csv"
        ? toCsv(source.fields, source.rows)
        : toJson(source.fields, source.rows);
    const filename = exportFilename(source.baseName, format);
    const mime =
      format === "csv" ? "text/csv; charset=utf-8" : "application/json";
    triggerDownload(contents, filename, mime);
    setOpen(false);
  }

  function pickServer(format: ExportFormat) {
    if (source.kind !== "table") return;
    setError(null);
    startTransition(async () => {
      const res = await exportTableData({
        connectionId: source.connectionId,
        tableName: source.tableName,
        schema: source.schema,
        format,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      triggerDownload(res.data.contents, res.data.filename, res.data.mime);
      setOpen(false);
    });
  }

  function pick(format: ExportFormat) {
    if (source.kind === "local") pickLocal(format);
    else pickServer(format);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <Button
        type="button"
        size={size}
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || pending}
        title="Download as CSV or JSON"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {size === "sm" && <span>Export</span>}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-md border border-border bg-popover shadow-lg",
            "text-sm"
          )}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => pick("csv")}
            disabled={pending}
            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/60"
          >
            <span>Download CSV</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              .csv
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => pick("json")}
            disabled={pending}
            className="flex w-full items-center justify-between border-t border-border px-3 py-2 text-left hover:bg-muted/60"
          >
            <span>Download JSON</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              .json
            </span>
          </button>
        </div>
      )}

      {error && (
        <p className="absolute right-0 mt-2 max-w-xs rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
