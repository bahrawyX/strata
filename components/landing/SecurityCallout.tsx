"use client";

import { motion, useReducedMotion } from "motion/react";
import { Shield } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

export function SecurityCallout() {
  const reduce = useReducedMotion();

  return (
    <section
      id="security"
      className="relative overflow-hidden border-y border-border"
    >
      <div aria-hidden className="absolute inset-0 hero-spotlight opacity-60" />
      <div aria-hidden className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative mx-auto max-w-5xl px-6 py-24 text-center">
        <Reveal>
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
            whileInView={
              reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }
            }
            viewport={{ once: true, margin: "-20% 0px" }}
            transition={{
              duration: 0.45,
              ease: [0.23, 1, 0.32, 1],
            }}
            className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary"
          >
            <Shield className="h-5 w-5" />
          </motion.div>
        </Reveal>

        <Reveal delay={0.06}>
          <h2 className="mt-6 text-balance text-3xl md:text-5xl font-semibold tracking-tighter leading-[1.1]">
            Your connection strings never leave encrypted.
          </h2>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-5 max-w-[60ch] text-base text-muted-foreground leading-relaxed">
            AES-256-GCM with a fresh IV per write. Every action checks your
            session and ownership. Postgres errors are stripped of paths before
            they ever reach the client.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-muted-foreground">
            {[
              "AES-256-GCM",
              "httpOnly · secure · sameSite=lax",
              "statement_timeout=30s",
              "parameterized queries",
              "rate-limited auth",
            ].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-border bg-card/60 px-2.5 py-1"
              >
                {chip}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
