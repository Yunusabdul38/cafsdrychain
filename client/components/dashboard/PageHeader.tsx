import type { ReactNode } from "react";
import BackLink from "@/components/ui/BackLink";

export default function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && <BackLink href={back.href} label={back.label} className="mb-4" />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-dark sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-[15px] text-muted">{description}</p>
          )}
        </div>
        {action && <div className="flex shrink-0 gap-2 print:hidden">{action}</div>}
      </div>
    </div>
  );
}
