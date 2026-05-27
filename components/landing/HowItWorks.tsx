"use client";

import { Fragment, useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Eyebrow } from "./primitives";

const STEPS = [
  {
    num: "01",
    title: "Paste your connection string",
    body: "Any PostgreSQL URL works. Neon, Supabase, Railway, Render, RDS, or self-hosted on your own VPS.",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M9 17H7a5 5 0 1 1 0-10h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Strata connects and maps your schema",
    body: "We introspect your tables, columns, types, and relationships. AES-256 encrypted. Instant.",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" strokeLinecap="round" />
        <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Browse, query, and edit",
    body: "A full visual interface for your data. No setup. No migration. No vendor lock-in. Disconnect any time.",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18M9 4v16" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const reveal = inView || reduce;

  return (
    <section id="how" className="py-[120px]" data-screen-label="03 How it works">
      <div className="mx-auto max-w-[1200px] px-8">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 flex flex-col items-center gap-4 text-center"
        >
          <Eyebrow>Setup in 60 seconds</Eyebrow>
          <h2 className="font-display text-[clamp(36px,4.5vw,56px)]">
            Three steps.
            <br />
            <em>Zero friction.</em>
          </h2>
        </motion.div>

        <div
          ref={ref}
          className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_60px_1fr_60px_1fr] lg:gap-0"
        >
          {STEPS.map((step, i) => (
            <Fragment key={step.num}>
              <motion.article
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: -20 }}
                animate={
                  reveal
                    ? reduce
                      ? { opacity: 1 }
                      : { opacity: 1, x: 0 }
                    : undefined
                }
                transition={{
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                  delay: i * 0.12,
                }}
                className="flex flex-col gap-3.5 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-7 transition-[border-color,background] duration-300 hover:border-[var(--border-default)] hover:bg-[var(--bg-elevated)]"
              >
                <div className="font-mono text-[11px] tracking-[0.1em] text-[var(--text-muted)]">
                  {step.num}
                </div>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--accent)]"
                  style={{ background: "var(--accent-muted)" }}
                >
                  {step.icon}
                </div>
                <div className="font-display text-[24px] leading-[1.2] text-[var(--text-primary)]">
                  {step.title}
                </div>
                <p className="text-[14px] leading-[1.55] text-[var(--text-secondary)]">
                  {step.body}
                </p>
              </motion.article>
              {i < STEPS.length - 1 && (
                <motion.div
                  initial={reduce ? { opacity: 0 } : { scaleX: 0 }}
                  animate={
                    reveal
                      ? reduce
                        ? { opacity: 1 }
                        : { scaleX: 1 }
                      : undefined
                  }
                  transition={{
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.4 + i * 0.12,
                  }}
                  style={{
                    transformOrigin: "left",
                    background:
                      "linear-gradient(to right, var(--border-default), transparent)",
                  }}
                  className="hidden h-px self-center lg:block"
                  aria-hidden="true"
                />
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
