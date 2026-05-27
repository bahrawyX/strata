import { cn } from "@/lib/utils";

/**
 * Strata mark — five stacked horizontal bars, evoking sedimentary strata.
 * Indigo top bar (accent), the rest in foreground with descending opacity.
 * Verbatim from the Claude Design handoff (`_design/project/assets/logo.svg`).
 */
export function Logo({
  className,
  size = 22,
  showWordmark = true,
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 text-[14px] tracking-[0.12em] font-mono font-medium text-foreground",
        className
      )}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="4" y="6" width="24" height="2" rx="0.5" fill="#6366F1" />
        <rect
          x="6"
          y="11"
          width="20"
          height="2"
          rx="0.5"
          fill="#F1F5F9"
          opacity="0.95"
        />
        <rect
          x="4"
          y="16"
          width="24"
          height="2"
          rx="0.5"
          fill="#F1F5F9"
          opacity="0.65"
        />
        <rect
          x="8"
          y="21"
          width="16"
          height="2"
          rx="0.5"
          fill="#F1F5F9"
          opacity="0.35"
        />
        <rect
          x="6"
          y="26"
          width="20"
          height="2"
          rx="0.5"
          fill="#F1F5F9"
          opacity="0.18"
        />
      </svg>
      {showWordmark && <span>STRATA</span>}
    </div>
  );
}
