"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function Topbar({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName: string;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 border-b border-border bg-card/40 backdrop-blur-sm flex items-center px-4 gap-4">
      <Link href="/connections" className="inline-flex">
        <Logo />
      </Link>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-sm text-foreground">{userName}</span>
          <span className="text-xs text-muted-foreground">{userEmail}</span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
