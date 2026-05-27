"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/#changelog", label: "Changelog" },
];

const TOP_THRESHOLD = 80;
const DELTA = 4;

/**
 * Floating pill navbar — always rounded-full. The center link group collapses
 * via `grid-template-columns: 1fr ↔ 0fr` when the user scrolls down past
 * 80px, and re-expands on any upward scroll. This mirrors the navbar from
 * bahrawy-picks.vercel.app and gives the "oval shape" effect: the pill
 * shrinks horizontally as the links hide.
 */
export function MarketingNavbar({ isAuthed }: { isAuthed: boolean }) {
  const [compact, setCompact] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      if (y < TOP_THRESHOLD) {
        setCompact(false);
      } else if (y > lastY + DELTA) {
        setCompact(true);
      } else if (y < lastY - DELTA) {
        setCompact(false);
      }
      lastY = y;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-fit -translate-x-1/2">
        <div className="pill-surface flex items-center gap-1 rounded-full px-2 py-1.5 transition-all duration-[450ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]">
          {/* Mobile menu button */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((s) => !s)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] md:hidden"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>

          {/* Brand */}
          <Link
            href="/"
            aria-label="Strata home"
            className="group inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)]/60"
          >
            <Logo size={18} showWordmark={false} />
            <span className="tracking-[0.12em] font-mono">STRATA</span>
          </Link>

          {/* Collapsible center — grid 1fr ↔ 0fr is the magic */}
          <div
            className={cn(
              "hidden overflow-hidden transition-[grid-template-columns,opacity] duration-[450ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] md:grid",
              compact
                ? "grid-cols-[0fr] opacity-0"
                : "grid-cols-[1fr] opacity-100"
            )}
            aria-hidden={compact}
          >
            <div className="flex min-w-0 items-center">
              <span
                aria-hidden
                className="mx-1 h-5 w-px shrink-0 bg-[var(--border-default)]/40"
              />
              <nav className="flex items-center gap-0.5 px-1">
                {LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    tabIndex={compact ? -1 : 0}
                    className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <span
                aria-hidden
                className="mx-1 h-5 w-px shrink-0 bg-[var(--border-default)]/40"
              />
            </div>
          </div>

          {/* Right side — theme + CTA */}
          <ThemeToggle />
          <Link
            href={isAuthed ? "/connections" : "/signup"}
            className="ml-0.5 inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full bg-[var(--accent)] px-3.5 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-[var(--accent-hover)]"
          >
            {isAuthed ? "Open app" : "Get started"}
          </Link>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 flex flex-col px-8 pt-24 pb-8 transition-[opacity,transform] duration-300 md:hidden",
          mobileOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        )}
        style={{ background: "var(--bg-base)" }}
      >
        {LINKS.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "border-b border-[var(--border-subtle)] py-3.5 font-display text-[32px] leading-none text-[var(--text-primary)] transition-[opacity,transform] duration-[400ms]",
              mobileOpen
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0"
            )}
            style={{
              transitionDelay: mobileOpen ? `${60 + i * 60}ms` : "0ms",
              transitionTimingFunction: "var(--ease-out-expo)",
            }}
          >
            {link.label}
          </Link>
        ))}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={isAuthed ? "/connections" : "/login"}
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border-default)] px-5 text-sm text-[var(--text-primary)]"
          >
            {isAuthed ? "Dashboard" : "Log in"}
          </Link>
          <Link
            href={isAuthed ? "/connections" : "/signup"}
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-5 text-sm font-medium text-white"
          >
            {isAuthed ? "Open app" : "Get started"}
          </Link>
        </div>
      </div>
    </>
  );
}
