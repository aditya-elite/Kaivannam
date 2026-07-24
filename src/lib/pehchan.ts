import { db } from "./db";
import { validatePehchanFormat } from "./pehchan-format";

export {
  validatePehchanFormat,
  verhoeffCheckDigit,
  normalizePehchan,
  maskPehchan,
} from "./pehchan-format";
export type { PehchanFormat } from "./pehchan-format";

/**
 * Gate 1 validity for a Pehchan (national artisan ID) number.
 *
 * Validity = BOTH of:
 *   1. Format + checksum (Verhoeff) — see pehchan-format.ts. Offline, deterministic.
 *   2. Whitelist — the number exists in the latest admin-ingested Pehchan register
 *      (the PehchanEntry table). There is NO live government API.
 */

export type PehchanValidity = {
  normalized: string;
  formatOk: boolean;
  inRegister: boolean;
  valid: boolean; // formatOk && inRegister
  datasetVersion: number | null;
  lastSyncedAt: Date | null;
  holderName: string | null;
};

/** Full server-side validity: format+checksum AND membership in the register. */
export async function validatePehchan(input: string): Promise<PehchanValidity> {
  const fmt = validatePehchanFormat(input);
  const dataset = await db.pehchanDataset.findFirst({ orderBy: { version: "desc" } });

  let inRegister = false;
  let holderName: string | null = null;
  if (dataset && fmt.formatOk) {
    const entry = await db.pehchanEntry.findFirst({
      where: { datasetId: dataset.id, pehchanNumber: fmt.normalized },
    });
    if (entry) {
      inRegister = true;
      holderName = entry.holderName;
    }
  }

  return {
    normalized: fmt.normalized,
    formatOk: fmt.formatOk,
    inRegister,
    valid: fmt.formatOk && inRegister,
    datasetVersion: dataset?.version ?? null,
    lastSyncedAt: dataset?.lastSyncedAt ?? null,
    holderName,
  };
}
