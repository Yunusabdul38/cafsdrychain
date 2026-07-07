import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-2xl border border-black/[0.12] bg-white px-4 text-[15px] text-brand-dark outline-none transition-colors placeholder:text-muted/60 focus:border-brand disabled:bg-black/[0.03]";

export function Label({
  children,
  htmlFor,
  hint,
}: {
  children: ReactNode;
  htmlFor?: string;
  hint?: string;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <label htmlFor={htmlFor} className="text-sm font-medium text-brand-dark">
        {children}
      </label>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

export function Input({
  label,
  id,
  className,
  ...props
}: { label?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}
      <input id={id} className={cn(control, "h-12", className)} {...props} />
    </div>
  );
}

export function Textarea({
  label,
  id,
  className,
  ...props
}: { label?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}
      <textarea
        id={id}
        className={cn(control, "resize-none py-3", className)}
        {...props}
      />
    </div>
  );
}

export function Select({
  label,
  id,
  className,
  children,
  ...props
}: { label?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <select
          id={id}
          className={cn(control, "h-12 appearance-none pr-10", className)}
          {...props}
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
