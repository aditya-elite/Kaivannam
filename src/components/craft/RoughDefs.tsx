/**
 * §2.3 — the rough-edge clipPath sprite. Defined once per document (rendered in
 * the root layout), referenced by class from motion.css.
 *
 * `rough-*` are plate / divider / badge edges: uneven keylines, the way a hand
 * -ruled line or a block-print registration edge is uneven.
 * `torn-*` are paint-stroke selection highlights: ragged, with bleeding ends.
 *
 * All paths are in objectBoundingBox units so one definition fits any element
 * size — no per-instance geometry, no raster assets, ~2KB gzipped for the lot.
 * Variant assignment lives in lib/rough.ts.
 */
export function RoughDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="rough-1" clipPathUnits="objectBoundingBox">
          <path d="M0.004,0.030 L0.19,0.008 L0.41,0.026 L0.63,0.006 L0.84,0.022 L0.997,0.012 L0.990,0.27 L0.998,0.55 L0.988,0.82 L0.996,0.988 L0.79,0.972 L0.57,0.994 L0.35,0.976 L0.14,0.996 L0.006,0.978 L0.016,0.73 L0.002,0.47 L0.012,0.21 Z" />
        </clipPath>
        <clipPath id="rough-2" clipPathUnits="objectBoundingBox">
          <path d="M0.008,0.012 L0.24,0.030 L0.47,0.006 L0.70,0.028 L0.91,0.004 L0.994,0.026 L0.984,0.32 L0.998,0.61 L0.986,0.990 L0.74,0.968 L0.52,0.992 L0.29,0.970 L0.08,0.994 L0.002,0.968 L0.014,0.68 L0.006,0.39 L0.016,0.14 Z" />
        </clipPath>
        <clipPath id="rough-3" clipPathUnits="objectBoundingBox">
          <path d="M0.002,0.022 L0.31,0.004 L0.55,0.030 L0.79,0.010 L0.998,0.030 L0.986,0.24 L0.996,0.49 L0.982,0.74 L0.994,0.976 L0.68,0.996 L0.44,0.970 L0.21,0.992 L0.004,0.970 L0.018,0.72 L0.004,0.44 L0.020,0.18 Z" />
        </clipPath>
        <clipPath id="rough-4" clipPathUnits="objectBoundingBox">
          <path d="M0.006,0.008 L0.16,0.028 L0.38,0.006 L0.60,0.024 L0.82,0.002 L0.996,0.024 L0.982,0.36 L0.998,0.66 L0.984,0.992 L0.82,0.970 L0.60,0.994 L0.38,0.972 L0.16,0.996 L0.002,0.976 L0.020,0.64 L0.002,0.33 L0.014,0.06 Z" />
        </clipPath>

        <clipPath id="torn-1" clipPathUnits="objectBoundingBox">
          <path d="M0.012,0.14 L0.06,0.04 L0.14,0.10 L0.26,0.02 L0.40,0.09 L0.55,0.03 L0.70,0.10 L0.85,0.04 L0.96,0.11 L0.994,0.05 L0.986,0.40 L0.998,0.72 L0.970,0.95 L0.88,0.90 L0.74,0.98 L0.60,0.90 L0.45,0.97 L0.30,0.89 L0.17,0.98 L0.05,0.90 L0.004,0.96 L0.020,0.60 L0.002,0.34 Z" />
        </clipPath>
        <clipPath id="torn-2" clipPathUnits="objectBoundingBox">
          <path d="M0.006,0.06 L0.09,0.12 L0.20,0.03 L0.33,0.11 L0.48,0.02 L0.62,0.10 L0.77,0.03 L0.90,0.12 L0.996,0.04 L0.982,0.33 L0.996,0.64 L0.988,0.94 L0.86,0.98 L0.71,0.89 L0.57,0.97 L0.42,0.90 L0.27,0.98 L0.13,0.91 L0.010,0.97 L0.024,0.66 L0.004,0.36 Z" />
        </clipPath>
        <clipPath id="torn-3" clipPathUnits="objectBoundingBox">
          <path d="M0.020,0.10 L0.11,0.02 L0.23,0.11 L0.37,0.04 L0.51,0.12 L0.66,0.03 L0.80,0.10 L0.93,0.02 L0.990,0.09 L0.976,0.46 L0.998,0.78 L0.962,0.98 L0.83,0.91 L0.69,0.99 L0.54,0.91 L0.39,0.98 L0.24,0.90 L0.10,0.97 L0.002,0.90 L0.016,0.55 L0.006,0.28 Z" />
        </clipPath>
        <clipPath id="torn-4" clipPathUnits="objectBoundingBox">
          <path d="M0.004,0.09 L0.07,0.03 L0.18,0.12 L0.31,0.02 L0.46,0.10 L0.60,0.03 L0.75,0.11 L0.88,0.04 L0.996,0.10 L0.980,0.38 L0.994,0.70 L0.974,0.96 L0.84,0.90 L0.68,0.98 L0.53,0.90 L0.38,0.97 L0.22,0.89 L0.08,0.98 L0.006,0.92 L0.022,0.62 L0.002,0.31 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}
