import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["playwright", "playwright-core"],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost", "127.0.0.1"],
    },
  },
};

export default nextConfig;
