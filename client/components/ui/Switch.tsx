"use client";

import { cn } from "@/lib/utils";

/**
 * An on/off switch.
 *
 * A real `role="switch"` button rather than a styled checkbox, so screen
 * readers announce the state and it responds to Space and Enter for free.
 */
export default function Switch({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Announced to screen readers; the visible text lives beside the switch. */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-brand" : "bg-black/[0.15]",
        className
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-white transition-all",
          checked ? "left-6" : "left-1"
        )}
      />
    </button>
  );
}
