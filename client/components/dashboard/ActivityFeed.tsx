import Link from "next/link";
import { relativeTime } from "@/lib/utils";
import { CheckIcon } from "@/components/icons";

export type ActivityItem = {
  title: string;
  batchId: string;
  actor: string;
  timestamp: string;
};

export default function ActivityFeed({
  items,
  basePath,
}: {
  items: ActivityItem[];
  basePath: string;
}) {
  return (
    <ul className="divide-y divide-black/[0.06]">
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-3 px-5 py-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint text-brand">
            <CheckIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-brand-dark">
              {item.title}
            </p>
            <p className="truncate text-xs text-muted">
              <Link
                href={`${basePath}/${item.batchId}`}
                className="font-mono text-brand hover:underline"
              >
                {item.batchId}
              </Link>{" "}
              · {item.actor}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted">
            {relativeTime(item.timestamp)}
          </span>
        </li>
      ))}
    </ul>
  );
}
