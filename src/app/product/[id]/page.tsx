import type { Metadata } from "next";
import { verifyProduct } from "@/lib/verify";
import { VerifyView } from "@/components/views/VerifyView";

// Public product verification page (opened by scanning the QR). No account.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Verify ${id} — Kalāsūtra` };
}

export default async function ProductVerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await verifyProduct(decodeURIComponent(id).toUpperCase());
  return <VerifyView id={id} result={result} />;
}
