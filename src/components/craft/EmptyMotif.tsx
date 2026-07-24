"use client";

/**
 * §8.3 — empty state. An uncarved motif that completes when content arrives:
 * the strokes are all there at low opacity, and `filled` draws the remaining
 * ones over 500ms. Cheap, and it makes the empty state feel intentional rather
 * than broken.
 *
 * The graphic is decorative; `title` and `body` carry the state.
 */
export function EmptyMotif({
  title,
  body,
  filled = false,
}: {
  title: string;
  body?: string;
  /** Flip to true once content lands to draw the remaining strokes. */
  filled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <svg
        width="96"
        height="96"
        viewBox="0 0 96 96"
        fill="none"
        aria-hidden="true"
        focusable="false"
        className={`motif-empty text-terracotta ${filled ? "is-filled" : ""}`}
      >
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M48,10 C68,10 86,28 86,48 C86,68 68,86 48,86 C28,86 10,68 10,48 C10,28 28,10 48,10 Z"
            pathLength={100}
            style={{ "--len": 100 } as React.CSSProperties}
          />
          <path
            d="M48,24 L62,48 L48,72 L34,48 Z"
            pathLength={100}
            style={{ "--len": 100 } as React.CSSProperties}
          />
          <path
            d="M24,48 L48,34 L72,48 L48,62 Z"
            pathLength={100}
            style={{ "--len": 100 } as React.CSSProperties}
          />
        </g>
      </svg>
      <p className="text-lg font-bold">{title}</p>
      {body ? <p className="max-w-sm text-base text-muted">{body}</p> : null}
    </div>
  );
}
