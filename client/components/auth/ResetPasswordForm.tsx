"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { useResetPassword, useVerifyResetToken } from "@/lib/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { CheckIcon, ClockIcon } from "@/components/icons";
import { Spinner } from "@/components/dashboard/States";

export default function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const { data: tokenStatus, isLoading: isVerifying } = useVerifyResetToken(token);
  const reset = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const newFieldErrors: Record<string, string[]> = {};
    if (password.length < 8) {
      newFieldErrors.password = ["Password must be at least 8 characters."];
    }
    if (password !== confirm) {
      newFieldErrors.confirm = ["Passwords do not match."];
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    try {
      await reset.mutateAsync({ token, newPassword: password });
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && typeof err.details === "object") {
          setFieldErrors(err.details as Record<string, string[]>);
        } else {
          setError(err.message);
        }
      } else {
        setError("Something went wrong.");
      }
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

  if (isVerifying) {
    return (
      <div className="py-4">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
          Verifying reset link…
        </h1>
        <p className="mt-2 text-[15px] text-muted">Please wait while we check your link status.</p>
      </div>
    );
  }

  if (tokenStatus && !tokenStatus.valid) {
    const isExpired = tokenStatus.reason === "expired";
    const isUsed = tokenStatus.reason === "used";

    return (
      <div>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ClockIcon className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-brand-dark">
          {isExpired ? "Link expired" : isUsed ? "Link already used" : "Invalid link"}
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          {isExpired
            ? "This password reset link has expired for security reasons. Please request a new one."
            : isUsed
            ? "This password reset link has already been used to change your password."
            : "This password reset link is invalid or malformed."}
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Request a new reset link
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
          error={fieldErrors.password?.[0]}
        />
        <Input
          id="confirm"
          label="Confirm password"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          error={fieldErrors.confirm?.[0]}
        />
        <Button type="submit" full size="lg" disabled={reset.isPending}>
          {reset.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="h-5 w-5 animate-spin text-white" />
              Updating password…
            </span>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </div>
  );
}
