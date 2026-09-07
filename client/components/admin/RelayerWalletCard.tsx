"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/dashboard/States";
import { LinkIcon, ExternalLinkIcon } from "@/components/icons";
import { useRelayerWallet } from "@/lib/hooks/useAdmin";
import { cn, shortHash } from "@/lib/utils";

const TONE = {
  HEALTHY: { badge: "bg-mint text-brand", dot: "bg-brand", label: "Healthy" },
  LOW: { badge: "bg-[#FFF3E0] text-[#B4740B]", dot: "bg-[#B4740B]", label: "Running low" },
  CRITICAL: { badge: "bg-red-50 text-red-600", dot: "bg-red-500", label: "Critically low" },
} as const;

/**
 * The relayer wallet sponsors gas for every operator's on chain write. If it
 * empties, records stop reaching the chain — so its balance is surfaced with a
 * clear top-up prompt well before that happens.
 */
export default function RelayerWalletCard() {
  const { data, isLoading, isError } = useRelayerWallet();

  return (
    <Card>
      <CardHeader title="Gas wallet" />
      <div className="p-5">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Spinner className="h-4 w-4 animate-spin text-brand" /> Reading balance…
          </div>
        ) : isError ? (
          <p className="text-sm text-muted">
            Could not reach the network to read the balance. Try again shortly.
          </p>
        ) : !data?.chainEnabled || !data.wallet ? (
          <p className="text-sm text-muted">
            On chain recording is switched off, so no gas wallet is in use.
          </p>
        ) : (
          (() => {
            const w = data.wallet;
            const tone = TONE[w.status];
            const pct = Math.min(100, (w.balance / (w.lowThreshold * 4)) * 100);
            return (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-3xl font-semibold tracking-tight text-brand-dark">
                      {w.balance.toFixed(5)}{" "}
                      <span className="text-base font-medium text-muted">{w.symbol}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Pays gas for every batch record
                    </p>
                  </div>
                  <Badge className={tone.badge} dot={tone.dot}>
                    {tone.label}
                  </Badge>
                </div>

                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
                  <div
                    className={cn("h-full rounded-full transition-all", tone.dot)}
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>

                {w.status !== "HEALTHY" && (
                  <div
                    className={cn(
                      "mt-4 rounded-2xl border px-4 py-3 text-sm leading-relaxed",
                      w.status === "CRITICAL"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    )}
                  >
                    <span className="font-semibold">
                      {w.status === "CRITICAL" ? "Top up now. " : "Top up soon. "}
                    </span>
                    {w.status === "CRITICAL"
                      ? "Batch records will stop reaching the blockchain once this wallet empties."
                      : `Below ${w.lowThreshold} ${w.symbol}. Send funds to the address below to keep records confirming.`}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-black/[0.08] bg-black/[0.02] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      Wallet address
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xs text-brand-dark">
                      {w.address}
                    </p>
                  </div>
                  <a
                    href={`https://sepolia.basescan.org/address/${w.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Opens the wallet on the block explorer in a new tab"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black/[0.03] px-3 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-mint hover:text-brand"
                  >
                    <LinkIcon className="h-3 w-3" />
                    {shortHash(w.address)}
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                </div>
              </>
            );
          })()
        )}
      </div>
    </Card>
  );
}
