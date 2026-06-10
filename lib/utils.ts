import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number | string | null | undefined): string {
  if (bytes === null || bytes === undefined) return "—";
  const n = typeof bytes === "string" ? Number(bytes) : bytes;
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const value = n / Math.pow(1024, i);
  return `${value.toFixed(value < 10 && i > 0 ? 2 : 1)} ${units[i]}`;
}

export function relativeTime(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/**
 * Detect macOS so we can render ⌘ vs Ctrl in keyboard hints. Falls back
 * gracefully when navigator.platform is empty (Chrome privacy-budget mode
 * and most modern browsers eventually).
 */
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  type WithUAData = Navigator & {
    userAgentData?: { platform?: string };
  };
  const uad = (navigator as WithUAData).userAgentData;
  const candidate =
    uad?.platform ||
    navigator.platform ||
    navigator.userAgent ||
    "";
  return /Mac|iPhone|iPad/i.test(candidate);
}
