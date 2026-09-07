"use client";

import { useEffect, useRef } from "react";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * The one dialog shell for the app.
 *
 * Every modal closes the three ways people expect: the corner button, the
 * Escape key, and a click on the backdrop. Defining that once means a new
 * dialog cannot quietly ship without them.
 */
export default function Modal({
  onClose,
  children,
  className,
  labelledBy,
}: {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /** id of the heading that names this dialog, for screen readers. */
  labelledBy?: string;
}) {
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // Stop the page behind the dialog scrolling under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      // Only a click that starts and ends on the backdrop closes: dragging a
      // selection out of the dialog should not dismiss it.
      onMouseDown={(e) => {
        if (!card.current?.contains(e.target as Node)) onClose();
      }}
      role="presentation"
    >
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          // Matches Card, with the positioning a dialog needs.
          "relative w-full max-w-md rounded-2xl border border-black/[0.08] bg-white p-6",
          "animate-in fade-in zoom-in duration-200",
          className
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/[0.04] hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
