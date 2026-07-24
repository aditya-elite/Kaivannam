"use client";

import { useT } from "@/lib/i18n/provider";
import { dyeLotColor } from "@/lib/dyelot";
import { roughClasses } from "@/lib/rough";

export type Category = { name: string; count: number; state: string };

/**
 * Traditional crafts, presented as labelled drawers along a wall rather than
 * as filter chips.
 *
 * It is a horizontal rail on narrow screens because a craft list is a browsing
 * gesture, not a form control — but it is built as a real scroll container with
 * keyboard-reachable buttons inside, not a carousel with arrows that traps
 * focus. On desktop it becomes a grid and the scrolling disappears entirely.
 */
export function CategoryRail({
  categories,
  active,
  onSelect,
}: {
  categories: Category[];
  active: string | null;
  onSelect: (name: string | null) => void;
}) {
  const t = useT();
  const edges = roughClasses(categories.length + 1, 23);

  return (
    <div>
      <div
        className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5"
        role="group"
        aria-label={t("shop.categories")}
      >
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={active === null}
          className={`press min-h-tap shrink-0 basis-40 px-4 py-3 text-left text-base font-semibold transition-colors sm:basis-auto ${edges[0]} ${
            active === null ? "bg-ink text-cream" : "bg-surface text-ink hover:bg-haldi/15"
          }`}
        >
          {t("shop.allCrafts")}
        </button>

        {categories.map((c, i) => {
          const on = active === c.name;
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => onSelect(on ? null : c.name)}
              aria-pressed={on}
              className={`press min-h-tap shrink-0 basis-52 px-4 py-3 text-left transition-colors sm:basis-auto ${edges[i + 1]} ${
                on ? "bg-ink text-cream" : "bg-surface text-ink hover:bg-haldi/15"
              }`}
            >
              <span
                aria-hidden="true"
                className="mb-2 block h-[3px] w-8"
                style={{ background: on ? "#E9A319" : dyeLotColor(i, "terracotta", 23) }}
              />
              <span className="block text-base font-semibold leading-snug">{c.name}</span>
              <span className={`block text-sm ${on ? "text-cream/75" : "text-muted"}`}>
                {c.state} · {t("shop.pieceCount", { count: c.count })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
