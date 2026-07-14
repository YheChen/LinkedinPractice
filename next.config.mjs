/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PWA/service-worker is wired in Milestone 12 (see docs/SPEC.md). We keep the
  // manifest static under /public and register the SW from the client shell.
  experimental: {
    // Keeps solver/generator Web Worker bundles out of the main chunk.
    webpackBuildWorker: true,
  },
};

export default nextConfig;
