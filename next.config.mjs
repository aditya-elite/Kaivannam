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
  },
};

export default nextConfig;
