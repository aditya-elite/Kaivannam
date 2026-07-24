import { db } from "@/lib/db";
import { LandingView } from "@/components/views/LandingView";

// Landing page — fully public, no auth. Fetches a few featured makers to show
// the register is real, then hands off to a client view for translated copy.
export default async function HomePage() {
  const [featured, artisanCount, productCount] = await Promise.all([
    db.artisan.findMany({
      where: { tier: { not: "DOCS_PENDING" } },
      take: 3,
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    db.artisan.count(),
    db.product.count({ where: { status: "SEALED" } }),
  ]);

  return (
    <LandingView
      stats={{ artisans: artisanCount, products: productCount }}
      featured={featured.map((a) => ({
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
