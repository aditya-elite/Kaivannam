import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, generateKeyPairSync, createSign } from "crypto";

// Seed uses its own Prisma client + local copies of the helpers so it has no
// dependency on Next's module graph (path aliases, "server-only", etc.).
const db = new PrismaClient();

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// ── Local copies of the crypto/Pehchan helpers (kept dependency-free) ──
function newKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKeyPem: publicKey as string, privateKeyPem: privateKey as string };
}
function signPayload(productId: string, tsIso: string, privateKeyPem: string) {
  const s = createSign("SHA256");
  s.update(`${productId}|${tsIso}`);
  s.end();
  return s.sign(privateKeyPem).toString("base64");
}
// Verhoeff check digit → build valid 12-digit demo Pehchan numbers.
const VD = [
  [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],
  [4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],
  [8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0],
];
const VP = [
  [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],
  [9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
];
const VINV = [0,4,3,2,1,5,6,7,8,9];
// Check digit for `base11`: the check digit sits at units (permutation index 0),
// so payload digits are offset by one — P[(i+1)%8]. Consistent with the validator.
function pehchan(base11: string): string {
  let c = 0;
  const rev = base11.split("").reverse();
  for (let i = 0; i < rev.length; i++) c = VD[c][VP[(i + 1) % 8][Number(rev[i])]];
  return base11 + VINV[c];
}
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
  await db.pehchanEntry.deleteMany();
  await db.pehchanDataset.deleteMany();
  await db.auditLog.deleteMany();
  await db.session.deleteMany();
  await db.artisan.deleteMany();
  await db.user.deleteMany();

  // Valid demo Pehchan numbers (first digit ≠ 0/1, valid Verhoeff checksum).
  const lakshmiPehchan = pehchan("23417658901");
  const ramaPehchan = pehchan("74821903651");
  const lakshmiKeys = newKeyPair();
  const ramaKeys = newKeyPair();

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
      pehchanNumber: lakshmiPehchan,
      pehchanVerified: true,
      signingPublicKey: lakshmiKeys.publicKeyPem,
      signingPrivateKey: lakshmiKeys.privateKeyPem,
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
      pehchanNumber: ramaPehchan,
      pehchanVerified: true,
      signingPublicKey: ramaKeys.publicKeyPem,
      signingPrivateKey: ramaKeys.privateKeyPem,
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

  // ── Pehchan register (Gate-1 whitelist, as if ingested by an admin) ──
  const pehchanDs = await db.pehchanDataset.create({
    data: { version: 1, sourceNote: "Pehchan artisan register — manual ingest (demo)" },
  });
  await db.pehchanEntry.createMany({
    data: [
      { datasetId: pehchanDs.id, pehchanNumber: lakshmiPehchan, holderName: "Lakshmi Devi", craft: "Kanchipuram silk weaving", region: "Kanchipuram" },
      { datasetId: pehchanDs.id, pehchanNumber: ramaPehchan, holderName: "Rama Rao", craft: "Dokra metal art", region: "Bastar" },
    ],
  });

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
      giNumber: "GI-0146",
      giCertUrl: "/samples/silk-completed.svg",
      giVerified: true,
      giEntryId: lakshmiGi?.id ?? null,
      priceInPaise: 1_245_000, // ₹12,450
      stock: 2,
      listedForSale: true,
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
  // KEY 1 — sign the dynamic QR payload with Lakshmi's private key.
  const signature = signPayload(product.id, now.toISOString(), lakshmiKeys.privateKeyPem);
  await db.product.update({
    where: { id: product.id },
    data: {
      contentHash,
      signature,
      qrIssuedAt: now,
      qrPngUrl: `/api/products/${product.id}/qr`,
    },
  });

  // ── More listed products so the shop has a real grid ──
  // Reusable sealer: creates 4 stages, chains the ledger, signs the QR, and lists.
  const ramaGiEntry = await db.giEntry.findFirst({ where: { giName: "Bastar Dhokra" } });
  async function sealListed(opts: {
    id: string;
    artisan: { id: string; fullName: string; craft: string; region: string; hiddenSignatureHash: string | null };
    keys: { privateKeyPem: string };
    title: string;
    materials: string;
    story: string;
    category: string;
    giNumber: string;
    giEntryId: string | null;
    photo: string;
    priceInPaise: number;
    stock: number;
    daysAgo: number;
  }) {
    const sealedAt = new Date(now.getTime() - opts.daysAgo * dayMs);
    await db.product.create({
      data: {
        id: opts.id,
        artisanId: opts.artisan.id,
        title: opts.title,
        materials: opts.materials,
        storyText: opts.story,
        category: opts.category,
        status: "SEALED",
        giNumber: opts.giNumber,
        giCertUrl: opts.photo,
        giVerified: true,
        giEntryId: opts.giEntryId,
        priceInPaise: opts.priceInPaise,
        stock: opts.stock,
        listedForSale: true,
        sealedAt,
      },
    });
    const recs = [];
    for (const stage of ["RAW_MATERIALS", "CRAFTING", "FINISHING", "COMPLETED"] as const) {
      const capturedAt = new Date(sealedAt.getTime() - dayMs);
      await db.stageEntry.create({
        data: { productId: opts.id, stage, version: 1, photoUrls: JSON.stringify([opts.photo]), note: null, capturedAt },
      });
      recs.push({ stage, version: 1, capturedAt: capturedAt.toISOString(), photoContentHashes: [sha256(opts.photo)], note: null });
    }
    const cHash = sha256(
      canonical({
        productId: opts.id,
        title: opts.title,
        materials: opts.materials,
        category: opts.category,
        storyText: opts.story,
        artisan: { id: opts.artisan.id, fullName: opts.artisan.fullName, craft: opts.artisan.craft, region: opts.artisan.region },
        hiddenSignatureHash: opts.artisan.hiddenSignatureHash,
        stages: recs,
      }),
    );
    const last = await db.ledgerEntry.findFirst({ orderBy: { seq: "desc" } });
    const seqN = (last?.seq ?? 0) + 1;
    const prev = last?.entryHash ?? "0".repeat(64);
    const eHash = sha256(`${seqN}|${opts.id}|${cHash}|${prev}`);
    await db.ledgerEntry.create({
      data: { seq: seqN, productId: opts.id, contentHash: cHash, prevHash: prev, entryHash: eHash, backend: "local", isTestnet: true },
    });
    await db.product.update({
      where: { id: opts.id },
      data: {
        contentHash: cHash,
        signature: signPayload(opts.id, sealedAt.toISOString(), opts.keys.privateKeyPem),
        qrIssuedAt: sealedAt,
        qrPngUrl: `/api/products/${opts.id}/qr`,
      },
    });
  }

  await sealListed({
    id: "KS-7H2M-4KP9-Q1XR",
    artisan: lakshmi,
    keys: lakshmiKeys,
    title: "Kanchipuram silk dupatta, mango motif",
    materials: "Pure mulberry silk, natural dyes, half-fine zari",
    story: "A lighter piece — the mango-bud border is my everyday pattern.",
    category: "Kanchipuram silk weaving",
    giNumber: "GI-0146",
    giEntryId: lakshmiGi?.id ?? null,
    photo: "/samples/silk-finishing.svg",
    priceInPaise: 385_000,
    stock: 5,
    daysAgo: 8,
  });
  await sealListed({
    id: "KS-9J3N-6LT2-B8WK",
    artisan: rama,
    keys: ramaKeys,
    title: "Dokra tribal elephant figurine",
    materials: "Bell metal, lost-wax cast, hand-finished",
    story: "Cast in one pour using the coiled-wax method my father taught me.",
    category: "Dokra metal art",
    giNumber: "GI-0021",
    giEntryId: ramaGiEntry?.id ?? null,
    photo: "/samples/hero.svg",
    priceInPaise: 265_000,
    stock: 4,
    daysAgo: 5,
  });
  await sealListed({
    id: "KS-2C5V-8MD4-R3YP",
    artisan: rama,
    keys: ramaKeys,
    title: "Dokra oil lamp with peacock finial",
    materials: "Bell metal, lost-wax cast",
    story: "A working diya — the peacock sits above the flame.",
    category: "Dokra metal art",
    giNumber: "GI-0021",
    giEntryId: ramaGiEntry?.id ?? null,
    photo: "/samples/hero.svg",
    priceInPaise: 172_500,
    stock: 6,
    daysAgo: 3,
  });

  console.log("Seeded:");
  console.log("  • 5 artisans across all verification tiers");
  console.log("  • GI dataset v1 with 5 entries · Pehchan register v1 with 2 entries");
  console.log("  • 1 pending verification (admin queue)");
  console.log("  • 4 sealed + signed products, all listed in the shop");
  console.log(`  • Demo Pehchan → Lakshmi: ${lakshmiPehchan}  Rama: ${ramaPehchan}`);
  console.log("Login demo → artisan: 9840012345 / password   admin: admin / admin123");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
