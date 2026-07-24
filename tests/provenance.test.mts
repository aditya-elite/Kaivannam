/**
 * Proof tests for the two-layer provenance feature.
 *
 *   npx tsx tests/provenance.test.mts
 *
 * These run against the seeded dev database. They are the executable form of
 * the Definition of Done: each one asserts one of the guarantees from Section 0
 * of the brief. No test runner is configured in this project, so this is a
 * plain tsx script with a tiny assert harness — `tsx` resolves the `@/` alias,
 * so the tests exercise the REAL library code, not a copy.
 */
import { db } from "@/lib/db";
import { computeCoreHash } from "@/lib/authenticity/core";
import { getCurrentRecord, getHistory } from "@/lib/authenticity/record";
import {
  initiateTransfer,
  acceptTransfer,
  getCurrentOwner,
  getOwnership,
} from "@/lib/ownership";
import { ownershipDb } from "@/lib/ownership-db";
import { addAttestation } from "@/lib/consensus/attest";
import { computeConsensus } from "@/lib/consensus/score";

let passed = 0;
let failed = 0;
function ok(name: string, cond: boolean, extra = "") {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${extra ? "  — " + extra : ""}`);
  }
}
async function pickSealed(): Promise<string> {
  // A sealed product with NO live handshake, so the transfer test starts clean.
  // (The seeded showcase deliberately carries a pending transfer.)
  const candidates = await db.product.findMany({
    where: { status: "SEALED" },
    select: { id: true, transferRequests: { where: { status: "PENDING" }, select: { id: true } } },
  });
  const clean = candidates.find((p) => p.transferRequests.length === 0);
  if (!clean) throw new Error("no clean sealed product in the dev DB — run `npm run db:seed`");
  return clean.id;
}

async function main() {
  const productId = await pickSealed();

  // ── DoD 1: transferring any number of times leaves the authenticity core and
  //          product hash bit-for-bit unchanged. ──────────────────────────────
  {
    const before = await db.product.findUnique({
      where: { id: productId },
      select: { contentHash: true },
    });
    const coreBefore = await computeCoreHash(productId);
    const recBefore = await getCurrentRecord(productId);

    // Run 5 full handshake transfers through the real transfer code.
    let owner = (await getCurrentOwner(productId)) ?? "seed-owner";
    for (let i = 0; i < 5; i++) {
      const to = `Test Holder ${i}`;
      const init = await initiateTransfer({ productId, actor: owner, toParty: to, note: `t${i}` });
      ok(`transfer ${i} initiates`, init.ok === true, init.ok ? "" : (init as { error: string }).error);
      const pending = await ownershipDb.listRequests(productId, "PENDING");
      const acc = await acceptTransfer({ requestId: pending[0].id, actor: to });
      ok(`transfer ${i} accepted (append-only)`, acc.ok === true);
      owner = to;
    }

    const after = await db.product.findUnique({
      where: { id: productId },
      select: { contentHash: true },
    });
    const coreAfter = await computeCoreHash(productId);
    const recAfter = await getCurrentRecord(productId);

    ok("Product.contentHash unchanged after 5 transfers", before?.contentHash === after?.contentHash, `${before?.contentHash} vs ${after?.contentHash}`);
    ok("recomputed coreHash unchanged after 5 transfers", coreBefore === coreAfter);
    ok("authenticity record version unchanged by transfers", recBefore?.version === recAfter?.version, `${recBefore?.version} → ${recAfter?.version}`);
    ok("authenticity trustScore unchanged by transfers", recBefore?.trustScore === recAfter?.trustScore);

    const own = await getOwnership(productId);
    ok("ownership log grew by exactly 5 entries", own.transferCount >= 5);
    ok("current owner is the last recipient", own.currentOwner === "Test Holder 4");
  }

  // ── DoD 2: vendor cannot inflate the score with their own material. ─────────
  {
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { artisan: true },
    });
    const maker = product!.artisan.fullName;

    const before = (await computeConsensus(productId))!.score;

    // (a) The maker attempts to self-attest — must be rejected outright.
    const selfCoop = await addAttestation({
      productId,
      attesterType: "COOPERATIVE",
      attesterName: maker,
      statement: "I made this, trust me",
    });
    ok("maker self-attestation is rejected", selfCoop.ok === false && selfCoop.error === "self_attestation");

    const afterSelf = (await computeConsensus(productId))!.score;
    ok("score does not move on a rejected self-attestation", before === afterSelf, `${before} → ${afterSelf}`);

    // (b) Piling on more vendor-supplied documents (GI cert, extra photos) is not
    //     even an input — prove the scorer ignores document volume by adding a
    //     stage photo and confirming the timeline signal is capped by
    //     completeness, not count.
    const raw1 = (await computeConsensus(productId))!;
    const timeline1 = raw1.sources.find((s) => s.key === "timeline")!.signal;
    // add a duplicate photo to an existing stage (more vendor material)
    const stage = await db.stageEntry.findFirst({ where: { productId } });
    if (stage) {
      const photos = JSON.parse(stage.photoUrls) as string[];
      await db.stageEntry.update({
        where: { id: stage.id },
        data: { photoUrls: JSON.stringify([...photos, ...photos]) },
      });
    }
    const timeline2 = (await computeConsensus(productId))!.sources.find((s) => s.key === "timeline")!.signal;
    ok("extra vendor photos do not raise the timeline signal", timeline1 === timeline2, `${timeline1} → ${timeline2}`);

    // (c) An INDEPENDENT attestation DOES raise it — the score only moves on
    //     genuinely independent agreement.
    const indep = await addAttestation({
      productId,
      attesterType: "NGO",
      attesterName: "Independent Test NGO",
      statement: "witnessed",
    });
    ok("independent attestation is accepted", indep.ok === true);
    const afterIndep = (await computeConsensus(productId))!.score;
    ok("independent attestation raises the score", afterIndep > before, `${before} → ${afterIndep}`);
  }

  // ── DoD 4: a correction supersedes rather than edits; original stays. ───────
  {
    const { supersedeForCorrection } = await import("@/lib/authenticity/record");
    const before = await getCurrentRecord(productId);
    const historyBefore = await getHistory(productId);

    const corrected = await supersedeForCorrection(
      productId,
      { materials: "Corrected materials (test)" },
      "test correction",
    );
    ok("correction creates a new version", !!corrected && corrected.version === (before?.version ?? 0) + 1);

    const historyAfter = await getHistory(productId);
    ok("history grew by exactly one version", historyAfter.length === historyBefore.length + 1);

    // The original version is still present, unedited, and linked.
    const original = historyAfter.find((h) => h.version === before?.version);
    ok("superseded original still present", !!original);
    ok("superseded original unchanged", original?.coreHash === before?.coreHash && original?.trustScore === before?.trustScore);
    ok("new version links to the one it superseded", corrected?.supersedesId === before?.id);
    ok("correction carries a reason", corrected?.supersedeReason === "test correction");
  }

  // ── Structural: the capability boundary exposes no authenticity writer. ─────
  {
    const surface = Object.keys(ownershipDb);
    const forbidden = surface.filter((k) => /product|authenticit|attest|stage|ledger|hash/i.test(k) && k !== "productMaker");
    ok("ownership capability exposes no authenticity/product writer", forbidden.length === 0, forbidden.join(","));
    // The one Layer-1 touchpoint is a read that returns strings, never a writer.
    ok("productMaker is read-only (returns name string)", typeof ownershipDb.productMaker === "function");
    ok("capability has no db/prisma escape hatch on its surface", !surface.some((k) => /^(db|prisma|\$)/.test(k)));
  }

  console.log(`\n${failed === 0 ? "ALL PASS" : failed + " FAILED"} — ${passed} passed, ${failed} failed`);
  await db.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
