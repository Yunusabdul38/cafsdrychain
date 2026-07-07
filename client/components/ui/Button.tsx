import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "dark" | "outline" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover border border-transparent",
  dark: "bg-brand-dark text-white hover:bg-brand-darker border border-transparent",
  outline:
    "bg-white text-brand-dark border border-black/[0.12] hover:border-brand hover:text-brand",
  ghost: "bg-transparent text-brand-dark hover:bg-mint border border-transparent",
  subtle: "bg-mint text-brand border border-transparent hover:bg-[#e3f3d9]",
  danger:
    "bg-white text-red-600 border border-red-200 hover:bg-red-50",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-full gap-1.5",
  md: "h-11 px-6 text-sm rounded-full gap-2",
  lg: "h-12 px-7 text-base rounded-full gap-2",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  children: ReactNode;
  className?: string;
};

export function buttonClass({
  variant = "primary",
  size = "md",
  full,
  className,
}: {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    full && "w-full",
    className
  );
}

export default function Button({
  variant,
  size,
  full,
  className,
  children,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={buttonClass({ variant, size, full, className })}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant,
  size,
  full,
  className,
  children,
}: CommonProps & { href: string }) {
  return (
    <Link
      href={href}
      className={buttonClass({ variant, size, full, className })}
    >
      {children}
    </Link>
  );
}
