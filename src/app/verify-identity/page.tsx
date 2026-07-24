import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { VerifyIdentityView } from "@/components/views/VerifyIdentityView";

// Pehchan ID verification. Requires an account (you verify your OWN identity),
// so this is a legitimate auth touchpoint distinct from browsing.
export default async function VerifyIdentityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/verify-identity");

  // Offer GI clusters from the latest ingested dataset for the claim dropdown.
  const dataset = await db.giDataset.findFirst({ orderBy: { version: "desc" } });
  const giOptions = dataset
    ? await db.giEntry.findMany({
        where: { datasetId: dataset.id },
        select: { giName: true },
        distinct: ["giName"],
      })
    : [];

  return (
    <VerifyIdentityView
      giOptions={giOptions.map((g) => g.giName)}
      datasetVersion={dataset?.version ?? null}
      lastSynced={dataset ? dataset.lastSyncedAt.toISOString() : null}
    />
  );
}
