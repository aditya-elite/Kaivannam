"use client";

import { useId } from "react";
import { VoiceButton } from "./VoiceButton";

// Accessible form fields: real <label> (never placeholder-as-label), consistent
// required marker AT the field, inline plain-language errors, and voice input on
// EVERY text field.

function RequiredMark({ show }: { show?: boolean }) {
  return show ? (
    <span className="ml-1 font-bold text-warning" aria-hidden="true">
      *
    </span>
  ) : null;
}

type Common = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string | null;
  hint?: string;
  requiredLabel?: string; // localized "required" for screen readers
};

export function TextField({
  label,
  value,
  onChange,
  required,
  error,
  hint,
  placeholder,
  inputMode,
  requiredLabel,
}: Common & { placeholder?: string; inputMode?: "text" | "numeric" }) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-base font-semibold">
        {label}
        <RequiredMark show={required} />
        {required ? <span className="sr-only"> ({requiredLabel})</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="mb-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <div className="flex gap-2">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={`${hint ? hintId : ""} ${error ? errId : ""}`.trim() || undefined}
          className={`min-h-tap w-full rounded-xl border-2 bg-surface px-4 text-base focus:border-teal ${
            error ? "border-warning" : "border-ink/15"
          }`}
        />
        <VoiceButton onText={(txt) => onChange(value ? `${value} ${txt}` : txt)} />
      </div>
      {error ? (
        <p id={errId} role="alert" className="mt-1 text-sm font-semibold text-warning">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  required,
  error,
  hint,
  placeholder,
  rows = 4,
  requiredLabel,
}: Common & { placeholder?: string; rows?: number }) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-base font-semibold">
        {label}
        <RequiredMark show={required} />
        {required ? <span className="sr-only"> ({requiredLabel})</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="mb-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <div className="flex gap-2">
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={`${hint ? hintId : ""} ${error ? errId : ""}`.trim() || undefined}
          className={`min-h-tap w-full rounded-xl border-2 bg-surface px-4 py-3 text-base focus:border-teal ${
            error ? "border-warning" : "border-ink/15"
          }`}
        />
        <VoiceButton onText={(txt) => onChange(value ? `${value} ${txt}` : txt)} />
      </div>
      {error ? (
        <p id={errId} role="alert" className="mt-1 text-sm font-semibold text-warning">
          {error}
        </p>
      ) : null}
    </div>
  );
}
