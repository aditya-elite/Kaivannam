import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TagView } from "@/components/views/TagView";

// Printable tag to attach to the physical item. Kept minimal and high-contrast.
export default async function TagPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id: decodeURIComponent(id).toUpperCase() },
    include: { artisan: true },
  });
  if (!product || product.status !== "SEALED") notFound();

  return (
    <TagView
      id={product.id}
      title={product.title}
      artisanName={product.artisan.fullName}
      craft={product.artisan.craft}
    />
  );
}
