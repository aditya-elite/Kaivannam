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

/**
 * Rounds a computed SVG coordinate to 4dp.
 *
 * `Math.cos` and `Math.sin` are not required to be bit-identical across
 * JavaScript engines, and they are not: rendering a spoke on the server
 * produced x2="7.819660112501051" while the browser computed 7.819660112501047
 * for the same angle. React compares the two as strings during hydration, sees
 * a mismatch it cannot patch, and throws for the whole tree.
 *
 * 4dp is far finer than a device pixel at any size this renders at, and it is
 * coarse enough to swallow a ~1e-15 discrepancy. Do not remove this in favour
 * of raw trig — the bug it fixes only appears once the component is
 * server-rendered, so it is easy to reintroduce and hard to spot locally.
 */
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

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
              x1={r4(24 + Math.cos(a) * 5)}
              y1={r4(24 + Math.sin(a) * 5)}
              x2={r4(24 + Math.cos(a) * 20)}
              y2={r4(24 + Math.sin(a) * 20)}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={r4(0.35 + (i / SPOKES) * 0.55)}
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
                /* Same rounding as Charkha above — this variant is also
                   server-rendered, so raw trig would mismatch identically. */
                <line
                  key={i}
                  x1={r4(12 + Math.cos(a) * 2.5)}
                  y1={r4(12 + Math.sin(a) * 2.5)}
                  x2={r4(12 + Math.cos(a) * 9)}
                  y2={r4(12 + Math.sin(a) * 9)}
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
