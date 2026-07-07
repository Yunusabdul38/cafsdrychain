"use client";

import { useState } from "react";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input, Select } from "@/components/ui/Field";
import Button, { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PageHeader from "@/components/dashboard/PageHeader";
import { CheckIcon, MailIcon } from "@/components/icons";

const roles: { id: Role; label: string; desc: string }[] = [
  { id: "operator", label: "Operator", desc: "Registers & updates batches" },
  { id: "admin", label: "Administrator", desc: "Full oversight & reporting" },
  { id: "auditor", label: "Auditor", desc: "Read-only verification & audit" },
];

export default function AddUserForm() {
  const [role, setRole] = useState<Role>("operator");
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");

  if (done) {
    return (
      <>
        <PageHeader title="User invited" />
        <Card className="mx-auto max-w-md p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint text-brand">
            <CheckIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-brand-dark">
            Account created
          </h2>
          <p className="mt-2 text-sm text-muted">
            {name || "The user"} has been provisioned as{" "}
            <span className="font-medium text-brand-dark">
              {roles.find((r) => r.id === role)?.label}
            </span>
            . An invite with sign-in details was sent by email.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1.5 text-xs font-medium text-brand">
            <MailIcon className="h-4 w-4" /> Invite email sent
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <LinkButton href="/admin/operators" full variant="dark">
              Back to users
            </LinkButton>
            <Button full variant="outline" onClick={() => setDone(false)}>
              Add another
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Add user"
        description="Provision a new account and assign a role."
        back={{ href: "/admin/operators", label: "Users" }}
      />

      <Card className="mx-auto max-w-xl p-5 sm:p-7">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setDone(true);
          }}
          className="space-y-5"
        >
          <div>
            <p className="mb-2 text-sm font-medium text-brand-dark">Role</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-colors",
                    role === r.id
                      ? "border-brand-dark bg-mint/50"
                      : "border-black/[0.12] hover:bg-mint/30"
                  )}
                >
                  <span className="block text-sm font-semibold text-brand-dark">
                    {r.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {r.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Input
            id="name"
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Zainab Bello"
            required
          />
          <Input
            id="email"
            type="email"
            label="Work email"
            placeholder="user@cafsdrychain.io"
            required
          />
          <Select id="location" label="Location" defaultValue="Oyo Solar Hub">
            <option>Oyo Solar Hub</option>
            <option>Kano Solar Hub</option>
            <option>Kaduna Solar Hub</option>
            <option>HQ · Ibadan</option>
            <option>Abuja</option>
          </Select>

          <div className="flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-mint/40 px-4 py-3 text-sm text-brand-dark">
            <MailIcon className="h-5 w-5 shrink-0 text-brand" />
            The user receives an email invite to set their password.
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
            <Button type="submit" full size="lg">
              Create account
            </Button>
            <LinkButton
              href="/admin/operators"
              full
              size="lg"
              variant="outline"
            >
              Cancel
            </LinkButton>
          </div>
        </form>
      </Card>
    </>
  );
}
