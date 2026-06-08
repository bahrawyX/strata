"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  GitBranch,
  LayoutDashboard,
  Star,
  Table2,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TableInfo } from "@/server/actions/schema";
import type { ConnectionHealth as ConnectionHealthType } from "@/server/actions/activity";
import type { Environment } from "@/lib/validations";
import { ConnectionHealth } from "./ConnectionHealth";
import { EnvironmentSettings } from "./EnvironmentSettings";

export function SchemaTree({
  connectionId,
  connectionName,
  tables,
  health,
  isDemo,
  environment,
  readOnly,
}: {
  connectionId: string;
  connectionName: string;
  tables: TableInfo[];
  health: ConnectionHealthType;
  isDemo: boolean;
  environment: Environment;
  readOnly: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card/30 flex flex-col h-full">
      <div className="px-4 py-4 border-b border-border space-y-2">
        <Link
          href="/connections"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          All connections
        </Link>
        <div
          className="text-sm font-medium truncate text-foreground"
          title={connectionName}
        >
          {connectionName}
        </div>
      </div>

      <ConnectionHealth
        connectionId={connectionId}
        isDemo={isDemo}
        initialHealth={health}
      />

      <EnvironmentSettings
        connectionId={connectionId}
        initialEnvironment={environment}
        initialReadOnly={readOnly}
        disabled={isDemo}
      />

      <nav className="px-3 py-3 flex flex-col gap-0.5">
        <NavItem
          href={`/db/${connectionId}`}
          icon={<LayoutDashboard className="h-3.5 w-3.5" />}
          active={pathname === `/db/${connectionId}`}
        >
          Overview
        </NavItem>
        <NavItem
          href={`/db/${connectionId}/query`}
          icon={<Terminal className="h-3.5 w-3.5" />}
          active={pathname === `/db/${connectionId}/query`}
        >
          SQL editor
        </NavItem>
        <NavItem
          href={`/db/${connectionId}/schema`}
          icon={<GitBranch className="h-3.5 w-3.5" />}
          active={pathname === `/db/${connectionId}/schema`}
        >
          Schema
        </NavItem>
        <NavItem
          href={`/db/${connectionId}/queries`}
          icon={<Star className="h-3.5 w-3.5" />}
          active={pathname === `/db/${connectionId}/queries`}
        >
          Saved
        </NavItem>
        <NavItem
          href={`/db/${connectionId}/activity`}
          icon={<Clock className="h-3.5 w-3.5" />}
          active={pathname === `/db/${connectionId}/activity`}
        >
          Activity
        </NavItem>
      </nav>

      <div className="px-4 pt-4 pb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground border-t border-border">
        Tables
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-4">
        {tables.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            No tables found.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {tables.map((t) => {
              const href = `/db/${connectionId}/table/${encodeURIComponent(
                t.name
              )}`;
              const active = pathname === href;
              return (
                <li key={`${t.schema}.${t.name}`}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors min-w-0",
                      active
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                    )}
                    title={`${t.schema}.${t.name}`}
                  >
                    <Table2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon,
  children,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm transition-colors",
        active
          ? "border-[var(--accent)] bg-[var(--accent-muted)] text-foreground"
          : "border-transparent text-muted-foreground hover:bg-[var(--bg-elevated)] hover:text-foreground"
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
