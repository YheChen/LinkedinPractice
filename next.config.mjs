/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PWA/service-worker is wired in Milestone 12 (see docs/SPEC.md). We keep the
  // manifest static under /public and register the SW from the client shell.
  experimental: {
    // Keeps solver/generator Web Worker bundles out of the main chunk.
    webpackBuildWorker: true,
  },
  // Baseline security headers (SPEC §Security). No CSP that would block the
  // inline worker/data-URI flows; headers below are safe for a static SPA-style app.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
