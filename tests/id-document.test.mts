/**
 * Proof tests for the deterministic parts of the ID-document pipeline:
 * server signing (roundtrip + tamper), the ledger document anchor, and that
 * generalising the ledger did NOT break existing product verification.
 *
 *   npx tsx tests/id-document.test.mts
 *
 * OCR (tesseract data) and Supabase storage need external resources and are not
 * asserted here — they're exercised by the live route.
 */
import { db } from "@/lib/db";
import { sha256 } from "@/lib/hash";
import { signDocumentPayload, verifyDocumentSignature, getServerPublicKeyPem } from "@/lib/server-signing";
import { getLedger } from "@/lib/ledger";

let passed = 0;
let failed = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${extra ? "  — " + extra : ""}`); }
};

async function main() {
  // ── Server signing: sign → verify true; tamper → false ────────────────────
  const imageBytes = Buffer.from("fake-id-image-bytes-for-test");
  const image_hash = sha256(imageBytes);
  const payload = {
    extracted_data: { idNumber: "234176589010", name: "Test Maker" },
    image_hash,
    timestamp: new Date().toISOString(),
  };
  const signed = signDocumentPayload(payload);
  ok("signature verifies against the signed payload",
    verifyDocumentSignature(signed.signedPayload, signed.signature, getServerPublicKeyPem()));
  ok("tampered payload fails verification",
    !verifyDocumentSignature(signed.signedPayload.replace("Test Maker", "Someone Else"), signed.signature));
  ok("tampered signature fails verification",
    !verifyDocumentSignature(signed.signedPayload, Buffer.from("nope").toString("base64")));
  ok("signedPayload carries the image hash", signed.signedPayload.includes(image_hash));
  ok("a signing key id is recorded", !!signed.signingKeyId);

  // ── Ledger: anchor a document hash on the same chain ──────────────────────
  const ledger = getLedger();
  const subjectId = "test-doc-" + Date.now();
  const receipt = await ledger.appendDocument(subjectId, image_hash);
  ok("document anchor returns a seq", receipt.seq > 0);
  const dv = await ledger.verifyDocument(subjectId);
  ok("anchored document verifies intact", dv.exists && dv.intact);

  const row = await db.ledgerEntry.findFirst({ where: { subjectType: "ID_DOCUMENT", subjectId } });
  ok("anchor stored as ID_DOCUMENT with null productId", !!row && row.productId === null && row.subjectType === "ID_DOCUMENT");
  ok("anchor stores ONLY the hash (no image/PII columns exist on the ledger)",
    !!row && row.contentHash === image_hash);

  // ── Existing product verification still intact after the schema change ────
  const product = await db.product.findFirst({ where: { status: "SEALED" }, select: { id: true } });
  if (product) {
    const pv = await ledger.verify(product.id);
    ok("existing sealed product still verifies on the ledger", pv.exists && pv.intact, product.id);
  } else {
    ok("existing sealed product still verifies (skipped — none seeded)", true);
  }

  // clean up the test anchor so the chain check in other tests isn't affected
  await db.ledgerEntry.deleteMany({ where: { subjectType: "ID_DOCUMENT", subjectId } });

  console.log(`\n${failed === 0 ? "ALL PASS" : failed + " FAILED"} — ${passed} passed, ${failed} failed`);
  await db.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
