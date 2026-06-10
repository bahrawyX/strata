"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "motion/react";
import { formatCellValue } from "./cell-utils";
import { RowEditor } from "./RowEditor";
import { ExportButton } from "@/components/query/ExportButton";
import { UndoToast, type PendingUndo } from "./UndoToast";
import type {
  TableDataResult,
  TableRow,
} from "@/server/actions/table";
import { deleteRow } from "@/server/actions/table";
import type { ColumnInfo } from "@/server/actions/schema";

type EditorState =
  | null
  | { kind: "insert" }
  | { kind: "edit"; row: TableRow; primaryKey: string };

const PAGE_SIZES = [25, 50, 100];

export function DataGrid({
  connectionId,
  tableName,
  data,
}: {
  connectionId: string;
  tableName: string;
  data: TableDataResult;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<EditorState>(null);
  const [confirmingRow, setConfirmingRow] = useState<number | null>(null);
  const [deleting, startDeleting] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function setPage(page: number) {
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(page));
    router.push(url.pathname + url.search);
  }

  function setPageSize(size: number) {
    const url = new URL(window.location.href);
    url.searchParams.set("pageSize", String(size));
    url.searchParams.set("page", "1");
    router.push(url.pathname + url.search);
  }

  function handleDelete(row: TableRow) {
    if (!data.primaryKey) return;
    startDeleting(async () => {
      const result = await deleteRow({
        connectionId,
        tableName,
        primaryKeyColumn: data.primaryKey!,
        primaryKeyValue: row[data.primaryKey!],
        isConfirmed: true,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setConfirmingRow(null);
      if (result.data.undo) {
        setPendingUndo({
          id: result.data.undo.id,
          tableName: result.data.undo.tableName,
          operation: result.data.undo.operation,
          expiresAt: result.data.undo.expiresAt,
        });
      }
      router.refresh();
    });
  }

  function onEditorClose() {
    setEditor(null);
  }

  function onEditorSuccess(undo?: PendingUndo | null) {
    setEditor(null);
    if (undo) setPendingUndo(undo);
    router.refresh();
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-card/30">
        <div className="min-w-0">
          <h1 className="text-base font-medium font-mono truncate">
            {tableName}
          </h1>
          <p className="text-xs text-muted-foreground">
            {data.total.toLocaleString()} row{data.total === 1 ? "" : "s"}
            {data.primaryKey ? (
              <>
                {" · primary key "}
                <span className="font-mono text-foreground">
                  {data.primaryKey}
                </span>
              </>
            ) : (
              " · no primary key"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            source={{
              kind: "table",
              connectionId,
              tableName,
            }}
          />
          <Button
            size="sm"
            onClick={() => setEditor({ kind: "insert" })}
            disabled={!data.primaryKey && data.columns.length === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            Insert row
          </Button>
        </div>
      </div>

      {error && (
        <div className="px-6 py-2 border-b border-destructive/40 bg-destructive/10 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        <table className="min-w-full text-xs border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-md">
            <tr>
              {data.columns.map((c) => (
                <th
                  key={c.name}
                  className={cn(
                    "text-left px-4 py-3 font-medium whitespace-nowrap border-b border-border align-bottom",
                    c.isPrimaryKey && "border-l-2 border-l-[var(--accent)]/60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] text-foreground">
                      {c.name}
                    </span>
                    <span className="rounded-full border border-border bg-muted/50 px-1.5 py-px text-[9px] uppercase tracking-wider text-foreground/75">
                      {c.dataType}
                    </span>
                    {c.isPrimaryKey && (
                      <span className="rounded border border-[var(--accent)]/40 bg-[var(--accent-muted)] px-1.5 py-px text-[9px] uppercase tracking-wider text-[var(--accent)]">
                        PK
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-24 border-b border-border" />
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={data.columns.length + 1}
                  className="px-3 py-12 text-center text-muted-foreground"
                >
                  No rows.
                </td>
              </tr>
            ) : (
              data.rows.map((row, i) => (
                <Row
                  key={i}
                  index={i}
                  row={row}
                  columns={data.columns}
                  primaryKey={data.primaryKey}
                  isConfirming={confirmingRow === i}
                  deleting={deleting && confirmingRow === i}
                  onEdit={() =>
                    data.primaryKey &&
                    setEditor({
                      kind: "edit",
                      row,
                      primaryKey: data.primaryKey,
                    })
                  }
                  onAskDelete={() => setConfirmingRow(i)}
                  onCancelDelete={() => setConfirmingRow(null)}
                  onConfirmDelete={() => handleDelete(row)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-border bg-card/30 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rows per page:</span>
          <div className="inline-flex rounded-md border border-border bg-card p-0.5">
            {PAGE_SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setPageSize(s)}
                className={cn(
                  "px-2 py-1 text-xs rounded-[4px] transition-colors",
                  s === data.pageSize
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            Page {data.page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage(Math.max(1, data.page - 1))}
              disabled={data.page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage(Math.min(totalPages, data.page + 1))}
              disabled={data.page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editor && (
          <RowEditor
            connectionId={connectionId}
            tableName={tableName}
            columns={data.columns}
            mode={editor}
            onClose={onEditorClose}
            onSuccess={onEditorSuccess}
          />
        )}
      </AnimatePresence>

      <UndoToast
        undo={pendingUndo}
        onDismiss={() => setPendingUndo(null)}
      />
    </div>
  );
}

function Row({
  index,
  row,
  columns,
  primaryKey,
  isConfirming,
  deleting,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  index: number;
  row: TableRow;
  columns: ColumnInfo[];
  primaryKey: string | null;
  isConfirming: boolean;
  deleting: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const zebra = index % 2 === 1 ? "bg-muted/15" : "";
  return (
    <tr
      className={cn(
        "group transition-colors hover:bg-[var(--accent-muted)]/40",
        zebra
      )}
    >
      {columns.map((c) => {
        const cell = formatCellValue(row[c.name]);
        return (
          <td
            key={c.name}
            className={cn(
              "px-4 py-2.5 align-middle font-mono whitespace-nowrap border-b border-border/60",
              c.isPrimaryKey && "border-l-2 border-l-[var(--accent)]/40"
            )}
            title={cell.full}
          >
            {cell.isNull ? (
              <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-foreground/80">
                NULL
              </span>
            ) : (
              <span className="text-foreground">{cell.display}</span>
            )}
          </td>
        );
      })}
      <td className="px-3 py-2 text-right border-b border-border/60">
        {isConfirming ? (
          <div className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-1 py-0.5">
            <span className="text-[11px] text-foreground px-1">Delete?</span>
            <Button
              variant="ghost"
              size="xs"
              onClick={onCancelDelete}
              disabled={deleting}
            >
              No
            </Button>
            <Button
              variant="destructive"
              size="xs"
              onClick={onConfirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Yes"
              )}
            </Button>
          </div>
        ) : (
          <div className="opacity-40 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity inline-flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onEdit}
              disabled={!primaryKey}
              aria-label="Edit row"
              title={primaryKey ? "Edit row" : "No primary key — cannot edit"}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onAskDelete}
              disabled={!primaryKey}
              aria-label="Delete row"
              title={
                primaryKey ? "Delete row" : "No primary key — cannot delete"
              }
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}
