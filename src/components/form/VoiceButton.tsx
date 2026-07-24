"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { IconMic } from "@/components/icons";

// Speech-to-text using the Web Speech API, in the user's current language.
// Available on EVERY text field, not just the story. Hidden when unsupported.
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
};

const SR_LANG: Record<string, string> = { en: "en-IN", hi: "hi-IN", ta: "ta-IN" };

export function VoiceButton({ onText }: { onText: (text: string) => void }) {
  const { locale, t } = useI18n();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const toggle = useCallback(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = SR_LANG[locale] ?? "en-IN";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      if (transcript) onText(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, [listening, locale, onText]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={listening}
      aria-label={listening ? t("common.listening") : t("common.voiceInput")}
      title={listening ? t("common.listening") : t("common.voiceInput")}
      className={`grid min-h-tap min-w-tap place-items-center rounded-xl border-2 ${
        listening
          ? "animate-pulse border-terracotta bg-terracotta text-white"
          : "border-ink/15 bg-surface text-indigo hover:border-indigo"
      }`}
    >
      <IconMic width={22} height={22} />
    </button>
  );
}
