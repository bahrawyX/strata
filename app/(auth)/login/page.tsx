import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign in — Strata",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = typeof params.redirect === "string" ? params.redirect : "/connections";

  return (
    <div>
      <div className="mb-8 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to continue to your databases.
        </p>
      </div>
      <LoginForm redirectTo={redirectTo} />
      <p className="mt-6 text-sm text-muted-foreground">
        New to Strata?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground hover:text-primary transition-colors"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
