import Link from "next/link";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border px-6 py-3">
        <h1 className="text-base font-medium">Settings</h1>
        <nav aria-label="Settings sections" className="mt-2 flex gap-1 text-sm">
          <Link
            href="/settings/billing"
            className="rounded-md border border-transparent border-b-[var(--accent)] px-2 py-1 text-foreground"
          >
            Billing
          </Link>
        </nav>
      </header>
      <div className="flex-1 overflow-auto scrollbar-thin p-6">{children}</div>
    </div>
  );
}
