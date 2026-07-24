"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/provider";
import { Button, Card, SectionHeading } from "@/components/ui";
import { IconQr, IconSearch, IconCamera, IconClose } from "@/components/icons";

// BarcodeDetector is available on Chrome for Android — our primary target device.
// We progressively enhance: live scan when supported, manual entry always.
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats: string[] }) => BarcodeDetectorLike;
  }
}

function extractProductId(raw: string): string {
  // Accept a full URL (from a scanned QR) or a bare product id typed in.
  const m = /\/product\/([^/?#]+)/.exec(raw);
  return (m ? m[1] : raw).trim().toUpperCase();
}

export function LookupView() {
  const t = useT();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const go = useCallback(
    (raw: string) => {
      const id = extractProductId(raw);
      if (id) router.push(`/product/${encodeURIComponent(id)}`);
    },
    [router],
  );

  const stopScan = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startScan = useCallback(async () => {
    setScanError(null);
    if (!window.BarcodeDetector) {
      setScanError("scan-unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScanning(true);
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      const tick = async () => {
        if (!streamRef.current) return;
        try {
          const codes = await detector.detect(video);
          if (codes[0]?.rawValue) {
            stopScan();
            go(codes[0].rawValue);
            return;
          }
        } catch {
          /* keep scanning */
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setScanError("scan-denied");
      setScanning(false);
    }
  }, [go, stopScan]);

  useEffect(() => () => stopScan(), [stopScan]);

  return (
    <div className="mx-auto max-w-xl">
      <SectionHeading sub={t("lookup.subtitle")}>{t("lookup.title")}</SectionHeading>

      <Card className="space-y-5">
        {scanning ? (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} className="aspect-square w-full object-cover" playsInline muted />
              <div className="pointer-events-none absolute inset-8 rounded-xl border-4 border-white/80" />
            </div>
            <p className="text-center text-base text-muted">{t("lookup.scanHint")}</p>
            <Button variant="outline" onClick={stopScan} className="w-full">
              <IconClose width={20} height={20} /> {t("common.cancel")}
            </Button>
          </div>
        ) : (
          <>
            <Button variant="secondary" onClick={startScan} className="w-full">
              <IconCamera width={22} height={22} /> {t("lookup.scanHint")}
            </Button>
            {scanError ? (
              <p className="flex items-start gap-2 rounded-lg bg-haldi/15 p-3 text-sm text-ink">
                <IconQr width={18} height={18} className="mt-0.5 shrink-0" />
                {scanError === "scan-unsupported"
                  ? "Live scan isn't available on this device — please type the product number below."
                  : "Camera permission was not granted — please type the product number below."}
              </p>
            ) : null}

            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="h-px flex-1 bg-ink/10" /> {t("common.or")}{" "}
              <span className="h-px flex-1 bg-ink/10" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                go(value);
              }}
              className="space-y-3"
            >
              <label htmlFor="pid" className="block text-base font-semibold">
                {t("lookup.title")}
              </label>
              <div className="relative">
                <IconQr
                  width={20}
                  height={20}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  id="pid"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={t("lookup.placeholder")}
                  autoCapitalize="characters"
                  className="min-h-tap w-full rounded-xl border-2 border-ink/15 bg-cream pl-11 pr-4 font-mono text-base tracking-wide focus:border-teal"
                />
              </div>
              <Button type="submit" className="w-full" disabled={!value.trim()}>
                <IconSearch width={20} height={20} /> {t("lookup.button")}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
