import type { NextConfig } from "next";
import path from "path";

const publicAppOrigin = process.env.PUBLIC_APP_ORIGIN;
const extraOrigins = publicAppOrigin ? [publicAppOrigin] : [];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["localhost", "127.0.0.1", ...extraOrigins],
  serverExternalPackages: ["playwright", "playwright-core"],
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost", "127.0.0.1", ...extraOrigins],
    },
  },
};

export default nextConfig;
