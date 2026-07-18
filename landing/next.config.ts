import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray ~/package-lock.json otherwise makes Next
  // infer the home directory as the root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
