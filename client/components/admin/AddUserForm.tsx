"use client";

import { useState } from "react";
import type { Role } from "@/lib/types";
import { cn, titleCase } from "@/lib/utils";
import { Input, Select } from "@/components/ui/Field";
import Button, { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PageHeader from "@/components/dashboard/PageHeader";
import { CheckIcon, MailIcon, LinkIcon, UsersIcon } from "@/components/icons";
import { useCreateUser, type ApiUser } from "@/lib/hooks/useUsers";
import { useLocations } from "@/lib/hooks/useLocations";
import Modal from "@/components/ui/Modal";
import { ApiError } from "@/lib/api";
import { useResendInvite } from "@/lib/hooks/useInvite";
import { useUpdateUserStatus } from "@/lib/hooks/useUsers";

type ExistingUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OPERATOR";
  status: "PENDING" | "ACTIVE" | "INACTIVE";
};

type Conflict = { message: string; existing?: ExistingUser };
import { Spinner } from "@/components/dashboard/States";

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
  const [chosenLocation, setLocation] = useState("");
  // Defaults to the first hub until the admin picks one. Derived rather than
  // written into state by an effect, which caused a cascading render.
  const location = chosenLocation || locations[0]?.name || "";
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<{ user: ApiUser } | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const resendInvite = useResendInvite();
  const updateStatus = useUpdateUserStatus();
  const [conflictDone, setConflictDone] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const newFieldErrors: Record<string, string[]> = {};
    if (!name.trim()) {
      newFieldErrors.name = ["Name is required."];
    }
    if (!email.trim()) {
      newFieldErrors.email = ["Email is required."];
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newFieldErrors.email = ["Please enter a valid work email address."];
    }

    if (role === "operator") {
      if (locations.length === 0) {
        newFieldErrors.location = ["No location/dryer hub available. Please add a dryer hub first to continue."];
      } else if (!location) {
        newFieldErrors.location = ["Pick a location to assign the operator to."];
      }
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    try {
      const res = await createUser.mutateAsync({
        name,
        email,
        role: role.toUpperCase() as unknown as Role, // backend expects ADMIN/OPERATOR
        location: role === "operator" ? location : "HQ",
      });
      setResult(res);
    } catch (err) {
      if (err instanceof ApiError) {
        // A clash with an existing account is not a field error: it needs
        // explaining and usually has a better next step than "try again".
        if (err.status === 409) {
          const detail = err.details as { existing?: ExistingUser } | undefined;
          setConflict({ message: err.message, existing: detail?.existing });
        } else if (err.details && typeof err.details === "object") {
          setFieldErrors(err.details as Record<string, string[]>);
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to create user.");
      }
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
            . They have been emailed an invitation to set their own password.
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

          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-brand/20 bg-mint/30 px-4 py-3 text-sm text-brand-dark text-left">
            <MailIcon className="h-5 w-5 shrink-0 text-brand mt-0.5" />
            <span>
              An invitation was sent to{" "}
              <span className="font-semibold">{result.user.email}</span>. The link
              works once and expires in 72 hours.
            </span>
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
        {conflict && (
          <UserExistsDialog
            conflict={conflict}
            done={conflictDone}
            busy={resendInvite.isPending || updateStatus.isPending}
            onClose={() => {
              setConflict(null);
              setConflictDone(null);
            }}
            onResend={async (id) => {
              await resendInvite.mutateAsync(id);
              setConflictDone("Invitation sent again.");
            }}
            onReactivate={async (id) => {
              await updateStatus.mutateAsync({ id, status: "ACTIVE" });
              setConflictDone("That account is active again.");
            }}
          />
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
            placeholder="Folake Adeyemi"
            required
            error={fieldErrors.name?.[0]}
          />
          <Input
            id="email"
            type="email"
            label="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="folake@cafsdrychain.io"
            required
            error={fieldErrors.email?.[0]}
          />
          {role === "operator" && (
            <Select
              id="location"
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isLocsLoading}
              error={fieldErrors.location?.[0]}
            >
              {isLocsLoading ? (
                <option value="">Loading locations...</option>
              ) : locations.length === 0 ? (
                <option value="">No locations available</option>
              ) : (
                locations.map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {titleCase(loc.name)}
                  </option>
                ))
              )}
            </Select>
          )}

          <div className="flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-mint/40 px-4 py-3 text-sm text-brand-dark">
            <LinkIcon className="h-5 w-5 shrink-0 text-brand" />
            A deterministic wallet is derived automatically and, for operators,
            authorized on chain.
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
            <Button type="submit" full size="lg" disabled={createUser.isPending}>
              {createUser.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="h-5 w-5 animate-spin text-white" />
                  Creating account…
                </span>
              ) : (
                "Create account"
              )}
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

/**
 * Shown when the email already belongs to somebody.
 *
 * A clash is usually not a mistake to correct in the form: the person already
 * exists and the admin needs a decision, so the dialog names the account and
 * offers the action that actually resolves it.
 */
function UserExistsDialog({
  conflict,
  done,
  busy,
  onClose,
  onResend,
  onReactivate,
}: {
  conflict: Conflict;
  done: string | null;
  busy: boolean;
  onClose: () => void;
  onResend: (id: string) => Promise<void>;
  onReactivate: (id: string) => Promise<void>;
}) {
  const existing = conflict.existing;
  const roleLabel = existing?.role === "ADMIN" ? "Administrator" : "Operator";

  return (
    <Modal onClose={onClose} labelledBy="user-exists-title">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF3E0] text-[#B4740B]">
      <UsersIcon className="h-6 w-6" />
      </span>

      <h3 id="user-exists-title" className="mt-4 text-lg font-semibold text-brand-dark">
      This email is already in use
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{conflict.message}</p>

      {existing && (
        <div className="mt-4 rounded-2xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 text-sm">
          <p className="font-medium text-brand-dark">{existing.name}</p>
          <p className="mt-0.5 text-muted">{existing.email}</p>
          <p className="mt-1.5 text-xs text-muted">
            {roleLabel} ·{" "}
            {existing.status === "PENDING"
              ? "Invited, not set up yet"
              : existing.status === "INACTIVE"
                ? "Deactivated"
                : "Active"}
          </p>
        </div>
      )}

      {done && (
        <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-brand">
          <CheckIcon className="h-4 w-4" /> {done}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
      {!done && existing?.status === "PENDING" && (
        <Button full disabled={busy} onClick={() => onResend(existing.id)}>
          {busy ? "Sending…" : "Resend invitation"}
        </Button>
      )}
      {!done && existing?.status === "INACTIVE" && (
        <Button full disabled={busy} onClick={() => onReactivate(existing.id)}>
          {busy ? "Reactivating…" : "Reactivate account"}
        </Button>
      )}
      <LinkButton href="/admin/operators" full variant="outline">
        View users
      </LinkButton>
      </div>
    </Modal>
  );
}
