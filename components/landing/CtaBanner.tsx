"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Btn, Eyebrow } from "./primitives";

const LINES = ["Stop context-switching.", "Your data is one tab away."];

export function CtaBanner({ isAuthed }: { isAuthed: boolean }) {
  const reduce = useReducedMotion();

  // Per-word split, mirroring the design's [data-split-words] behaviour.
  // Words on the first line render first; a <br /> separates lines; words on
  // the second line follow. Spaces are emitted as plain text nodes BETWEEN
  // word spans (not inside them) so inline-block whitespace stripping doesn't
  // glue everything together.
  let runningIndex = 0;
  const renderLine = (line: string, lineIdx: number) =>
    line.split(" ").map((word, i) => {
      const idx = runningIndex++;
      const isFirst = i === 0;
      return (
        <Fragment key={`${lineIdx}-${idx}-${word}`}>
          {!isFirst && " "}
          <motion.span
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            whileInView={
              reduce ? { opacity: 1 } : { opacity: 1, y: 0 }
            }
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{
              duration: 0.6,
              ease: [0.16, 1, 0.3, 1],
              delay: idx * 0.05,
            }}
            className="inline-block"
          >
            {word}
          </motion.span>
        </Fragment>
      );
    });

  return (
    <section
      className="cta-bg relative overflow-hidden border-y border-[var(--border-subtle)] px-8 py-[120px] text-center"
      data-screen-label="06 CTA"
    >
      <div
        aria-hidden
        className="cta-glow pointer-events-none absolute"
        style={{
          top: "50%",
          left: "50%",
          width: 700,
          height: 400,
          marginLeft: -350,
          marginTop: -200,
        }}
      />
      <div className="relative mx-auto flex max-w-[1200px] flex-col items-center gap-5">
        <Eyebrow accent>// Get started</Eyebrow>
        <h2 className="font-display text-[clamp(36px,4.5vw,56px)]">
          {renderLine(LINES[0], 0)}
          <br />
          {renderLine(LINES[1], 1)}
        </h2>
        <p className="text-[14px] text-[var(--text-muted)]">
          Free to start · No credit card
        </p>
        <motion.div
          initial={false}
          whileInView={
            reduce ? undefined : { scale: [1, 1.03, 1] }
          }
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.7, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-2"
        >
          <Btn href={isAuthed ? "/connections" : "/signup"}>
            Connect your database
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Btn>
        </motion.div>
      </div>
    </section>
  );
}
