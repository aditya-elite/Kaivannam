import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { generateProductQrPng } from "@/lib/qr";

// Returns the printable QR PNG for a sealed product. The QR encodes the public
// verification URL, so scanning it in a shop opens the record with no account.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!product || product.status !== "SEALED") {
    return new Response("Not found", { status: 404 });
  }
  const origin = req.nextUrl.origin;
  const png = await generateProductQrPng(product.id, origin);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
}
