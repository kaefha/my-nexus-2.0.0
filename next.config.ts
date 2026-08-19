import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Some next.js versions require it here
  },
  // In latest next.js, allowedDevOrigins is top level
  allowedDevOrigins: ['192.168.1.29', '192.168.1.33', '192.168.1.18', 'localhost'],
};

export default nextConfig;
