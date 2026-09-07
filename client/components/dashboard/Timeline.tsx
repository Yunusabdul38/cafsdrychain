import type { TimelineEvent } from "@/lib/types";
import { formatDateTime, shortHash } from "@/lib/utils";
import { CheckIcon, ExternalLinkIcon, NoteIcon } from "@/components/icons";

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
            {e.note && (
              <div className="mt-2 rounded-xl border-l-2 border-brand/40 bg-mint/30 px-3 py-2">
                {/* Labelled, so a free-text note is not mistaken for recorded data */}
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand">
                  <NoteIcon className="h-3.5 w-3.5" />
                  Operator note
                </p>
                <p className="mt-1 text-sm leading-relaxed text-brand-dark">
                  {e.note}
                </p>
              </div>
            )}
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
              <a
                href={`https://sepolia.basescan.org/tx/${e.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Opens the blockchain record in a new tab"
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-black/[0.03] px-3 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-mint hover:text-brand"
              >
                View on chain record
                <span className="font-mono opacity-70">{shortHash(e.txHash)}</span>
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
