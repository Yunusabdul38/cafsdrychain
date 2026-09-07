import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/ui/Logo";
import { QrIcon, ShieldIcon, LinkIcon } from "@/components/icons";

const points = [
  { icon: ShieldIcon, text: "Tamper resistant batch records" },
  { icon: QrIcon, text: "Instant QR verification" },
  { icon: LinkIcon, text: "Immutable history on chain" },
];

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* Brand panel — desktop only (flat, no gradient) */}
      <aside className="relative login-panel hidden flex-col justify-between bg-brand-dark p-12 text-white lg:flex">
        <Logo href="/" dark />

        <div className="max-w-md">
          <h2 className="text-4xl font-semibold leading-tight">
            Every batch, verified and on chain.
          </h2>
          <p className="mt-4 text-white/70">
            Sign in to register produce, track drying, and keep an immutable
            record of every step, from the dryer to delivery.
          </p>

          <ul className="mt-8 space-y-3">
            {points.map((p) => (
              <li key={p.text} className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <p.icon className="h-5 w-5" />
                </span>
                <span className="text-white/85">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-white/50">
          © {new Date().getFullYear()} CAFS DryChain
        </p>
      </aside>

      {/* Form column */}
      <main className="flex min-h-screen flex-col px-5 py-8 sm:px-8 lg:justify-center">
        <div className="mb-8 lg:hidden">
          <Logo href="/" />
        </div>
        <div className="mx-auto w-full max-w-sm flex-1 lg:flex-none">
          {children}
        </div>
        <div className="mx-auto mt-8 w-full max-w-sm">
          <Link
            href="/verify"
            className="block rounded-2xl border border-black/[0.1] px-4 py-3 text-center text-sm font-medium text-brand-dark transition-colors hover:bg-mint"
          >
            Verify a product without signing in
          </Link>
        </div>
      </main>
    </div>
  );
}
