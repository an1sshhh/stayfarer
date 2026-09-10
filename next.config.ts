import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: apiUrl ? [new URL(`${apiUrl}/**`)] : [],
  },
};

export default nextConfig;
