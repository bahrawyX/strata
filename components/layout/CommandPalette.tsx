"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Activity,
  CreditCard,
  Database,
  GitBranch,
  Moon,
  Plus,
  Search,
  Sparkles,
  Star,
  Sun,
  Table2,
  Terminal,
  Users,
} from "lucide-react";
import { CmdBar, type CmdBarGroup } from "@/components/bahrawy/cmd-bar";

type TableLink = { name: string; connectionId: string };
type SavedLink = { id: string; name: string; connectionId: string };

type Props = {
  tables: TableLink[];
  savedQueries: SavedLink[];
};

/**
 * Global Cmd/Ctrl+K command palette. Mounted once per dashboard layout.
 * Reads its source data from server props (tables + saved queries scoped
 * to whichever connection the user is currently on; routes + theme +
 * sign-out are static).
 */
export function CommandPalette({ tables, savedQueries }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  // Hotkey listener: Cmd+K on macOS, Ctrl+K elsewhere. We let the bahrawy
  // CmdBar own Esc and arrow keys once it's open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Extract the connectionId from the current URL so table / saved-query
  // hits go to the right place. Falls back to whatever's in the props.
  const currentConnectionId = useMemo(() => {
    const match = pathname.match(/\/db\/([0-9a-fA-F-]{36})/);
    return match?.[1] ?? tables[0]?.connectionId ?? null;
  }, [pathname, tables]);

  const groups: CmdBarGroup[] = useMemo(() => {
    const tablesGroup: CmdBarGroup = {
      label: "Tables",
      items: tables.map((t) => ({
        id: `table:${t.connectionId}:${t.name}`,
        label: t.name,
        hint: "Open table",
        icon: <Table2 className="h-4 w-4 text-muted-foreground" />,
        keywords: ["table", t.name],
        onSelect: () =>
          router.push(
            `/db/${t.connectionId}/table/${encodeURIComponent(t.name)}`
          ),
      })),
    };
    const savedGroup: CmdBarGroup = {
      label: "Saved queries",
      items: savedQueries.map((q) => ({
        id: `saved:${q.id}`,
        label: q.name,
        hint: "Load into editor",
        icon: <Star className="h-4 w-4 text-amber-400" />,
        keywords: ["query", "saved", q.name],
        onSelect: () =>
          router.push(
            `/db/${q.connectionId}/query?load=${encodeURIComponent(q.id)}`
          ),
      })),
    };

    const navGroup: CmdBarGroup = {
      label: "Navigate",
      items: [
        {
          id: "nav:connections",
          label: "Connections",
          hint: "All your databases",
          icon: <Database className="h-4 w-4 text-muted-foreground" />,
          keywords: ["connections", "home"],
          onSelect: () => router.push("/connections"),
        },
        {
          id: "nav:new-connection",
          label: "New connection",
          hint: "Add a Postgres",
          icon: <Plus className="h-4 w-4 text-muted-foreground" />,
          keywords: ["add", "new", "connection"],
          onSelect: () => router.push("/connections/new"),
        },
        ...(currentConnectionId
          ? [
              {
                id: "nav:editor",
                label: "SQL editor",
                hint: "Run a query",
                icon: <Terminal className="h-4 w-4 text-muted-foreground" />,
                keywords: ["sql", "editor", "query"],
                onSelect: () =>
                  router.push(`/db/${currentConnectionId}/query`),
              },
              {
                id: "nav:schema",
                label: "Schema",
                hint: "View the ER diagram",
                icon: <GitBranch className="h-4 w-4 text-muted-foreground" />,
                keywords: ["schema", "diagram", "er"],
                onSelect: () =>
                  router.push(`/db/${currentConnectionId}/schema`),
              },
              {
                id: "nav:queries",
                label: "Saved & history",
                hint: "Queries tab",
                icon: <Star className="h-4 w-4 text-muted-foreground" />,
                keywords: ["saved", "history"],
                onSelect: () =>
                  router.push(`/db/${currentConnectionId}/queries`),
              },
              {
                id: "nav:activity",
                label: "Activity",
                hint: "Audit log",
                icon: <Activity className="h-4 w-4 text-muted-foreground" />,
                keywords: ["activity", "audit", "log"],
                onSelect: () =>
                  router.push(`/db/${currentConnectionId}/activity`),
              },
            ]
          : []),
        {
          id: "nav:team",
          label: "Team settings",
          hint: "Members + invites",
          icon: <Users className="h-4 w-4 text-muted-foreground" />,
          keywords: ["team", "members", "invite"],
          onSelect: () => router.push("/settings/team"),
        },
        {
          id: "nav:billing",
          label: "Billing",
          hint: "Plan + invoices",
          icon: <CreditCard className="h-4 w-4 text-muted-foreground" />,
          keywords: ["billing", "plan", "subscription"],
          onSelect: () => router.push("/settings/billing"),
        },
      ],
    };

    const actionsGroup: CmdBarGroup = {
      label: "Actions",
      items: [
        {
          id: "action:theme",
          label:
            resolvedTheme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode",
          hint: "Theme",
          icon:
            resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-muted-foreground" />
            ),
          keywords: ["theme", "dark", "light", "appearance"],
          onSelect: () =>
            setTheme(resolvedTheme === "dark" ? "light" : "dark"),
        },
        {
          id: "action:copilot",
          label: "Ask the co-pilot",
          hint: "Plain English → SQL",
          icon: <Sparkles className="h-4 w-4 text-[var(--accent)]" />,
          keywords: ["ai", "co-pilot", "copilot", "ask"],
          onSelect: () => {
            if (currentConnectionId) {
              router.push(`/db/${currentConnectionId}/query?copilot=1`);
            }
          },
        },
      ],
    };

    return [
      navGroup,
      ...(tablesGroup.items.length > 0 ? [tablesGroup] : []),
      ...(savedGroup.items.length > 0 ? [savedGroup] : []),
      actionsGroup,
    ];
  }, [router, tables, savedQueries, currentConnectionId, resolvedTheme, setTheme]);

  return (
    <CmdBar
      open={open}
      onOpenChange={setOpen}
      groups={groups}
      placeholder="Search tables, queries, settings…"
      emptyMessage={
        <span className="flex items-center gap-2 text-muted-foreground">
          <Search className="h-3.5 w-3.5" /> Nothing matches. Try a different
          query.
        </span>
      }
    />
  );
}
