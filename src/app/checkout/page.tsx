import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { CheckoutView } from "@/components/views/CheckoutView";
import { CheckoutAuthGate } from "@/components/views/CheckoutAuthGate";

export const metadata: Metadata = { title: "Checkout — Kaivannam" };

// An account is REQUIRED to buy: gate the checkout behind sign-in / register.
export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) return <CheckoutAuthGate />;

  const defaultBuyer = {
    name: user.displayName,
    phone: /^\d{6,}$/.test(user.handle) ? user.handle : "",
    email: /@/.test(user.handle) ? user.handle : "",
  };
  return <CheckoutView defaultBuyer={defaultBuyer} />;
}
