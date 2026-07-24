import { getCurrentUser } from "@/lib/auth";
import { RegisterView } from "@/components/views/RegisterView";

// The ONLY place auth is required — but browsing here isn't blocked. A guest can
// fill the whole form; the sign-in screen appears only when they seal the record.
export default async function RegisterPage() {
  const user = await getCurrentUser();
  return <RegisterView authed={!!user} artisanName={user?.displayName ?? null} />;
}
