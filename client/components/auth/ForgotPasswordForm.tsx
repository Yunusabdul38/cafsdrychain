"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { useForgotPassword } from "@/lib/hooks/useAuth";
import { CheckIcon } from "@/components/icons";
import BackLink from "@/components/ui/BackLink";
import { Spinner } from "@/components/dashboard/States";

export default function ForgotPasswordForm() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const newFieldErrors: Record<string, string[]> = {};
    if (!email.trim()) {
      newFieldErrors.email = ["Email is required."];
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newFieldErrors.email = ["Please enter a valid email address."];
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    // Always show success — the server never reveals whether the email exists.
    await forgot.mutateAsync({ email }).catch(() => {});
    setSent(true);
  };

  if (sent) {
    return (
      <div>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mint text-brand">
          <CheckIcon className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-brand-dark">
          Check your email
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          If an account exists for <span className="font-medium text-brand-dark">{email}</span>,
          we&apos;ve sent a link to reset your password. It expires in 1 hour.
        </p>
        <BackLink href="/login" label="Back to sign in" className="mt-6" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
        Forgot password?
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Input
          id="email"
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="folake@cafsdrychain.io"
          error={fieldErrors.email?.[0]}
        />
        <Button type="submit" full size="lg" disabled={forgot.isPending}>
          {forgot.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="h-5 w-5 animate-spin text-white" />
              Sending…
            </span>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>

      <BackLink href="/login" label="Back to sign in" className="mt-6" />
    </div>
  );
}
