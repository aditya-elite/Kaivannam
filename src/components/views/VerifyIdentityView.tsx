"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/provider";
import { Button, Card, SectionHeading } from "@/components/ui";
import { TextField } from "@/components/form/fields";
import { compressImage } from "@/lib/client/image";
import { formatDate } from "@/lib/format";
import { validatePehchanFormat } from "@/lib/pehchan-format";
import { IconUpload, IconShield, IconAlert, IconCheck, IconClose, IconUser } from "@/components/icons";

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
  const idMatch = /(\d[\d\s]{10,})/.exec(text.replace(/\n/g, " "));
  const idNumber = (idMatch ? idMatch[1] : find(["id", "no", "number", "pehchan"])).replace(/\s+/g, "").trim();
  const name = find(["name", "नाम", "பெயர்"]);
  const craft = find(["craft", "trade", "category", "occupation"]);
  const region = find(["region", "district", "cluster", "place", "address"]);
  return {
    fields: { idNumber, name, craft, region },
    conf: {
      idNumber: idNumber ? (idMatch ? 0.82 : 0.55) : 0.2,
      name: name ? 0.88 : 0.25,
      craft: craft ? 0.8 : 0.35,
      region: region ? 0.72 : 0.3,
    },
  };
}

type Mode = "number" | "photo";

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

  const [mode, setMode] = useState<Mode>("number");

  // Shared
  const [pehchan, setPehchan] = useState("");
  const [name, setName] = useState("");
  const [claimedGi, setClaimedGi] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { verified: boolean }>(null);

  // Live Gate-1 register check
  const [registerState, setRegisterState] = useState<null | { inRegister: boolean; holderName: string | null }>(null);
  const [checking, setChecking] = useState(false);

  // Photo/OCR
  const [image, setImage] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [fields, setFields] = useState<Fields>({ idNumber: "", name: "", craft: "", region: "" });
  const [conf, setConf] = useState<Conf | null>(null);
  const [rawText, setRawText] = useState("");

  const activeNumber = mode === "photo" ? fields.idNumber : pehchan;
  const fmt = validatePehchanFormat(activeNumber);

  // Debounced whitelist check whenever a well-formed number is present.
  useEffect(() => {
    setRegisterState(null);
    if (!fmt.formatOk) return;
    let cancelled = false;
    setChecking(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch("/api/pehchan/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number: fmt.normalized }),
        });
        const data = await res.json();
        if (!cancelled) setRegisterState({ inRegister: !!data.inRegister, holderName: data.holderName ?? null });
      } catch {
        if (!cancelled) setRegisterState(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [fmt.formatOk, fmt.normalized]);

  async function handleFile(file: File | null) {
    if (!file) return;
    setReading(true);
    try {
      const { default: Tesseract } = await import("tesseract.js");
      const { data } = await Tesseract.recognize(file, "eng");
      const parsed = parseOcr(data.text);
      setRawText(data.text);
      setFields(parsed.fields);
      setConf(parsed.conf);
      setName(parsed.fields.name);
      setImage(await compressImage(file));
    } catch {
      setConf({ idNumber: 0, name: 0, craft: 0, region: 0 });
      setImage(await compressImage(file));
    } finally {
      setReading(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    try {
      const payload =
        mode === "photo"
          ? {
              image,
              pehchanNumber: fields.idNumber,
              fields,
              claimedGi,
              rawText,
              confidence: conf,
            }
          : {
              pehchanNumber: pehchan,
              fields: { name },
              claimedGi,
            };
      const res = await fetch("/api/verify-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setDone({ verified: !!data.verified });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div
          className={`flex flex-col items-center gap-3 rounded-2xl p-6 text-white ${
            done.verified ? "bg-teal" : "bg-indigo"
          }`}
        >
          {done.verified ? <IconShield width={36} height={36} /> : <IconCheck width={36} height={36} />}
          <h1 className="text-2xl font-extrabold">
            {done.verified ? t("pehchan.verifiedTitle") : t("ocr.submitted")}
          </h1>
          <p className="text-base">
            {done.verified ? t("pehchan.verifiedBody") : t("pehchan.pendingBody")}
          </p>
        </div>
        <Button className="mt-4" onClick={() => router.push("/my-items")}>
          {t("nav.myitems")}
        </Button>
      </div>
    );
  }

  const flagged = (k: keyof Fields) => conf !== null && conf[k] < LOW;

  // Whether submit is allowed: a well-formed number is the minimum bar.
  const canSubmit = fmt.formatOk && (mode === "number" ? true : !!image);

  return (
    <div className="mx-auto max-w-xl">
      <SectionHeading sub={t("pehchan.intro")}>{t("pehchan.title")}</SectionHeading>

      {/* Mode toggle */}
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-ink/5 p-1">
        {(["number", "photo"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`min-h-tap rounded-lg px-3 text-base font-semibold ${
              mode === m ? "bg-surface text-ink shadow-card" : "text-muted"
            }`}
          >
            {m === "number" ? t("pehchan.modeNumber") : t("pehchan.modePhoto")}
          </button>
        ))}
      </div>

      <Card className="space-y-5">
        {mode === "number" ? (
          <>
            <div>
              <label htmlFor="pehchan-num" className="mb-1 block text-base font-semibold">
                {t("pehchan.numberLabel")}
              </label>
              <input
                id="pehchan-num"
                inputMode="numeric"
                value={pehchan}
                onChange={(e) => setPehchan(e.target.value)}
                placeholder="XXXX XXXX XXXX"
                className="min-h-tap w-full rounded-xl border-2 border-ink/15 bg-surface px-3 product-id font-mono text-lg focus:border-teal"
              />
              <PehchanStatus
                fmt={fmt}
                checking={checking}
                registerState={registerState}
              />
            </div>
            <TextField
              label={t("ocr.name")}
              value={name}
              onChange={setName}
              requiredLabel={t("common.optional")}
            />
          </>
        ) : (
          <>
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
                    {reading ? t("ocr.reading") : t("pehchan.modePhoto")}
                  </span>
                </button>
              </>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Uploaded artisan ID card" className="w-full rounded-xl object-contain shadow-card" />
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
                    {k === "idNumber" ? (
                      <PehchanStatus fmt={fmt} checking={checking} registerState={registerState} />
                    ) : null}
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* GI cluster claim (used for a possible GI_AUTHORISED name cross-check). */}
        {(mode === "number" || image) && (
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
        )}

        {(mode === "number" || image) && (
          <Button onClick={submit} disabled={submitting || !canSubmit} className="w-full">
            <IconShield width={20} height={20} />
            {submitting ? t("common.loading") : t("pehchan.submit")}
          </Button>
        )}
      </Card>
    </div>
  );
}

/** Live Gate-1 status: format+checksum (offline) and register membership (API). */
function PehchanStatus({
  fmt,
  checking,
  registerState,
}: {
  fmt: ReturnType<typeof validatePehchanFormat>;
  checking: boolean;
  registerState: null | { inRegister: boolean; holderName: string | null };
}) {
  const t = useT();
  if (!fmt.normalized) return null;

  return (
    <div className="mt-2 space-y-1.5 text-sm">
      <StatusLine ok={fmt.formatOk} label={t("pehchan.checkFormat")} failLabel={t(`pehchan.reason.${fmt.reason ?? "checksum"}`)} />
      {fmt.formatOk ? (
        checking ? (
          <p className="flex items-center gap-2 text-muted">
            <IconUser width={16} height={16} /> {t("pehchan.checkingRegister")}
          </p>
        ) : registerState ? (
          <StatusLine
            ok={registerState.inRegister}
            label={
              registerState.inRegister && registerState.holderName
                ? t("pehchan.registerMatch", { name: registerState.holderName })
                : t("pehchan.inRegister")
            }
            failLabel={t("pehchan.notInRegister")}
          />
        ) : null
      ) : null}
    </div>
  );
}

function StatusLine({ ok, label, failLabel }: { ok: boolean; label: string; failLabel: string }) {
  return (
    <p className={`flex items-center gap-2 ${ok ? "text-teal-700" : "text-warning"}`}>
      {ok ? <IconCheck width={16} height={16} /> : <IconClose width={16} height={16} />}
      {ok ? label : failLabel}
    </p>
  );
}
