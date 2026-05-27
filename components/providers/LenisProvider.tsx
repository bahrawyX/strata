"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";

/**
 * Smooth-scroll wrapper. Lenis hijacks wheel/touch and drives a single rAF
 * loop, so scroll-driven animations downstream (motion's `useScroll`,
 * IntersectionObserver, etc.) all stay in sync.
 *
 * Disabled when the user prefers reduced motion — falls back to native scroll.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // Hash-link support — Lenis intercepts the default scroll, so we re-run
    // the jump through its API.
    const onHashClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement | null)?.closest("a[href^='#']");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -80 });
    };
    document.addEventListener("click", onHashClick);

    return () => {
      document.removeEventListener("click", onHashClick);
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
