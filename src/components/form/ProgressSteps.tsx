"use client";

import { IconCheck } from "@/components/icons";

// Visible progress for the multi-step flow ("Step 2 of 4") with per-step state
// pinned to icon + text, never colour alone.
export function ProgressSteps({
  steps,
  current,
  stepLabel,
}: {
  steps: string[];
  current: number; // 0-based
  stepLabel: string; // localized "Step {n} of {total}"
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-base font-semibold text-muted">{stepLabel}</p>
      <ol className="flex items-center gap-1" aria-label="Progress">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={i} className="flex flex-1 items-center gap-1">
              <div className="flex min-w-0 flex-col items-center gap-1">
                <span
                  aria-current={active ? "step" : undefined}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    done
                      ? "bg-success text-white"
                      : active
                        ? "bg-indigo text-white ring-4 ring-indigo/20"
                        : "bg-ink/10 text-muted"
                  }`}
                >
                  {done ? <IconCheck width={18} height={18} title="Done" /> : i + 1}
                </span>
                <span
                  className={`hidden text-center text-xs sm:block ${
                    active ? "font-bold text-indigo" : "text-muted"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 ? (
                <span className={`h-1 flex-1 rounded ${done ? "bg-success" : "bg-ink/10"}`} />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
