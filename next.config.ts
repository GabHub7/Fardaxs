import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow remote product images (Supabase Storage public URLs, brand logos,
    // and any https-hosted image pasted into the admin product form).
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
