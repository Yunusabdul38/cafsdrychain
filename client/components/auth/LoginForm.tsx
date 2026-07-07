"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/types";
import { roleMeta } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const roles: { id: Role; label: string }[] = [
  { id: "operator", label: "Operator" },
  { id: "admin", label: "Admin" },
  { id: "auditor", label: "Auditor" },
];

export default function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("operator");
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Frontend demo — route to the selected role's dashboard
    setTimeout(() => router.push(roleMeta[role].home), 350);
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
        Welcome back
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        Sign in to your CAFS DryChain workspace.
      </p>

      {/* Role selector */}
      <div className="mt-7">
        <p className="mb-2 text-sm font-medium text-brand-dark">Sign in as</p>
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-black/[0.1] p-1">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={cn(
                "rounded-xl py-2.5 text-sm font-semibold transition-colors",
                role === r.id
                  ? "bg-brand-dark text-white"
                  : "text-brand-dark/70 hover:bg-mint"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <Input
          id="email"
          label="Email"
          type="email"
          required
          defaultValue={roleMeta[role].user.email}
          key={role}
          placeholder="you@cafsdrychain.io"
        />
        <div>
          <Input
            id="password"
            label="Password"
            type="password"
            required
            defaultValue="demo1234"
            placeholder="••••••••"
          />
          <div className="mt-2 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-black/20 accent-brand"
              />
              Remember me
            </label>
            <Link href="#" className="font-medium text-brand hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" full size="lg" disabled={loading}>
          {loading ? "Signing in…" : `Sign in as ${roleMeta[role].title}`}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Accounts are provisioned by your administrator.
        <br />
        Need access?{" "}
        <Link
          href="mailto:admin@cafsdrychain.io"
          className="font-semibold text-brand hover:underline"
        >
          Contact your admin
        </Link>
      </p>
    </div>
  );
}
