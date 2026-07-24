import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getProvenance } from "@/lib/provenance";
import { ProvenanceManageView } from "@/components/views/ProvenanceManageView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Provenance — ${id} — Kaivannam` };
}

export default async function ProvenancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const canonicalId = decodeURIComponent(id).toUpperCase();

  const product = await db.product.findUnique({
    where: { id: canonicalId },
    select: { id: true, title: true, status: true, artisan: { select: { fullName: true } } },
  });
  if (!product) notFound();

  const [provenance, user] = await Promise.all([getProvenance(canonicalId), getCurrentUser()]);

  return (
    <ProvenanceManageView
      productId={product.id}
      productTitle={product.title}
      makerName={product.artisan.fullName}
      provenance={provenance}
      viewer={
        user
          ? { displayName: user.displayName, role: user.role, isMaker: user.displayName.trim().toLowerCase() === product.artisan.fullName.trim().toLowerCase() }
          : null
      }
    />
  );
}
