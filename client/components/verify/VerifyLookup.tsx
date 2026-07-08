"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const dark = variant === "dark";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = value.trim().toUpperCase();
    // The result page fetches from the API and shows a not-found state itself.
    if (id) router.push(`${basePath}/${id}`);
  };

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
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter Batch ID e.g. DRY-2K7F-9X1"
            className={
              dark
                ? "h-12 w-full rounded-full border border-white/15 bg-white/10 pl-11 pr-4 text-[15px] text-white outline-none placeholder:text-white/50 focus:border-brand"
                : "h-12 w-full rounded-full border border-black/[0.12] bg-white pl-11 pr-4 text-[15px] text-brand-dark outline-none placeholder:text-muted/60 focus:border-brand"
            }
          />
        </div>
        <Button type="submit" size="lg" disabled={!value.trim()}>
          <QrIcon className="h-5 w-5" /> Verify
        </Button>
      </form>
    </div>
  );
}
