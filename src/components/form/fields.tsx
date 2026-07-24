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

/**
 * §2.4 — a rule under the field, not a box around it. The reference uses rules
 * almost everywhere and boxes almost nowhere, and that is a large part of why
 * it reads as editorial rather than as an app.
 *
 * The one thing deliberately NOT traded away: a boxed field advertises "you can
 * type here" more loudly than a ruled one, which matters for users with low
 * digital literacy. So the rule is 2px rather than a hairline, it darkens on
 * hover, and it goes terracotta on focus — the affordance is carried by weight
 * and colour change instead of by an enclosing outline.
 *
 * The focus ring itself is untouched (globals.css: 3px teal, offset, never
 * animated). Nothing here weakens the accessibility contract.
 */
// Note: no `focus:outline-none` anywhere here. Tailwind's variant would win on
// specificity over the zero-specificity :where() focus rule in globals.css and
// silently delete the keyboard focus ring.
const fieldBase =
  "min-h-tap w-full border-0 border-b-2 bg-transparent px-1 text-base transition-colors";

function fieldClasses(error?: string | null) {
  return `${fieldBase} ${
    error ? "border-warning" : "border-ink/25 hover:border-ink/45 focus:border-terracotta"
  }`;
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
          className={fieldClasses(error)}
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
          className={`${fieldClasses(error)} py-3`}
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
