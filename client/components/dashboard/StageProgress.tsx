import type { BatchStage } from "@/lib/types";
import { STAGE_LABEL, STAGE_ORDER } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { CheckIcon } from "@/components/icons";

export default function StageProgress({ stage }: { stage: BatchStage }) {
  const currentIndex = STAGE_ORDER.indexOf(stage);

  return (
    <ol className="flex items-center overflow-x-auto">
      {STAGE_ORDER.map((s, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <li key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                  done && "border-brand bg-brand text-white",
                  current && "border-brand-dark bg-brand-dark text-white",
                  !done && !current && "border-black/[0.15] bg-white text-muted"
                )}
              >
                {done ? <CheckIcon className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-[11px] font-medium",
                  current ? "text-brand-dark" : "text-muted"
                )}
              >
                {STAGE_LABEL[s]}
              </span>
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <span
                className={cn(
                  "mx-1 mb-5 h-px flex-1",
                  i < currentIndex ? "bg-brand" : "bg-black/[0.12]"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
