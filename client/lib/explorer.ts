"use client";

import { useAppConfig } from "@/lib/config";

/**
 * Block-explorer links for the server's chain. Until the config arrives they
 * are undefined — an inert link rather than one to the wrong chain.
 */
export function useExplorer() {
  const base = useAppConfig().data?.explorerUrl?.replace(/\/+$/, "");
  return {
    txUrl: (hash: string) => (base ? `${base}/tx/${hash}` : undefined),
    addressUrl: (address: string) => (base ? `${base}/address/${address}` : undefined),
  };
}
