"use client";

import { useState, useEffect } from "react";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input, Select } from "@/components/ui/Field";
import Button, { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PageHeader from "@/components/dashboard/PageHeader";
import { CheckIcon, MailIcon, LinkIcon } from "@/components/icons";
import { useCreateUser, type ApiUser } from "@/lib/hooks/useUsers";
import { useLocations } from "@/lib/hooks/useLocations";
import { ApiError } from "@/lib/api";

const roles: { id: Role; label: string; desc: string }[] = [
  { id: "operator", label: "Operator", desc: "Registers & updates batches" },
  { id: "admin", label: "Administrator", desc: "Full oversight & reporting" },
];

export default function AddUserForm() {
  const createUser = useCreateUser();
  const { data: locations = [], isLoading: isLocsLoading } = useLocations();
  const [role, setRole] = useState<Role>("operator");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ user: ApiUser; tempPassword: string } | null>(null);

  useEffect(() => {
    if (locations.length > 0 && !location) {
      setLocation(locations[0].name);
    }
  }, [locations, location]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await createUser.mutateAsync({
        name,
        email,
        role: role.toUpperCase() as unknown as Role, // backend expects ADMIN/OPERATOR
        location,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create user.");
    }
  };

  if (result) {
    return (
      <>
        <PageHeader title="User created" />
        <Card className="mx-auto max-w-md p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint text-brand">
            <CheckIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-brand-dark">
            {result.user.name} provisioned
          </h2>
          <p className="mt-2 text-sm text-muted">
            Account created as{" "}
            <span className="font-medium text-brand-dark">
              {roles.find((r) => r.id === role)?.label}
            </span>
            . An invite email was sent with sign-in details.
          </p>

          {result.user.wallet && (
            <div className="mt-4 rounded-2xl border border-black/[0.08] bg-mint/40 p-4 text-left">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand">
                <LinkIcon className="h-4 w-4" /> Deterministic wallet
              </p>
              <p className="mt-1 break-all font-mono text-xs text-brand-dark">
                {result.user.wallet.address}
              </p>
            </div>
          )}

          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1.5 text-xs font-medium text-brand">
            <MailIcon className="h-4 w-4" /> Temp password: {result.tempPassword}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <LinkButton href="/admin/operators" full variant="dark">
              Back to users
            </LinkButton>
            <Button
              full
              variant="outline"
              onClick={() => {
                setResult(null);
                setName("");
                setEmail("");
              }}
            >
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
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-brand-dark">Role</p>
            <div className="grid gap-2 sm:grid-cols-2">
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
                  <span className="mt-0.5 block text-xs text-muted">{r.desc}</span>
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@cafsdrychain.io"
            required
          />
          <Select
            id="location"
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isLocsLoading}
          >
            {isLocsLoading ? (
              <option value="">Loading locations...</option>
            ) : locations.length === 0 ? (
              <option value="">No locations available</option>
            ) : (
              locations.map((loc) => (
                <option key={loc.id} value={loc.name}>
                  {loc.name}
                </option>
              ))
            )}
          </Select>

          <div className="flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-mint/40 px-4 py-3 text-sm text-brand-dark">
            <LinkIcon className="h-5 w-5 shrink-0 text-brand" />
            A deterministic wallet is derived automatically and, for operators,
            authorised on-chain.
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
            <Button type="submit" full size="lg" disabled={createUser.isPending}>
              {createUser.isPending ? "Creating…" : "Create account"}
            </Button>
            <LinkButton href="/admin/operators" full size="lg" variant="outline">
              Cancel
            </LinkButton>
          </div>
        </form>
      </Card>
    </>
  );
}
