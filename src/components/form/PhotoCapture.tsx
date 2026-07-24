"use client";

import { useRef, useState } from "react";
import { useT } from "@/lib/i18n/provider";
import { compressImage } from "@/lib/client/image";
import { IconCamera, IconClose } from "@/components/icons";

// Capture/add photos for a stage. Opens the rear camera on phones (capture
// attribute), compresses client-side, and shows removable previews.
export function PhotoCapture({
  photos,
  onChange,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const added: string[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        added.push(await compressImage(f));
      }
      onChange([...photos, ...added]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {photos.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {photos.map((src, i) => (
            <li key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Stage photo ${i + 1}`}
                className="h-24 w-24 rounded-xl object-cover shadow-card"
                width={96}
                height={96}
              />
              <button
                type="button"
                onClick={() => onChange(photos.filter((_, j) => j !== i))}
                aria-label={`${t("common.close")} ${i + 1}`}
                className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-warning text-white shadow-lift"
              >
                <IconClose width={16} height={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex min-h-tap items-center gap-2 rounded-xl border-2 border-dashed border-indigo/40 bg-indigo/5 px-5 py-3 text-base font-semibold text-indigo hover:border-indigo disabled:opacity-60"
      >
        <IconCamera width={22} height={22} />
        {busy ? t("common.loading") : photos.length ? t("common.addPhoto") : t("reg.addStagePhoto")}
      </button>
    </div>
  );
}
