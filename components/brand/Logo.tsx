import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="7" fill="#6366F1" />
        <path
          d="M9 21.5C9 22.3284 9.67157 23 10.5 23H21.5C22.3284 23 23 22.3284 23 21.5V20H9V21.5Z"
          fill="white"
          fillOpacity="0.55"
        />
        <path
          d="M9 16.5C9 17.3284 9.67157 18 10.5 18H21.5C22.3284 18 23 17.3284 23 16.5V15H9V16.5Z"
          fill="white"
          fillOpacity="0.8"
        />
        <path
          d="M9 11.5C9 10.6716 9.67157 10 10.5 10H21.5C22.3284 10 23 10.6716 23 11.5V13H9V11.5Z"
          fill="white"
        />
      </svg>
      <span className="text-base font-semibold tracking-tight text-foreground">
        Strata
      </span>
    </div>
  );
}
