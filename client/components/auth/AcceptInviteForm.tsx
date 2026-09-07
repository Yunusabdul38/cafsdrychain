"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { useAcceptInvite, useVerifyInviteToken } from "@/lib/hooks/useInvite";
import { ApiError } from "@/lib/api";
import { CheckIcon, ClockIcon } from "@/components/icons";
import { Spinner } from "@/components/dashboard/States";

/**
 * Where an invited user lands. They choose their own password here, so no
 * password is ever created for them or sent by email.
 */
export default function AcceptInviteForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const { data: tokenStatus, isLoading: isVerifying } = useVerifyInviteToken(token);
  const accept = useAcceptInvite();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errs: Record<string, string[]> = {};
    if (password.length < 8) errs.password = ["Password must be at least 8 characters."];
    if (password !== confirm) errs.confirm = ["Passwords do not match."];
    if (Object.keys(errs).length) return setFieldErrors(errs);

    try {
      await accept.mutateAsync({ token, password });
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again."
      );
    }
  };

  if (!token) {
    return (
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
          Invalid link
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          This invitation link is missing or malformed. Ask your administrator to
          send a new one.
        </p>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="py-4">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
          Checking your invitation…
        </h1>
        <p className="mt-2 flex items-center gap-2 text-[15px] text-muted">
          <Spinner className="h-4 w-4 animate-spin text-brand" /> One moment.
        </p>
      </div>
    );
  }

  if (tokenStatus && !tokenStatus.valid) {
    const reason = tokenStatus.reason;
    const title =
      reason === "expired"
        ? "Invitation expired"
        : reason === "superseded"
          ? "A newer invitation was sent"
          : reason === "used"
            ? "Already set up"
            : "Invalid link";
    const body =
      reason === "expired"
        ? "Invitations last 72 hours. Ask your administrator to send you a new one."
        : reason === "superseded"
          ? "This link was replaced when a fresh invitation was sent to you. Open the most recent invitation email and use the link there."
          : reason === "used"
            ? "This invitation has already been used. Sign in with the password you chose."
            : "This invitation link is not valid. Ask your administrator to send a new one.";

    return (
      <div>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ClockIcon className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-brand-dark">
          {title}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Go to sign in
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
          Account ready
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          Your password is set. Taking you to sign in…
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
        Set your password
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Choose a password only you know. Nobody else, including your
        administrator, can see it.
      </p>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
        <Button type="submit" full size="lg" disabled={accept.isPending}>
          {accept.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="h-5 w-5 animate-spin text-white" />
              Setting up your account…
            </span>
          ) : (
            "Set password and continue"
          )}
        </Button>
      </form>
    </div>
  );
}
