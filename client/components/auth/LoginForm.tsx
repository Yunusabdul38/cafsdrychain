"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { useLogin, useLogout } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/store/auth";
import { ApiError } from "@/lib/api";
import { Spinner } from "@/components/dashboard/States";

/** Where a signed-in user belongs. */
const homeFor = (role: string) => (role === "admin" ? "/admin" : "/operator");

export default function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const logout = useLogout();
  const { user, status } = useAuthStore();
  const reason = useSearchParams().get("reason");

  // Already signed in? There is nothing to do here — go where they belong.
  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(homeFor(user.role));
    }
  }, [status, user, router]);
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
      const { user: signedIn } = await login.mutateAsync({ email, password });
      // Route by the role the backend assigned — not a client-side choice.
      router.push(homeFor(signedIn.role));
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

  const clashError =
    login.error instanceof ApiError && login.error.status === 409 ? login.error : null;

  // A new tab starts "idle" until the refresh cookie is checked. Showing the
  // form during that window is what let a second person sign in over an active
  // session, so nothing is offered until we know who holds this browser.
  if (status === "idle" || (status === "authenticated" && user)) {
    return (
      <div className="py-4">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
          {status === "idle" ? "Checking your session…" : "Taking you to your dashboard…"}
        </h1>
        <p className="mt-2 flex items-center gap-2 text-[15px] text-muted">
          <Spinner className="h-4 w-4 animate-spin text-brand" /> One moment.
        </p>
      </div>
    );
  }

  return (
    <div>
      {reason === "timeout" && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Session expired</p>
          <p className="mt-1 leading-relaxed">
            You were signed out after an hour of inactivity. Please sign in
            again to continue.
          </p>
        </div>
      )}
      {reason === "expired" && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Session expired</p>
          <p className="mt-1 leading-relaxed">
            Your session ended before that action could be completed. Sign in
            again. Nothing was saved.
          </p>
        </div>
      )}
      {reason === "switched" && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Signed out for your safety</p>
          <p className="mt-1 leading-relaxed">
            A different account signed in on this browser, so this session was
            ended rather than continued as someone else.
          </p>
        </div>
      )}
      {clashError && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Another account is signed in here</p>
          <p className="mt-1 leading-relaxed">{clashError.message}</p>
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="mt-2 text-sm font-semibold text-brand hover:underline"
          >
            Sign out that account
          </button>
        </div>
      )}
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
          placeholder="folake@cafsdrychain.io"
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
    </div>
  );
}
