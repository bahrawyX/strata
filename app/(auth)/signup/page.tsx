import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata = {
  title: "Create your account — Strata",
};

export default function SignupPage() {
  return (
    <div>
      <div className="mb-8 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your Postgres databases from one place.
        </p>
      </div>
      <SignupForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground hover:text-primary transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
