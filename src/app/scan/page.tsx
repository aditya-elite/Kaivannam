import { Suspense } from "react";
import type { Metadata } from "next";
import { ThreeKeyScanView } from "@/components/views/ThreeKeyScanView";

export const metadata: Metadata = { title: "3-Key scan — Kaivannam" };

// Public 3-Key verification scanner (opened by scanning a product's dynamic QR).
// No account needed. useSearchParams needs a Suspense boundary in Next 15.
export default function ScanPage() {
  return (
    <Suspense fallback={null}>
      <ThreeKeyScanView />
    </Suspense>
  );
}
