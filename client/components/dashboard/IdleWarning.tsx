"use client";

import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ClockIcon } from "@/components/icons";

/**
 * Shown a couple of minutes before an idle session ends, so nobody discovers
 * they were signed out only after filling in a form.
 */
export default function IdleWarning({ onStay }: { onStay: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:bottom-6 sm:left-auto sm:right-6 sm:p-0">
      <Card className="mx-auto flex max-w-md items-start gap-3 p-4 sm:mx-0">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF3E0] text-[#B4740B]">
          <ClockIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand-dark">
            You&apos;re about to be signed out
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted">
            For security, sessions end after an hour of inactivity. Anything not
            saved will be lost.
          </p>
          <Button size="sm" className="mt-3" onClick={onStay}>
            Stay signed in
          </Button>
        </div>
      </Card>
    </div>
  );
}
