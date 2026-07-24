"use client";

import { useEffect, useState } from "react";

const KEY = "ks_favorites";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Saved pieces, kept in localStorage.
 *
 * No account required — the whole product is built so that browsing and
 * verifying never demand a sign-in, and a wishlist is not the place to break
 * that. It also means this works offline, which matters here.
 *
 * Accessibility notes that are easy to get wrong on a heart button:
 *   · It is a real <button> with `aria-pressed`, not a decorative icon. A
 *     screen reader announces the state, not just the label.
 *   · The label names the piece ("Save Dokra oil lamp"), because a page of
 *     twelve buttons all called "Save" is unusable in a rota list.
 *   · State is filled-vs-outline, never colour alone.
 */
export function FavoriteButton({ id, title, label, savedLabel }: {
  id: string;
  title: string;
  label: string;
  savedLabel: string;
}) {
  // Starts false on both server and client, then syncs after mount — reading
  // localStorage during render would produce a hydration mismatch.
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(read().includes(id));
  }, [id]);

  function toggle() {
    const next = !on;
    setOn(next);
    try {
      const list = read().filter((x) => x !== id);
      if (next) list.push(id);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* Private mode / quota — the button still works for this session. */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={`${on ? savedLabel : label}: ${title}`}
      className="press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream/85 text-terracotta transition-colors hover:bg-cream"
    >
      <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 20.5 3.8 12.4a5.1 5.1 0 0 1 7.2-7.2l1 1 1-1a5.1 5.1 0 0 1 7.2 7.2Z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
