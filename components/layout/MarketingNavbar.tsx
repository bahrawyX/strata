"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#workflow" },
  { label: "Security", href: "#security" },
];

export function MarketingNavbar({ isAuthed }: { isAuthed: boolean }) {
  const { scrollY } = useScroll();
  const reduce = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const lastY = useRef(0);

  useMotionValueEvent(scrollY, "change", (current) => {
    const previous = lastY.current;
    const delta = current - previous;
    setCondensed(current > 12);
    if (!reduce && current > 120) {
      if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
    } else {
      setHidden(false);
    }
    lastY.current = current;
  });

  useEffect(() => {
    lastY.current = window.scrollY;
    setCondensed(window.scrollY > 12);
  }, []);

  return (
    <motion.header
      animate={{ y: hidden ? "-120%" : "0%" }}
      transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <motion.nav
        layout
        transition={{ layout: { duration: 0.28, ease: [0.23, 1, 0.32, 1] } }}
        className={cn(
          "flex w-full max-w-5xl items-center justify-between rounded-full border px-3 py-2 transition-[background-color,border-color,box-shadow] duration-300",
          condensed
            ? "border-border/80 bg-card/85 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
            : "border-transparent bg-transparent"
        )}
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo size={22} />
        </Link>

        <ul className="hidden md:flex items-center gap-1 text-sm">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">
          {isAuthed ? (
            <Button asChild size="sm">
              <Link href="/connections">
                Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <AnimatePresence initial={false} mode="popLayout">
                {condensed && (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, scale: 0.94, width: 0 }}
                    animate={{ opacity: 1, scale: 1, width: "auto" }}
                    exit={{ opacity: 0, scale: 0.94, width: 0 }}
                    transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <Button asChild size="sm">
                      <Link href="/signup">Get started</Link>
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </motion.nav>
    </motion.header>
  );
}
