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
    //
    // EVERY route that calls fulfillOrder() needs both, since fulfillment
    // stitches clips, builds the vertical variants and lays the music track.
    "/api/fulfill": ["./node_modules/ffmpeg-static/**", "./assets/**"],
    "/api/free": ["./node_modules/ffmpeg-static/**", "./assets/**"],
    "/api/webhook": ["./node_modules/ffmpeg-static/**", "./assets/**"],
    "/api/admin/retry": ["./node_modules/ffmpeg-static/**", "./assets/**"],
    "/api/generate": ["./node_modules/ffmpeg-static/**", "./assets/**"],
    "/api/stitch": ["./node_modules/ffmpeg-static/**"],
    "/api/qc-test": ["./node_modules/ffmpeg-static/**"],
  },
  /**
   * Keep the marketing assets out of the serverless bundles.
   *
   * `src/lib/stitch.ts` builds the ffmpeg path from `process.cwd()`, which the
   * tracer can't follow, so it gives up and traces the ENTIRE project into every
   * function that imports it — /api/stitch, /api/fulfill and /api/free were each
   * carrying all 27 MB of `public/` on top of the 80 MB ffmpeg binary. That sat
   * just under Vercel's 250 MB uncompressed function limit until a ~1 MB clip
   * pushed it over, and the deploy started failing at "Deploying outputs" with
   * the build itself passing.
   *
   * Nothing server-side reads from `public/` — Vercel serves it from the CDN —
   * and `landing/` is a separate sub-app. The music track the ffmpeg routes DO
   * need lives in `assets/` and is included above, so it is unaffected.
   */
  outputFileTracingExcludes: {
    "*": ["./public/**/*", "./landing/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
