"use client";

import { useT } from "@/lib/i18n/provider";
import { Card, SectionHeading } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { decideVerification, ingestGiDataset } from "@/app/admin/actions";
import { IconShield, IconCheck, IconClose, IconAlert, IconThread, IconUpload } from "@/components/icons";

type QueueItem = {
  id: string;
  artisanName: string;
  artisanTier: string;
  docImageUrl: string;
  ocr: {
    idNumber: string | null;
    name: string | null;
    craft: string | null;
    region: string | null;
    confidence: Record<string, number> | null;
    rawText: string | null;
  };
  claimedGi: string | null;
  giMatch: { id: string; giNumber: string; giName: string } | null;
  giDatasetVersion: number | null;
  giSyncedAt: string | null;
};

export function AdminView({
  queue,
  dataset,
  audit,
}: {
  queue: QueueItem[];
  dataset: { version: number; entries: number; lastSyncedAt: string; sourceNote: string | null } | null;
  audit: { action: string; target: string; createdAt: string }[];
}) {
  const t = useT();

  return (
    <div className="space-y-10">
      <SectionHeading>{t("nav.admin")}</SectionHeading>

      {/* GI dataset ingest */}
      <section aria-labelledby="gi-heading">
        <h2 id="gi-heading" className="mb-3 flex items-center gap-2 text-xl font-bold">
          <IconThread width={22} height={22} className="text-indigo" /> {t("admin.giIngest")}
        </h2>
        <Card className="space-y-4">
          {dataset ? (
            <p className="text-base text-muted">
              Current: dataset <strong>v{dataset.version}</strong> · {dataset.entries} entries ·{" "}
              {t("ocr.giProvenance", { date: formatDate(dataset.lastSyncedAt) })}
            </p>
          ) : (
            <p className="text-base text-muted">No dataset ingested yet.</p>
          )}
          <form action={ingestGiDataset} className="space-y-3">
            <label htmlFor="gi-rows" className="block text-base font-semibold">
              GI register rows —{" "}
              <span className="font-normal text-muted">
                gi_number | gi_name | craft_category | region | authorised_user
              </span>
            </label>
            <textarea
              id="gi-rows"
              name="rows"
              rows={5}
              placeholder={"GI-0146 | Kanchipuram Silk | Handloom | Kanchipuram, Tamil Nadu | Lakshmi Devi"}
              className="w-full rounded-xl border-2 border-ink/15 bg-surface px-4 py-3 font-mono text-sm focus:border-teal"
            />
            <input
              name="note"
              placeholder="Source note (e.g. GI Registry Part A+B, July 2026)"
              className="min-h-tap w-full rounded-xl border-2 border-ink/15 bg-surface px-4 text-base focus:border-teal"
            />
            <button
              type="submit"
              className="inline-flex min-h-tap items-center gap-2 rounded-xl bg-indigo px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              <IconUpload width={20} height={20} /> Ingest new version
            </button>
          </form>
        </Card>
      </section>

      {/* Verification queue */}
      <section aria-labelledby="queue-heading">
        <h2 id="queue-heading" className="mb-3 flex items-center gap-2 text-xl font-bold">
          <IconShield width={22} height={22} className="text-teal" /> {t("admin.queue")}
        </h2>
        {queue.length === 0 ? (
          <Card>
            <p className="text-base text-muted">{t("admin.noPending")}</p>
          </Card>
        ) : (
          <ul className="space-y-5">
            {queue.map((item) => (
              <li key={item.id}>
                <Card className="space-y-4">
                  <h3 className="text-lg font-bold">{item.artisanName}</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Document */}
                    <div>
                      <p className="mb-1 text-sm font-semibold text-muted">{t("admin.docSide")}</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.docImageUrl}
                        alt={`ID document for ${item.artisanName}`}
                        className="w-full rounded-xl border border-ink/10 object-contain"
                      />
                    </div>
                    {/* OCR fields */}
                    <div>
                      <p className="mb-1 text-sm font-semibold text-muted">{t("admin.ocrSide")}</p>
                      <dl className="space-y-1 text-base">
                        {(["idNumber", "name", "craft", "region"] as const).map((k) => {
                          const conf = item.ocr.confidence?.[k];
                          const low = conf !== undefined && conf < 0.7;
                          return (
                            <div key={k} className="flex items-center justify-between gap-2">
                              <dt className="text-muted">{t(`ocr.${k}`)}</dt>
                              <dd className="flex items-center gap-1 text-right font-semibold">
                                {item.ocr[k] || "—"}
                                {low ? (
                                  <span
                                    className="inline-flex items-center gap-0.5 text-warning"
                                    title="Low OCR confidence"
                                  >
                                    <IconAlert width={14} height={14} />
                                    {Math.round((conf ?? 0) * 100)}%
                                  </span>
                                ) : null}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                    {/* GI match */}
                    <div>
                      <p className="mb-1 text-sm font-semibold text-muted">{t("admin.giSide")}</p>
                      {item.giMatch ? (
                        <div className="rounded-xl bg-success/10 p-3 text-success">
                          <p className="flex items-center gap-1.5 font-semibold">
                            <IconCheck width={18} height={18} /> Match found
                          </p>
                          <p className="mt-1 text-sm">
                            {item.giMatch.giName} · {item.giMatch.giNumber}
                          </p>
                          {item.giSyncedAt ? (
                            <p className="mt-1 text-xs">
                              {t("ocr.giProvenance", { date: formatDate(item.giSyncedAt) })} · v
                              {item.giDatasetVersion}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="rounded-xl bg-haldi/15 p-3 text-ink">
                          <p className="flex items-center gap-1.5 font-semibold">
                            <IconAlert width={18} height={18} /> No GI match
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            {item.claimedGi ? `Claimed: ${item.claimedGi}` : "No GI claimed"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Decision */}
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                    <form action={decideVerification} className="contents">
                      <input type="hidden" name="requestId" value={item.id} />
                      <input
                        name="reason"
                        placeholder={t("admin.reason")}
                        className="min-h-tap w-full rounded-xl border-2 border-ink/15 bg-surface px-4 text-base focus:border-teal"
                      />
                      <button
                        type="submit"
                        name="decision"
                        value="approve"
                        className="inline-flex min-h-tap items-center justify-center gap-2 rounded-xl bg-success px-5 font-semibold text-white hover:opacity-90"
                      >
                        <IconCheck width={20} height={20} /> {t("admin.approve")}
                      </button>
                      <button
                        type="submit"
                        name="decision"
                        value="reject"
                        className="inline-flex min-h-tap items-center justify-center gap-2 rounded-xl bg-warning px-5 font-semibold text-white hover:opacity-90"
                      >
                        <IconClose width={20} height={20} /> {t("admin.reject")}
                      </button>
                    </form>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Audit log */}
      <section aria-labelledby="audit-heading">
        <h2 id="audit-heading" className="mb-3 text-xl font-bold">
          Audit log
        </h2>
        <Card>
          {audit.length === 0 ? (
            <p className="text-base text-muted">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-ink/5 text-sm">
              {audit.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-mono font-semibold">{a.action}</span>
                  <span className="truncate text-muted">{a.target}</span>
                  <span className="shrink-0 text-muted">{formatDate(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
