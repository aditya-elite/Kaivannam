import { db } from "./db";
import { crossCheckGi } from "./gi";
import { generateArtisanKeyPair } from "./crypto-keys";
import { normalizePehchan } from "./pehchan-format";

/**
 * Finalise Gate-1 (artisan identity) verification. Shared by:
 *   • the identity route, when a valid Pehchan number auto-approves, and
 *   • the admin action, when a reviewer manually approves a request.
 *
 * It sets the confirmed Pehchan on the profile, cross-checks the name against the
 * GI Part-B register for a possible GI_AUTHORISED upgrade, and ensures the artisan
 * has an ECDSA signing keypair (KEY 1) so their products can be signed.
 */
export async function finalizeArtisanVerification(opts: {
  artisanId: string;
  name: string;
  claimedGi: string | null;
  pehchanNumber: string | null;
  pehchanDocUrl?: string | null;
}): Promise<{ tier: "ID_VERIFIED" | "GI_AUTHORISED"; giMatched: boolean }> {
  const artisan = await db.artisan.findUnique({ where: { id: opts.artisanId } });
  if (!artisan) return { tier: "ID_VERIFIED", giMatched: false };

  // GI Part-B name cross-check → possible tier upgrade.
  const gi = await crossCheckGi(opts.name, opts.claimedGi);
  let tier: "ID_VERIFIED" | "GI_AUTHORISED" = "ID_VERIFIED";
  if (gi.match && gi.dataset) {
    tier = "GI_AUTHORISED";
    await db.giMatch.upsert({
      where: { artisanId: opts.artisanId },
      create: { artisanId: opts.artisanId, giEntryId: gi.match.id, datasetVersion: gi.dataset.version },
      update: { giEntryId: gi.match.id, datasetVersion: gi.dataset.version },
    });
  }

  // Ensure a signing keypair exists (generate once).
  const keyData =
    artisan.signingPublicKey && artisan.signingPrivateKey
      ? {}
      : (() => {
          const pair = generateArtisanKeyPair();
          return { signingPublicKey: pair.publicKeyPem, signingPrivateKey: pair.privateKeyPem };
        })();

  await db.artisan.update({
    where: { id: opts.artisanId },
    data: {
      tier,
      pehchanVerified: true,
      ...(opts.pehchanNumber ? { pehchanNumber: normalizePehchan(opts.pehchanNumber) } : {}),
      ...(opts.pehchanDocUrl ? { pehchanDocUrl: opts.pehchanDocUrl } : {}),
      ...keyData,
    },
  });

  return { tier, giMatched: !!gi.match };
}
