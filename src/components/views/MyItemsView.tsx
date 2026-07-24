"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { Card, SectionHeading, ButtonLink, Button } from "@/components/ui";
import { TierBadge, type Tier } from "@/components/TierBadge";
import { formatDate } from "@/lib/format";
import { signOutAction } from "@/app/login/actions";
import { listDrafts, deleteDraft, stagesDone, type Draft } from "@/lib/client/draft";
import { WeaveProgress } from "@/components/craft/WeaveProgress";
import { SyncStatus } from "@/components/craft/Charkha";
import { EmptyMotif } from "@/components/craft/EmptyMotif";
import { IconCamera, IconArrowRight, IconShield, IconClose } from "@/components/icons";

const CURRENT_KEY = "ks_current_draft";

export function MyItemsView({
  authed,
  artisanName,
  verificationTier,
  published,
}: {
  authed: boolean;
  artisanName: string | null;
  verificationTier: string | null;
  published: { id: string; title: string; category: string; sealedAt: string | null }[];
}) {
  const t = useT();
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    setDrafts(listDrafts());
  }, []);

  function resume(id: string) {
    localStorage.setItem(CURRENT_KEY, id);
  }
  function remove(id: string) {
    deleteDraft(id);
    setDrafts(listDrafts());
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading>{t("nav.myitems")}</SectionHeading>
        {authed ? (
          <form action={signOutAction}>
            <Button variant="outline" type="submit">
              {t("nav.signout")}
            </Button>
          </form>
        ) : null}
      </div>

      {authed && verificationTier ? (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-bold">{artisanName}</p>
            <div className="mt-1">
              <TierBadge tier={verificationTier as Tier} size="sm" />
            </div>
          </div>
          <ButtonLink href="/verify-identity" variant="secondary">
            <IconShield width={20} height={20} /> {t("ocr.title")}
          </ButtonLink>
        </Card>
      ) : null}

      {/* Drafts in progress (device-local, resumable). */}
      <section aria-labelledby="drafts-heading">
        <h2 id="drafts-heading" className="mb-3 text-xl font-bold">
          {t("reg.myItems")}
        </h2>
        {drafts.length === 0 ? (
          <Card>
            <p className="text-base text-muted">{t("profile.noItems")}</p>
            <ButtonLink href="/register" variant="primary" className="mt-4">
              <IconCamera width={20} height={20} /> {t("home.ctaRegister")}
            </ButtonLink>
          </Card>
        ) : (
          <ul className="space-y-3">
            {drafts.map((d) => {
              const done = stagesDone(d);
              return (
                <li key={d.id}>
                  <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <p className="text-lg font-bold">{d.title || t("reg.itemTitle")}</p>
                      <p className="text-sm text-muted">
                        {t("reg.stageProgress", { done, left: 4 - done })}
                      </p>
                      {/* §6.1 — documented stages as a weave completing. */}
                      <WeaveProgress done={done} label={`${done}/4`} />
                      {/* §9 — a draft lives only on this device, so it is
                          queued, and queued is deliberately static: motion
                          implies activity. The text says so either way. */}
                      <SyncStatus state="queued" label={t("sync.queued")} />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href="/register"
                        onClick={() => resume(d.id)}
                        className="inline-flex min-h-tap items-center gap-2 rounded-xl bg-terracotta px-4 py-2 font-semibold text-white hover:bg-terracotta-600"
                      >
                        {t("reg.resume")} <IconArrowRight width={18} height={18} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(d.id)}
                        aria-label={`${t("common.close")} ${d.title}`}
                        className="grid min-h-tap min-w-tap place-items-center rounded-xl border-2 border-ink/15 text-warning"
                      >
                        <IconClose width={20} height={20} />
                      </button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Published items (server). */}
      {authed ? (
        <section aria-labelledby="published-heading">
          <h2 id="published-heading" className="mb-3 text-xl font-bold">
            {t("profile.items")}
          </h2>
          {published.length === 0 ? (
            <EmptyMotif title={t("empty.title")} body={t("profile.noItems")} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {published.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/product/${p.id}`}
                    className="flex h-full flex-col justify-between rounded-2xl bg-surface p-4 shadow-card hover:shadow-lift"
                  >
                    <div>
                      <p className="text-lg font-bold">{p.title}</p>
                      <p className="text-sm text-muted">{p.category}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="product-id font-mono text-sm text-muted">{p.id}</span>
                      {p.sealedAt ? (
                        <span className="text-sm text-muted">{formatDate(p.sealedAt)}</span>
                      ) : null}
                    </div>
                  </Link>
                  {/* Sealed on the server — a single check stamp, then static.
                      Never a persistent animation on a resolved state. Outside
                      the link so the live region is not read as part of it. */}
                  <SyncStatus state="synced" label={t("sync.synced")} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <Card className="border-l-4 border-teal">
          <p className="text-base text-muted">{t("auth.whyBody")}</p>
        </Card>
      )}
    </div>
  );
}
