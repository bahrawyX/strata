"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { signupSchema } from "@/lib/validations";

/**
 * Real signup via BetterAuth. Creates a real user row and signs them in.
 * Demo path lives separately on the auth pages as an explicit CTA.
 */
export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, startTransition] = useTransition();

  function validateField(field: "name" | "email" | "password") {
    const result = signupSchema.safeParse({ name, email, password });
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
    const result = signupSchema.safeParse({ name, email, password });
    if (!result.success) {
      const next: typeof errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as "name" | "email" | "password";
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    startTransition(async () => {
      try {
        const { error } = await authClient.signUp.email({
          name: result.data.name,
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
        setFormError(
          "Sign-up is temporarily unavailable. Try the demo below, or contact support."
        );
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => validateField("name")}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
          disabled={submitting}
        />
        {errors.name && (
          <p id="name-error" className="text-xs text-destructive">
            {errors.name}
          </p>
        )}
      </div>

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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => validateField("password")}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "password-error" : "password-hint"
            }
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
        {errors.password ? (
          <p id="password-error" className="text-xs text-destructive">
            {errors.password}
          </p>
        ) : (
          <p id="password-hint" className="text-xs text-muted-foreground">
            At least 8 characters.
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
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}

function mapAuthError(error: { message?: string; code?: string }): string {
  const m = (error.message ?? "").toLowerCase();
  const c = (error.code ?? "").toLowerCase();
  if (
    m.includes("already") ||
    m.includes("exists") ||
    c.includes("user_already_exists")
  ) {
    return "An account with that email already exists. Sign in instead.";
  }
  if (m.includes("password")) {
    return "Password doesn't meet requirements — use at least 8 characters.";
  }
  if (m.includes("rate") || m.includes("too many")) {
    return "Too many attempts. Try again in a minute.";
  }
  return "Could not create your account. Please try again.";
}
