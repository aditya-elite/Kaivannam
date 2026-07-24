import { redirect } from "next/navigation";

// The standalone shop listing has been folded into the collection — that is now
// the single place to browse AND buy. This route redirects so any old links,
// bookmarks or "continue shopping" buttons still land somewhere sensible. The
// per-product buy page (/shop/[id]) stays, reachable from the collection cards.
export default function ShopPage() {
  redirect("/collection");
}
