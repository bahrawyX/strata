"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroVisual } from "./HeroVisual";

export function Hero({ isAuthed }: { isAuthed: boolean }) {
  const reduce = useReducedMotion();
  const ease = [0.23, 1, 0.32, 1] as const;

  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 grid-bg opacity-50" />
      <div aria-hidden className="absolute inset-0 hero-spotlight" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />

      <div className="relative mx-auto max-w-6xl px-6 pt-32 pb-24 md:pt-36 md:pb-28 lg:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          {/* Copy */}
          <div className="max-w-xl">
            <motion.span
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
            >
              <span className="size-1.5 rounded-full bg-primary" />
              Now connecting Neon, Supabase, and any Postgres
            </motion.span>

            <motion.h1
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease, delay: 0.08 }}
              className="mt-5 text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tighter leading-[1.05]"
            >
              The Postgres workspace built for{" "}
              <span className="text-primary">people who ship.</span>
            </motion.h1>

            <motion.p
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease, delay: 0.16 }}
              className="mt-5 max-w-[58ch] text-base md:text-lg text-muted-foreground leading-relaxed"
            >
              Connect a database, browse every table, edit rows, and run queries
              from one fast, keyboard-friendly canvas — encrypted end-to-end.
            </motion.p>

            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease, delay: 0.24 }}
              className="mt-8 flex items-center gap-3"
            >
              {isAuthed ? (
                <Button asChild size="lg">
                  <Link href="/connections">
                    Open dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/signup">
                      Start free
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost">
                    <Link href="#workflow">See it work</Link>
                  </Button>
                </>
              )}
            </motion.div>
          </div>

          {/* Animated workspace preview */}
          <div className="relative">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
