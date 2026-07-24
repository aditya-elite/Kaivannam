import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/views/AuthForm";

// The single auth touchpoint. Reached only when a signed-out user tries to
// create a product record. Explains why, and preserves their return path.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const { next, mode } = await searchParams;
  const user = await getCurrentUser();
  const dest = next && next.startsWith("/") ? next : "/register";
  if (user) redirect(dest);

  return <AuthForm next={dest} initialMode={mode === "signup" ? "signup" : "signin"} />;
}
