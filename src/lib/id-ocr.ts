import { validatePehchanFormat, normalizePehchan } from "./pehchan-format";

/**
 * ID-document OCR.
 *
 * The brief referred to an "existing ML model" in the repo root; that folder is
 * a Go RSA-signing CLI and cannot read images, so this is a real OCR built here
 * with tesseract.js (a mature, offline-capable OCR engine — no external API, no
 * keys). It extracts text from the uploaded Pehchan-card image and parses the
 * fields we need, with a per-field confidence and an explicit failure path.
 *
 * IMPORTANT: reading text off a card does NOT prove the card is genuine. This
 * only produces structured data + a confidence for review. Rejection here means
 * "we couldn't read a valid document image", never "the ID is fake".
 *
 * tesseract.js downloads its trained data (~10MB) on first use and caches it. In
 * an environment without network access that first call fails; we surface that
 * as a clean `ocr_unavailable` rejection rather than crashing.
 */

export type OcrFields = {
  idNumber: string | null;
  name: string | null;
  craft: string | null;
  region: string | null;
};

export type OcrSuccess = {
  ok: true;
  fields: OcrFields;
  confidence: Record<keyof OcrFields, number>; // 0..1 per field
  overall: number; // 0..1
  rawText: string;
  /** True when the extracted id passes the Pehchan format+checksum. */
  idChecksumOk: boolean;
};

export type OcrFailure = {
  ok: false;
  /** Machine reason → maps to a user-facing rejection message. */
  reason: "ocr_unavailable" | "unreadable" | "no_fields" | "low_confidence";
  detail: string;
  rawText?: string;
  overall?: number;
};

export type OcrResult = OcrSuccess | OcrFailure;

// Below this mean word confidence the image is treated as unreadable (blurry,
// glare, wrong document). Tunable.
const MIN_OVERALL = 0.3;

/** Find the value on the same line as a label, or on the next non-empty line. */
function fieldByLabel(lines: string[], labels: string[]): string | null {
  const labelRe = new RegExp(`^\\s*(?:${labels.join("|")})\\s*[:\\-]?\\s*(.*)$`, "i");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(labelRe);
    if (m) {
      const inline = m[1].trim();
      if (inline) return inline;
      // Value may be on the following line.
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim()) return lines[j].trim();
      }
    }
  }
  return null;
}

/** Best 12-digit Pehchan candidate: prefer one that passes the checksum. */
function findIdNumber(text: string): { value: string | null; checksumOk: boolean } {
  const candidates = text.match(/\d[\d\s-]{9,}\d/g) ?? [];
  let firstDigits: string | null = null;
  for (const c of candidates) {
    const digits = c.replace(/\D/g, "");
    if (digits.length !== 12) continue;
    if (firstDigits === null) firstDigits = digits;
    if (validatePehchanFormat(digits).formatOk) return { value: normalizePehchan(digits), checksumOk: true };
  }
  return { value: firstDigits, checksumOk: false };
}

/**
 * Actually run tesseract. Kept separate so the caller can race it against a
 * timeout — createWorker downloads trained data on first use and will HANG
 * indefinitely on a network-less host, which must never block the upload.
 */
async function recognize(imageBytes: Buffer): Promise<{ text: string; meanWordConf: number }> {
  // Dynamic import keeps tesseract out of the module graph until needed and off
  // any edge runtime.
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", undefined, {
    langPath: process.env.TESSERACT_LANG_PATH,
    cachePath: process.env.TESSERACT_CACHE_PATH,
  });
  try {
    const { data } = await worker.recognize(imageBytes);
    const words = (data as { words?: Array<{ confidence: number }> }).words ?? [];
    const meanWordConf = words.length
      ? words.reduce((a, w) => a + (w.confidence ?? 0), 0) / words.length / 100
      : (data.confidence ?? 0) / 100;
    return { text: data.text ?? "", meanWordConf };
  } finally {
    // Fire-and-forget terminate so a hung worker can't keep the request alive.
    worker.terminate().catch(() => {});
  }
}

export async function runIdOcr(imageBytes: Buffer): Promise<OcrResult> {
  const timeoutMs = Number(process.env.OCR_TIMEOUT_MS ?? 15000);
  let text = "";
  let meanWordConf = 0;
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`OCR timed out after ${timeoutMs}ms`)), timeoutMs),
    );
    const out = await Promise.race([recognize(imageBytes), timeout]);
    text = out.text;
    meanWordConf = out.meanWordConf;
  } catch (e) {
    // Engine unavailable/timed out — an INFRASTRUCTURE issue, not a bad document.
    // The caller still hashes + signs + anchors; only the auto-read fields are
    // missing (left for manual review).
    return {
      ok: false,
      reason: "ocr_unavailable",
      detail:
        "The OCR engine could not run (its trained data may be unavailable offline, " +
        "or it timed out). " + (e instanceof Error ? e.message : String(e)),
    };
  }

  const cleaned = text.replace(/\r/g, "").trim();
  if (!cleaned) {
    return { ok: false, reason: "unreadable", detail: "No text could be read from the image.", overall: meanWordConf };
  }

  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
  const { value: idNumber, checksumOk } = findIdNumber(cleaned);
  const name = fieldByLabel(lines, ["name", "holder", "artisan"]);
  const craft = fieldByLabel(lines, ["craft", "trade", "skill", "occupation"]);
  const region = fieldByLabel(lines, ["region", "district", "state", "cluster", "village"]);

  // A valid document image should yield at least an id number or a name.
  if (!idNumber && !name) {
    return {
      ok: false,
      reason: "no_fields",
      detail: "Could not find an ID number or a name — this may not be a Pehchan card image.",
      rawText: cleaned,
      overall: meanWordConf,
    };
  }

  if (meanWordConf < MIN_OVERALL) {
    return {
      ok: false,
      reason: "low_confidence",
      detail: "The image was too unclear to read reliably. Please re-upload a sharper photo.",
      rawText: cleaned,
      overall: meanWordConf,
    };
  }

  // Per-field confidence: the mean word confidence, boosted for the id when its
  // checksum validates (strong signal the digits were read correctly).
  const base = Math.max(0, Math.min(1, meanWordConf));
  const confidence: Record<keyof OcrFields, number> = {
    idNumber: idNumber ? Math.min(1, checksumOk ? Math.max(base, 0.9) : base * 0.8) : 0,
    name: name ? base : 0,
    craft: craft ? base * 0.9 : 0,
    region: region ? base * 0.9 : 0,
  };

  return {
    ok: true,
    fields: { idNumber, name, craft, region },
    confidence,
    overall: base,
    rawText: cleaned,
    idChecksumOk: checksumOk,
  };
}
