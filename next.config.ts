import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/chat/completions',
        destination: '/v1/chat/completions',
      },
      {
        source: '/api/v1/models',
        destination: '/v1/models',
      },
    ];
  },
};

export default nextConfig;
