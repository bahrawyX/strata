"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { Dialog } from "@/components/bahrawy/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveQuery } from "@/server/actions/saved-queries";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  query: string;
  onSaved?: () => void;
};

export function SaveQueryDialog({
  open,
  onOpenChange,
  connectionId,
  query,
  onSaved,
}: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  function submit() {
    if (!name.trim() || saving) return;
    setError(null);
    startTransition(async () => {
      const res = await saveQuery({
        connectionId,
        name: name.trim(),
        query,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setName("");
      onSaved?.();
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Save query"
      description="Saved queries appear in the sidebar and stay scoped to this connection. Star them to pin to the top."
      footer={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={saving || !name.trim() || !query.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save query
              </>
            )}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor="saved-query-name" className="text-xs">
            Name
          </Label>
          <Input
            id="saved-query-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Active users · last 30 days"
            maxLength={120}
            autoFocus
            spellCheck={false}
          />
          <p className="text-[10px] text-muted-foreground">
            {name.length}/120
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Query preview
          </Label>
          <pre className="max-h-32 overflow-auto rounded-md border border-border bg-muted/30 p-2 font-mono text-[11px] leading-relaxed text-foreground scrollbar-thin">
            {query.trim() || "(empty)"}
          </pre>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </form>
    </Dialog>
  );
}
