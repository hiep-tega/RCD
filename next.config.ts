import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "puppeteer",
    "puppeteer-core",
    "@playwright/test",
    "playwright-core",
    "fs-extra",
  ],
};

export default nextConfig;
