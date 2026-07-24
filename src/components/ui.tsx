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

const buttonBase =
  "inline-flex min-h-tap items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold shadow-card transition-colors disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none";

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

export function SectionHeading({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold sm:text-3xl">{children}</h1>
      {sub ? <p className="mt-2 max-w-2xl text-base text-muted">{sub}</p> : null}
    </div>
  );
}
