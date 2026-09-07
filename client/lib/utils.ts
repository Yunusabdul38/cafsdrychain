export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/**
 * Identifies a batch on screen by facts an operator actually recognises —
 * what it is, how much, and where it came from — rather than its opaque ID.
 */
export function batchSummary(b: {
  product: string;
  freshWeight: number;
  source: string;
}) {
  return `${titleCase(b.product)} · ${b.freshWeight} kg from ${titleCase(b.source)}`;
}

/**
 * Capitalise each word for display. Only the first letter of a word is touched,
 * so deliberate casing survives intact ("FreshMart", "NG-882").
 *
 * Display-only: stored values are never rewritten, because the recorded text is
 * what the tamper-evidence hash is computed over.
 */
export function titleCase(value: string): string;
export function titleCase(value: string | undefined | null): string | undefined;
export function titleCase(value: string | undefined | null): string | undefined {
  if (!value) return value ?? undefined;
  return value.replace(
    /(^|[\s/(\-·])([a-z])/g,
    (_m, sep: string, ch: string) => sep + ch.toUpperCase()
  );
}

/** 0x9f3a…c21b — a recognisable stub of a transaction hash, not a wall of hex. */
export function shortHash(hash: string) {
  return hash.length > 12 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash;
}
