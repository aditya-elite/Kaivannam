"use client";

/**
 * Shopping cart held in localStorage so it survives navigation, app close, and
 * the sign-in round-trip — and works for guests with no account.
 *
 * The cart stores ONLY product ids + quantities. Titles and prices are always
 * re-fetched and re-validated on the server at cart preview / checkout time — the
 * client price is never trusted.
 */

export type CartLine = { productId: string; quantity: number };

const KEY = "ks_cart";
const EVENT = "cart-changed";

function read(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return arr.filter((l) => l && typeof l.productId === "string" && l.quantity > 0);
  } catch {
    return [];
  }
}

function write(lines: CartLine[]): void {
  localStorage.setItem(KEY, JSON.stringify(lines));
  // Notify same-tab listeners (storage event only fires cross-tab).
  window.dispatchEvent(new Event(EVENT));
}

export function getCart(): CartLine[] {
  return read();
}

export function cartCount(): number {
  return read().reduce((n, l) => n + l.quantity, 0);
}

export function addToCart(productId: string, quantity = 1): void {
  const lines = read();
  const existing = lines.find((l) => l.productId === productId);
  if (existing) existing.quantity += quantity;
  else lines.push({ productId, quantity });
  write(lines);
}

export function setQty(productId: string, quantity: number): void {
  let lines = read();
  if (quantity <= 0) lines = lines.filter((l) => l.productId !== productId);
  else {
    const existing = lines.find((l) => l.productId === productId);
    if (existing) existing.quantity = quantity;
    else lines.push({ productId, quantity });
  }
  write(lines);
}

export function removeFromCart(productId: string): void {
  write(read().filter((l) => l.productId !== productId));
}

export function clearCart(): void {
  write([]);
}

/** Subscribe to cart changes (same tab + other tabs). Returns an unsubscribe fn. */
export function onCartChanged(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
