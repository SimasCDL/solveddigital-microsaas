import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Force the ffmpeg-static binary into the serverless bundles for every route
  // that shells out to it. The path is built dynamically (process.cwd()), so
  // Vercel's tracer can't detect it — without this, ffmpeg is missing in
  // production and stitching / QC / format variants / music all fail.
  outputFileTracingIncludes: {
    // ffmpeg binary + the background music track (both read from disk at runtime
    // via dynamic paths the tracer can't detect on its own).
    '/api/fulfill': ['./node_modules/ffmpeg-static/**', './assets/**'],
    '/api/generate': ['./node_modules/ffmpeg-static/**', './assets/**'],
    '/api/stitch': ['./node_modules/ffmpeg-static/**'],
    '/api/qc-test': ['./node_modules/ffmpeg-static/**'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
