import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { DemoShortcut } from "@/components/auth/DemoShortcut";

export const metadata = {
  title: "Sign in — Strata",
};

export default function LoginPage() {
  return (
    <div>
      <div className="mb-8 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to continue to your databases.
        </p>
      </div>
      <LoginForm />
      <p className="mt-6 text-sm text-muted-foreground">
        New to Strata?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground transition-colors hover:text-primary"
        >
          Create an account
        </Link>
      </p>
      <DemoShortcut />
    </div>
  );
}
