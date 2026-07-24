"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/provider";
import { Button, Card, SectionHeading } from "@/components/ui";
import { Seal } from "@/components/craft/Seal";
import {
  IconShield,
  IconCheck,
  IconClose,
  IconQr,
  IconAlert,
  IconArrowRight,
} from "@/components/icons";

/**
 * The 3-Key Verification "Jury Panel" scanner.
 *
 * Reads the signed payload from the QR URL (?p=&t=&s=), performs the on-device
 * KEY 2 liveness measurement (2s of DeviceOrientation tilt) and geolocation, then
 * POSTs everything to /api/verify-scan and renders the three-key verdict.
 *
 * KEY 1 (signature) and KEY 3 (provenance hash) are decided server-side; the
 * client only measures liveness/geo and displays the combined result.
 */

type KeyRow = { label: string; ok: boolean };
type ScanResponse = {
  verdict: string;
  message: string;
  keys: { key1: KeyRow; key2: KeyRow; key3: KeyRow };
  product: { id: string; title: string; artisanName: string; artisanId: string } | null;
};

type GeoPoint = { lat: number; lng: number };
type Phase = "idle" | "measuring" | "submitting" | "done";

const LIVENESS_MS = 2000;
// Combined pitch+roll travel (degrees) that counts as genuine 3D motion.
const MOTION_THRESHOLD_DEG = 8;

/** Sample DeviceOrientation for ~2s; resolve whether real 3D motion was seen. */
function measureLiveness(): Promise<{ moved: boolean; sensor: boolean }> {
  return new Promise((resolve) => {
    let betaMin = Infinity,
      betaMax = -Infinity,
      gammaMin = Infinity,
      gammaMax = -Infinity;
    let samples = 0;

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      samples++;
      betaMin = Math.min(betaMin, e.beta);
      betaMax = Math.max(betaMax, e.beta);
      gammaMin = Math.min(gammaMin, e.gamma);
      gammaMax = Math.max(gammaMax, e.gamma);
    };

    window.addEventListener("deviceorientation", onOrient);
    window.setTimeout(() => {
      window.removeEventListener("deviceorientation", onOrient);
      const travel = betaMax - betaMin + (gammaMax - gammaMin);
      resolve({ moved: samples > 0 && travel >= MOTION_THRESHOLD_DEG, sensor: samples > 0 });
    }, LIVENESS_MS);
  });
}

/** iOS 13+ gates the sensor behind a user-gesture permission prompt. */
async function requestOrientationPermission(): Promise<void> {
  const anyEvent = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  if (typeof anyEvent?.requestPermission === "function") {
    try {
      await anyEvent.requestPermission();
    } catch {
      /* denied — measureLiveness will simply see no samples */
    }
  }
}

function getGeo(): Promise<GeoPoint | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 4000, maximumAge: 60000 },
    );
  });
}

export function ThreeKeyScanView() {
  const t = useT();
  const params = useSearchParams();

  const payload = useMemo(
    () => ({
      p: params.get("p") ?? "",
      t: params.get("t") ?? "",
      s: params.get("s") ?? "",
    }),
    [params],
  );

  const [productId, setProductId] = useState(payload.p);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState<string>("");
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  // Desktop has no motion sensor; this lets a tester exercise the pass path.
  const [simulateLiveness, setSimulateLiveness] = useState(false);

  const run = useCallback(async () => {
    const id = (productId || payload.p).trim();
    if (!id) return;
    setPhase("measuring");
    setResult(null);
    setHttpStatus(null);

    // KEY 2a — liveness.
    setStatus(t("scan.measuring"));
    await requestOrientationPermission();
    const live = await measureLiveness();
    const livenessPassed = simulateLiveness ? true : live.moved;

    // KEY 2b — geolocation (best-effort).
    setStatus(t("scan.locating"));
    const geo = await getGeo();

    // Submit to the engine.
    setPhase("submitting");
    setStatus(t("scan.verifying"));
    try {
      const res = await fetch("/api/verify-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ProductID: id,
          Signature: payload.s,
          Timestamp: payload.t,
          GeoLocation: geo,
          LivenessPassed: livenessPassed,
        }),
      });
      const data = (await res.json()) as ScanResponse;
      setResult(data);
      setHttpStatus(res.status);
    } catch {
      setResult({
        verdict: "ERROR",
        message: t("scan.networkError"),
        keys: {
          key1: { label: t("scan.key1"), ok: false },
          key2: { label: t("scan.key2"), ok: false },
          key3: { label: t("scan.key3"), ok: false },
        },
        product: null,
      });
      setHttpStatus(0);
    } finally {
      setPhase("done");
      setStatus("");
    }
  }, [productId, payload, simulateLiveness, t]);

  const authentic = httpStatus === 200;

  return (
    <div className="mx-auto max-w-xl">
      <SectionHeading label={t("scan.eyebrow")} sub={t("scan.intro")}>
        {t("scan.title")}
      </SectionHeading>

      {phase === "idle" || (phase === "done" && !result) ? (
        <Card className="space-y-4">
          <label htmlFor="scan-pid" className="block text-base font-semibold">
            {t("scan.productId")}
          </label>
          <input
            id="scan-pid"
            value={productId}
            onChange={(e) => setProductId(e.target.value.toUpperCase())}
            placeholder="KS-XXXX-XXXX-XXXX"
            className="min-h-tap w-full rounded-xl border-2 border-ink/15 bg-surface px-3 font-mono text-base focus:border-teal"
          />

          {!payload.s ? (
            <p className="flex items-start gap-2 rounded-lg bg-haldi/15 p-3 text-sm text-ink">
              <IconAlert width={16} height={16} className="mt-0.5 shrink-0" />
              {t("scan.noSignatureNote")}
            </p>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={simulateLiveness}
              onChange={(e) => setSimulateLiveness(e.target.checked)}
              className="h-4 w-4"
            />
            {t("scan.simulateLiveness")}
          </label>

          <Button onClick={run} className="w-full">
            <IconShield width={20} height={20} /> {t("scan.start")}
          </Button>
        </Card>
      ) : null}

      {(phase === "measuring" || phase === "submitting") && (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="tilt-hint text-4xl" aria-hidden="true">
            📱
          </div>
          <p className="text-base font-semibold" role="status" aria-live="polite">
            {status}
          </p>
          <p className="max-w-sm text-sm text-muted">{t("scan.tiltHint")}</p>
        </Card>
      )}

      {phase === "done" && result ? (
        <JuryPanel result={result} authentic={authentic} httpStatus={httpStatus} onReset={() => setPhase("idle")} />
      ) : null}
    </div>
  );
}

/* ── The Jury Panel ─────────────────────────────────────────────────────────── */

function JuryPanel({
  result,
  authentic,
  httpStatus,
  onReset,
}: {
  result: ScanResponse;
  authentic: boolean;
  httpStatus: number | null;
  onReset: () => void;
}) {
  const t = useT();
  const rows: Array<{ n: number; row: KeyRow }> = [
    { n: 1, row: result.keys.key1 },
    { n: 2, row: result.keys.key2 },
    { n: 3, row: result.keys.key3 },
  ];

  return (
    <div className={authentic ? "" : "calm-geometry"}>
      <header className="flex flex-col items-center gap-4 py-6 text-center">
        <Seal tone={authentic ? "authentic" : "alert"} />
        <div>
          <p className="type-label text-muted">{t("scan.verdictTitle")}</p>
          <h1
            className={`mt-2 text-2xl font-extrabold sm:text-3xl ${
              authentic ? "text-teal-700" : "text-warning"
            }`}
          >
            {result.message}
          </h1>
          {httpStatus ? (
            <p className="mt-1 font-mono text-sm text-muted">HTTP {httpStatus}</p>
          ) : null}
        </div>
      </header>

      {/* The three keys, judged independently. */}
      <ul className="space-y-3">
        {rows.map(({ n, row }) => (
          <li
            key={n}
            className="flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-card"
          >
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ${
                row.ok ? "bg-teal/15 text-teal-700" : "bg-warning/15 text-warning"
              }`}
            >
              {row.ok ? <IconCheck width={22} height={22} /> : <IconClose width={22} height={22} />}
            </span>
            <div className="min-w-0">
              <p className="type-label text-muted">
                {t("scan.keyN", { n: String(n) })}
              </p>
              <p className="text-base font-semibold">
                {row.label} —{" "}
                <span className={row.ok ? "text-teal-700" : "text-warning"}>
                  {row.ok ? t("scan.keyPass") : t("scan.keyFail")}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ul>

      {result.product ? (
        <Card className="mt-6">
          <h2 className="text-lg font-bold">{result.product.title}</h2>
          <p className="mt-1 text-base text-muted">
            {t("verify.madeBy")}: {result.product.artisanName}
          </p>
          <p className="mt-1 font-mono text-sm text-muted">{result.product.id}</p>
          {authentic ? (
            <a
              href={`/product/${result.product.id}`}
              className="mt-3 inline-flex min-h-tap items-center gap-2 font-semibold text-indigo hover:underline"
            >
              {t("scan.viewRecord")} <IconArrowRight width={16} height={16} />
            </a>
          ) : null}
        </Card>
      ) : null}

      <button
        type="button"
        onClick={onReset}
        className="press mt-8 inline-flex min-h-tap items-center gap-2 font-semibold text-indigo hover:underline"
      >
        <IconQr width={18} height={18} /> {t("scan.again")}
      </button>
    </div>
  );
}
