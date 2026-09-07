import type { ReactNode } from "react";
import {
  LinkIcon,
  QrIcon,
  ShieldIcon,
  ChartIcon,
  LeafIcon,
  BoltIcon,
} from "@/components/icons";

type Feature = {
  icon: ReactNode;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: <LinkIcon className="h-6 w-6" />,
    title: "Immutable on chain",
    description:
      "Every batch event is written to the blockchain, creating a permanent record that can't be edited or erased.",
  },
  {
    icon: <QrIcon className="h-6 w-6" />,
    title: "Instant QR verification",
    description:
      "Regulators, buyers, and consumers scan a single QR code to reveal a product's full journey in seconds.",
  },
  {
    icon: <ShieldIcon className="h-6 w-6" />,
    title: "Tamper resistant history",
    description:
      "Each drying update is time stamped and locked, giving you an audit trail no one can quietly rewrite.",
  },
  {
    icon: <ChartIcon className="h-6 w-6" />,
    title: "Centralized dashboard",
    description:
      "Administrators monitor batches, track drying across locations, and generate reports from one place.",
  },
  {
    icon: <LeafIcon className="h-6 w-6" />,
    title: "Built for solar drying",
    description:
      "Purpose built for solar dried produce, capturing weight, moisture, and quality at every stage.",
  },
  {
    icon: <BoltIcon className="h-6 w-6" />,
    title: "Real time updates",
    description:
      "Operators log progress as it happens, so the record always reflects the true state of the batch.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-mint to-white py-24 sm:py-28"
    >
      {/* soft decorative blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-brand/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-sky/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-brand shadow-sm">
            Features
          </span>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight text-brand-dark sm:text-5xl">
            Everything you need to trust a batch
          </h2>
          <p className="mt-4 text-lg text-muted">
            DryChain pairs on chain integrity with a simple workflow, so trust
            is built in, not bolted on.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-3xl border border-black/[0.06] bg-white/80 p-7 backdrop-blur-sm transition-all"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-dark text-white transition-colors">
                {feature.icon}
              </span>
              <h3 className="mt-5 text-xl font-semibold text-brand-dark">
                {feature.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
