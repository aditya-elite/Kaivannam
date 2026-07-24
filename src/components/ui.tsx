import Link from "next/link";
import type { ReactNode } from "react";

/* Shared UI primitives. All interactive targets meet the 48×48 minimum and pair
   text with an icon where they trigger an action. */

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-terracotta text-white hover:bg-terracotta-600 active:bg-terracotta-700",
  secondary: "bg-indigo text-white hover:bg-indigo-700",
  outline: "bg-surface text-ink border-2 border-ink/20 hover:border-ink/40",
  ghost: "bg-transparent text-indigo hover:bg-indigo/10",
  danger: "bg-warning text-white hover:opacity-90",
};

// `press` (motion.css §7.1) makes the button press *into* the surface on
// :active. Deliberately not a ripple — ripple is Material's signature and reads
// as generic. Focus rings come from globals.css and are never animated.
const buttonBase =
  "press inline-flex min-h-tap items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold shadow-card transition-colors disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none";

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: { variant?: ButtonVariant } & React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
  }) {
  return (
    <button className={`${buttonBase} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  href,
  children,
  ...props
}: { variant?: ButtonVariant; href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
  }) {
  return (
    <Link href={href} className={`${buttonBase} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </Link>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl bg-surface p-5 shadow-card ${className}`}>{children}</div>
  );
}

export function SectionHeading({
  children,
  sub,
  label,
}: {
  children: ReactNode;
  sub?: ReactNode;
  /** Small caps eyebrow — the low end of the §2.6 scale contrast. */
  label?: string;
}) {
  return (
    <div className="mb-6">
      {label ? <p className="type-label mb-2 text-muted">{label}</p> : null}
      <h1 className="text-2xl font-bold sm:text-3xl">{children}</h1>
      {sub ? <p className="mt-2 max-w-2xl text-base text-muted">{sub}</p> : null}
    </div>
  );
}

/**
 * §2.4 — a hairline rule beneath a row, not a bordered box around it. The
 * reference uses rules almost everywhere and boxes almost nowhere, and that is
 * a large part of why it reads as editorial rather than as an app. The clip in
 * motion.css gives it a hand-ruled drift; a plain border-bottom reads as a
 * spreadsheet.
 */
export function Rule({ className = "" }: { className?: string }) {
  return <hr className={`rule-hand text-ink ${className}`} aria-hidden="true" />;
}

/**
 * Tier B opaque plate. In a fluid layout you cannot guarantee which part of an
 * illustration or texture lands behind which text, so system screens always put
 * text on an opaque ground — never straight over art (§2.5).
 * `variant` picks one of the four rough edges (§2.3); pass the sibling index so
 * neighbours never share one.
 */
export function Plate({
  variant,
  className = "",
  children,
}: {
  variant?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`relative bg-surface p-5 shadow-card ${variant ?? "rounded-2xl"} ${className}`}>
      {children}
    </div>
  );
}
