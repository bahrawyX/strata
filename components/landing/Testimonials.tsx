"use client";

import { motion, useReducedMotion } from "motion/react";
import { Eyebrow } from "./primitives";

const TESTIMONIALS = [
  {
    quote:
      "I stopped opening the Supabase dashboard entirely. Strata's table viewer is just faster.",
    name: "Alex Chen",
    title: "Staff Eng · Series B",
    initials: "AC",
  },
  {
    quote:
      "The SQL editor with 30-second timeout saved us from a few production foot-guns.",
    name: "Marta Kowalski",
    title: "Backend Lead · Remote",
    initials: "MK",
  },
  {
    quote:
      "Setup took under 2 minutes. I was skeptical until I pasted my Neon connection string.",
    name: "Darius Osei",
    title: "Technical Founder",
    initials: "DO",
  },
];

export function Testimonials() {
  const reduce = useReducedMotion();
  return (
    <section
      id="testimonials"
      className="py-[120px]"
      data-screen-label="05 Testimonials"
    >
      <div className="mx-auto max-w-[1200px] px-8">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 flex flex-col items-center gap-4 text-center"
        >
          <Eyebrow>From the field</Eyebrow>
          <h2 className="font-display text-[clamp(36px,4.5vw,56px)]">
            Engineers who
            <br />
            <em>actually ship.</em>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.article
              key={t.name}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: -20 }}
              whileInView={
                reduce ? { opacity: 1 } : { opacity: 1, x: 0 }
              }
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
                delay: i * 0.1,
              }}
              className="relative flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-7 pb-6 pt-8"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute left-6 top-5 font-display text-[72px] leading-[0.6]"
                style={{ color: "var(--accent-muted)" }}
              >
                &ldquo;
              </div>
              <p className="relative z-[1] pt-6 text-[16px] leading-[1.55] text-[var(--text-secondary)]">
                {t.quote}
              </p>
              <div className="mt-auto flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-default)] font-mono text-[12px] text-[var(--text-secondary)]"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--bg-elevated), var(--bg-overlay))",
                  }}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                    {t.name}
                  </div>
                  <div className="mt-0.5 font-mono text-[12px] text-[var(--text-muted)]">
                    {t.title}
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
