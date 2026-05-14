import fs from "fs-extra";
import path from "path";
import Coordinate from "../data/coordinate.json" assert { type: "json" };
import { test, chromium } from "@playwright/test";
// test.setTimeout(0);

export const runtime = "nodejs";

let x_play;
let y_play;
let x_activate;
let y_activate;
let VIEWPORT;

let BASE_DURATION_MS = 3500;
const REEL_EXTENSION_MS = 2500;
const PULL_COMP_MS = 1200;

let browser = null;
let context = null;
let running = false;

function countWinningRounds(resultJson) {
  try {
    if (typeof resultJson === "string") {
      resultJson = JSON.parse(resultJson);
    }

    if (!Array.isArray(resultJson)) {
      return 0;
    }

    return Math.max(0, resultJson.length - 1);
  } catch (e) {
    console.error("Invalid result_json:", e);

    return 0;
  }
}

async function ensureSession(displayMode) {
  if (browser && browser.isConnected() && context) {
    return;
  }

  browser = await chromium.launch({
    headless: false,
  });

  if (displayMode === "portrait") {
    VIEWPORT = {
      width: 396,
      height: 703,
    };
  } else {
    VIEWPORT = {
      width: 800,
      height: 600,
    };
  }
  context = await browser.newContext({
    viewport: VIEWPORT,
  });
}

test("Spin crawl", async () => {
  const recordingsDir = path.join(process.cwd(), "recordings");
  for (let i = 47; i < Coordinate.length; i++) {
    try {
      x_play = Coordinate[i].x_play;
      y_play = Coordinate[i].y_play;
      x_activate = Coordinate[i].x_activate;
      y_activate = Coordinate[i].y_activate;
      await fs.ensureDir(recordingsDir);
      await ensureSession(Coordinate[i].displayMode);

      const page = await context.newPage();
      await page.goto(Coordinate[i].url, {
        waitUntil: "networkidle",
      });

      console.log("get in game");
      if (Coordinate[i].displayMode === "landscape") {
        await page.waitForTimeout(1000);
      } else {
        await page.waitForTimeout(6000);
      }

      console.log("Clicking activate button...");
      //  //idk why coor cooreect but wrong when display at this ratio
      // if (Coordinate[i].displayMode === "landscape") {
      //   y_activate -= 50;
      // }
      // await page.locator("canvas").click({
      //   position: { x: x_activate, y: y_activate },
      //   force: true, // Bypasses
      // });
      //now i know
      await page.mouse.click(x_activate, y_activate);

      await page.waitForTimeout(2000)
      console.log("Clicking play button...");
      //idk why coor cooreect but wrong when display at this ratio
      // if (Coordinate[i].displayMode === "landscape") {
      //   y_play -= 60;
      // }
      // await page.locator("canvas").click({
      //   position: { x: x_play, y: y_play },
      //   force: true, // Bypasses visibility checks if the button is strictly inside the canvas
      // });
      await page.mouse.click(x_play, y_play);

      await page.waitForTimeout(3000);
    } catch (e) {
      console.error(e);

      return Response.json(
        {
          success: false,
          error: e.message,
        },
        { status: 500 },
      );
    } finally {
      running = false;
      await context?.close();
      await browser?.close();
    }
  }
});
