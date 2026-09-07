import { ChevronLeftIcon } from "@/components/icons";
import { LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * The single back-navigation control for the whole site. Built on LinkButton so
 * it inherits the shared button sizing, borders and focus ring rather than
 * carrying a look of its own.
 */
export default function BackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <LinkButton
      href={href}
      variant="outline"
      size="sm"
      className={cn("print:hidden", className)}
    >
      <ChevronLeftIcon className="h-4 w-4" />
      {label}
    </LinkButton>
  );
}
