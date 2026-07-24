import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getArtisanIdDocument, type IdDocView } from "@/lib/id-document";
import { MyItemsView } from "@/components/views/MyItemsView";

// "My items" — resumable drafts (from the device) + published items (from the
// server, when signed in). Not a login wall: guests still see their local drafts.
export default async function MyItemsPage() {
  const user = await getCurrentUser();

  let published: {
    id: string;
    title: string;
    category: string;
    sealedAt: string | null;
    priceInPaise: number | null;
    stock: number;
    listedForSale: boolean;
  }[] = [];
  let verificationTier: string | null = null;
  let idDoc: IdDocView | null = null;

  if (user?.artisanId) {
    const [products, artisan, doc] = await Promise.all([
      db.product.findMany({
        where: { artisanId: user.artisanId, status: "SEALED" },
        orderBy: { sealedAt: "desc" },
      }),
      db.artisan.findUnique({ where: { id: user.artisanId }, select: { tier: true } }),
      getArtisanIdDocument(user.artisanId),
    ]);
    idDoc = doc;
    published = products.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      sealedAt: p.sealedAt ? p.sealedAt.toISOString() : null,
      priceInPaise: p.priceInPaise,
      stock: p.stock,
      listedForSale: p.listedForSale,
    }));
    verificationTier = artisan?.tier ?? null;
  }

  return (
    <MyItemsView
      authed={!!user}
      artisanName={user?.displayName ?? null}
      verificationTier={verificationTier}
      published={published}
      idDoc={idDoc}
    />
  );
}
