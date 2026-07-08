"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { useLogin } from "@/lib/hooks/useAuth";
import { ApiError } from "@/lib/api";

export default function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { user } = await login.mutateAsync({ email, password });
      // Route by the role the backend assigned — not a client-side choice.
      router.push(user.role === "admin" ? "/admin" : "/operator");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to reach the server. Please try again."
      );
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
          {login.isPending ? "Signing in…" : "Sign in"}
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
