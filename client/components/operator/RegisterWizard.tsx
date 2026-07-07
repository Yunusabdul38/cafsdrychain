"use client";

import Link from "next/link";
import { useState } from "react";
import { products } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Input, Select } from "@/components/ui/Field";
import Button, { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PageHeader from "@/components/dashboard/PageHeader";
import { CheckIcon, QrIcon, LinkIcon } from "@/components/icons";

type Form = {
  product: string;
  sourceType: string;
  source: string;
  supplier: string;
  freshWeight: string;
  deliveryDate: string;
  facility: string;
};

const steps = ["Produce details", "Source & delivery", "Review"];

function newBatchId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  const seg = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `DRY-${seg(4)}-${seg(3)}`;
}

export default function RegisterWizard() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [batchId] = useState(newBatchId());
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<Form>({
    product: products[0],
    sourceType: "Farm",
    source: "",
    supplier: "",
    freshWeight: "",
    deliveryDate: today,
    facility: "Oyo Solar Hub",
  });

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const canNext =
    step === 0
      ? !!form.product
      : step === 1
        ? !!form.source && !!form.supplier && !!form.freshWeight
        : true;

  if (done) {
    return (
      <>
        <PageHeader title="Batch registered" />
        <Card className="mx-auto max-w-md p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint text-brand">
            <CheckIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-brand-dark">
            {form.product} registered
          </h2>
          <p className="mt-1 text-sm text-muted">
            A unique Batch ID and QR code were generated and the record was
            written to the Base blockchain.
          </p>

          <div className="mt-5 rounded-2xl border border-black/[0.08] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              Batch ID
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-brand-dark">
              {batchId}
            </p>
            <div className="mt-4 flex items-center justify-center rounded-2xl border border-black/[0.08] bg-mint py-6">
              <QrIcon className="h-24 w-24 text-brand-dark" />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <LinkButton href="/operator/drying" full variant="dark">
              Start drying
            </LinkButton>
            <LinkButton href="/operator/batches" full variant="outline">
              All batches
            </LinkButton>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Register produce"
        description="Create a new batch and generate its on-chain record."
        back={{ href: "/operator", label: "Overview" }}
      />

      {/* Stepper */}
      <ol className="mb-6 flex items-center">
        {steps.map((label, i) => (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                  i < step && "border-brand bg-brand text-white",
                  i === step && "border-brand-dark bg-brand-dark text-white",
                  i > step && "border-black/[0.15] bg-white text-muted"
                )}
              >
                {i < step ? <CheckIcon className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:block",
                  i === step ? "text-brand-dark" : "text-muted"
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "mx-3 h-px flex-1",
                  i < step ? "bg-brand" : "bg-black/[0.12]"
                )}
              />
            )}
          </li>
        ))}
      </ol>

      <Card className="mx-auto max-w-xl p-5 sm:p-7">
        {step === 0 && (
          <div className="space-y-4">
            <Select
              id="product"
              label="Product type"
              value={form.product}
              onChange={(e) => set("product", e.target.value)}
            >
              {products.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
            <Select
              id="facility"
              label="Drying facility"
              value={form.facility}
              onChange={(e) => set("facility", e.target.value)}
            >
              <option>Oyo Solar Hub</option>
              <option>Kano Solar Hub</option>
              <option>Kaduna Solar Hub</option>
            </Select>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Select
              id="sourceType"
              label="Source"
              value={form.sourceType}
              onChange={(e) => set("sourceType", e.target.value)}
            >
              <option>Farm</option>
              <option>Market</option>
            </Select>
            <Input
              id="source"
              label={form.sourceType === "Farm" ? "Farm name" : "Market name"}
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              placeholder={form.sourceType === "Farm" ? "Ola Farms" : "Bodija Market"}
              required
            />
            <Input
              id="supplier"
              label="Farmer / supplier"
              value={form.supplier}
              onChange={(e) => set("supplier", e.target.value)}
              placeholder="Ibrahim Ola"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="freshWeight"
                type="number"
                label="Fresh weight (kg)"
                value={form.freshWeight}
                onChange={(e) => set("freshWeight", e.target.value)}
                placeholder="480"
                required
              />
              <Input
                id="deliveryDate"
                type="date"
                label="Delivery date"
                value={form.deliveryDate}
                onChange={(e) => set("deliveryDate", e.target.value)}
                required
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <dl className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.08]">
              {[
                ["Product", form.product],
                ["Facility", form.facility],
                ["Source", `${form.source} (${form.sourceType})`],
                ["Supplier", form.supplier],
                ["Fresh weight", `${form.freshWeight} kg`],
                ["Delivery date", form.deliveryDate],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium text-brand-dark">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-mint/40 px-4 py-3 text-sm text-brand-dark">
              <LinkIcon className="h-5 w-5 shrink-0 text-brand" />
              A Batch ID + QR code will be generated and recorded on-chain.
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          {step < steps.length - 1 ? (
            <Button
              type="button"
              full
              size="lg"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button type="button" full size="lg" onClick={() => setDone(true)}>
              Register batch
            </Button>
          )}
          {step > 0 ? (
            <Button
              type="button"
              full
              size="lg"
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
          ) : (
            <LinkButton href="/operator" full size="lg" variant="outline">
              Cancel
            </LinkButton>
          )}
        </div>
      </Card>
    </>
  );
}
