"use client";

import { useActionState, useState } from "react";
import { useT } from "@/lib/i18n/provider";
import { Button, Card } from "@/components/ui";
import { signInAction, signUpAction, type AuthState } from "@/app/login/actions";
import { IconShield, IconUser } from "@/components/icons";

export function AuthForm({ next, initialMode }: { next: string; initialMode: "signin" | "signup" }) {
  const t = useT();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const action = mode === "signin" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});

  return (
    <div className="mx-auto max-w-md">
      {/* One-line explanation of WHY auth is needed, right at the trigger point. */}
      <Card className="mb-4 border-l-4 border-teal">
        <div className="flex items-start gap-3">
          <IconShield width={24} height={24} className="mt-0.5 shrink-0 text-teal" />
          <div>
            <h1 className="text-lg font-bold">{t("auth.whyTitle")}</h1>
            <p className="mt-1 text-base text-muted">{t("auth.whyBody")}</p>
            <p className="mt-2 text-sm font-semibold text-teal">{t("auth.returnNote")}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-5 flex rounded-xl bg-cream p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            onClick={() => setMode("signin")}
            className={`min-h-tap flex-1 rounded-lg px-4 py-2 text-base font-semibold ${
              mode === "signin" ? "bg-surface text-indigo shadow-card" : "text-muted"
            }`}
          >
            {t("auth.signIn")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => setMode("signup")}
            className={`min-h-tap flex-1 rounded-lg px-4 py-2 text-base font-semibold ${
              mode === "signup" ? "bg-surface text-indigo shadow-card" : "text-muted"
            }`}
          >
            {t("auth.createAccount")}
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />

          {mode === "signup" ? (
            <Field id="displayName" name="displayName" label={t("auth.name")} required autoComplete="name" />
          ) : null}
          <Field
            id="handle"
            name="handle"
            label={t("auth.handle")}
            required
            autoComplete="username"
            inputMode="text"
          />
          <Field
            id="password"
            name="password"
            label={t("auth.password")}
            type="password"
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />

          {state.error ? (
            <p role="alert" className="rounded-lg bg-warning/10 p-3 text-base font-semibold text-warning">
              {t(state.error)}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            <IconUser width={20} height={20} />
            {pending ? t("common.loading") : mode === "signin" ? t("auth.signIn") : t("auth.createAccount")}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  ...props
}: { id: string; label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-base font-semibold">
        {label}
        {required ? <span className="ml-1 text-warning" aria-hidden="true">*</span> : null}
      </label>
      <input
        id={id}
        required={required}
        aria-required={required}
        className="min-h-tap w-full rounded-xl border-2 border-ink/15 bg-cream px-4 text-base focus:border-teal"
        {...props}
      />
    </div>
  );
}
