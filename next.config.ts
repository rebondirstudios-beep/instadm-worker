import type { NextConfig } from "next";

const publicAppOrigin = process.env.PUBLIC_APP_ORIGIN;
const extraOrigins = publicAppOrigin ? [publicAppOrigin] : [];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["localhost", "127.0.0.1", ...extraOrigins],
  serverExternalPackages: ["playwright", "playwright-core"],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost", "127.0.0.1", ...extraOrigins],
    },
  },
};

export default nextConfig;
