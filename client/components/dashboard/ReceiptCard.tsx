import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import DetailRow from "@/components/ui/DetailRow";
import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export type ReceiptRow = { label: string; value?: string | number | null };

/**
 * The confirmation card used at the end of every stage — registration, each
 * lifecycle step, payment, completion.
 *
 * One shape throughout: a tinted band carrying the headline fact, a divided
 * list of what was recorded, then the actions. Defined once so the completion
 * screens cannot drift apart.
 */
export default function ReceiptCard({
  eyebrow,
  title,
  subtitle,
  icon,
  rows = [],
  children,
  className,
}: {
  /** Small uppercase label above the title. */
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Defaults to a check mark; pass null for no badge. */
  icon?: ReactNode | null;
  rows?: ReceiptRow[];
  /** Action area under the rows. */
  children?: ReactNode;
  className?: string;
}) {
  const visible = rows.filter(
    (r) => r.value !== undefined && r.value !== null && r.value !== ""
  );

  return (
    <Card className={cn("mx-auto max-w-md overflow-hidden", className)}>
      <div className="bg-mint/50 px-6 py-7 text-center">
        {icon !== null && (
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white">
            {icon ?? <CheckIcon className="h-6 w-6" />}
          </span>
        )}
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          {eyebrow}
        </p>
        <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-brand-dark">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      </div>

      {visible.length > 0 && (
        <dl className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
          {visible.map((r) => (
            <DetailRow key={r.label} label={r.label} value={r.value} />
          ))}
        </dl>
      )}

      {children && <div className="p-5 sm:p-6">{children}</div>}
    </Card>
  );
}
