"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
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
  arrayElementType,
  inputTypeFor,
  isArrayType,
  isIntervalType,
  isJsonType,
  isLongTextType,
  parseInputValue,
  validateJson,
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

  // JSON columns are flagged invalid here so we can disable submit + show an
  // inline error chip without an extra render pass per keystroke.
  const jsonErrors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const c of columns) {
      if (isJsonType(c.dataType) && !nullFlags[c.name]) {
        const v = validateJson(values[c.name]);
        if (!v.ok) out[c.name] = v.error;
      }
    }
    return out;
  }, [columns, values, nullFlags]);

  const hasJsonError = Object.keys(jsonErrors).length > 0;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (hasJsonError) {
      setError("One or more JSON fields are invalid. Fix them before saving.");
      return;
    }
    startTransition(async () => {
      const payload: Record<string, unknown> = {};
      for (const c of columns) {
        // Generated columns can never be written. Skip regardless of UI
        // state so a stale value can't sneak through.
        if (c.isGenerated) continue;

        if (mode.kind === "insert" && c.isPrimaryKey && c.defaultValue) {
          // Skip primary keys with server-side defaults on insert so the
          // db generates them.
          if (values[c.name] === "" && !nullFlags[c.name]) continue;
        }
        if (nullFlags[c.name]) {
          if (!c.isNullable) continue;
          payload[c.name] = null;
          continue;
        }
        if (values[c.name] === "" && mode.kind === "insert") {
          // Empty + insert + not-explicit-null = let server defaults apply.
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
              const isArray = isArrayType(c.dataType);
              const isJson = isJsonType(c.dataType);
              const isInterval = isIntervalType(c.dataType);
              const isLong = isLongTextType(c.dataType);
              const type = inputTypeFor(c.dataType);
              const disabled =
                submitting ||
                c.isGenerated ||
                (mode.kind === "edit" && c.name === mode.primaryKey);

              return (
                <div key={c.name} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
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
                      {c.isGenerated && (
                        <span
                          className="ml-1.5 inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1 py-px text-[10px] font-medium uppercase text-muted-foreground"
                          title="Generated column — value computed by Postgres, not editable."
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          Generated
                        </span>
                      )}
                    </Label>
                    {c.isNullable && !c.isGenerated && (
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
                  ) : c.isGenerated ? (
                    <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground font-mono">
                      {values[c.name] || "—"}
                    </div>
                  ) : isArray ? (
                    <ArrayField
                      id={`col-${c.name}`}
                      value={values[c.name]}
                      elementType={arrayElementType(c.dataType)}
                      disabled={disabled}
                      onChange={(v) =>
                        setValues((s) => ({ ...s, [c.name]: v }))
                      }
                    />
                  ) : isJson ? (
                    <JsonField
                      id={`col-${c.name}`}
                      value={values[c.name]}
                      error={jsonErrors[c.name] ?? null}
                      disabled={disabled}
                      onChange={(v) =>
                        setValues((s) => ({ ...s, [c.name]: v }))
                      }
                    />
                  ) : isInterval ? (
                    <Input
                      id={`col-${c.name}`}
                      type="text"
                      value={values[c.name]}
                      onChange={(e) =>
                        setValues((s) => ({
                          ...s,
                          [c.name]: e.target.value,
                        }))
                      }
                      placeholder="e.g. 1 day, 30 minutes"
                      disabled={disabled}
                      className="font-mono text-xs"
                      spellCheck={false}
                    />
                  ) : isLong ? (
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
            <Button
              type="submit"
              size="sm"
              disabled={submitting || hasJsonError}
              title={
                hasJsonError ? "Fix invalid JSON before saving." : undefined
              }
            >
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

// ---------------------------------------------------------------------------
// Sub-fields
// ---------------------------------------------------------------------------

function ArrayField({
  id,
  value,
  elementType,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  elementType: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const lines = value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return (
    <div className="space-y-1">
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={Math.max(3, Math.min(8, lines.length + 1))}
        disabled={disabled}
        placeholder={`One ${elementType} per line`}
        className="font-mono text-xs"
        spellCheck={false}
      />
      {lines.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {lines.slice(0, 12).map((line, i) => (
            <span
              key={i}
              className="inline-block max-w-[160px] truncate rounded border border-border bg-muted/40 px-1.5 py-px text-[10px] font-mono text-foreground"
              title={line}
            >
              {line}
            </span>
          ))}
          {lines.length > 12 && (
            <span className="text-[10px] text-muted-foreground">
              + {lines.length - 12} more
            </span>
          )}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        {lines.length} element{lines.length === 1 ? "" : "s"} ·{" "}
        {elementType}[]
      </p>
    </div>
  );
}

function JsonField({
  id,
  value,
  error,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  error: string | null;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        disabled={disabled}
        placeholder={"{}"}
        className={
          "font-mono text-xs " +
          (error ? "border-destructive/50 focus-visible:ring-destructive/30" : "")
        }
        spellCheck={false}
      />
      {error ? (
        <p className="text-[10px] font-mono text-destructive">
          Invalid JSON · {error}
        </p>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          {value.trim() === "" ? "Empty — will use NULL or default." : "Valid JSON."}
        </p>
      )}
    </div>
  );
}
