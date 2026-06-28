import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['recharts'],
  serverExternalPackages: ['better-sqlite3'],
  allowedDevOrigins: ['192.168.1.217'],
};

export default nextConfig;
