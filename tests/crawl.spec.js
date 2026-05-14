import fs from "fs-extra";
import path from "path";
import { test, chromium } from "@playwright/test";
import API_Coordination from "../utils/API_Coordination.json" assert { type: "json" };
import DisplaySetting from "../utils/DisplayCoordination.json" assert { type: "json" };
import Coordinate from "../data/coordinate.json" assert { type: "json" };
test.setTimeout(0);

export const runtime = "nodejs";

const GAME_URL = DisplaySetting.landscape.API[1];

function getGameEntry(settings, gameUrl) {
  for (const displayMode of ["portrait", "landscape"]) {
    const mode = settings[displayMode];

    for (const item of mode.API) {
      if (typeof item === "string") {
        if (item === gameUrl) {
          return {
            displayMode, // save current mode name
            ...mode,
          };
        }
      } else if (typeof item === "object") {
        const url = Object.keys(item)[0];

        if (url === gameUrl) {
          return {
            displayMode,
            ...mode,
            ...item[url],
          };
        }
      }
    }
  }

  return null;
}
const ENTRY = getGameEntry(DisplaySetting, GAME_URL);

const X = ENTRY.X;
const Y = ENTRY.Y;

const m = ENTRY.active_x ?? 580;
const n = ENTRY.active_y ?? 400;

let VIEWPORT = ENTRY.portrait
  ? {
      width: 396,
      height: 703,
    }
  : {
      width: 800,
      height: 600,
    };

let BASE_DURATION_MS = 0;
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

async function ensureSession() {
  if (browser && browser.isConnected() && context) {
    return;
  }

  browser = await chromium.launch({
    headless: false,
  });

  if (ENTRY.portrait) {
    VIEWPORT = {
      width: 396,
      height: 703,
    };
  }
  context = await browser.newContext({
    viewport: VIEWPORT,
  });
}

test("Spin crawl", async () => {
  if (running) {
    return Response.json(
      {
        success: false,
        error: "Recording loop already running",
      },
      { status: 409 },
    );
  }

  try {
    running = true;
    const recordingsDir = path.join(process.cwd(), "recordings");

    await fs.ensureDir(recordingsDir);
    await ensureSession();

    const page = await context.newPage();
    await page.goto(GAME_URL, {
      waitUntil: "networkidle",
    });

    // // Debug: Draw active area
    // const activatePortraitArea = {
    //   x: 180,
    //   y: 600,
    //   width: 40,
    //   height: 80,
    // };
    // await page.evaluate((a) => {
    //   const div = document.createElement("div");
    //   div.style.position = "fixed";
    //   div.style.left = a.x + "px";
    //   div.style.top = a.y + "px";
    //   div.style.width = a.width + "px";
    //   div.style.height = a.height + "px";
    //   div.style.border = "2px solid red";
    //   div.style.zIndex = "999999";
    //   document.body.appendChild(div);
    // }, activatePortraitArea);

    fs.writeFile("data/game_report.json", `${Date.now()}\n`);

    while (true) {
      if (BASE_DURATION_MS == 0) {
        BASE_DURATION_MS = 3500;
        await page.waitForTimeout(1000);
        console.log("get in game");
        if (ENTRY.portrait) {
          await page.waitForTimeout(3000);
          BASE_DURATION_MS = 2000;
        }

        await page.locator("canvas").click({
          position: { x: m, y: n },
          force: true, // Bypasses
        });

        await page.waitForTimeout(2000);
      } else {
        console.log("Waiting for spin...");
        
        // start recording
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
        
        await page.waitForTimeout(1000);
        
        // start push button
        await page.locator("canvas").click({
          position: { x: X, y: Y },
          force: true, // Bypasses visibility checks if the button is strictly inside the canvas
        });
        
        const responsePromise = page.waitForResponse(
          (res) =>
            res.request().method() === "POST" && res.url().includes("/v1"),
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
          if (ENTRY.displayMode === "portrait") {
            let pull = body.data.pull?.ActiveLines?.length;
            if (pull) {
              extraMs = pull * PULL_COMP_MS;
            }
          }
          await waitForTimeout(extraMs);
          await fs.appendFile("data/game_report.json", JSON.stringify(body));
        }

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

        const filename = `spin-${Date.now()}.webm`;

        const fullPath = path.resolve(process.cwd(), "recordings", filename);

        await fs.writeFile(fullPath, buffer);
        
        console.log("Saved:", filename);

        //get out of pannel show paly win how many from free spin
        if (body.data.freespin_win !== "0.00") {
          page.evaluate(() => {
            window.addEventListener("mousedown", (e) => {
              console.log("Mouse down at:", 10, 10);
            });
          });
        }
      }
    }
    await page.waitForTimeout(10000);
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
});
