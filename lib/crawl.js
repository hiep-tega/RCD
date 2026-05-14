import { chromium } from "playwright";
import Coordinates from "../data/coordinate.json" assert { type: "json" };
import fs from "fs-extra";
import path from "path";
import db from "./db";
export const runtime = "nodejs";

let browser = null;
let context = null;
let VIEWPORT;
let inter = true;
let MS = 0;
let BASE_DURATION_MS = 3000;
let PULL_COMP_MS = 2000;
let REEL_EXTENSION_MS = 2500;
let jsonFilePath = path.join(
  process.cwd(),
  "data",
  `game_report_${Date.now()}.json`,
);

const saveCrawl = ({ url, displayMode, videoPath, data }) => {
  const stmt = db.prepare(`
    INSERT INTO crawl (
      url,
      display_mode,
      video_path,
      data,
      created_at
    )
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(url, displayMode, videoPath, data, new Date().toISOString());

  console.log("Saved to SQLite");
};

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

const COORDINATE_PATH = path.join(process.cwd(), "data", "correct_cod.json");

async function appendCoordinate(
  url,
  x_activate,
  y_activate,
  x_play,
  y_play,
  displayMode,
) {
  await fs.ensureDir(path.dirname(COORDINATE_PATH));

  let coordinates = [];

  if (await fs.pathExists(COORDINATE_PATH)) {
    try {
      const raw = await fs.readFile(COORDINATE_PATH, "utf8");

      if (raw.trim()) {
        coordinates = JSON.parse(raw);

        if (!Array.isArray(coordinates)) {
          coordinates = [];
        }
      }
    } catch (e) {
      console.warn("coordinate.json invalid, recreating.");
    }
  }

  coordinates.push({
    url,
    x_activate,
    y_activate,
    x_play,
    y_play,
    ts: new Date().toISOString(),
  });

  await fs.writeJson(COORDINATE_PATH, coordinates, {
    spaces: 2,
  });

  console.log("Coordinate saved");
}
export async function runCrawler(req) {
  const { url, displayMode } = req;
  browser = await chromium.launch({
    headless: false,
  });
  console.log(url);
  const Coordinate = Coordinates.find((item) => item.url === url);
  console.log(Coordinate);
  const recordingsDir = path.join(process.cwd(), "recordings");

  await fs.ensureDir(recordingsDir);
  await ensureSession(Coordinate.displayMode);

  let x_play = Coordinate.x_play;
  let y_play = Coordinate.y_play;
  let x_activate = Coordinate.x_activate;
  let y_activate = Coordinate.y_activate;

  let firstClick = null;

  const page = await context.newPage();
  await page.exposeFunction("saveClick", async ({ x, y }) => {
    console.log("Clicked:", x, y);

    if (!firstClick) {
      firstClick = { x, y };

      console.log("Clicked activate position");

      return;
    }

    await appendCoordinate(
      API_LANDSCAPE[i],
      firstClick.x,
      firstClick.y,
      x,
      y,
      "landscape",
    );

    console.log("Clicked play position");

    firstClick = null;
  });

  await page.addInitScript(() => {
    document.addEventListener("click", (event) => {
      window.saveClick({
        x: event.clientX,
        y: event.clientY,
      });
    });
  });
  await page.goto(url, {
    waitUntil: "networkidle",
  });
  while (inter) {
    try {
      console.log("get in game");
      if (MS == 0) {
        MS = 3500;
        if (displayMode === "landscape") {
          await page.waitForTimeout(1000);
          console.log("Clicking activate button...");
          await page.mouse.click(x_activate, y_activate);
        } else {
          await page.waitForTimeout(6000);
          console.log("Clicking activate button...");
          await page.locator("canvas").click({
            position: { x: x_activate, y: y_activate },
            force: true, // Bypasses visibility checks if the button is strictly inside the canvas
          });
        }
      }

      await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        
        if (!canvas) {
          throw new Error("Canvas not found");
        }
        
        const stream = canvas.captureStream(60);
        
        window.recordedChunks = [];

        window.mediaRecorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp9",
        });
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            recordedChunks.push(e.data);
          }
        };
        
        mediaRecorder.start();
      });
      await page.waitForTimeout(3000);
      
      console.log("Clicking play button...");
      await page.mouse.click(x_play, y_play);
      const responsePromise = page.waitForResponse(
        (res) => res.request().method() === "POST" && res.url().includes("/v1"),
        { timeout: 0 },
      );

      // wait until POST actually happens
      const response = await responsePromise;

      console.log("POST detected");

      // minimum duration
      await page.waitForTimeout(BASE_DURATION_MS);

      let body = null;
      let extraMs = 0;

      try {
        body = await response.json();
      } catch (e) {
        console.error("JSON parse failed:", e);
      }

      if (body) {
        // landscape games usually have win_amount in the root, while portrait games might nest it differently
        const winAmount = parseFloat(body.data["win_amount"] ?? 0);

        if (!Number.isNaN(winAmount) && winAmount > 0) {
          const winningRounds = countWinningRounds(body.data["result_json"]);

          extraMs = winningRounds * REEL_EXTENSION_MS;
        }

        // portrait games might have a different structure, so we can check for nested win_amount if the root one is not present
        if (displayMode === "portrait") {
          let pull = body.data.pull?.ActiveLines?.length;
          if (pull) {
            extraMs = pull * PULL_COMP_MS;
          }
        }

        await fs.appendFile(jsonFilePath, JSON.stringify(body));
      }

      //save in sql lite

      const base64Video = await page.evaluate(async () => {
        return new Promise((resolve) => {
          mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunks, {
              type: "video/webm",
            });

            const arrayBuffer = await blob.arrayBuffer();

            let binary = "";

            const bytes = new Uint8Array(arrayBuffer);

            for (const b of bytes) {
              binary += String.fromCharCode(b);
            }

            resolve(btoa(binary));
          };
          mediaRecorder.stop();
        });
      });

      const buffer = Buffer.from(base64Video, "base64");

      const filename = `crawl-${Date.now()}.webm`;

      const fullPath = path.resolve(process.cwd(), "recordings", filename);

      await fs.writeFile(fullPath, buffer);
      console.log("Saved:", filename);
      saveCrawl({
        url,
        displayMode,
        videoPath: fullPath,
        data: jsonFilePath,
      });
    } catch (e) {
      console.error(e);

      return Response.json(
        {
          success: false,
          error: e.message,
        },
        { status: 500 },
      );
    }
  }
}
