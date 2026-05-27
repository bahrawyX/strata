"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  Database,
  Lock,
  Pencil,
  Plug,
  Search,
  Table2,
  Terminal,
  CheckCircle2,
} from "lucide-react";

type Step = {
  index: string;
  title: string;
  body: string;
  visual: React.ReactNode;
};

const STEPS: Step[] = [
  {
    index: "01",
    title: "Paste a connection string.",
    body: "Bring any Postgres — Neon, Supabase, RDS, self-hosted. We test it before saving and encrypt it with AES-256-GCM.",
    visual: <ConnectVisual />,
  },
  {
    index: "02",
    title: "Browse every table.",
    body: "Schema tree on the left, paginated grid on the right. Primary keys, types, NULLs — all where they should be.",
    visual: <BrowseVisual />,
  },
  {
    index: "03",
    title: "Edit rows or write SQL.",
    body: "Insert, edit, and delete from a slide-in panel. Or open the editor and run any query with a 30-second timeout.",
    visual: <QueryVisual />,
  },
];

export function WorkflowSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <section
      id="workflow"
      ref={containerRef}
      className="relative"
      style={{ height: `${STEPS.length * 100}vh` }}
    >
      {/* Sticky intro chip — anchors the section title at the top of viewport
          while the stack scrolls. */}
      <div className="sticky top-0 z-10 pt-24">
        <div className="mx-auto max-w-6xl px-6">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30% 0px" }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="text-3xl md:text-4xl font-semibold tracking-tighter"
          >
            Three steps. No portal-hopping.
          </motion.h2>
        </div>
      </div>

      {/* Stack of cards */}
      {STEPS.map((step, i) => (
        <StackCard
          key={step.index}
          step={step}
          index={i}
          total={STEPS.length}
          progress={scrollYProgress}
        />
      ))}
    </section>
  );
}

function StackCard({
  step,
  index,
  total,
  progress,
}: {
  step: Step;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  // Each card occupies 1/total of the scroll range. The fade/shrink starts
  // when the NEXT card begins entering.
  const enter = index / total;
  const start = (index + 0.5) / total;
  const end = (index + 1) / total;

  const scale = useTransform(progress, [enter, start, end], [1, 1, 0.94]);
  const opacity = useTransform(progress, [enter, start, end], [1, 1, 0.4]);
  const y = useTransform(progress, [enter, start, end], [0, 0, -30]);

  return (
    <div className="sticky top-0 flex h-screen items-center justify-center px-6">
      <motion.div
        style={
          reduce
            ? undefined
            : {
                scale,
                opacity,
                y,
                transformOrigin: "center top",
              }
        }
        className="mx-auto w-full max-w-5xl"
      >
        <div className="grid gap-8 rounded-2xl border border-border bg-card/90 p-6 md:p-10 shadow-2xl backdrop-blur-sm lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs font-mono text-muted-foreground">
              Step {step.index}
            </span>
            <h3 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
              {step.title}
            </h3>
            <p className="mt-3 max-w-[48ch] text-sm md:text-base text-muted-foreground leading-relaxed">
              {step.body}
            </p>
          </div>

          <div className="relative">{step.visual}</div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Step visuals ──────────────────────────────────────────────────────────

function ConnectVisual() {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>New connection</span>
        <Plug className="h-3.5 w-3.5" />
      </div>
      <div className="mt-3 space-y-3">
        <div>
          <p className="text-[10px] text-muted-foreground">Name</p>
          <p className="mt-1 rounded-md border border-border bg-card px-3 py-2 text-sm">
            Production database
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Type</p>
          <div className="mt-1 inline-flex rounded-md border border-border bg-card p-0.5 text-xs">
            <span className="rounded-[5px] bg-primary/15 px-2 py-1 text-foreground">
              Neon
            </span>
            <span className="px-2 py-1 text-muted-foreground">Supabase</span>
            <span className="px-2 py-1 text-muted-foreground">PostgreSQL</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Connection string</p>
          <p className="mt-1 truncate rounded-md border border-border bg-card px-3 py-2 font-mono text-[11px] text-foreground">
            postgresql://user:••••••@ep-cool-cloud-83.us-east-2…
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Connected · 42 ms · encrypted
        </div>
      </div>
    </div>
  );
}

function BrowseVisual() {
  const items = [
    { name: "users", icon: Table2, active: true },
    { name: "orders", icon: Table2 },
    { name: "events", icon: Table2 },
    { name: "billing_items", icon: Table2 },
    { name: "sessions", icon: Table2 },
    { name: "audit_log", icon: Table2 },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background/70">
      <div className="grid grid-cols-[120px_1fr]">
        <div className="border-r border-border p-2">
          <div className="px-1.5 pb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
            Tables
          </div>
          {items.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.name}
                className={
                  "flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px] font-mono " +
                  (t.active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground")
                }
              >
                <Icon className="h-3 w-3" />
                {t.name}
              </div>
            );
          })}
        </div>
        <div>
          <div className="grid grid-cols-[40px_1fr_72px] gap-2 border-b border-border bg-background/40 px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
            <span>id</span>
            <span>email</span>
            <span>plan</span>
          </div>
          {[
            ["1041", "ada@strata.app", "Pro"],
            ["1042", "linus@strata.app", "Team"],
            ["1043", "grace@strata.app", "Free"],
            ["1044", "alan@strata.app", "Pro"],
          ].map((row) => (
            <div
              key={row[0]}
              className="grid grid-cols-[40px_1fr_72px] gap-2 border-b border-border/70 px-3 py-1.5 font-mono text-[11px]"
            >
              <span className="text-muted-foreground">{row[0]}</span>
              <span className="truncate">{row[1]}</span>
              <span>{row[2]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Search className="h-3 w-3" />
          12,801 rows
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded border border-border px-1 py-0.5">25</span>
          <span>·</span>
          <span>50</span>
          <span>·</span>
          <span>100</span>
        </span>
      </div>
    </div>
  );
}

function QueryVisual() {
  return (
    <div className="rounded-xl border border-border bg-background/70">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Terminal className="h-3.5 w-3.5" />
        SQL editor
      </div>
      <div className="p-3 font-mono text-[11px] leading-relaxed text-foreground/90">
        <span className="text-pink-400">SELECT</span>{" "}
        <span className="text-foreground">name</span>,{" "}
        <span className="text-foreground">created_at</span>
        {"\n"}
        <span className="text-pink-400">FROM</span>{" "}
        <span className="text-foreground">users</span>
        {"\n"}
        <span className="text-pink-400">WHERE</span>{" "}
        <span className="text-foreground">plan</span>{" "}
        <span className="text-muted-foreground">=</span>{" "}
        <span className="text-emerald-300">&apos;Pro&apos;</span>
        {"\n"}
        <span className="text-pink-400">ORDER BY</span>{" "}
        <span className="text-foreground">created_at</span>{" "}
        <span className="text-pink-400">DESC</span>;
      </div>
      <div className="flex items-center justify-between border-t border-border bg-background/40 px-3 py-1.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Pencil className="h-3 w-3" />
          412 rows · 18 ms
        </span>
        <span className="flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-emerald-400" />
          statement_timeout = 30s
        </span>
      </div>
      <div className="border-t border-border">
        <div className="grid grid-cols-[1fr_80px] gap-2 px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
          <span>name</span>
          <span>created_at</span>
        </div>
        {["ada.lovelace", "linus.t", "alan.t"].map((n) => (
          <div
            key={n}
            className="grid grid-cols-[1fr_80px] gap-2 border-t border-border/70 px-3 py-1.5 font-mono text-[11px]"
          >
            <span>{n}</span>
            <span className="text-muted-foreground">2026-05-12</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
        <Database className="h-3 w-3" />
        production_db
      </div>
    </div>
  );
}
