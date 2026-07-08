import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5 animate-spin text-brand"}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted">
      <Spinner className="h-7 w-7 animate-spin text-brand" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Card>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      {icon && (
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-brand">
          {icon}
        </span>
      )}
      <p className="font-semibold text-brand-dark">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </Card>
  );
}
