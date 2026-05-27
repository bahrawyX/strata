"use client";

import { motion, useReducedMotion } from "motion/react";
import { Eyebrow } from "./primitives";

function NeonBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 font-mono text-[12px] tracking-[0.04em] text-[var(--text-secondary)]">
      <svg viewBox="0 0 14 14" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
        <circle cx="7" cy="7" r="3" />
        <path
          d="M1 7h3M10 7h3M7 1v3M7 10v3"
          stroke="currentColor"
          strokeWidth="1.2"
          fill="none"
        />
      </svg>
      Neon
    </span>
  );
}
function SupabaseBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 font-mono text-[12px] tracking-[0.04em] text-[var(--text-secondary)]">
      <svg
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        className="h-3.5 w-3.5"
        aria-hidden
      >
        <path d="M7 1L12 7l-5 6L2 7z" />
      </svg>
      Supabase
    </span>
  );
}
function PostgresBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 font-mono text-[12px] tracking-[0.04em] text-[var(--text-secondary)]">
      <svg
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        className="h-3.5 w-3.5"
        aria-hidden
      >
        <ellipse cx="7" cy="3.5" rx="5" ry="2" />
        <path d="M2 3.5v7c0 1.1 2.24 2 5 2s5-.9 5-2v-7" />
      </svg>
      Postgres
    </span>
  );
}

export function FeatureBento() {
  const reduce = useReducedMotion();

  return (
    <section id="features" className="py-[120px]" data-screen-label="04 Features">
      <div className="mx-auto max-w-[1200px] px-8">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 flex flex-col gap-4"
        >
          <Eyebrow>Built for engineers</Eyebrow>
          <h2 className="font-display text-[clamp(36px,4.5vw,56px)] text-left">
            Tools that respect
            <br />
            <em>how you actually work.</em>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Wide — works with any Postgres */}
          <BentoCard className="md:col-span-2" delay={0}>
            <h3 className="font-display text-[26px] leading-[1.2]">
              Works with any Postgres
            </h3>
            <p className="text-[14px] leading-[1.55] text-[var(--text-secondary)]">
              Neon, Supabase, Railway, Render, Amazon RDS, or your own VPS. If
              it speaks PostgreSQL, Strata speaks it. No proprietary connector,
              no driver to install.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <NeonBadge />
              <SupabaseBadge />
              <PostgresBadge />
            </div>
          </BentoCard>

          {/* AES-256 lock */}
          <BentoCard delay={0.08}>
            <h3 className="font-display text-[26px] leading-[1.2]">
              AES-256 encrypted
            </h3>
            <p className="text-[14px] leading-[1.55] text-[var(--text-secondary)]">
              Connection strings stored with military-grade encryption. We
              can&apos;t read them. Neither can anyone else.
            </p>
            <div
              className="mt-auto flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)] text-[var(--accent)]"
              style={{
                background: "var(--accent-muted)",
                boxShadow: "0 0 24px var(--accent-glow)",
              }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden
              >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 1 1 8 0v4" />
              </svg>
            </div>
          </BentoCard>

          {/* Zero persistent connections */}
          <BentoCard delay={0.16}>
            <h3 className="font-display text-[26px] leading-[1.2]">
              Zero persistent connections
            </h3>
            <p className="text-[14px] leading-[1.55] text-[var(--text-secondary)]">
              We open a connection, run your query, and close it. No pooling.
              No lingering sessions in your database.
            </p>
            <div className="mt-auto flex flex-wrap gap-2 font-mono text-[11px] text-[var(--text-muted)]">
              <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1">
                OPEN
              </span>
              <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1 text-[var(--text-secondary)]">
                QUERY
              </span>
              <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1">
                CLOSE
              </span>
            </div>
          </BentoCard>

          {/* Wide — SQL editor */}
          <BentoCard className="md:col-span-2" delay={0.24}>
            <h3 className="font-display text-[26px] leading-[1.2]">
              SQL editor, built in
            </h3>
            <p className="text-[14px] leading-[1.55] text-[var(--text-secondary)]">
              Run any query directly. Results render instantly as a table.
              30-second timeout. No surprises.
            </p>
            <pre className="mt-auto overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-4 py-3.5 font-mono text-[12px] leading-[1.6] text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)]">
                -- recent sign-ups, by plan
              </span>
              {"\n"}
              <span className="text-[var(--accent)]">select</span> plan,{" "}
              <span className="text-[var(--accent)]">count</span>(*){" "}
              <span className="text-[var(--accent)]">as</span> n{"\n"}
              <span className="text-[var(--accent)]">from</span>   users{"\n"}
              <span className="text-[var(--accent)]">where</span>  created_at{" "}
              <span className="text-[var(--accent)]">&gt;</span> now(){" "}
              <span className="text-[var(--accent)]">-</span>{" "}
              <span style={{ color: "#C4B5FD" }}>&apos;7 days&apos;</span>::interval
              {"\n"}
              <span className="text-[var(--accent)]">group by</span> plan{"\n"}
              <span className="text-[var(--accent)]">order by</span> n{" "}
              <span className="text-[var(--accent)]">desc</span>;
            </pre>
          </BentoCard>

          {/* Schema explorer */}
          <BentoCard delay={0.32}>
            <h3 className="font-display text-[26px] leading-[1.2]">
              Schema explorer
            </h3>
            <p className="text-[14px] leading-[1.55] text-[var(--text-secondary)]">
              Browse every table, column, type, and relationship from a clean
              sidebar. No clicking through six menus.
            </p>
            <div className="mt-auto font-mono text-[11px] leading-[1.9] text-[var(--text-secondary)]">
              <div>
                ├ <span style={{ color: "var(--accent)" }}>users</span>{" "}
                <span style={{ color: "var(--text-muted)" }}>· 12,481</span>
              </div>
              <div>
                ├ orders{" "}
                <span style={{ color: "var(--text-muted)" }}>· 98k</span>
              </div>
              <div>
                ├ products{" "}
                <span style={{ color: "var(--text-muted)" }}>· 412</span>
              </div>
              <div>
                └ sessions{" "}
                <span style={{ color: "var(--text-muted)" }}>· 2.1M</span>
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

function BentoCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      className={
        "flex min-h-[220px] flex-col gap-3.5 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-7 transition-[background,border-color,transform] duration-[220ms] [transition-timing-function:var(--ease-out-expo)] hover:border-[var(--border-default)] hover:bg-[var(--bg-elevated)] " +
        (className ?? "")
      }
    >
      {children}
    </motion.article>
  );
}
