"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Database, Plus, Users } from "lucide-react";
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

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-card/30 hidden md:flex flex-col">
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
    </aside>
  );
}
