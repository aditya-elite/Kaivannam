"use client";

/**
 * §6.1 — weave progress. Four stages render as a weaving pattern completing,
 * not a bar filling. Each completed stage adds four interlocking thread strokes
 * drawn via stroke-dashoffset, staggered 60ms. On the fourth, a gold fill
 * sweeps across the resolved motif.
 *
 * This is the artisan's payoff for weeks of documentation, so it earns feature
 * length — but it never carries the state on its own: `label` is rendered as
 * text beside it and the same information is in the stage list below.
 *
 * `pathLength` normalises every stroke to 100 units so the dash animation works
 * without measuring geometry in JS.
 */
export function WeaveProgress({
  done,
  total = 4,
  label,
}: {
  /** Number of completed stages. */
  done: number;
  total?: number;
  /** Text equivalent, e.g. "3 of 4 stages documented". Always rendered. */
  label: string;
}) {
  const complete = done >= total;
  const cell = 60;

  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox={`0 0 ${cell * total} 44`}
        className={`h-11 w-full max-w-[280px] ${complete ? "weave-complete" : ""}`}
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        {/* Unwoven ground — always present, so the shape of the whole is legible
            from the first stage rather than assembling out of nothing. */}
        {Array.from({ length: total }, (_, i) => (
          <g key={`g${i}`} stroke="#2B1D14" strokeWidth="2" opacity="0.12">
            <line x1={i * cell + 8} y1="10" x2={i * cell + 8} y2="34" />
            <line x1={i * cell + 22} y1="10" x2={i * cell + 22} y2="34" />
            <line x1={i * cell + 36} y1="10" x2={i * cell + 36} y2="34" />
            <line x1={i * cell + 2} y1="16" x2={i * cell + 44} y2="16" />
            <line x1={i * cell + 2} y1="28" x2={i * cell + 44} y2="28" />
          </g>
        ))}

        {/* Woven threads for each completed stage. Warp and weft interlock. */}
        {Array.from({ length: total }, (_, i) =>
          i < done ? (
            <g key={`w${i}`} stroke="#1F6F78" strokeWidth="2.5" strokeLinecap="round">
              {[
                `M${i * cell + 8},10 L${i * cell + 8},34`,
                `M${i * cell + 22},10 L${i * cell + 22},34`,
                `M${i * cell + 2},16 L${i * cell + 44},16`,
                `M${i * cell + 2},28 L${i * cell + 44},28`,
              ].map((d, n) => (
                <path
                  key={n}
                  d={d}
                  pathLength={100}
                  className="weave-thread is-done"
                  style={{ "--len": 100, "--n": n } as React.CSSProperties}
                />
              ))}
            </g>
          ) : null,
        )}

        {/* Gold sweep on resolution. scaleX from the left, never a width change. */}
        {complete ? (
          <rect
            className="weave-sweep"
            x="0"
            y="8"
            width={cell * total}
            height="28"
            fill="#E9A319"
            opacity="0.22"
            rx="3"
          />
        ) : null}
      </svg>

      <p className="type-label shrink-0 text-muted">{label}</p>
    </div>
  );
}
