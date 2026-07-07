"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { batches, getBatch } from "@/lib/mock-data";
import Button from "@/components/ui/Button";
import { SearchIcon, QrIcon } from "@/components/icons";

export default function VerifyLookup({
  basePath,
  variant = "light",
}: {
  basePath: string;
  variant?: "light" | "dark";
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = value.trim();
    if (getBatch(id)) {
      router.push(`${basePath}/${id.toUpperCase()}`);
    } else {
      setError(true);
    }
  };

  const dark = variant === "dark";
  const samples = batches.slice(0, 4).map((b) => b.id);

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon
            className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${
              dark ? "text-white/50" : "text-muted"
            }`}
          />
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            placeholder="Enter Batch ID e.g. DRY-2K7F-9X1"
            className={
              dark
                ? "h-12 w-full rounded-full border border-white/15 bg-white/10 pl-11 pr-4 text-[15px] text-white outline-none placeholder:text-white/50 focus:border-brand"
                : "h-12 w-full rounded-full border border-black/[0.12] bg-white pl-11 pr-4 text-[15px] text-brand-dark outline-none placeholder:text-muted/60 focus:border-brand"
            }
          />
        </div>
        <Button type="submit" size="lg">
          <QrIcon className="h-5 w-5" /> Verify
        </Button>
      </form>

      {error && (
        <p className="mt-2 text-sm text-red-500">
          No batch found with that ID. Try one of the samples below.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`text-xs ${dark ? "text-white/60" : "text-muted"}`}>
          Try:
        </span>
        {samples.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => router.push(`${basePath}/${id}`)}
            className={
              dark
                ? "rounded-full border border-white/15 px-3 py-1 font-mono text-xs text-white/80 hover:bg-white/10"
                : "rounded-full border border-black/[0.12] px-3 py-1 font-mono text-xs text-brand hover:bg-mint"
            }
          >
            {id}
          </button>
        ))}
      </div>
    </div>
  );
}
