// Inline, dependency-free icons. Every key action is paired with one of these so
// meaning survives partial literacy. Decorative icons get aria-hidden; meaningful
// ones take a `title`. 24px grid, currentColor stroke.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function base({ title, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const IconCheck = (p: IconProps) => base({ ...p, children: <polyline points="20 6 9 17 4 12" /> });
export const IconShield = (p: IconProps) =>
  base({ ...p, children: <><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" /><polyline points="9 12 11 14 15 10" /></> });
export const IconAlert = (p: IconProps) =>
  base({ ...p, children: <><path d="M12 3l9 16H3z" /><line x1="12" y1="10" x2="12" y2="14" /><circle cx="12" cy="17" r="0.5" fill="currentColor" /></> });
export const IconSearch = (p: IconProps) =>
  base({ ...p, children: <><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></> });
export const IconQr = (p: IconProps) =>
  base({ ...p, children: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><line x1="14" y1="14" x2="14" y2="21" /><line x1="18" y1="14" x2="21" y2="14" /><line x1="18" y1="18" x2="21" y2="21" /></> });
export const IconCamera = (p: IconProps) =>
  base({ ...p, children: <><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></> });
export const IconMic = (p: IconProps) =>
  base({ ...p, children: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><line x1="12" y1="18" x2="12" y2="21" /></> });
export const IconGlobe = (p: IconProps) =>
  base({ ...p, children: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></> });
export const IconUser = (p: IconProps) =>
  base({ ...p, children: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></> });
export const IconArrowRight = (p: IconProps) =>
  base({ ...p, children: <><line x1="4" y1="12" x2="20" y2="12" /><polyline points="14 6 20 12 14 18" /></> });
export const IconArrowLeft = (p: IconProps) =>
  base({ ...p, children: <><line x1="20" y1="12" x2="4" y2="12" /><polyline points="10 6 4 12 10 18" /></> });
export const IconMenu = (p: IconProps) =>
  base({ ...p, children: <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></> });
export const IconClose = (p: IconProps) =>
  base({ ...p, children: <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></> });
export const IconClock = (p: IconProps) =>
  base({ ...p, children: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></> });
export const IconPrint = (p: IconProps) =>
  base({ ...p, children: <><polyline points="6 9 6 3 18 3 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="7" rx="1" /></> });
export const IconThread = (p: IconProps) =>
  base({ ...p, children: <><path d="M4 4c6 2 10 6 16 16" /><circle cx="4" cy="4" r="1.5" fill="currentColor" /><circle cx="20" cy="20" r="1.5" fill="currentColor" /></> });
export const IconCloud = (p: IconProps) =>
  base({ ...p, children: <path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 18 18z" /> });
export const IconUpload = (p: IconProps) =>
  base({ ...p, children: <><path d="M12 15V4" /><polyline points="7 9 12 4 17 9" /><path d="M5 20h14" /></> });
export const IconBag = (p: IconProps) =>
  base({ ...p, children: <><path d="M6 8h12l-1 12H7z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></> });
export const IconTag = (p: IconProps) =>
  base({ ...p, children: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" /><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" /></> });
export const IconTruck = (p: IconProps) =>
  base({ ...p, children: <><rect x="2" y="6" width="12" height="10" rx="1" /><path d="M14 9h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></> });
export const IconLogout = (p: IconProps) =>
  base({ ...p, children: <><path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2" /><polyline points="17 9 21 12 17 15" /><line x1="21" y1="12" x2="9" y2="12" /></> });
export const IconGoogle = (p: SVGProps<SVGSVGElement>) => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...p}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

