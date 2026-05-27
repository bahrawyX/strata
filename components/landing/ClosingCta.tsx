"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";

export function ClosingCta({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="relative">
      <div className="mx-auto max-w-4xl px-6 py-28 text-center">
        <Reveal>
          <h2 className="text-balance text-4xl md:text-5xl font-semibold tracking-tighter leading-[1.05]">
            Stop tab-switching between portals.
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mx-auto mt-4 max-w-[52ch] text-base text-muted-foreground leading-relaxed">
            One place for every Postgres you touch.
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="mt-8 flex items-center justify-center">
            <Button asChild size="lg">
              <Link href={isAuthed ? "/connections" : "/signup"}>
                {isAuthed ? "Open dashboard" : "Start free"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
