"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { useLogin } from "@/lib/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { Spinner } from "@/components/dashboard/States";

export default function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const newFieldErrors: Record<string, string[]> = {};
    if (!email.trim()) {
      newFieldErrors.email = ["Email is required."];
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newFieldErrors.email = ["Please enter a valid email address."];
    }
    if (!password) {
      newFieldErrors.password = ["Password is required."];
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    try {
      const { user } = await login.mutateAsync({ email, password });
      // Route by the role the backend assigned — not a client-side choice.
      router.push(user.role === "admin" ? "/admin" : "/operator");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && typeof err.details === "object") {
          setFieldErrors(err.details as Record<string, string[]>);
        } else {
          setError(err.message);
        }
      } else {
        setError("Unable to reach the server. Please try again.");
      }
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
        Welcome back
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        Sign in to your CAFS DryChain workspace.
      </p>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Input
          id="email"
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@cafsdrychain.io"
          error={fieldErrors.email?.[0]}
        />
        <div>
          <Input
            id="password"
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            error={fieldErrors.password?.[0]}
          />
          <div className="mt-2 flex items-center justify-end text-sm">
            <Link
              href="/forgot-password"
              className="font-medium text-brand hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" full size="lg" disabled={login.isPending}>
          {login.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="h-5 w-5 animate-spin text-white" />
              Signing in…
            </span>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Accounts are provisioned by your administrator.
        <br />
        Need access?{" "}
        <Link
          href="#"
          className="font-semibold text-brand hover:underline"
        >
          Contact your admin
        </Link>
      </p>
    </div>
  );
}
