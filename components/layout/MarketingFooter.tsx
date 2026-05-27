"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Logo } from "@/components/brand/Logo";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.27-1.7-1.27-1.7-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.68 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.94 10.94 0 0 1 5.74 0c2.18-1.49 3.14-1.18 3.14-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.35.78 1.05.78 2.12v3.14c0 .31.21.67.79.56C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

const COLUMNS = [
  {
    label: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#workflow" },
      { label: "Security", href: "#security" },
    ],
  },
  {
    label: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/signup" },
    ],
  },
  {
    label: "More",
    links: [
      {
        label: "Source on GitHub",
        href: "https://github.com/bahrawyX/strata",
        external: true,
      },
    ],
  },
];

export function MarketingFooter() {
  const reduce = useReducedMotion();

  return (
    <footer className="relative mt-12 border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-6 pt-14 pb-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground leading-relaxed">
              The Postgres workspace for people who ship.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.label}>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
                  {col.label}
                </h4>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      {"external" in link && link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-foreground/85 hover:text-foreground transition-colors duration-150"
                        >
                          {link.label}
                          {link.label.toLowerCase().includes("github") && (
                            <GithubMark className="h-3 w-3" />
                          )}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-foreground/85 hover:text-foreground transition-colors duration-150"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Big wordmark that softly reveals on scroll. */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          whileInView={reduce ? { opacity: 0.65 } : { opacity: 0.65, y: 0 }}
          viewport={{ once: true, margin: "-5% 0px" }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          className="mt-14 select-none overflow-hidden"
          aria-hidden
        >
          <p className="-mb-3 text-[clamp(3rem,17vw,12rem)] font-semibold leading-[0.85] tracking-tighter text-foreground/10">
            strata
          </p>
        </motion.div>

        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Strata. All rights reserved.</span>
          <span>Built for developers.</span>
        </div>
      </div>
    </footer>
  );
}
