import { test } from "@playwright/test";

import Coordinate from "../data/coordinate.json" assert {
  type: "json",
};

import { runCrawler } from "../lib/crawl.js";

test("Spin crawl", async () => {
  await runCrawler(Coordinate);
});