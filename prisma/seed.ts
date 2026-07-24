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

  // ── Sealed products with 4-stage timelines + an append-only ledger ──
  //
  // The collection page needs enough stock to read as a showroom rather than a
  // near-empty shelf, so this seeds a catalogue rather than a single item.
  // Every one of them goes through the *real* seal path — canonical record,
  // content hash, ledger append, ECDSA signature — so each is genuinely
  // verifiable and the QR endpoint serves a real signed payload. Nothing here
  // is a display-only stub.
  const now = new Date();
  const dayMs = 864e5;
  let ledgerSeq = 0;
  let prevHash = "0".repeat(64);

  type Maker = {
    id: string;
    fullName: string;
    craft: string;
    region: string;
    hiddenSignatureHash: string | null;
    privateKeyPem: string | null;
  };

  async function sealProduct(opts: {
    id: string;
    maker: Maker;
    title: string;
    materials: string;
    storyText: string;
    category: string;
    priceInr: number | null;
    giNumber?: string | null;
    giEntryId?: string | null;
    /** Photo per stage, oldest first. */
    photos: readonly [string, string, string, string];
    notes: readonly [string, string, string, string];
    /** Days before "now" the piece was completed — drives "recently verified". */
    completedDaysAgo: number;
  }) {
    const base = opts.completedDaysAgo;
    const sealedAt = new Date(now.getTime() - base * dayMs);
    const product = await db.product.create({
      data: {
        id: opts.id,
        artisanId: opts.maker.id,
        title: opts.title,
        materials: opts.materials,
        storyText: opts.storyText,
        category: opts.category,
        priceInr: opts.priceInr,
        status: "SEALED",
        giNumber: opts.giNumber ?? null,
        giCertUrl: opts.giNumber ? opts.photos[3] : null,
        giVerified: !!opts.giNumber,
        giEntryId: opts.giEntryId ?? null,
        sealedAt,
        createdAt: new Date(now.getTime() - (base + 24) * dayMs),
      },
    });

    const STAGES = ["RAW_MATERIALS", "CRAFTING", "FINISHING", "COMPLETED"] as const;
    // Stages run 20, 13, 4 and 1 days before completion.
    const offsets = [20, 13, 4, 1];
    const stageRecords = [];
    for (let i = 0; i < STAGES.length; i++) {
      const capturedAt = new Date(sealedAt.getTime() - offsets[i] * dayMs);
      await db.stageEntry.create({
        data: {
          productId: product.id,
          stage: STAGES[i],
          version: 1,
          photoUrls: JSON.stringify([opts.photos[i]]),
          note: opts.notes[i],
          capturedAt,
        },
      });
      stageRecords.push({
        stage: STAGES[i],
        version: 1,
        capturedAt: capturedAt.toISOString(),
        photoContentHashes: [sha256(opts.photos[i])],
        note: opts.notes[i],
      });
    }

    // Canonical record + content hash (same shape as lib/product-record.ts).
    const record = {
      productId: product.id,
      title: product.title,
      materials: product.materials,
      category: product.category,
      storyText: product.storyText,
      artisan: {
        id: opts.maker.id,
        fullName: opts.maker.fullName,
        craft: opts.maker.craft,
        region: opts.maker.region,
      },
      hiddenSignatureHash: opts.maker.hiddenSignatureHash,
      stages: stageRecords,
    };
    const contentHash = sha256(canonical(record));

    ledgerSeq += 1;
    const entryHash = sha256(`${ledgerSeq}|${product.id}|${contentHash}|${prevHash}`);
    await db.ledgerEntry.create({
      data: {
        seq: ledgerSeq,
        productId: product.id,
        contentHash,
        prevHash,
        entryHash,
        backend: "local",
        isTestnet: true,
      },
    });
    prevHash = entryHash;

    // KEY 1 — sign the dynamic QR payload with the maker's private key. Makers
    // without a keypair (lower tiers) still get a sealed record and a ledger
    // entry; they simply have no signed QR, which the verify path handles.
    const signature = opts.maker.privateKeyPem
      ? signPayload(product.id, sealedAt.toISOString(), opts.maker.privateKeyPem)
      : null;
    await db.product.update({
      where: { id: product.id },
      data: {
        contentHash,
        signature,
        qrIssuedAt: signature ? sealedAt : null,
        qrPngUrl: signature ? `/api/products/${product.id}/qr` : null,
      },
    });
    return product;
  }

  const mLakshmi: Maker = { ...lakshmi, privateKeyPem: lakshmiKeys.privateKeyPem };
  const mRama: Maker = { ...rama, privateKeyPem: ramaKeys.privateKeyPem };
  const mMeena: Maker = { ...meena, privateKeyPem: null };
  const mAnitha: Maker = { ...anitha, privateKeyPem: null };

  const SILK = ["/samples/silk-raw.svg", "/samples/silk-crafting.svg", "/samples/silk-finishing.svg", "/samples/silk-completed.svg"] as const;
  const DOKRA = ["/samples/dokra.svg", "/samples/dokra.svg", "/samples/dokra.svg", "/samples/dokra.svg"] as const;
  const TERRA = ["/samples/terracotta.svg", "/samples/terracotta.svg", "/samples/terracotta.svg", "/samples/terracotta.svg"] as const;
  const KALAM = ["/samples/hero.svg", "/samples/hero.svg", "/samples/hero.svg", "/samples/hero.svg"] as const;

  const silkNotes = [
    "Mulberry silk yarn dyed with natural indigo and madder.",
    "Weaving the body on the pit loom.",
    "Adding the zari temple border.",
    "Finished piece, washed and pressed.",
  ] as const;
  const dokraNotes = [
    "Beeswax thread wound over the clay core.",
    "Clay mould built up and dried in the sun.",
    "Molten brass poured; the wax runs out.",
    "Mould broken away, surface filed and polished.",
  ] as const;
  const terraNotes = [
    "River clay from the Banas, wedged by foot.",
    "Plaque shaped and the figure built up by hand.",
    "Slip applied and left to leather-hard.",
    "Fired in the wood kiln for eighteen hours.",
  ] as const;
  const kalamNotes = [
    "Cotton treated with myrobalan and buffalo milk.",
    "Outline drawn with the bamboo kalam pen.",
    "Natural dyes filled in, washed between colours.",
    "Final wash in running water and sun-dried.",
  ] as const;

  // The original demo product keeps its id — it is referenced in the README,
  // the QR fixtures and any bookmark from an earlier run.
  const productId = "KS-4F7Q-9XB2-M3KP";
  await sealProduct({
    id: productId, maker: mLakshmi,
    title: "Kanchipuram temple-border silk saree",
    materials: "Pure mulberry silk, natural indigo & madder dyes, pure zari",
    storyText:
      "This saree took three weeks on my pit loom. The temple border is a pattern my grandmother taught me. The peacock in the pallu is my family's mark.",
    category: "Kanchipuram silk weaving", priceInr: 28500,
    giNumber: "GI-0146", giEntryId: lakshmiGi?.id ?? null,
    photos: SILK, notes: silkNotes, completedDaysAgo: 1,
  });

  const catalogue = [
    { id: "KS-7H2M-4KP9-L6XR", maker: mLakshmi, title: "Korvai silk saree in madder red", materials: "Mulberry silk, madder root dye, pure zari", storyText: "The body and border are woven separately and joined by hand — the korvai join. You can feel the ridge where the two colours meet.", category: "Kanchipuram silk weaving", priceInr: 34000, giNumber: "GI-0146", photos: SILK, notes: silkNotes, completedDaysAgo: 6 },
    { id: "KS-9B3T-2QW7-Z4NM", maker: mLakshmi, title: "Indigo silk dupatta with rudraksha border", materials: "Mulberry silk, natural indigo, silver zari", storyText: "A lighter piece for daily wear. The rudraksha border is the smallest motif I weave — one hundred and forty beads across.", category: "Kanchipuram silk weaving", priceInr: 9800, photos: SILK, notes: silkNotes, completedDaysAgo: 12 },
    { id: "KS-5R8K-3JD2-V7YC", maker: mRama, title: "Dokra tribal horse figurine", materials: "Brass, beeswax, river clay, rice husk", storyText: "The horse is our village guardian. I cast it the way my father did — one mould, one pour, and the mould is broken to free it. No two are the same.", category: "Dokra metal art", priceInr: 4200, photos: DOKRA, notes: dokraNotes, completedDaysAgo: 3 },
    { id: "KS-2N6P-8XF4-H9QL", maker: mRama, title: "Dokra oil lamp with peacock finial", materials: "Brass, beeswax, river clay", storyText: "A working lamp, not an ornament. Fill the well with oil and it will burn through the night. The peacock sits where the wick rests.", category: "Dokra metal art", priceInr: 6800, photos: DOKRA, notes: dokraNotes, completedDaysAgo: 9 },
    { id: "KS-4W7L-6MB3-T2KJ", maker: mRama, title: "Dokra measuring bowl set of three", materials: "Brass, beeswax, river clay", storyText: "Grain measures. My grandmother used a set like these every day of her life. I make them in the old sizes, not in litres.", category: "Dokra metal art", priceInr: 5400, photos: DOKRA, notes: dokraNotes, completedDaysAgo: 18 },
    { id: "KS-8C4V-9ZR5-N3HD", maker: mMeena, title: "Molela votive plaque — Dev Narayan", materials: "Banas river clay, natural slip, wood-fired", storyText: "The plaque is made flat, not thrown. I press the clay onto the board and raise the figure with my thumbs. It is fired once, in a wood kiln.", category: "Terracotta pottery", priceInr: 2400, photos: TERRA, notes: terraNotes, completedDaysAgo: 2 },
    { id: "KS-6Y2Q-5TN8-B7WF", maker: mMeena, title: "Terracotta water pot with wheel-cut neck", materials: "Banas river clay, wood-fired", storyText: "Clay keeps water cool without electricity. This is the shape we have always made — narrow at the neck so nothing spills when it is carried on the head.", category: "Terracotta pottery", priceInr: 1650, photos: TERRA, notes: terraNotes, completedDaysAgo: 15 },
    { id: "KS-3K9D-7VC2-M5RP", maker: mMeena, title: "Pair of terracotta lamp stands", materials: "Banas river clay, natural slip, wood-fired", storyText: "For Diwali. My mother made these every year and sold them at the roadside. I still make them to her measurements.", category: "Terracotta pottery", priceInr: 980, photos: TERRA, notes: terraNotes, completedDaysAgo: 25 },
    { id: "KS-1L5X-4HG6-Q8ZT", maker: mAnitha, title: "Srikalahasti Kalamkari wall panel — Tree of Life", materials: "Handloom cotton, myrobalan, natural vegetable dyes", storyText: "Every line is drawn with a bamboo pen, not printed. The panel took forty days. The tree holds seventeen birds and each one is a different species.", category: "Kalamkari", priceInr: 12500, photos: KALAM, notes: kalamNotes, completedDaysAgo: 4 },
    { id: "KS-9F3B-2SW7-K4LV", maker: mAnitha, title: "Kalamkari cotton yardage in pomegranate", materials: "Handloom cotton, pomegranate rind, iron acetate", storyText: "The red comes from madder and the black from iron and jaggery left to ferment for three weeks. No chemical colour touches this cloth.", category: "Kalamkari", priceInr: 3900, photos: KALAM, notes: kalamNotes, completedDaysAgo: 11 },
    { id: "KS-7T6N-8PJ3-D2XQ", maker: mAnitha, title: "Kalamkari temple hanging, unlined", materials: "Handloom cotton, natural vegetable dyes", storyText: "This hung in our village temple for the festival. The story runs left to right, the way it is meant to be read aloud to children.", category: "Kalamkari", priceInr: null, photos: KALAM, notes: kalamNotes, completedDaysAgo: 30 },
  ] as const;

  for (const item of catalogue) {
    await sealProduct({
      id: item.id, maker: item.maker, title: item.title, materials: item.materials,
      storyText: item.storyText, category: item.category, priceInr: item.priceInr,
      giNumber: "giNumber" in item ? item.giNumber : null,
      giEntryId: null, photos: item.photos, notes: item.notes,
      completedDaysAgo: item.completedDaysAgo,
    });
  }

  console.log("Seeded:");
  console.log("  • 5 artisans across all verification tiers");
  console.log("  • GI dataset v1 with 5 entries · Pehchan register v1 with 2 entries");
  console.log("  • 1 pending verification (admin queue)");
  console.log(`  • ${ledgerSeq} sealed + signed products (ledger seq 1–${ledgerSeq})`);
  console.log(`  • Original demo product preserved: ${productId}`);
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
