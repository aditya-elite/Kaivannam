// Origins permitted to invoke Server Actions. Next validates the request's
// Origin against its Host and rejects a mismatch with "Invalid Server Actions
// request" — correct default (it is CSRF protection), but it breaks whenever a
// tunnel or reverse proxy sits in front of the dev server and rewrites Host.
// Login and admin both use Server Actions, so without this they 500 behind a
// tunnel while ordinary page loads keep working, which is a confusing failure.
//
// Set TUNNEL_ORIGINS for anything not covered, comma-separated and without a
// scheme, e.g. TUNNEL_ORIGINS="abc123.ngrok-free.app,staging.example.org".
const tunnelOrigins = (process.env.TUNNEL_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""))
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Uploaded files are served from the local object-storage dir in dev.
  // In production this is swapped for a real object store (see src/lib/storage.ts).
  images: {
    remotePatterns: [],
  },
  // Keep the client bundle lean for low-end Android on throttled 3G.
  experimental: {
    optimizePackageImports: ["qrcode"],
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "*.ngrok-free.app", // free tunnels — the subdomain changes each session
        "*.ngrok.app", // reserved / paid domains
        "*.ngrok.io", // legacy
        ...tunnelOrigins,
      ],
    },
  },
};

export default nextConfig;
