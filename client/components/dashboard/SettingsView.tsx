import Link from "next/link";
import type { Role } from "@/lib/types";
import { roleMeta } from "@/lib/nav";
import { Card, CardHeader } from "@/components/ui/Card";
import PageHeader from "@/components/dashboard/PageHeader";
import { Input } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { LogoutIcon } from "@/components/icons";

export default function SettingsView({ role }: { role: Role }) {
  const { user, title } = roleMeta[role];
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your profile and preferences."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 text-center lg:col-span-1">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mint text-lg font-semibold text-brand">
            {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </span>
          <p className="mt-3 font-semibold text-brand-dark">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
          <span className="mt-3 inline-block rounded-full bg-mint px-3 py-1 text-xs font-semibold text-brand">
            {title}
          </span>
          <p className="mt-3 text-sm text-muted">{user.location}</p>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Profile" />
            <div className="space-y-4 p-5">
              <Input id="name" label="Full name" defaultValue={user.name} />
              <Input id="email" label="Email" defaultValue={user.email} />
              <Input id="location" label="Location" defaultValue={user.location} />
              <div>
                <Button variant="dark">Save changes</Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Security" />
            <div className="space-y-4 p-5">
              <Input id="pw" type="password" label="New password" placeholder="••••••••" />
              <div>
                <Button variant="outline">Update password</Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="font-medium text-brand-dark">Sign out</p>
                <p className="text-sm text-muted">
                  End your session on this device.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                <LogoutIcon className="h-4 w-4" /> Log out
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
