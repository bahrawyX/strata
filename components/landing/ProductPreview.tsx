"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Eyebrow } from "./primitives";

const TABLES = [
  { name: "users", count: "12,481", active: true },
  { name: "orders", count: "98,210" },
  { name: "products", count: "412" },
  { name: "sessions", count: "2.1M" },
  { name: "invoices", count: "3,209" },
  { name: "api_keys", count: "88" },
];

const ROWS = [
  ["e7a1…2c", "alex.chen@arcadia.dev", "Alex Chen", "team", "2024-02-14 09:21"],
  ["3f9b…71", "m.kowalski@hyperflow.io", "Marta Kowalski", "pro", "2024-03-02 14:08"],
  ["a014…d8", "d.osei@founderhq.co", "Darius Osei", "team", "2024-03-19 06:55"],
  ["b2c4…05", "priya.r@northbeam.app", "Priya Ramanathan", "pro", "2024-04-01 11:42"],
  ["5d8e…ff", "j.iwasaki@kintai.jp", "Junji Iwasaki", "free", "2024-04-12 18:30"],
  ["9f01…3a", "samira.b@orbitline.eu", "Samira Beltrán", "pro", "2024-04-23 02:11"],
  ["21bd…8c", "t.ofori@bridgeway.dev", "Tomi Ofori", "team", "2024-05-08 22:04"],
  ["cc77…12", "noor.h@arcboard.io", "Noor Hadid", "pro", "2024-05-19 07:26"],
];

const COLS = [
  { name: "id", type: "uuid" },
  { name: "email", type: "text" },
  { name: "name", type: "text" },
  { name: "status", type: "enum" },
  { name: "plan", type: "text" },
  { name: "created_at", type: "timestamptz" },
];

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" strokeLinecap="round" />
      <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" strokeLinecap="round" />
    </svg>
  );
}

export function ProductPreview() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inView = useInView(wrapRef, {
    once: true,
    margin: "-10% 0px",
  });
  const reduce = useReducedMotion();
  const reveal = inView || reduce;

  return (
    <section className="px-0 py-[120px]" id="preview" data-screen-label="02 Product preview">
      <div className="mx-auto max-w-[1200px] px-8">
        {/* head */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 flex flex-col items-center gap-4 text-center"
        >
          <Eyebrow accent>// Product preview</Eyebrow>
          <h2 className="font-display text-[clamp(36px,4.5vw,56px)]">
            Your entire database.
            <br />
            <em>One interface.</em>
          </h2>
        </motion.div>

        {/* Mockup — always rendered in dark mode regardless of page theme;
            it represents a screenshot of the actual product running in dark
            UI, the way Stripe and Linear do on their marketing pages. */}
        <motion.div
          ref={wrapRef}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 60, scale: 0.96 }}
          whileInView={
            reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
          }
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="dark relative mx-auto max-w-[1100px] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--bg-surface)] shadow-[0_40px_120px_rgba(0,0,0,0.45),0_0_0_1px_var(--border-subtle)]"
          role="img"
          aria-label="Strata application screenshot"
          style={{ transformOrigin: "50% 0%" }}
        >
          <div className="pointer-events-none absolute inset-0 mockup-scanlines" />

          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] md:h-[600px]">
            {/* Topbar */}
            <div className="md:col-span-2 flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-base)] px-4 h-11">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-[var(--border-default)]" />
                <span className="size-2.5 rounded-full bg-[var(--border-default)]" />
                <span className="size-2.5 rounded-full bg-[var(--border-default)]" />
              </div>
              <div className="ml-2 font-mono text-[12px] text-[var(--text-secondary)]">
                strata <b className="font-medium text-[var(--text-primary)]">/ production-db</b> · us-east-2
              </div>
              <div className="flex-1" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-[11px] tracking-[0.05em] text-[var(--text-secondary)]">
                ⌘K
              </span>
            </div>

            {/* Sidebar */}
            <aside
              aria-label="Schema tree"
              className="hidden md:block border-r border-[var(--border-subtle)] bg-[var(--bg-base)] p-2 text-[13px]"
            >
              <div className="px-2.5 pb-2.5 pt-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Schema · public
              </div>
              {TABLES.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
                  animate={
                    reveal
                      ? reduce
                        ? { opacity: 1 }
                        : { opacity: 1, x: 0 }
                      : undefined
                  }
                  transition={{
                    duration: 0.4,
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.12 + i * 0.04,
                  }}
                  className={
                    "flex items-center gap-2.5 rounded px-2.5 py-1.5 font-mono text-[12px] " +
                    (t.active
                      ? "bg-[var(--accent-muted)] text-[var(--text-primary)] shadow-[inset_2px_0_0_var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]")
                  }
                >
                  <DatabaseIcon
                    className={
                      "h-3 w-3 " +
                      (t.active
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-muted)]")
                    }
                  />
                  {t.name}
                  <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                    {t.count}
                  </span>
                </motion.div>
              ))}
            </aside>

            {/* Main */}
            <div className="flex min-w-0 flex-col bg-[var(--bg-surface)]">
              {/* Tabs */}
              <div className="flex h-10 items-center gap-1 border-b border-[var(--border-subtle)] px-4">
                {(["users", "orders", "SQL"] as const).map((t, i) => (
                  <div
                    key={t}
                    className={
                      "relative rounded-t-[6px] px-3 py-2 font-mono text-[12px] " +
                      (i === 0
                        ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-px after:bg-[var(--bg-elevated)]"
                        : "text-[var(--text-secondary)]")
                    }
                  >
                    {t}
                  </div>
                ))}
                <div className="flex-1" />
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.1)] px-2.5 font-mono text-[11px] text-[var(--success)]">
                  <span
                    className="size-1.5 rounded-full bg-[var(--success)]"
                    style={{ boxShadow: "0 0 8px var(--success)" }}
                  />
                  Connected
                </span>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5 font-mono text-[11px] text-[var(--text-muted)]">
                <span className="rounded border border-[var(--border-subtle)] px-2 py-[3px] text-[var(--text-secondary)]">
                  12,481 rows
                </span>
                <span className="rounded border border-[var(--border-subtle)] px-2 py-[3px] text-[var(--text-secondary)]">
                  9 columns
                </span>
                <span className="rounded border border-[rgba(99,102,241,0.3)] bg-[var(--accent-muted)] px-2 py-[3px] text-[var(--accent)]">
                  filter: status = &apos;active&apos;
                </span>
                <span className="flex-1" />
                <span>~ 14 ms</span>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-hidden">
                <table
                  className="w-full border-collapse font-mono text-[12px]"
                  aria-label="Users table"
                >
                  <thead>
                    <tr>
                      {COLS.map((c) => (
                        <th
                          key={c.name}
                          className="sticky top-0 whitespace-nowrap border-b border-[var(--border-subtle)] bg-[var(--bg-base)] px-3.5 py-2 text-left text-[11px] font-medium tracking-[0.05em] text-[var(--text-muted)]"
                        >
                          {c.name}
                          <span className="ml-1.5 inline-block rounded bg-[var(--bg-elevated)] px-1.5 py-px text-[10px] text-[var(--text-muted)]">
                            {c.type}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((r, i) => (
                      <motion.tr
                        key={r[0]}
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                        animate={
                          reveal
                            ? reduce
                              ? { opacity: 1 }
                              : { opacity: 1, y: 0 }
                            : undefined
                        }
                        transition={{
                          duration: 0.4,
                          ease: [0.16, 1, 0.3, 1],
                          delay: 0.2 + i * 0.04,
                        }}
                      >
                        <td className="max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-[var(--border-subtle)] px-3.5 py-[9px] text-[var(--text-muted)]">
                          {r[0]}
                        </td>
                        <td className="max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-[var(--border-subtle)] px-3.5 py-[9px] text-[var(--text-primary)]">
                          {r[1]}
                        </td>
                        <td className="max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-[var(--border-subtle)] px-3.5 py-[9px] text-[var(--text-secondary)]">
                          {r[2]}
                        </td>
                        <td className="max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-[var(--border-subtle)] px-3.5 py-[9px] text-[var(--accent)]">
                          active
                        </td>
                        <td className="max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-[var(--border-subtle)] px-3.5 py-[9px] text-[var(--text-secondary)]">
                          {r[3]}
                        </td>
                        <td className="max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-[var(--border-subtle)] px-3.5 py-[9px] text-[var(--text-secondary)]">
                          {r[4]}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
