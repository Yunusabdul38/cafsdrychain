import type { ReactNode } from "react";
import {
  ClipboardIcon,
  SunIcon,
  BoxIcon,
  QrIcon,
  ChartIcon,
} from "@/components/icons";

type Step = {
  icon: ReactNode;
  title: string;
  description: string;
  points: string[];
};

const steps: Step[] = [
  {
    icon: <ClipboardIcon className="h-6 w-6" />,
    title: "Produce Registration",
    description:
      "An authorized operator registers each batch delivered to the solar dryer. The system mints a unique Batch ID, generates a QR code, and writes a secure blockchain record.",
    points: [
      "Product type",
      "Source (farm or market)",
      "Farmer / supplier info",
      "Fresh weight",
      "Date of delivery",
    ],
  },
  {
    icon: <SunIcon className="h-6 w-6" />,
    title: "Drying Process",
    description:
      "As drying progresses, the operator updates the batch. Every update is recorded on-chain, building a transparent, tamper-resistant history of the process.",
    points: [
      "Drying start & completion time",
      "Final weight",
      "Moisture level",
      "Quality observations",
    ],
  },
  {
    icon: <BoxIcon className="h-6 w-6" />,
    title: "Storage & Distribution",
    description:
      "Once drying completes, the system captures how and where the product moves — making every step traceable from production to delivery.",
    points: [
      "Storage location",
      "Packaging details",
      "Transportation information",
      "Destination or buyer",
    ],
  },
  {
    icon: <QrIcon className="h-6 w-6" />,
    title: "Product Verification",
    description:
      "Each package carries a unique QR code. When scanned by regulators, buyers, or consumers, the full product history and verification status appear instantly.",
    points: [
      "Product type & source",
      "Drying & storage records",
      "Distribution history",
      "Verification status",
    ],
  },
  {
    icon: <ChartIcon className="h-6 w-6" />,
    title: "Monitoring & Reporting",
    description:
      "Administrators access a centralized dashboard to oversee the entire operation and audit the complete product lifecycle across every location.",
    points: [
      "Monitor all registered batches",
      "Track drying across locations",
      "Generate reports",
      "Verify blockchain records",
    ],
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative bg-white py-24 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-1.5 text-sm font-semibold text-brand">
            How it works
          </span>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight text-brand-dark sm:text-5xl">
            From harvest to shelf, fully traceable
          </h2>
          <p className="mt-4 text-lg text-muted">
            Five simple steps take a batch from the dryer to a verified,
            on-chain record anyone can trust.
          </p>
        </div>

        {/* Timeline */}
        <ol className="relative mt-16 space-y-8 sm:space-y-6">
          {/* vertical guide line */}
          <span
            aria-hidden
            className="absolute left-6 top-4 bottom-4 hidden w-px bg-gradient-to-b from-brand/40 via-brand/20 to-transparent sm:block"
          />
          {steps.map((step, i) => (
            <li key={step.title} className="relative sm:pl-20">
              {/* number node */}
              <div className="absolute left-0 top-0 z-10 hidden h-12 w-12 items-center justify-center rounded-full bg-brand-dark text-base font-semibold text-white ring-4 ring-white sm:flex">
                {i + 1}
              </div>

              <div className="group rounded-3xl border border-black/[0.06] bg-white p-6 sm:p-7">
                <div className="flex flex-col gap-5 md:flex-row md:items-start">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mint text-brand">
                    {step.icon}
                  </span>

                  <div className="flex-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand sm:hidden">
                      Step {i + 1}
                    </span>
                    <h3 className="text-xl font-semibold text-brand-dark">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted">
                      {step.description}
                    </p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {step.points.map((point) => (
                        <li
                          key={point}
                          className="rounded-full bg-mint/80 px-3 py-1 text-xs font-medium text-brand-dark/80"
                        >
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
