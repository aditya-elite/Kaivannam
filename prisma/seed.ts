import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";

// Seed uses its own Prisma client + local copies of the hash helpers so it has
// no dependency on Next's module graph (path aliases, "server-only", etc.).
const db = new PrismaClient();

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
function canonical(v: unknown): string {
  const sort = (x: unknown): unknown =>
    Array.isArray(x)
      ? x.map(sort)
      : x && typeof x === "object"
        ? Object.keys(x as Record<string, unknown>)
            .sort()
            .reduce<Record<string, unknown>>((a, k) => ((a[k] = sort((x as any)[k])), a), {})
        : x;
  return JSON.stringify(sort(v));
}

async function main() {
  console.log("Resetting demo data…");
  // Order matters for FK constraints.
  await db.ledgerEntry.deleteMany();
  await db.stageEntry.deleteMany();
  await db.product.deleteMany();
  await db.giMatch.deleteMany();
  await db.verificationRequest.deleteMany();
  await db.giEntry.deleteMany();
  await db.giDataset.deleteMany();
  await db.auditLog.deleteMany();
  await db.session.deleteMany();
  await db.artisan.deleteMany();
  await db.user.deleteMany();

  const pw = await bcrypt.hash("password", 10);
  const adminPw = await bcrypt.hash("admin123", 10);

  // ── Users (needed only to REGISTER products) ─────────────────
  const lakshmiUser = await db.user.create({
    data: { handle: "9840012345", passwordHash: pw, displayName: "Lakshmi Devi", role: "ARTISAN" },
  });
  await db.user.create({
    data: { handle: "admin", passwordHash: adminPw, displayName: "Registry Admin", role: "ADMIN" },
  });

  // ── Artisans across the verification tiers ───────────────────
  const lakshmi = await db.artisan.create({
    data: {
      userId: lakshmiUser.id,
      fullName: "Lakshmi Devi",
      craft: "Kanchipuram silk weaving",
      region: "Kanchipuram",
      state: "Tamil Nadu",
      bio: "Third-generation silk weaver working on a traditional pit loom. Known for temple-border sarees in natural dyes.",
      photoUrl: "/samples/artisan-lakshmi.svg",
      tier: "GI_AUTHORISED",
      hiddenSignatureHash: sha256("peacock-motif-inner-pallu-3threads"),
      hiddenSignatureHint: "Peacock motif woven into the inner pallu",
    },
  });
  const rama = await db.artisan.create({
    data: {
      fullName: "Rama Rao",
      craft: "Dokra metal art",
      region: "Bastar",
      state: "Chhattisgarh",
      bio: "Lost-wax metal caster making tribal figurines and lamps using the centuries-old Dokra technique.",
      photoUrl: "/samples/artisan-rama.svg",
      tier: "ID_VERIFIED",
      hiddenSignatureHash: sha256("filework-signature-base-RR"),
      hiddenSignatureHint: "Initials filed under the base",
    },
  });
  const meena = await db.artisan.create({
    data: {
      fullName: "Meena Kumari",
      craft: "Terracotta pottery",
      region: "Molela",
      state: "Rajasthan",
      bio: "Makes votive terracotta plaques of local deities, fired in a traditional wood kiln.",
      photoUrl: "/samples/artisan-meena.svg",
      tier: "COOP_VOUCHED",
    },
  });
  await db.artisan.create({
    data: {
      fullName: "Suresh Prajapati",
      craft: "Blue pottery",
      region: "Jaipur",
      state: "Rajasthan",
      bio: "Blue pottery artisan, newly registered.",
      tier: "SELF_DECLARED",
    },
  });
  const anitha = await db.artisan.create({
    data: {
      fullName: "Anitha Reddy",
      craft: "Kalamkari",
      region: "Srikalahasti",
      state: "Andhra Pradesh",
      bio: "Hand-painted Kalamkari using natural dyes and a bamboo pen.",
      tier: "DOCS_PENDING",
    },
  });

  // ── GI reference dataset (as if ingested by an admin this month) ──
  const dataset = await db.giDataset.create({
    data: { version: 1, sourceNote: "GI Registry Part A + Part B — manual monthly ingest (demo)" },
  });
  const giRows = [
    { giNumber: "GI-0146", giName: "Kanchipuram Silk", craftCategory: "Handloom", region: "Kanchipuram, Tamil Nadu", authorisedUser: "Lakshmi Devi" },
    { giNumber: "GI-0021", giName: "Bastar Dhokra", craftCategory: "Metalware", region: "Bastar, Chhattisgarh", authorisedUser: "Rama Rao" },
    { giNumber: "GI-0089", giName: "Molela Clay Work", craftCategory: "Terracotta", region: "Molela, Rajasthan", authorisedUser: "Molela Terracotta Cooperative" },
    { giNumber: "GI-0201", giName: "Blue Pottery of Jaipur", craftCategory: "Pottery", region: "Jaipur, Rajasthan", authorisedUser: null },
    { giNumber: "GI-0056", giName: "Srikalahasti Kalamkari", craftCategory: "Textile painting", region: "Srikalahasti, Andhra Pradesh", authorisedUser: "Anitha Reddy" },
  ];
  for (const row of giRows) {
    await db.giEntry.create({ data: { ...row, datasetId: dataset.id } });
  }
  // Record Lakshmi's GI match (name found in Part B).
  const lakshmiGi = await db.giEntry.findFirst({ where: { giName: "Kanchipuram Silk" } });
  if (lakshmiGi) {
    await db.giMatch.create({
      data: { artisanId: lakshmi.id, giEntryId: lakshmiGi.id, datasetVersion: dataset.version },
    });
  }

  // ── A pending verification request (for the admin queue demo) ──
  await db.verificationRequest.create({
    data: {
      artisanId: anitha.id,
      docImageUrl: "/samples/terracotta.svg",
      ocrIdNumber: "AP-ART-2019-44821",
      ocrName: "Anitha Reddy",
      ocrCraft: "Kalamkari",
      ocrRegion: "Srikalahasti",
      ocrConfidence: JSON.stringify({ idNumber: 0.62, name: 0.94, craft: 0.88, region: 0.71 }),
      ocrRawText: "GOVT OF ANDHRA PRADESH\nARTISAN ID\nName: Anitha Reddy\nCraft: Kalamkari\n...",
      idNumber: "AP-ART-2019-44821",
      claimedGi: "Srikalahasti Kalamkari",
      status: "PENDING",
    },
  });

  // ── One fully sealed product with a 4-stage timeline + ledger entry ──
  const productId = "KS-4F7Q-9XB2-M3KP";
  const now = new Date();
  const dayMs = 864e5;
  const stagesInput = [
    { stage: "RAW_MATERIALS", url: "/samples/silk-raw.svg", note: "Mulberry silk yarn dyed with natural indigo and madder.", daysAgo: 21 },
    { stage: "CRAFTING", url: "/samples/silk-crafting.svg", note: "Weaving the body on the pit loom.", daysAgo: 14 },
    { stage: "FINISHING", url: "/samples/silk-finishing.svg", note: "Adding the zari temple border.", daysAgo: 4 },
    { stage: "COMPLETED", url: "/samples/silk-completed.svg", note: "Finished six-yard saree, washed and pressed.", daysAgo: 1 },
  ] as const;

  const product = await db.product.create({
    data: {
      id: productId,
      artisanId: lakshmi.id,
      title: "Kanchipuram temple-border silk saree",
      materials: "Pure mulberry silk, natural indigo & madder dyes, pure zari",
      storyText:
        "This saree took three weeks on my pit loom. The temple border is a pattern my grandmother taught me. The peacock in the pallu is my family's mark.",
      category: "Kanchipuram silk weaving",
      status: "SEALED",
      sealedAt: now,
    },
  });

  const stageRecords = [];
  for (const s of stagesInput) {
    const capturedAt = new Date(now.getTime() - s.daysAgo * dayMs);
    await db.stageEntry.create({
      data: {
        productId: product.id,
        stage: s.stage,
        version: 1,
        photoUrls: JSON.stringify([s.url]),
        note: s.note,
        capturedAt,
      },
    });
    stageRecords.push({
      stage: s.stage,
      version: 1,
      capturedAt: capturedAt.toISOString(),
      photoContentHashes: [sha256(s.url)],
      note: s.note,
    });
  }

  // Build the canonical record + content hash (same shape as product-record.ts).
  const record = {
    productId: product.id,
    title: product.title,
    materials: product.materials,
    category: product.category,
    storyText: product.storyText,
    artisan: { id: lakshmi.id, fullName: lakshmi.fullName, craft: lakshmi.craft, region: lakshmi.region },
    hiddenSignatureHash: lakshmi.hiddenSignatureHash,
    stages: stageRecords,
  };
  const contentHash = sha256(canonical(record));

  // Genesis ledger append (seq 1).
  const prevHash = "0".repeat(64);
  const seq = 1;
  const entryHash = sha256(`${seq}|${product.id}|${contentHash}|${prevHash}`);
  await db.ledgerEntry.create({
    data: { seq, productId: product.id, contentHash, prevHash, entryHash, backend: "local", isTestnet: true },
  });
  await db.product.update({
    where: { id: product.id },
    data: { contentHash, qrPngUrl: `/api/products/${product.id}/qr` },
  });

  console.log("Seeded:");
  console.log("  • 5 artisans across all verification tiers");
  console.log("  • GI dataset v1 with 5 entries");
  console.log("  • 1 pending verification (admin queue)");
  console.log(`  • 1 sealed product: ${productId} (ledger seq 1)`);
  console.log("Login demo → artisan: 9840012345 / password   admin: admin / admin123");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
