"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";

const LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Changelog", href: "/#changelog" },
];

export function MarketingNavbar({ isAuthed }: { isAuthed: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 h-16 flex items-center transition-[background,backdrop-filter,border-color] duration-[220ms]",
          scrolled
            ? "bg-[rgba(8,8,16,0.78)] backdrop-blur-xl border-b border-[var(--border-subtle)]"
            : "bg-transparent border-b border-transparent"
        )}
      >
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-8 px-8">
          <Link
            href="/"
            aria-label="Strata home"
            className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Logo />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden md:flex flex-1 items-center justify-center gap-1"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded px-3.5 py-2 text-sm text-[var(--text-secondary)] transition-colors duration-[120ms] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link
              href={isAuthed ? "/connections" : "/login"}
              className="inline-flex h-9 items-center gap-2 rounded-md px-3.5 text-sm text-[var(--text-secondary)] transition-colors duration-[220ms] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            >
              {isAuthed ? "Dashboard" : "Log in"}
            </Link>
            <Link
              href={isAuthed ? "/connections" : "/signup"}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent)] px-3.5 text-sm font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.10)] transition-[background,box-shadow] duration-[220ms] hover:bg-[var(--accent-hover)] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.10),0_8px_24px_var(--accent-glow)]"
            >
              {isAuthed ? "Open app" : "Get started"}
            </Link>
          </div>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((s) => !s)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile overlay menu */}
      <div
        className={cn(
          "fixed inset-0 z-40 flex flex-col px-8 pt-20 pb-8 transition-[opacity,transform] duration-[220ms] md:hidden",
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        )}
        style={{ background: "var(--bg-base)" }}
      >
        {LINKS.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={cn(
              "border-b border-[var(--border-subtle)] py-3.5 font-display text-[32px] leading-none text-[var(--text-primary)] transition-[opacity,transform] duration-[400ms]",
              open
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            )}
            style={{
              transitionDelay: open ? `${60 + i * 60}ms` : "0ms",
              transitionTimingFunction: "var(--ease-out-expo)",
            }}
          >
            {link.label}
          </Link>
        ))}
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={isAuthed ? "/connections" : "/login"}
            onClick={() => setOpen(false)}
            className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border-default)] px-5 text-sm text-[var(--text-primary)]"
          >
            {isAuthed ? "Dashboard" : "Log in"}
          </Link>
          <Link
            href={isAuthed ? "/connections" : "/signup"}
            onClick={() => setOpen(false)}
            className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-5 text-sm font-medium text-white"
          >
            {isAuthed ? "Open app" : "Get started"}
          </Link>
        </div>
      </div>
    </>
  );
}
