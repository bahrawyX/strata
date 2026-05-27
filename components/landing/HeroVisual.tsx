"use client";

import { motion, useReducedMotion } from "motion/react";
import { Database, Table2, Zap } from "lucide-react";

/**
 * Animated mini-preview of the Strata workspace.
 * Motion is motivated: it shows that Strata is alive — tables stream in, a row
 * highlights, a query result lands. Restrained: one continuous loop, not "every
 * card has its own infinite animation."
 */
export function HeroVisual() {
  const reduce = useReducedMotion();

  const tableRows = [
    { id: "01", name: "users", rows: "12.8k", tint: "from-indigo-500/30" },
    { id: "02", name: "orders", rows: "94.2k", tint: "from-emerald-500/25" },
    { id: "03", name: "events", rows: "1.2M", tint: "from-amber-500/20" },
    { id: "04", name: "billing_items", rows: "8.1k", tint: "from-rose-500/20" },
  ];

  const cellEase = [0.23, 1, 0.32, 1] as const;

  return (
    <div className="relative">
      {/* Glow */}
      <div
        aria-hidden
        className="absolute -inset-10 rounded-3xl bg-primary/10 blur-3xl"
      />

      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: cellEase, delay: 0.1 }}
        className="relative rounded-2xl border border-border bg-card/90 backdrop-blur-sm shadow-2xl overflow-hidden"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-2.5">
          <span className="size-2.5 rounded-full bg-muted" />
          <span className="size-2.5 rounded-full bg-muted" />
          <span className="size-2.5 rounded-full bg-muted" />
          <div className="ml-3 flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
            <Database className="h-3 w-3 text-primary" />
            production_db
            <span className="ml-1 inline-block size-1.5 rounded-full bg-success" />
          </div>
        </div>

        <div className="grid grid-cols-[140px_1fr]">
          {/* Sidebar — table list */}
          <div className="border-r border-border bg-background/40 p-2">
            <p className="px-1.5 pb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
              Tables
            </p>
            {tableRows.map((t, i) => (
              <motion.div
                key={t.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
                transition={{
                  duration: 0.4,
                  ease: cellEase,
                  delay: 0.4 + i * 0.06,
                }}
                className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px] text-foreground"
              >
                <Table2 className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono truncate">{t.name}</span>
              </motion.div>
            ))}
          </div>

          {/* Main pane — fake table grid */}
          <div className="relative">
            {/* Header row */}
            <div className="grid grid-cols-[40px_80px_1fr_72px] gap-2 border-b border-border bg-background/40 px-3 py-1.5 text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
              <span>id</span>
              <span>name</span>
              <span>email</span>
              <span>plan</span>
            </div>

            {/* Data rows */}
            <div className="divide-y divide-border/70">
              {[
                ["1041", "ada.lovelace", "ada@strata.app", "Pro"],
                ["1042", "linus.t", "linus@strata.app", "Team"],
                ["1043", "grace.h", "grace@strata.app", "Free"],
                ["1044", "alan.t", "alan@strata.app", "Pro"],
                ["1045", "donald.k", "donald@strata.app", "Team"],
              ].map((row, i) => {
                const highlight = i === 1;
                return (
                  <motion.div
                    key={row[0]}
                    initial={
                      reduce ? { opacity: 0 } : { opacity: 0, y: 6 }
                    }
                    animate={
                      reduce ? { opacity: 1 } : { opacity: 1, y: 0 }
                    }
                    transition={{
                      duration: 0.4,
                      ease: cellEase,
                      delay: 0.6 + i * 0.05,
                    }}
                    className={
                      "relative grid grid-cols-[40px_80px_1fr_72px] gap-2 px-3 py-2 text-[11px] font-mono " +
                      (highlight
                        ? "text-foreground"
                        : "text-foreground/90")
                    }
                  >
                    {highlight && !reduce && (
                      <motion.span
                        layoutId="row-highlight"
                        className="absolute inset-x-1.5 inset-y-0.5 -z-0 rounded bg-primary/10 ring-1 ring-primary/30"
                        transition={{
                          duration: 0.5,
                          ease: cellEase,
                        }}
                      />
                    )}
                    <span className="relative z-10 text-muted-foreground">
                      {row[0]}
                    </span>
                    <span className="relative z-10 truncate">{row[1]}</span>
                    <span className="relative z-10 truncate text-muted-foreground">
                      {row[2]}
                    </span>
                    <span className="relative z-10">{row[3]}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer — query stat */}
            <motion.div
              initial={
                reduce ? { opacity: 0 } : { opacity: 0, y: 8 }
              }
              animate={
                reduce ? { opacity: 1 } : { opacity: 1, y: 0 }
              }
              transition={{
                duration: 0.45,
                ease: cellEase,
                delay: 1.0,
              }}
              className="flex items-center justify-between border-t border-border bg-background/40 px-3 py-1.5 text-[10px] text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-primary" />
                SELECT * FROM users
              </span>
              <span className="font-mono">12,801 rows · 38 ms</span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Floating tag — "encrypted" pill */}
      <motion.div
        initial={
          reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.94 }
        }
        animate={
          reduce
            ? { opacity: 1 }
            : { opacity: 1, y: 0, scale: 1 }
        }
        transition={{
          duration: 0.6,
          ease: cellEase,
          delay: 1.25,
        }}
        className="absolute -bottom-3 left-6 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-300 shadow-lg backdrop-blur"
      >
        <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
        Connection encrypted · AES-256-GCM
      </motion.div>
    </div>
  );
}
