"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  CreditCard,
  Database,
  Menu,
  Plus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/connections", label: "Connections", icon: Database },
  { href: "/connections/new", label: "New connection", icon: Plus },
];

const accountItems = [
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the sheet whenever the route changes (Link clicks finish).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Esc closes the sheet + lock body scroll while it's open.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile-only hamburger (below md). Lives in the page corner since
          the Topbar is already busy and a chip there would crowd the
          theme toggle on small screens. */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed left-3 top-3 z-30 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card/80 backdrop-blur-sm text-foreground hover:bg-card"
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Desktop rail */}
      <aside className="w-60 shrink-0 border-r border-border bg-card/30 hidden md:flex flex-col">
        <NavList pathname={pathname} />
      </aside>

      {/* Mobile sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <motion.div
              key="sheet-backdrop"
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            />
            <motion.aside
              key="sheet-panel"
              className="relative z-10 w-64 max-w-[80vw] h-full border-r border-border bg-card shadow-2xl flex flex-col"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Strata
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <NavList pathname={pathname} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavList({ pathname }: { pathname: string }) {
  return (
    <nav className="p-3 flex flex-col gap-0.5">
      <div className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Workspace
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href === "/connections" && pathname.startsWith("/db/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}

      <div className="mt-4 px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Account
      </div>
      {accountItems.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
