"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/lib/validations";

/**
 * Real sign-in via BetterAuth. The previous demo-cookie path lives separately
 * on the auth pages as an explicit "Try the demo" CTA so users understand
 * which surface they're using.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, startTransition] = useTransition();

  function validateField(field: "email" | "password") {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === field);
      setErrors((e) => ({ ...e, [field]: issue?.message }));
    } else {
      setErrors((e) => ({ ...e, [field]: undefined }));
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const next: typeof errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as "email" | "password";
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    startTransition(async () => {
      try {
        const { error } = await authClient.signIn.email({
          email: result.data.email,
          password: result.data.password,
        });
        if (error) {
          setFormError(mapAuthError(error));
          return;
        }
        router.push("/connections");
        router.refresh();
      } catch {
        // Network / DB-unreachable case — surfaces while the production
        // DATABASE_URL is still a placeholder. Demo browsing still works.
        setFormError(
          "Sign-in is temporarily unavailable. Try the demo below, or contact support."
        );
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => validateField("email")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          disabled={submitting}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-destructive">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => validateField("password")}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            disabled={submitting}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="text-xs text-destructive">
            {errors.password}
          </p>
        )}
      </div>

      {formError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}

/**
 * Map BetterAuth's error envelope to a user-facing string. The library
 * doesn't expose a stable error-code enum, so we look at the message text
 * for the well-known cases and fall back to a generic message otherwise.
 */
function mapAuthError(error: { message?: string; code?: string }): string {
  const m = (error.message ?? "").toLowerCase();
  const c = (error.code ?? "").toLowerCase();
  if (
    m.includes("invalid email") ||
    m.includes("invalid password") ||
    m.includes("invalid credentials") ||
    c.includes("invalid")
  ) {
    return "Invalid email or password.";
  }
  if (m.includes("not found") || m.includes("does not exist")) {
    return "No account with that email. Create one below.";
  }
  if (m.includes("verify") || m.includes("verification")) {
    return "Please verify your email before signing in.";
  }
  if (m.includes("rate") || m.includes("too many")) {
    return "Too many attempts. Try again in a minute.";
  }
  return "Could not sign in. Please try again.";
}
