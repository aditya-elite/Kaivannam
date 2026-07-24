import { db } from "@/lib/db";
import { ArtisansView } from "@/components/views/ArtisansView";

// Public artisan register — browse & search all makers, no account needed.
export default async function ArtisansPage() {
  const artisans = await db.artisan.findMany({
    orderBy: { fullName: "asc" },
    include: { _count: { select: { products: { where: { status: "SEALED" } } } } },
  });

  return (
    <ArtisansView
      artisans={artisans.map((a) => ({
        id: a.id,
        fullName: a.fullName,
        craft: a.craft,
        region: a.region,
        state: a.state,
        tier: a.tier,
        photoUrl: a.photoUrl,
        productCount: a._count.products,
      }))}
    />
  );
}
