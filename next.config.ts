import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Supabase auth redirects and external image sources if needed
  async redirects() {
    return [];
  },

  // Ensure the auth callback route is never statically cached
  async headers() {
    return [
      {
        source: "/auth/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
