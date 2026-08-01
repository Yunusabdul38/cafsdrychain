"use client";

import { useState, useEffect, useMemo } from "react";
import { products } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Input, Select, Label } from "@/components/ui/Field";
import Button, { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PageHeader from "@/components/dashboard/PageHeader";
import { useCreateBatch, type ApiBatch } from "@/lib/hooks/useBatches";
import { useAuthStore } from "@/lib/store/auth";
import { ApiError } from "@/lib/api";
import { Spinner } from "@/components/dashboard/States";
import { DatePicker } from "@/components/ui/DatePicker";
import { CheckIcon, QrIcon, LinkIcon, DownloadIcon } from "@/components/icons";

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

export default function RegisterWizard() {
  const create = useCreateBatch();
  const [step, setStep] = useState(0);
  const [created, setCreated] = useState<ApiBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const today = new Date().toISOString().slice(0, 10);

  const user = useAuthStore((s) => s.user);
  const [productSearch, setProductSearch] = useState("");
  const [isProductOpen, setIsProductOpen] = useState(false);

  const [form, setForm] = useState<Form>({
    product: products[0],
    sourceType: "Farm",
    source: "",
    supplier: "",
    freshWeight: "",
    deliveryDate: today,
    facility: user?.location || "",
  });

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (user?.location) {
      set("facility", user.location);
    }
  }, [user?.location]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [productSearch]);

  const exactMatch = useMemo(() => {
    return products.some(
      (p) => p.toLowerCase() === productSearch.trim().toLowerCase()
    );
  }, [productSearch]);

  const onRegister = async () => {
    setError(null);
    setFieldErrors({});

    const newFieldErrors: Record<string, string[]> = {};
    if (!form.product) {
      newFieldErrors.product = ["Product type is required."];
    }
    if (!form.source.trim()) {
      newFieldErrors.source = ["Source name is required."];
    }
    if (!form.supplier.trim()) {
      newFieldErrors.supplier = ["Supplier details are required."];
    }
    const weightNum = Number(form.freshWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      newFieldErrors.freshWeight = ["Fresh weight must be a positive number."];
    }
    if (!form.deliveryDate) {
      newFieldErrors.deliveryDate = ["Delivery date is required."];
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    try {
      const { batch } = await create.mutateAsync({
        product: form.product,
        sourceType: form.sourceType as "Farm" | "Market",
        source: form.source,
        supplier: form.supplier,
        freshWeight: Number(form.freshWeight),
        deliveryDate: form.deliveryDate,
        location: form.facility,
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
    ctx.fillText("DATE:", 60, 275);
    ctx.font = "16px sans-serif";
    ctx.fillText(new Date(created.deliveryDate).toLocaleDateString(), 200, 275);

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
      ctx.fillText("Scan QR to verify origin and drying history on Base blockchain.", canvas.width / 2, 665);

      // Trigger download
      const link = document.createElement("a");
      link.download = `QR-${created.batchId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  };

  const canNext =
    step === 0
      ? !!form.product
      : step === 1
        ? !!form.source && !!form.supplier && !!form.freshWeight
        : true;

  if (created) {
    return (
      <>
        <PageHeader title="Batch registered" />
        <Card className="mx-auto max-w-md p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint text-brand">
            <CheckIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-brand-dark">
            {created.product} registered
          </h2>
          <p className="mt-1 text-sm text-muted">
            A unique Batch ID was generated and the record was written to the
            registry{created.txHash ? " on Base" : ""}.
          </p>

          <div className="mt-5 rounded-2xl border border-black/[0.08] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              Batch ID
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-brand-dark">
              {created.batchId}
            </p>
            <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-black/[0.08] bg-mint p-6">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/verify/${created.batchId}`)}`}
                alt={`QR code for ${created.batchId}`}
                className="h-36 w-36 bg-white p-2 rounded-xl"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                onClick={handleDownloadQr}
              >
                <DownloadIcon className="h-4 w-4" /> Download QR Code
              </Button>
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
            <div className="relative">
              <Label htmlFor="product">Product type</Label>
              <button
                id="product"
                type="button"
                onClick={() => setIsProductOpen(!isProductOpen)}
                className={cn(
                  "flex h-12 w-full items-center justify-between rounded-2xl border bg-white px-4 text-left text-[15px] text-brand-dark outline-none transition-colors placeholder:text-muted/60 focus:border-brand",
                  fieldErrors.product?.[0] ? "border-red-500" : "border-black/[0.12]"
                )}
              >
                <span>{form.product || "Select product type"}</span>
                <svg
                  className={cn(
                    "h-4 w-4 text-muted transition-transform",
                    isProductOpen && "rotate-180"
                  )}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {fieldErrors.product?.[0] && (
                <p className="mt-1.5 text-xs text-red-600 font-medium leading-relaxed">{fieldErrors.product[0]}</p>
              )}

              {isProductOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => {
                      setIsProductOpen(false);
                      setProductSearch("");
                    }}
                  />
                  <div className="absolute left-0 right-0 z-20 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-black/[0.12] bg-white p-2 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
                    <input
                      type="text"
                      className="mb-2 h-10 w-full rounded-xl border border-black/[0.1] bg-black/[0.02] px-3 text-sm outline-none focus:border-brand"
                      placeholder="Search or add custom..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      autoFocus
                    />
                    <ul className="space-y-1">
                      {filteredProducts.map((p) => (
                        <li key={p}>
                          <button
                            type="button"
                            onClick={() => {
                              set("product", p);
                              setIsProductOpen(false);
                              setProductSearch("");
                            }}
                            className={cn(
                              "w-full rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-mint/50",
                              form.product === p ? "bg-mint text-brand font-medium" : "text-brand-dark"
                            )}
                          >
                            {p}
                          </button>
                        </li>
                      ))}
                      {productSearch.trim() && !exactMatch && (
                        <li>
                          <button
                            type="button"
                            onClick={() => {
                              const customValue = productSearch.trim();
                              set("product", customValue);
                              setIsProductOpen(false);
                              setProductSearch("");
                            }}
                            className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-brand transition-colors hover:bg-mint/50"
                          >
                            + Add custom: "{productSearch.trim()}"
                          </button>
                        </li>
                      )}
                      {filteredProducts.length === 0 && !productSearch.trim() && (
                        <li className="px-3 py-2 text-xs text-muted">
                          No products found.
                        </li>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </div>
            <div>
              <Label htmlFor="facility">Drying facility</Label>
              <div className="flex h-12 w-full items-center rounded-2xl border border-black/[0.12] bg-black/[0.03] px-4 text-[15px] text-brand-dark">
                {user?.location || "—"}
              </div>
            </div>
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
              label={form.sourceType === "Farm" ? "Farm name" : "Market name"}
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              placeholder={form.sourceType === "Farm" ? "Ola Farms" : "Bodija Market"}
              required
              error={fieldErrors.source?.[0]}
            />
            <Input
              id="supplier"
              label="Farmer / supplier"
              value={form.supplier}
              onChange={(e) => set("supplier", e.target.value)}
              placeholder="Ibrahim Ola"
              required
              error={fieldErrors.supplier?.[0]}
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
                error={fieldErrors.freshWeight?.[0]}
              />
              <DatePicker
                id="deliveryDate"
                name="deliveryDate"
                label="Delivery date"
                value={form.deliveryDate}
                onChange={(val) => set("deliveryDate", val)}
                required
                error={fieldErrors.deliveryDate?.[0]}
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
