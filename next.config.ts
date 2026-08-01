import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/epcr/login", destination: "/epcr-account/login" },
      { source: "/epcr/setup-password", destination: "/epcr-account/setup-password" },
      { source: "/epcr/dashboard", destination: "/epcr-dashboard" },
    ];
  },
};

export default nextConfig;
