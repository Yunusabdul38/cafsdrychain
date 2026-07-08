import type { TimelineEvent } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { CheckIcon } from "@/components/icons";

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-6">
      <span
        aria-hidden
        className="absolute left-[15px] top-2 bottom-2 w-px bg-black/[0.1]"
      />
      {events.map((e, i) => (
        <li key={i} className="relative flex gap-4">
          <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand bg-mint text-brand">
            <CheckIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="font-semibold text-brand-dark">{e.title}</p>
              <time className="text-xs text-muted">
                {formatDateTime(e.timestamp)}
              </time>
            </div>
            <p className="mt-0.5 text-sm text-muted">by {e.actor}</p>
            {e.details && e.details.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {e.details.map((d) => (
                  <li
                    key={d.label}
                    className="rounded-full bg-mint px-3 py-1 text-xs text-brand-dark"
                  >
                    <span className="text-muted">{d.label}:</span> {d.value}
                  </li>
                ))}
              </ul>
            )}
            {e.txHash && (
              <p className="mt-2 font-mono text-[11px] text-muted break-all">
                tx{" "}
                <a
                  href={`https://sepolia.basescan.org/tx/${e.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline"
                >
                  {e.txHash}
                </a>
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
