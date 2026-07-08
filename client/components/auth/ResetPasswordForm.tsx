"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { useResetPassword } from "@/lib/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { CheckIcon } from "@/components/icons";

export default function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const reset = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    try {
      await reset.mutateAsync({ token, newPassword: password });
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  };

  if (!token) {
    return (
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
          Invalid link
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          This password reset link is missing or malformed.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mint text-brand">
          <CheckIcon className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-brand-dark">
          Password updated
        </h1>
        <p className="mt-2 text-[15px] text-muted">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
        Set a new password
      </h1>
      <p className="mt-2 text-[15px] text-muted">Choose a strong password you don&apos;t use elsewhere.</p>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Input
          id="password"
          label="New password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <Input
          id="confirm"
          label="Confirm password"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
        />
        <Button type="submit" full size="lg" disabled={reset.isPending}>
          {reset.isPending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
