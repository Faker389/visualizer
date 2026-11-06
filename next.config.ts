import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["draco3dgltf", "firebase-admin"],
  experimental: {
    serverActions: { bodySizeLimit: "500mb" },
  },
};

export default nextConfig;
