"use client";

import { useState, useMemo } from "react";
import BatchQr from "@/components/dashboard/BatchQr";
import {
  CATEGORY_NAMES,
  OTHER_PRODUCT,
  composeProduct,
  productsForCategory,
} from "@/lib/categories";
import { cn, titleCase, formatDateTime } from "@/lib/utils";
import { Input, Select } from "@/components/ui/Field";
import Button, { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PageHeader from "@/components/dashboard/PageHeader";
import ReceiptCard from "@/components/dashboard/ReceiptCard";
import { useCreateBatch, type ApiBatch } from "@/lib/hooks/useBatches";
import { useAuthStore } from "@/lib/store/auth";
import { ApiError } from "@/lib/api";
import { Spinner } from "@/components/dashboard/States";
import { CheckIcon, LinkIcon } from "@/components/icons";

type Form = {
  category: string;
  product: string;
  /** Free-text name used only when `product` is "Other". */
  otherProduct: string;
  sourceType: string;
  source: string;
  freshWeight: string;
};

const steps = ["Produce details", "Source & delivery", "Review"];

export default function RegisterWizard() {
  const create = useCreateBatch();
  const [step, setStep] = useState(0);
  const [created, setCreated] = useState<ApiBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const today = new Date().toISOString().slice(0, 10);

  const user = useAuthStore((s) => s.user);

  const [form, setForm] = useState<Form>({
    category: "",
    product: "",
    otherProduct: "",
    sourceType: "Farm",
    source: "",
    freshWeight: "",
  });

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  /** The operator's own hub — not an input, so it is read straight from them. */
  const facility = user?.location ?? "";

  // The product list is driven by the selected category.
  const categoryProducts = useMemo(
    () => productsForCategory(form.category),
    [form.category]
  );

  const isOtherProduct = form.product === OTHER_PRODUCT;

  // What actually gets stored on the batch: "Mango", or "Other (Awara)".
  const productValue = composeProduct(form.product, form.otherProduct);

  // Changing category clears the product so a mismatched pair can't be submitted.
  const onCategoryChange = (value: string) => {
    setForm((f) => ({ ...f, category: value, product: "", otherProduct: "" }));
  };

  // Leaving "Other" discards the name that only applied to it.
  const onProductChange = (value: string) => {
    setForm((f) => ({
      ...f,
      product: value,
      otherProduct: value === OTHER_PRODUCT ? f.otherProduct : "",
    }));
  };

  const onRegister = async () => {
    setError(null);
    setFieldErrors({});

    const newFieldErrors: Record<string, string[]> = {};
    if (!form.category) {
      newFieldErrors.category = ["Category is required."];
    }
    if (!form.product) {
      newFieldErrors.product = ["Product type is required."];
    }
    if (isOtherProduct && !form.otherProduct.trim()) {
      newFieldErrors.otherProduct = ["Please name the product."];
    }
    if (!form.source.trim()) {
      newFieldErrors.source = ["Source name is required."];
    }
    const weightNum = Number(form.freshWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      newFieldErrors.freshWeight = ["Fresh weight must be a positive number."];
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    try {
      const { batch } = await create.mutateAsync({
        category: form.category,
        product: productValue,
        sourceType: form.sourceType as "Farm" | "Market",
        source: form.source,
        freshWeight: Number(form.freshWeight),
        location: facility,
      });
      setCreated(batch);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && typeof err.details === "object") {
          setFieldErrors(err.details as Record<string, string[]>);
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to register batch.");
      }
    }
  };


  const canNext =
    step === 0
      ? !!form.category &&
        !!form.product &&
        (!isOtherProduct || !!form.otherProduct.trim())
      : step === 1
        ? !!form.source && !!form.freshWeight
        : true;

  // Already settled (fees switched off) means the next step is drying itself.
  const feeSettled = created?.payment?.status === "PAID";

  if (created) {
    return (
      <ReceiptCard
        eyebrow="Batch registered"
        title={titleCase(created.product)}
        subtitle={`${titleCase(created.category)} · ${titleCase(created.location)}`}
        rows={[
          { label: "Batch", value: created.batchId },
          { label: "Fresh weight", value: `${created.freshWeight} kg` },
          { label: "Source", value: `${titleCase(created.source)} (${created.sourceType})` },
          { label: "Entry date", value: formatDateTime(created.entryDate) },
        ]}
      >
        <BatchQr
          label={{
              batchId: created.batchId,
              product: created.product,
              location: created.location,
              freshWeight: created.freshWeight,
              entryDate: created.entryDate,
            }}
        />
        <p className="mt-4 text-center text-sm leading-relaxed text-muted">
          Print or share this code. Scanning it shows the batch&apos;s full
          history.{" "}
          {feeSettled
            ? "No drying fee applies, so you can begin drying."
            : "Next, set the drying fee so drying can begin."}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <LinkButton href={`/operator/batches/${created.batchId}/update`} full variant="dark">
            {feeSettled ? "Start drying" : "Set drying fee"}
          </LinkButton>
          <LinkButton href="/operator/batches" full variant="outline">
            All batches
          </LinkButton>
        </div>
      </ReceiptCard>
    );
  }

  return (
    <>
      <PageHeader
        title="Register produce"
        description="Create a new batch and generate its on chain record."
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
              id="category"
              label="Category"
              placeholder="Select a category"
              value={form.category}
              onChange={(e) => onCategoryChange(e.target.value)}
              error={fieldErrors.category?.[0]}
            >
              {CATEGORY_NAMES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select
              id="product"
              label="Product type"
              placeholder={
                form.category ? "Select product type" : "Select a category first"
              }
              disabled={!form.category}
              value={form.product}
              onChange={(e) => onProductChange(e.target.value)}
              error={fieldErrors.product?.[0]}
            >
              {categoryProducts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>

            {/* Naming an "Other" product — recorded as e.g. "Other (Awara)". */}
            {isOtherProduct && (
              <Input
                id="otherProduct"
                label="Name the product"
                placeholder="E.g. Ọkà bàbà"
                value={form.otherProduct}
                onChange={(e) => set("otherProduct", e.target.value)}
                required
                autoFocus
                error={fieldErrors.otherProduct?.[0]}
              />
            )}

          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Select
              id="sourceType"
              label="Source"
              value={form.sourceType}
              onChange={(e) => set("sourceType", e.target.value)}
              error={fieldErrors.sourceType?.[0]}
            >
              <option>Farm</option>
              <option>Market</option>
            </Select>
            <Input
              id="source"
              label={
                form.sourceType === "Farm"
                  ? "Farm name / location"
                  : "Market name / location"
              }
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              placeholder={
                form.sourceType === "Farm"
                  ? "Adéọlá Farms, Ìwó"
                  : "Bọ̀dìjà Market, Ìbàdàn"
              }
              required
              error={fieldErrors.source?.[0]}
            />
            <Input
              id="freshWeight"
              type="number"
              label="Fresh weight (kg)"
              value={form.freshWeight}
              onChange={(e) => set("freshWeight", e.target.value)}
              placeholder="480"
              required
              error={fieldErrors.freshWeight?.[0]}
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <dl className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.08]">
              {[
                ["Category", form.category],
                ["Product", productValue],
                ["Facility", titleCase(facility)],
                ["Source", `${form.source} (${form.sourceType})`],
                ["Fresh weight", `${form.freshWeight} kg`],
                ["Entry date", `${today} (recorded on registration)`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium text-brand-dark">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-black/[0.08] bg-mint/40 px-4 py-3 text-sm text-brand-dark">
              <LinkIcon className="h-5 w-5 shrink-0 text-brand" />
              A Batch ID + QR code will be generated and recorded on chain.
            </div>
            {error && (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
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
            <Button
              type="button"
              full
              size="lg"
              disabled={create.isPending}
              onClick={onRegister}
            >
              {create.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="h-5 w-5 animate-spin text-white" />
                  Registering batch…
                </span>
              ) : (
                "Register batch"
              )}
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
