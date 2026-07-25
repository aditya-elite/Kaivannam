"use client";

// Draft model held in localStorage so an in-progress item survives app close,
// navigation, and connection loss — and survives the sign-in round-trip.
export type StageKey = "RAW_MATERIALS" | "CRAFTING" | "FINISHING" | "COMPLETED";

export type DraftStage = {
  photos: string[]; // compressed WebP data URLs
  note: string;
  capturedAtClient: string; // informational; server stamps the authoritative time
};

export type Draft = {
  id: string;
  title: string;
  category: string;
  materials: string;
  storyText: string;
  hiddenSignature: string;
  hiddenSignatureHint: string;
  // Gate 2 — the product's GI certificate (image + OCR-read/confirmed number).
  giNumber: string;
  giCertImage: string; // compressed image data URL, "" until captured
  // Storefront listing (optional — the maker can sell the piece).
  priceRupees: string; // kept as a string for the input; parsed server-side
  stock: string;
  listForSale: boolean;
  stages: Record<StageKey, DraftStage>;
  updatedAt: string;
};

const KEY = (id: string) => `ks_draft_${id}`;
const INDEX = "ks_draft_index";

export function emptyStage(): DraftStage {
  return { photos: [], note: "", capturedAtClient: "" };
}

export function newDraft(): Draft {
  return {
    id: crypto.randomUUID(),
    title: "",
    category: "",
    materials: "",
    storyText: "",
    hiddenSignature: "",
    hiddenSignatureHint: "",
    giNumber: "",
    giCertImage: "",
    priceRupees: "",
    stock: "1",
    listForSale: false,
    stages: {
      RAW_MATERIALS: emptyStage(),
      CRAFTING: emptyStage(),
      FINISHING: emptyStage(),
      COMPLETED: emptyStage(),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function saveDraft(draft: Draft): void {
  draft.updatedAt = new Date().toISOString();
  localStorage.setItem(KEY(draft.id), JSON.stringify(draft));
  const idx = listDraftIds();
  if (!idx.includes(draft.id)) localStorage.setItem(INDEX, JSON.stringify([...idx, draft.id]));
}

/**
 * Backfill any fields a draft is missing from the current defaults. Drafts live
 * in localStorage and can outlive schema changes — a draft saved before the GI
 * fields (giNumber/giCertImage), the listing fields, etc. were added would have
 * them as `undefined` at runtime even though TypeScript trusts the stored JSON.
 * Merging over `newDraft()` guarantees every field (and every stage sub-object)
 * exists, so callers can `.trim()` freely.
 */
function withDefaults(raw: Partial<Draft>): Draft {
  const base = newDraft();
  const s = raw.stages ?? ({} as Partial<Draft["stages"]>);
  return {
    ...base,
    ...raw,
    id: raw.id ?? base.id,
    stages: {
      RAW_MATERIALS: { ...base.stages.RAW_MATERIALS, ...(s.RAW_MATERIALS ?? {}) },
      CRAFTING: { ...base.stages.CRAFTING, ...(s.CRAFTING ?? {}) },
      FINISHING: { ...base.stages.FINISHING, ...(s.FINISHING ?? {}) },
      COMPLETED: { ...base.stages.COMPLETED, ...(s.COMPLETED ?? {}) },
    },
    updatedAt: raw.updatedAt ?? base.updatedAt,
  };
}

export function loadDraft(id: string): Draft | null {
  const raw = localStorage.getItem(KEY(id));
  if (!raw) return null;
  try {
    return withDefaults(JSON.parse(raw) as Partial<Draft>);
  } catch {
    return null;
  }
}

export function deleteDraft(id: string): void {
  localStorage.removeItem(KEY(id));
  localStorage.setItem(INDEX, JSON.stringify(listDraftIds().filter((x) => x !== id)));
}

export function listDraftIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function listDrafts(): Draft[] {
  return listDraftIds()
    .map(loadDraft)
    .filter((d): d is Draft => d !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export const STAGE_KEYS: StageKey[] = ["RAW_MATERIALS", "CRAFTING", "FINISHING", "COMPLETED"];

export function stagesDone(draft: Draft): number {
  return STAGE_KEYS.filter((k) => draft.stages[k].photos.length > 0).length;
}
