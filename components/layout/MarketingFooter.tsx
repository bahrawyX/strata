import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "/#changelog" },
      { label: "Roadmap", href: "/#roadmap" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "API reference", href: "/docs#api" },
      { label: "Status", href: "/#status" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#about" },
      { label: "Blog", href: "/#blog" },
      { label: "Contact", href: "/#contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/#privacy" },
      { label: "Terms", href: "/#terms" },
      { label: "Security", href: "/#security" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="mt-20 border-t border-[var(--border-subtle)] px-0 pb-12 pt-16">
      <div className="mx-auto max-w-[1200px] px-8">
        <div className="grid grid-cols-2 items-start gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-4 max-w-[220px] text-[14px] leading-[1.55] text-[var(--text-muted)]">
              The layer between you and your data.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--text-muted)]">
                {col.title}
              </h4>
              <ul className="flex list-none flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[14px] text-[var(--text-secondary)] transition-colors duration-[120ms] hover:text-[var(--text-primary)]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-[var(--border-subtle)] pt-6 text-[13px] text-[var(--text-muted)] sm:flex-row sm:items-center">
          <div className="font-mono text-[12px]">
            © {new Date().getFullYear()} Strata Systems, Inc.
          </div>
          <div className="font-mono text-[12px]">
            Built with Neon + Next.js
          </div>
        </div>
      </div>
    </footer>
  );
}
