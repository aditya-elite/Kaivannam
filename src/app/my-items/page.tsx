import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MyItemsView } from "@/components/views/MyItemsView";

// "My items" — resumable drafts (from the device) + published items (from the
// server, when signed in). Not a login wall: guests still see their local drafts.
export default async function MyItemsPage() {
  const user = await getCurrentUser();

  let published: { id: string; title: string; category: string; sealedAt: string | null }[] = [];
  let verificationTier: string | null = null;

  if (user?.artisanId) {
    const [products, artisan] = await Promise.all([
      db.product.findMany({
        where: { artisanId: user.artisanId, status: "SEALED" },
        orderBy: { sealedAt: "desc" },
      }),
      db.artisan.findUnique({ where: { id: user.artisanId }, select: { tier: true } }),
    ]);
    published = products.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      sealedAt: p.sealedAt ? p.sealedAt.toISOString() : null,
    }));
    verificationTier = artisan?.tier ?? null;
  }

  return (
    <MyItemsView
      authed={!!user}
      artisanName={user?.displayName ?? null}
      verificationTier={verificationTier}
      published={published}
    />
  );
}
