import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiHostname = apiUrl ? new URL(apiUrl).hostname : "";
const isLocalApi = apiHostname === "localhost" || apiHostname === "127.0.0.1";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: apiUrl ? [new URL(`${apiUrl}/**`)] : [],
    // Next's SSRF guard blocks image optimization for any URL that resolves to a
    // loopback/private IP. Our own API is on localhost in dev, and remotePatterns
    // above already restricts fetches to that exact host, so it's safe to allow here.
    dangerouslyAllowLocalIP: isLocalApi,
  },
};

export default nextConfig;
