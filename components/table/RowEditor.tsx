"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  insertRow,
  updateRow,
  type TableRow,
} from "@/server/actions/table";
import type { ColumnInfo } from "@/server/actions/schema";
import {
  inputTypeFor,
  parseInputValue,
  valueToInputString,
} from "./cell-utils";

type Mode =
  | { kind: "insert" }
  | { kind: "edit"; row: TableRow; primaryKey: string };

export function RowEditor({
  connectionId,
  tableName,
  columns,
  mode,
  onClose,
  onSuccess,
}: {
  connectionId: string;
  tableName: string;
  columns: ColumnInfo[];
  mode: Mode;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const c of columns) {
      if (mode.kind === "edit") {
        initial[c.name] = valueToInputString(mode.row[c.name]);
      } else {
        initial[c.name] = "";
      }
    }
    return initial;
  });
  const [nullFlags, setNullFlags] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const c of columns) {
      if (mode.kind === "edit") {
        initial[c.name] = mode.row[c.name] === null;
      } else {
        initial[c.name] = false;
      }
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload: Record<string, unknown> = {};
      for (const c of columns) {
        if (mode.kind === "insert" && c.isPrimaryKey && c.defaultValue) {
          // skip primary keys with defaults on insert
          if (values[c.name] === "") continue;
        }
        if (nullFlags[c.name]) {
          if (!c.isNullable) continue;
          payload[c.name] = null;
          continue;
        }
        if (values[c.name] === "" && mode.kind === "insert") {
          // skip empty on insert; let defaults apply
          continue;
        }
        payload[c.name] = parseInputValue(
          values[c.name],
          c.dataType,
          c.isNullable
        );
      }

      const result =
        mode.kind === "insert"
          ? await insertRow({
              connectionId,
              tableName,
              values: payload,
            })
          : await updateRow({
              connectionId,
              tableName,
              primaryKeyColumn: mode.primaryKey,
              primaryKeyValue: mode.row[mode.primaryKey],
              values: payload,
            });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onSuccess();
    });
  }

  const title = mode.kind === "insert" ? "Insert row" : "Edit row";

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md h-full bg-card border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 h-14 border-b border-border">
          <div>
            <h2 className="text-sm font-medium">{title}</h2>
            <p className="text-xs text-muted-foreground">{tableName}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex-1 flex flex-col min-h-0"
          noValidate
        >
          <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
            {columns.map((c) => {
              const type = inputTypeFor(c.dataType);
              const isLongText =
                type === "text" &&
                (c.dataType === "text" || c.dataType.startsWith("json"));
              const disabled =
                submitting ||
                (mode.kind === "edit" && c.name === mode.primaryKey);
              return (
                <div key={c.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`col-${c.name}`} className="text-xs">
                      <span className="font-mono">{c.name}</span>
                      <span className="ml-2 font-normal text-muted-foreground">
                        {c.dataType}
                      </span>
                      {c.isPrimaryKey && (
                        <span className="ml-1.5 text-[10px] uppercase text-primary">
                          PK
                        </span>
                      )}
                    </Label>
                    {c.isNullable && (
                      <label className="flex items-center gap-1 text-[11px] text-muted-foreground select-none">
                        <input
                          type="checkbox"
                          checked={nullFlags[c.name]}
                          onChange={(e) =>
                            setNullFlags((s) => ({
                              ...s,
                              [c.name]: e.target.checked,
                            }))
                          }
                          disabled={disabled}
                          className="size-3"
                        />
                        NULL
                      </label>
                    )}
                  </div>
                  {nullFlags[c.name] ? (
                    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground italic">
                      NULL
                    </div>
                  ) : isLongText ? (
                    <Textarea
                      id={`col-${c.name}`}
                      value={values[c.name]}
                      onChange={(e) =>
                        setValues((s) => ({
                          ...s,
                          [c.name]: e.target.value,
                        }))
                      }
                      rows={3}
                      disabled={disabled}
                      className="font-mono text-xs"
                      spellCheck={false}
                    />
                  ) : type === "checkbox" ? (
                    <div className="flex items-center gap-2 py-1">
                      <input
                        id={`col-${c.name}`}
                        type="checkbox"
                        checked={values[c.name] === "true"}
                        onChange={(e) =>
                          setValues((s) => ({
                            ...s,
                            [c.name]: e.target.checked ? "true" : "false",
                          }))
                        }
                        disabled={disabled}
                        className="size-4"
                      />
                      <span className="text-xs text-muted-foreground">
                        {values[c.name] === "true" ? "true" : "false"}
                      </span>
                    </div>
                  ) : (
                    <Input
                      id={`col-${c.name}`}
                      type={type}
                      value={values[c.name]}
                      onChange={(e) =>
                        setValues((s) => ({
                          ...s,
                          [c.name]: e.target.value,
                        }))
                      }
                      placeholder={c.defaultValue ?? ""}
                      disabled={disabled}
                      className="font-mono text-xs"
                      spellCheck={false}
                    />
                  )}
                </div>
              );
            })}

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : mode.kind === "insert" ? (
                "Insert row"
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
