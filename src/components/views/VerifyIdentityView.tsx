"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/provider";
import { Button, Card, SectionHeading } from "@/components/ui";
import { TextField } from "@/components/form/fields";
import { compressImage } from "@/lib/client/image";
import { formatDate } from "@/lib/format";
import { IconUpload, IconShield, IconAlert, IconCheck } from "@/components/icons";

type Fields = { idNumber: string; name: string; craft: string; region: string };
type Conf = Record<keyof Fields, number>;

const LOW = 0.7;

// Very light heuristic parse of OCR text into the Pehchan fields. Whatever it
// finds is ALWAYS shown to the user for correction — never silently trusted.
function parseOcr(text: string): { fields: Fields; conf: Conf } {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const find = (labels: string[]) => {
    for (const l of lines) {
      for (const lab of labels) {
        const m = new RegExp(`${lab}\\s*[:\\-]?\\s*(.+)`, "i").exec(l);
        if (m && m[1].trim().length > 1) return m[1].trim();
      }
    }
    return "";
  };
  const idMatch = /([A-Z]{0,3}[-\s]?\d[\d\s\-/]{5,})/.exec(text.replace(/\n/g, " "));
  const idNumber = (idMatch ? idMatch[1] : find(["id", "no", "number"])).replace(/\s+/g, "").trim();
  const name = find(["name", "नाम", "பெயர்"]);
  const craft = find(["craft", "trade", "category", "occupation"]);
  const region = find(["region", "district", "cluster", "place", "address"]);
  return {
    fields: { idNumber, name, craft, region },
    // Confidence heuristic: found-by-label scores higher than not-found.
    conf: {
      idNumber: idNumber ? (idMatch ? 0.82 : 0.55) : 0.2,
      name: name ? 0.88 : 0.25,
      craft: craft ? 0.8 : 0.35,
      region: region ? 0.72 : 0.3,
    },
  };
}

export function VerifyIdentityView({
  giOptions,
  datasetVersion,
  lastSynced,
}: {
  giOptions: string[];
  datasetVersion: number | null;
  lastSynced: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [fields, setFields] = useState<Fields>({ idNumber: "", name: "", craft: "", region: "" });
  const [conf, setConf] = useState<Conf | null>(null);
  const [rawText, setRawText] = useState("");
  const [claimedGi, setClaimedGi] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) return;
    setReading(true);
    try {
      // Tesseract.js runs on-device — works offline, no API key, no data leaves.
      const { default: Tesseract } = await import("tesseract.js");
      const { data } = await Tesseract.recognize(file, "eng");
      const parsed = parseOcr(data.text);
      setRawText(data.text);
      setFields(parsed.fields);
      setConf(parsed.conf);
      setImage(await compressImage(file));
    } catch {
      // OCR failed — let the user type everything manually.
      setConf({ idNumber: 0, name: 0, craft: 0, region: 0 });
      setImage(await compressImage(file));
    } finally {
      setReading(false);
    }
  }

  async function submit() {
    if (!image) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/verify-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, fields, claimedGi, rawText, confidence: conf }),
      });
      if (res.ok) setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-teal p-6 text-white">
          <IconCheck width={36} height={36} />
          <h1 className="text-2xl font-extrabold">{t("ocr.submitted")}</h1>
        </div>
        <Button className="mt-4" onClick={() => router.push("/my-items")}>
          {t("nav.myitems")}
        </Button>
      </div>
    );
  }

  const flagged = (k: keyof Fields) => conf !== null && conf[k] < LOW;

  return (
    <div className="mx-auto max-w-xl">
      <SectionHeading sub={t("ocr.intro")}>{t("ocr.title")}</SectionHeading>

      <Card className="space-y-5">
        {!image ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={reading}
              className="flex min-h-[160px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-indigo/40 bg-indigo/5 p-6 text-indigo hover:border-indigo disabled:opacity-60"
            >
              <IconUpload width={32} height={32} />
              <span className="text-base font-semibold">
                {reading ? t("ocr.reading") : t("ocr.title")}
              </span>
            </button>
            {reading ? (
              <p className="text-center text-base text-muted" role="status" aria-live="polite">
                {t("ocr.reading")}
              </p>
            ) : null}
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="Uploaded artisan ID card"
              className="w-full rounded-xl object-contain shadow-card"
            />
            <p className="flex items-start gap-2 rounded-lg bg-haldi/15 p-3 text-base text-ink">
              <IconAlert width={18} height={18} className="mt-0.5 shrink-0" />
              {t("ocr.checkFields")}
            </p>

            {(["idNumber", "name", "craft", "region"] as const).map((k) => (
              <div key={k}>
                <TextField
                  label={t(`ocr.${k}`)}
                  value={fields[k]}
                  onChange={(v) => setFields((f) => ({ ...f, [k]: v }))}
                  error={flagged(k) ? t("ocr.lowConfidence") : undefined}
                  requiredLabel={t("common.required")}
                />
              </div>
            ))}

            <div>
              <label htmlFor="claim-gi" className="mb-1 block text-base font-semibold">
                {t("ocr.claimGi")}
              </label>
              <select
                id="claim-gi"
                value={claimedGi}
                onChange={(e) => setClaimedGi(e.target.value)}
                className="min-h-tap w-full rounded-xl border-2 border-ink/15 bg-surface px-3 text-base focus:border-teal"
              >
                <option value="">—</option>
                {giOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {datasetVersion && lastSynced ? (
                <p className="mt-1 text-sm text-muted">
                  {t("ocr.giProvenance", { date: formatDate(lastSynced) })} · v{datasetVersion}
                </p>
              ) : null}
            </div>

            <Button onClick={submit} disabled={submitting} className="w-full">
              <IconShield width={20} height={20} />
              {submitting ? t("common.loading") : t("ocr.submit")}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
