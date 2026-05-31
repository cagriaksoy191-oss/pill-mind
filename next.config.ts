import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
  },
};

const sentryOptions = {
  // Silent logs during build
  silent: true,
  org: "pillmind",
  project: "pillmind",
  // Widens the scope of files uploaded to Sentry for better source mapping
  widenClientFileUpload: true,
  // Routes Sentry requests through Next.js rewrite to bypass ad blockers
  tunnelRoute: "/monitoring",
  // Hides server-side sourcemaps from the public build
  hideSourceMaps: true,
  disableLogger: true,
};

export default withSentryConfig(nextConfig, sentryOptions);
