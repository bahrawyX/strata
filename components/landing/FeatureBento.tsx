"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  Database,
  KeyRound,
  Network,
  Terminal,
  Zap,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

export function FeatureBento() {
  return (
    <section id="features" className="relative">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <h2 className="max-w-2xl text-3xl md:text-4xl font-semibold tracking-tighter leading-tight">
            Built for the day-to-day of working in a database.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-4 max-w-[58ch] text-base text-muted-foreground leading-relaxed">
            Strata stays out of the way until you need it. Then it&apos;s right
            there — keyboard-fast, type-aware, and honest about what&apos;s
            happening on the wire.
          </p>
        </Reveal>

        {/* 5-cell bento — varied sizes, varied visuals. Avoids the
            "6 white cards in a row" anti-pattern. */}
        <div className="mt-12 grid gap-3 sm:grid-cols-6 sm:grid-rows-[260px_260px]">
          <BentoCell className="sm:col-span-3 sm:row-span-2 overflow-hidden">
            <CellHeader
              icon={<Database className="h-4 w-4" />}
              eyebrow="Connect"
              title="Any Postgres, in seconds."
              body="Paste a connection string. We test it before saving and encrypt it with AES-256-GCM before it ever hits disk."
            />
            <EncryptVisual />
          </BentoCell>

          <BentoCell className="sm:col-span-3 overflow-hidden">
            <div className="flex h-full">
              <div className="flex-1">
                <CellHeader
                  icon={<Terminal className="h-4 w-4" />}
                  title="SQL editor"
                  body="Run anything, get clear stats."
                />
              </div>
              <div className="hidden sm:flex w-44 items-center pr-1">
                <QueryCounter />
              </div>
            </div>
          </BentoCell>

          <BentoCell className="sm:col-span-3 overflow-hidden">
            <div className="grid h-full grid-cols-[1fr_auto] items-center gap-3">
              <CellHeader
                icon={<Zap className="h-4 w-4" />}
                title="30-second timeout"
                body="Every user query is wrapped automatically. No runaway scans."
              />
              <LatencyDots />
            </div>
          </BentoCell>

          <BentoCell className="sm:col-span-2 overflow-hidden">
            <CellHeader
              icon={<Network className="h-4 w-4" />}
              title="Fresh client per request"
              body="No pool keeping zombie connections to your DB."
            />
          </BentoCell>

          <BentoCell className="sm:col-span-2 overflow-hidden">
            <CellHeader
              icon={<KeyRound className="h-4 w-4" />}
              title="Yours alone"
              body="Every action checks session and ownership."
            />
          </BentoCell>

          <BentoCell className="sm:col-span-2 overflow-hidden">
            <div className="grid h-full grid-cols-[1fr_auto] items-end gap-3">
              <CellHeader
                icon={<Database className="h-4 w-4" />}
                title="One workspace"
                body="Switch between every database from one sidebar."
              />
              <ConnectionsStack />
            </div>
          </BentoCell>
        </div>
      </div>
    </section>
  );
}

function BentoCell({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal className={className}>
      <div className="relative h-full rounded-xl border border-border bg-card p-5 transition-colors duration-200 hover:border-border/70">
        {children}
      </div>
    </Reveal>
  );
}

function CellHeader({
  icon,
  eyebrow,
  title,
  body,
}: {
  icon: React.ReactNode;
  eyebrow?: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      {eyebrow && (
        <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </p>
      )}
      <h3 className="mt-2 text-base font-medium text-foreground tracking-tight">
        {title}
      </h3>
      <p className="mt-1.5 max-w-[42ch] text-sm text-muted-foreground leading-relaxed">
        {body}
      </p>
    </div>
  );
}

// ─── Visuals embedded in cells ─────────────────────────────────────────────

function EncryptVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="mt-6">
      <div className="rounded-lg border border-border bg-background/70 p-3 font-mono text-[10px] leading-relaxed">
        <p className="text-muted-foreground">// plaintext</p>
        <p className="text-foreground">
          postgresql://user:hunter2@db.neon.tech:5432/prod
        </p>
        <motion.div
          aria-hidden
          initial={reduce ? { opacity: 0 } : { opacity: 0, scaleX: 0 }}
          whileInView={
            reduce ? { opacity: 1 } : { opacity: 1, scaleX: 1 }
          }
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{
            duration: 0.5,
            ease: [0.23, 1, 0.32, 1],
            delay: 0.2,
          }}
          style={{ originX: 0 }}
          className="my-2 h-px bg-gradient-to-r from-primary via-primary/40 to-transparent"
        />
        <p className="text-muted-foreground">// stored</p>
        <p className="break-all text-emerald-300/90">
          a3f1c2:5b7e8f1d:4f2a8b9c1e7d3a9f1c0e2b...
        </p>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        AES-256-GCM with a 16-byte random IV per write.
      </p>
    </div>
  );
}

function QueryCounter() {
  const reduce = useReducedMotion();
  return (
    <div className="flex w-full flex-col items-end gap-1.5">
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
        whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="font-mono text-[11px] text-muted-foreground"
      >
        12,801 rows · 38 ms
      </motion.div>
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
        whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{
          duration: 0.5,
          ease: [0.23, 1, 0.32, 1],
          delay: 0.08,
        }}
        className="font-mono text-[11px] text-muted-foreground"
      >
        412 rows · 18 ms
      </motion.div>
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
        whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{
          duration: 0.5,
          ease: [0.23, 1, 0.32, 1],
          delay: 0.16,
        }}
        className="font-mono text-[11px] text-foreground"
      >
        1 row · 4 ms
      </motion.div>
    </div>
  );
}

function LatencyDots() {
  const reduce = useReducedMotion();
  return (
    <div className="flex h-16 items-end gap-1">
      {[18, 28, 22, 32, 24, 14, 30, 16].map((h, i) => (
        <motion.span
          key={i}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scaleY: 0.2 }}
          whileInView={
            reduce ? { opacity: 1 } : { opacity: 1, scaleY: 1 }
          }
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{
            duration: 0.4,
            ease: [0.23, 1, 0.32, 1],
            delay: i * 0.04,
          }}
          style={{ height: `${h * 2}px`, originY: 1 }}
          className={
            "w-1.5 rounded-sm " +
            (i === 7 ? "bg-primary" : "bg-foreground/30")
          }
        />
      ))}
    </div>
  );
}

function ConnectionsStack() {
  const reduce = useReducedMotion();
  return (
    <div className="relative h-16 w-16 shrink-0">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={
            reduce
              ? { opacity: 0 }
              : { opacity: 0, y: 10, rotate: -6 + i * 2 }
          }
          whileInView={
            reduce
              ? { opacity: 1 }
              : { opacity: 1, y: 0, rotate: -6 + i * 2 }
          }
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{
            duration: 0.5,
            ease: [0.23, 1, 0.32, 1],
            delay: 0.1 + i * 0.06,
          }}
          style={{
            zIndex: 3 - i,
            transformOrigin: "center bottom",
          }}
          className="absolute inset-0 rounded-md border border-border bg-background/90 shadow-md"
        >
          <div className="m-1.5 flex h-2 w-2 items-center">
            <span
              className={
                "size-2 rounded-full " +
                (i === 0
                  ? "bg-primary"
                  : i === 1
                    ? "bg-emerald-400"
                    : "bg-amber-400")
              }
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
