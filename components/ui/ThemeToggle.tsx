"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * Light/dark toggle. Renders a neutral placeholder until mounted to avoid
 * hydration mismatch — next-themes only resolves the theme on the client.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  if (!mounted) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)]",
          className
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
        className
      )}
    >
      <Sun
        className={cn(
          "absolute h-4 w-4 transition-[opacity,transform] duration-200",
          isDark
            ? "scale-75 opacity-0"
            : "scale-100 opacity-100"
        )}
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 transition-[opacity,transform] duration-200",
          isDark
            ? "scale-100 opacity-100"
            : "scale-75 opacity-0"
        )}
      />
    </button>
  );
}
