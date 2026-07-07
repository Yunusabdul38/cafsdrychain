import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Logo({
  href = "/",
  dark = false,
  className,
}: {
  href?: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/img/drychain-logo.png"
        alt="CAFS DryChain logo"
        width={40}
        height={40}
        className="h-9 w-9 rounded-full object-cover"
        priority
      />
      <span className="flex flex-col leading-none">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
          CAFS
        </span>
        <span
          className={cn(
            "-mt-0.5 text-lg font-semibold",
            dark ? "text-white" : "text-brand-dark"
          )}
        >
          DryChain
        </span>
      </span>
    </Link>
  );
}
