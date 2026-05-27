import { cn } from "@/lib/utils";

const STYLES: Record<string, { label: string; className: string }> = {
  neon: {
    label: "Neon",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  supabase: {
    label: "Supabase",
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  postgres: {
    label: "Postgres",
    className: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  },
};

export function DbTypeBadge({ type }: { type: string }) {
  const style = STYLES[type] ?? STYLES.postgres;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        style.className
      )}
    >
      {style.label}
    </span>
  );
}
