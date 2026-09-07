"use client";

import { useState, useMemo } from "react";
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
import { CheckIcon, LinkIcon, DownloadIcon } from "@/components/icons";

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

  const handleDownloadQr = () => {
    if (!created) return;

    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 700;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Premium mint border
    ctx.strokeStyle = "#eef7ed";
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

    // Accent header
    ctx.fillStyle = "#113824"; // brand dark green
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CAFS DRYING NETWORK", canvas.width / 2, 70);

    ctx.fillStyle = "#5c7d6d"; // muted green
    ctx.font = "16px sans-serif";
    ctx.fillText("ON-CHAIN TRACEABLE BATCH", canvas.width / 2, 100);

    // Divider line
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 125);
    ctx.lineTo(canvas.width - 40, 125);
    ctx.stroke();

    // Batch Details
    ctx.textAlign = "left";
    ctx.fillStyle = "#113824";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("PRODUCT:", 60, 170);
    ctx.font = "16px sans-serif";
    ctx.fillText(created.product, 200, 170);

    ctx.font = "bold 16px sans-serif";
    ctx.fillText("FACILITY:", 60, 205);
    ctx.font = "16px sans-serif";
    ctx.fillText(created.location, 200, 205);

    ctx.font = "bold 16px sans-serif";
    ctx.fillText("FRESH WEIGHT:", 60, 240);
    ctx.font = "16px sans-serif";
    ctx.fillText(`${created.freshWeight} kg`, 200, 240);

    ctx.font = "bold 16px sans-serif";
    ctx.fillText("ENTRY DATE:", 60, 275);
    ctx.font = "16px sans-serif";
    ctx.fillText(new Date(created.entryDate).toLocaleDateString(), 200, 275);

    // QR Code Image
    const qrImage = new Image();
    qrImage.crossOrigin = "anonymous";
    const qrData = `${window.location.origin}/verify/${created.batchId}`;
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

    qrImage.onload = () => {
      // Center of canvas: x = (600 - 260) / 2 = 170
      ctx.drawImage(qrImage, 170, 320, 260, 260);

      // QR Frame
      ctx.strokeStyle = "#113824";
      ctx.lineWidth = 4;
      ctx.strokeRect(165, 315, 270, 270);

      // Batch ID Text below QR
      ctx.textAlign = "center";
      ctx.fillStyle = "#113824";
      ctx.font = "bold 20px monospace";
      ctx.fillText(created.batchId, canvas.width / 2, 630);

      // Footer
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#a0aec0";
      ctx.fillText("Scan QR to verify origin and drying history on the blockchain.", canvas.width / 2, 665);

      // Trigger download
      const link = document.createElement("a");
      link.download = `QR-${created.batchId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
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
        <div className="relative flex flex-col items-center justify-center rounded-2xl border border-black/[0.08] bg-mint p-6">
          <button
            type="button"
            onClick={handleDownloadQr}
            aria-label="Download QR code"
            title="Download QR code"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] bg-white text-brand transition-colors hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <DownloadIcon className="h-4 w-4" />
          </button>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(`${window.location.origin}/verify/${created.batchId}`)}`}
            alt={`QR code for ${created.batchId}`}
            className="h-40 w-40 rounded-xl bg-white p-2 sm:h-48 sm:w-48"
          />
        </div>
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
