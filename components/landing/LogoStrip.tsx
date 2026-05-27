"use client";

import { motion, useReducedMotion } from "motion/react";

// Real brand wordmarks via Simple Icons CDN. Logo-only — no industry labels,
// per the taste-skill LOGO-ONLY rule.
const LOGOS = [
  { name: "Neon", slug: "neon" },
  { name: "Supabase", slug: "supabase" },
  { name: "PostgreSQL", slug: "postgresql" },
  { name: "Vercel", slug: "vercel" },
  { name: "Railway", slug: "railway" },
  { name: "Render", slug: "render" },
  { name: "Fly.io", slug: "fly-dot-io" },
  { name: "Amazon RDS", slug: "amazonrds" },
];

export function LogoStrip() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="Compatible databases and hosts"
      className="relative border-y border-border bg-card/40"
    >
      <div className="mx-auto max-w-6xl px-6 py-10">
        <motion.p
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
          whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20% 0px" }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="text-center text-xs text-muted-foreground"
        >
          Works with every Postgres you already use
        </motion.p>

        <div className="relative mt-6 overflow-hidden">
          {/* Edge fades */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-card/40 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-card/40 to-transparent"
          />

          <div className="marquee-track flex w-max gap-12">
            {[...LOGOS, ...LOGOS].map((logo, i) => (
              <div
                key={`${logo.slug}-${i}`}
                className="flex h-10 w-32 shrink-0 items-center justify-center opacity-70 transition-opacity hover:opacity-100"
                title={logo.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://cdn.simpleicons.org/${logo.slug}/cfcfd6`}
                  alt={logo.name}
                  className="h-7 w-auto"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
