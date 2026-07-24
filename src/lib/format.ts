// Dates are ALWAYS DD/MM/YYYY. Currency is ₹ with Indian digit grouping.

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatRupees(amount: number): string {
  // Indian grouping: e.g. 1,00,000
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}
