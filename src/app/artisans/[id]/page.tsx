import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { maskPehchan } from "@/lib/pehchan-format";
import { ArtisanProfileView } from "@/components/views/ArtisanProfileView";

// Public artisan profile. The hidden signature is never queried for display.
export default async function ArtisanProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const artisan = await db.artisan.findUnique({
    where: { id },
    include: {
      products: {
        where: { status: "SEALED" },
        orderBy: { sealedAt: "desc" },
        include: { stages: { orderBy: { capturedAt: "asc" }, take: 1 } },
      },
      giMatch: { include: { giEntry: true } },
    },
  });

  if (!artisan) notFound();

  return (
    <ArtisanProfileView
      artisan={{
        id: artisan.id,
        fullName: artisan.fullName,
        craft: artisan.craft,
        region: artisan.region,
        state: artisan.state,
        bio: artisan.bio,
        photoUrl: artisan.photoUrl,
        tier: artisan.tier,
        pehchan:
          artisan.pehchanVerified && artisan.pehchanNumber
            ? { masked: maskPehchan(artisan.pehchanNumber), docUrl: artisan.pehchanDocUrl }
            : null,
      }}
      gi={
        artisan.giMatch
          ? {
              giNumber: artisan.giMatch.giEntry.giNumber,
              giName: artisan.giMatch.giEntry.giName,
              datasetVersion: artisan.giMatch.datasetVersion,
              checkedAt: artisan.giMatch.checkedAt.toISOString(),
            }
          : null
      }
      products={artisan.products.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        photoUrl: p.stages[0] ? (JSON.parse(p.stages[0].photoUrls)[0] as string) : null,
        sealedAt: p.sealedAt ? p.sealedAt.toISOString() : null,
        giNumber: p.giVerified ? p.giNumber : null,
      }))}
    />
  );
}
