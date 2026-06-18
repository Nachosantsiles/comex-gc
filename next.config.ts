import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['recharts'],
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
