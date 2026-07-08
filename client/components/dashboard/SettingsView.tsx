"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { roleMeta } from "@/lib/nav";
import { useAuthStore } from "@/lib/store/auth";
import { useChangePassword, useLogout } from "@/lib/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import PageHeader from "@/components/dashboard/PageHeader";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { LoadingState } from "@/components/dashboard/States";
import { LogoutIcon, CheckIcon } from "@/components/icons";

export default function SettingsView() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const changePassword = useChangePassword();
  const logout = useLogout();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!user) return <LoadingState />;

  const title = roleMeta[user.role].title;
  const initials = user.name.split(" ").map((n) => n[0]).slice(0, 2).join("");

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await changePassword.mutateAsync({ currentPassword: current, newPassword: next });
      setMsg({ ok: true, text: "Password updated." });
      setCurrent("");
      setNext("");
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "Failed to update." });
    }
  };

  const onLogout = async () => {
    await logout.mutateAsync().catch(() => {});
    router.replace("/login");
  };

  return (
    <>
      <PageHeader title="Settings" description="Manage your profile and security." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 text-center lg:col-span-1">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mint text-lg font-semibold text-brand">
            {initials}
          </span>
          <p className="mt-3 font-semibold text-brand-dark">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
          <span className="mt-3 inline-block rounded-full bg-mint px-3 py-1 text-xs font-semibold text-brand">
            {title}
          </span>
          {user.location && <p className="mt-3 text-sm text-muted">{user.location}</p>}
          {user.wallet && (
            <div className="mt-4 rounded-2xl border border-black/[0.08] bg-mint/40 p-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">
                Wallet
              </p>
              <p className="mt-1 break-all font-mono text-xs text-brand-dark">
                {user.wallet.address}
              </p>
            </div>
          )}
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Profile" />
            <div className="space-y-4 p-5">
              <Input id="name" label="Full name" defaultValue={user.name} disabled />
              <Input id="email" label="Email" defaultValue={user.email} disabled />
              <p className="text-xs text-muted">
                Profile details are managed by your administrator.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Change password" />
            <form onSubmit={onChangePassword} className="space-y-4 p-5">
              {msg && (
                <div
                  className={
                    msg.ok
                      ? "flex items-center gap-2 rounded-2xl border border-brand/30 bg-mint/50 px-4 py-2.5 text-sm text-brand"
                      : "rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600"
                  }
                >
                  {msg.ok && <CheckIcon className="h-4 w-4" />} {msg.text}
                </div>
              )}
              <Input
                id="current"
                type="password"
                label="Current password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="••••••••"
                required
              />
              <Input
                id="new"
                type="password"
                label="New password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
              <Button type="submit" variant="dark" disabled={changePassword.isPending}>
                {changePassword.isPending ? "Updating…" : "Update password"}
              </Button>
            </form>
          </Card>

          <Card>
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="font-medium text-brand-dark">Sign out</p>
                <p className="text-sm text-muted">End your session on this device.</p>
              </div>
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                <LogoutIcon className="h-4 w-4" /> Log out
              </button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
