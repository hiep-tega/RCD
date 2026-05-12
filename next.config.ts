import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep puppeteer and its screen recorder in Node.js — never bundle them for the browser
  serverExternalPackages: ["puppeteer", "puppeteer-screen-recorder", "puppeteer-core"],
};

export default nextConfig;
