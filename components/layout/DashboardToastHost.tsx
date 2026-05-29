"use client";

import { ToastProvider } from "@/components/bahrawy/toast";

/**
 * Thin client wrapper so the server-side dashboard layout can mount the
 * imperative <ToastProvider> without becoming a client component itself.
 */
export function DashboardToastHost({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider position="bottom-right" duration={3500}>
      {children}
    </ToastProvider>
  );
}
