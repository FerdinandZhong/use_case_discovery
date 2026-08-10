/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output → a self-contained server.js for the Docker image / CML app.
  output: 'standalone',
  // Serve under a subpath when required (e.g. a CML Application subdomain base path).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  experimental: {
    // Ensure the better-sqlite3 native binding is copied into the standalone bundle.
    outputFileTracingIncludes: {
      '/api/**': ['./node_modules/better-sqlite3/build/Release/*.node'],
    },
  },
};

export default nextConfig;
