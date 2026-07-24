import { randomBytes } from "crypto";
import { TEST_DECLINE_CARD } from "./payment-constants";

export { TEST_DECLINE_CARD } from "./payment-constants";

/**
 * SIMULATED payment gateway — NOT a real payment service provider.
 *
 * This stands in for a PSP (Razorpay/Stripe/etc.) so the checkout flow can be
 * demonstrated end-to-end without moving real money. No card data is stored; only
 * the last 4 digits and a fake transaction reference are kept on the order.
 *
 * Behaviour: every card is approved EXCEPT the canonical test decline card
 * `4000 0000 0000 0002`, which always declines — so the failure path is demoable.
 */

export type ChargeInput = {
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  amountPaise: number;
};

export type ChargeResult =
  | { ok: true; ref: string; last4: string }
  | { ok: false; decline: "card_declined" | "invalid_card" | "invalid_amount" };

function normalize(card: string): string {
  return card.replace(/[\s-]/g, "");
}

/** Luhn check — a light validity guard, not security. */
function luhnValid(digits: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function simulateCharge(input: ChargeInput): ChargeResult {
  const card = normalize(input.cardNumber);
  if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) {
    return { ok: false, decline: "invalid_amount" };
  }
  if (!/^\d{13,19}$/.test(card) || !luhnValid(card)) {
    return { ok: false, decline: "invalid_card" };
  }
  if (card === TEST_DECLINE_CARD) {
    return { ok: false, decline: "card_declined" };
  }
  // Approved.
  const ref = "SIMPAY-" + randomBytes(6).toString("hex").toUpperCase();
  return { ok: true, ref, last4: card.slice(-4) };
}
