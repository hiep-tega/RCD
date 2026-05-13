import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TARGET_URL_PART = "swiftplay.slotgen.com/api/slotadventurer/v1";

const state = globalThis.__watchApiState || {
  running: false,
  startedAt: null,
  saves: 0,
  errors: 0,
  browser: null,
  client: null,
  requestMeta: new Map(),
};

globalThis.__watchApiState = state;

function ensureSaveDir() {
  const dir = path.join(process.cwd(), "public", "json");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function stopWatcher() {
  if (state.client) {
    state.client.removeAllListeners("Network.requestWillBeSent");
    state.client.removeAllListeners("Network.responseReceived");
  }

  state.client = null;
  state.browser = null;
  state.running = false;
  state.requestMeta.clear();
}

async function startWatcher() {
  if (state.running) {
    return {
      success: true,
      running: true,
      message: "Watcher already running",
      startedAt: state.startedAt,
      saves: state.saves,
      errors: state.errors,
    };
  }

  const browser = await puppeteer.connect({
    browserURL: "http://127.0.0.1:9222",
  });

  const pages = await browser.pages();
  const page =
    pages.find((p) => p.url() === "http://localhost:3000") ||
    pages[0];

  if (!page) {
    throw new Error("No Chrome tab found. Open localhost app first.");
  }

  const client = await page.target().createCDPSession();
  await client.send("Network.enable");

  client.on("Network.requestWillBeSent", (event) => {
    state.requestMeta.set(event.requestId, {
      method: event.request?.method || "GET",
      url: event.request?.url || "",
      headers: event.request?.headers || {},
      timestamp: Date.now(),
    });
  });

  client.on("Network.responseReceived", async (event) => {
    try {
      const resUrl = event.response?.url || "";
      if (!resUrl.includes(TARGET_URL_PART)) return;

      const meta = state.requestMeta.get(event.requestId) || {};
      const method = (meta.method || "GET").toUpperCase();
      if (method !== "POST") return;

      const bodyResult = await client.send("Network.getResponseBody", {
        requestId: event.requestId,
      });

      const rawBody = bodyResult.base64Encoded
        ? Buffer.from(bodyResult.body, "base64").toString("utf8")
        : bodyResult.body;

      let data;
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = rawBody;
      }

      const dir = ensureSaveDir();
      const filename = `data-${Date.now()}.json`;
      const payload = {
        timestamp: Date.now(),
        source: "cdp-network",
        endpoint: resUrl,
        request: {
          method,
          referer: meta.headers?.Referer || meta.headers?.referer || "",
        },
        response: {
          status: event.response?.status,
          mimeType: event.response?.mimeType,
          resourceType: event.type,
        },
        data,
      };

      fs.writeFileSync(path.join(dir, filename), JSON.stringify(payload, null, 2));
      state.saves += 1;
    } catch {
      state.errors += 1;
    }
  });

  state.browser = browser;
  state.client = client;
  state.running = true;
  state.startedAt = new Date().toISOString();

  return {
    success: true,
    running: true,
    message: "Watcher started",
    startedAt: state.startedAt,
    saves: state.saves,
    errors: state.errors,
  };
}

export async function GET() {
  return Response.json({
    success: true,
    running: state.running,
    startedAt: state.startedAt,
    saves: state.saves,
    errors: state.errors,
  });
}

export async function POST() {
  try {
    const result = await startWatcher();
    return Response.json(result);
  } catch (err) {
    return Response.json(
      {
        success: false,
        running: false,
        error: err?.message || "Failed to start watcher",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  stopWatcher();
  return Response.json({ success: true, running: false, message: "Watcher stopped" });
}
