"use client";

/**
 * §8.1 — charkha loader. Ten spokes: below eight it reads as a fidget spinner,
 * above twelve it aliases on low-DPI screens.
 *
 * Never rendered bare. `label` is required, and it is real text in the DOM
 * inside a live region — a user who cannot see the wheel still knows what is
 * happening. Under reduced motion the wheel is static and the label carries the
 * whole state (motion.css).
 */
const SPOKES = 10;

export function Charkha({ label, size = 40 }: { label: string; size?: number }) {
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        focusable="false"
        className="charkha shrink-0 text-terracotta"
      >
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" opacity="0.3" />
        <circle cx="24" cy="24" r="4" fill="currentColor" />
        {Array.from({ length: SPOKES }, (_, i) => {
          const a = (i / SPOKES) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={24 + Math.cos(a) * 5}
              y1={24 + Math.sin(a) * 5}
              x2={24 + Math.cos(a) * 20}
              y2={24 + Math.sin(a) * 20}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={0.35 + (i / SPOKES) * 0.55}
            />
          );
        })}
      </svg>
      <p className="text-base text-muted">{label}</p>
    </div>
  );
}

/**
 * Loom-shuttle variant for short operations of known duration — a shuttle
 * travelling back and forth across a warp rather than an open-ended spin.
 */
export function Shuttle({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      <svg
        width="96"
        height="24"
        viewBox="0 0 96 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
        className="shrink-0 text-indigo"
      >
        <g stroke="currentColor" strokeWidth="1.5" opacity="0.25">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1={6 + i * 11} y1="3" x2={6 + i * 11} y2="21" />
          ))}
        </g>
        <path
          className="shuttle"
          style={{ "--throw": "64px" } as React.CSSProperties}
          d="M2,12 L10,6 L26,6 L34,12 L26,18 L10,18 Z"
          fill="currentColor"
        />
      </svg>
      <p className="text-base text-muted">{label}</p>
    </div>
  );
}

/**
 * §9 — sync state. Queued is deliberately static: motion implies activity, and
 * queued is not active. Syncing turns at 2s per rotation, slower than the page
 * loader, so background work never reads as foreground work. Failure has no
 * motion at all (§5.3). Every state is readable as text, not just icon state.
 */
export type SyncState = "queued" | "syncing" | "synced" | "failed";

export function SyncStatus({ state, label }: { state: SyncState; label: string }) {
  const tone =
    state === "failed" ? "text-warning" : state === "synced" ? "text-success" : "text-muted";

  return (
    <p className={`flex items-center gap-2 text-sm ${tone}`} role="status" aria-live="polite">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        {state === "synced" ? (
          <polyline
            className="sync-stamp"
            points="20 6 9 17 4 12"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : state === "failed" ? (
          <>
            <path d="M12 3l9 16H3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <line x1="12" y1="10" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <g className={state === "syncing" ? "sync-spin" : undefined} style={{ transformOrigin: "center" }}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={12 + Math.cos(a) * 2.5}
                  y1={12 + Math.sin(a) * 2.5}
                  x2={12 + Math.cos(a) * 9}
                  y2={12 + Math.sin(a) * 9}
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              );
            })}
          </g>
        )}
      </svg>
      {label}
    </p>
  );
}
