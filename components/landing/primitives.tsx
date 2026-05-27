import Link from "next/link";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Eyebrow({
  children,
  accent = false,
  className,
}: {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "eyebrow",
        accent && "eyebrow-accent",
        className
      )}
    >
      {children}
    </div>
  );
}

type BtnProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline";
  size?: "md" | "sm";
  className?: string;
};

export function Btn({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
}: BtnProps) {
  const base =
    "inline-flex items-center gap-2 rounded-md font-medium whitespace-nowrap transition-[background,color,border-color,box-shadow] duration-[220ms] [transition-timing-function:var(--ease-out-expo)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]";
  const sizes = {
    md: "h-11 px-5 text-sm",
    sm: "h-9 px-3.5 text-[13px]",
  } as const;
  const variants = {
    primary:
      "bg-[var(--accent)] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.10)] hover:bg-[var(--accent-hover)] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.10),0_8px_24px_var(--accent-glow)]",
    ghost:
      "text-[var(--text-secondary)] bg-transparent hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]",
    outline:
      "text-[var(--text-primary)] bg-transparent border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]",
  } as const;
  return (
    <Link
      href={href}
      className={cn(base, sizes[size], variants[variant], className)}
    >
      {children}
    </Link>
  );
}
